import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

const SYNOPSIS_SYSTEM = `You extract structured fields from a personal memory transcript, using the PROMPT as context.

The user answered a prompt. The prompt may establish a named subject (e.g. "Jackie O", "your grandmother"). When the transcript uses pronouns (she / he / they / her / him), resolve them to the prompt's named subject if the resolution is unambiguous.

Return STRICT JSON with this exact shape:
{
  "where": string | null,     // a place — city, building, room, or specific location ("Wilson, North Carolina", "my grandmother's kitchen"). null if none is clearly stated in the transcript.
  "when": string | null,      // a date, year, season, decade, or life-stage phrase ("2018", "the summer of 1985", "when I was 12", "spring of last year"). null if none is clearly stated.
  "who": [
    {
      "name": string | null,    // proper name only ("Larry", "Jackie Kennedy", "Sarah"). null when only a relation word was used.
      "relation": string | null // one of: mother, father, spouse, partner, son, daughter, brother, sister, grandmother, grandfather, grandson, granddaughter, aunt, uncle, cousin, niece, nephew, in_law, best_friend, close_friend, friend, childhood_friend, colleague, boss, mentor, business_partner, neighbor, other. null if not specified.
    },
    ...
  ],
  "mood": string | null,      // 1-3 word emotional tone — lowercase, vivid ("wistful", "proud", "bittersweet"). null if none detectable.
  "tags": [string, ...],      // 3-5 single-word lowercase recall tags — concrete keywords from the memory. always populate if the transcript has meaningful content.
  "summary": string | null    // one short sentence capturing the core (max 25 words). null for very short transcripts.
}

HARD RULES for "who":
- Only proper names and/or relation words qualify. Never emit a pronoun ("she", "he", "they", "her", "him", "it") or an object noun ("person", "someone") as a name.
- If the transcript uses a pronoun and the prompt names a subject, resolve: {"name": <prompt subject>, "relation": null}.
- If the pronoun is ambiguous (no clear referent), omit the entry entirely.
- "cousin Larry" → {"name": "Larry", "relation": "cousin"}
- "Uncle Tim" → {"name": "Tim", "relation": "uncle"}
- "Grandma Rose" → {"name": "Rose", "relation": "grandmother"}
- "my mom Sarah" → {"name": "Sarah", "relation": "mother"}
- "my aunt" (no name) → {"name": null, "relation": "aunt"}
- "my brother" (no name) → {"name": null, "relation": "brother"}
- "Adam from my mom's side" → {"name": "Adam", "relation": null}
- "her sister" where prompt subject is Jackie → the SISTER's name isn't given, so {"name": null, "relation": "sister"} (don't invent a name from the prompt)
- "she is very dear to me" where prompt is about Jackie → {"name": "Jackie", "relation": null}
- Drop entries that are only "she"/"he"/"they" with no resolvable referent.

Other rules:
- Even very short transcripts (under 40 chars) must be processed.
- Use the speaker's own phrasing for places and times.
- If a field has nothing concrete, return null (or empty array for "who"/"tags") — never guess.
- Return JSON only. No prose, no code fences.`

interface SynopsisJSON {
  where: string | null
  when: string | null
  who: { name: string | null; relation: string | null }[]
  mood: string | null
  tags: string[]
  summary: string | null
}

const PRONOUNS = new Set(['she', 'he', 'they', 'her', 'him', 'them', 'it'])
const GENERIC_NOUNS = new Set(['someone', 'person', 'people', 'anybody', 'nobody', 'a friend', 'my friend', 'a guy', 'some guy'])

function isPronounOrGeneric(name: string): boolean {
  const n = name.trim().toLowerCase()
  if (PRONOUNS.has(n)) return true
  if (GENERIC_NOUNS.has(n)) return true
  return false
}

function parseJSON(raw: string): SynopsisJSON | null {
  const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  const candidate = match ? match[0] : cleaned
  try {
    const parsed = JSON.parse(candidate)
    if (!parsed || typeof parsed !== 'object') return null
    const arr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim()) : []
    const who: { name: string | null; relation: string | null }[] = Array.isArray(parsed.who)
      ? parsed.who
          .map((p: any): { name: string | null; relation: string | null } | null => {
            if (typeof p === 'string') {
              // Fallback for older response shape — try to split "cousin Larry" pattern
              const RELATION_WORDS = ['mother', 'mom', 'father', 'dad', 'spouse', 'partner', 'son', 'daughter', 'brother', 'sister', 'grandmother', 'grandma', 'grandfather', 'grandpa', 'grandson', 'granddaughter', 'aunt', 'uncle', 'cousin', 'niece', 'nephew']
              const lower = p.toLowerCase().trim()
              if (isPronounOrGeneric(lower)) return null
              for (const rw of RELATION_WORDS) {
                const m = lower.match(new RegExp(`^${rw}\\s+([a-z][a-z'’.\\-]+)`, 'i'))
                if (m) {
                  const normalized = rw === 'mom' ? 'mother' : rw === 'dad' ? 'father' : rw === 'grandma' ? 'grandmother' : rw === 'grandpa' ? 'grandfather' : rw
                  return { name: m[1][0].toUpperCase() + m[1].slice(1), relation: normalized }
                }
                if (lower === rw) {
                  const normalized = rw === 'mom' ? 'mother' : rw === 'dad' ? 'father' : rw === 'grandma' ? 'grandmother' : rw === 'grandpa' ? 'grandfather' : rw
                  return { name: null, relation: normalized }
                }
              }
              return { name: p.trim(), relation: null }
            }
            if (p && typeof p === 'object') {
              const rawName = typeof p.name === 'string' ? p.name.trim() : ''
              const relation = typeof p.relation === 'string' && p.relation.trim() ? p.relation.trim().toLowerCase() : null
              // Scrub pronouns and generic nouns that slipped past the model
              if (rawName && isPronounOrGeneric(rawName)) return relation ? { name: null, relation } : null
              const name = rawName || null
              // Entry must have at least one of name or relation to be useful
              if (!name && !relation) return null
              return { name, relation }
            }
            return null
          })
          .filter((x: any): x is { name: string | null; relation: string | null } => !!x)
          .slice(0, 8)
      : []
    return {
      where: typeof parsed.where === 'string' && parsed.where.trim() ? parsed.where.trim() : null,
      when: typeof parsed.when === 'string' && parsed.when.trim() ? parsed.when.trim() : null,
      who,
      mood: typeof parsed.mood === 'string' && parsed.mood.trim() ? parsed.mood.trim().toLowerCase().slice(0, 40) : null,
      tags: arr(parsed.tags).map((t) => t.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24)).filter(Boolean).slice(0, 5),
      summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : null,
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const memoryId = typeof body.memoryId === 'string' ? body.memoryId : null
    const transcript = typeof body.transcript === 'string' ? body.transcript.slice(0, 6000) : ''
    const promptText = typeof body.promptText === 'string' ? body.promptText.slice(0, 600).trim() : ''
    // "merge" means "union into existing extracted_entities rather than overwrite".
    // Used by the Continue-this-memory append flow so the second pass doesn't
    // clobber people/topics/locations the first pass already captured.
    const mode: 'create' | 'merge' = body.mode === 'merge' ? 'merge' : 'create'

    if (!transcript.trim()) {
      return NextResponse.json({ error: 'Missing transcript' }, { status: 400 })
    }

    const userMsg = promptText
      ? `PROMPT:\n${promptText}\n\nTRANSCRIPT:\n${transcript}`
      : `TRANSCRIPT:\n${transcript}`

    let raw = ''
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        temperature: 0.2,
        system: SYNOPSIS_SYSTEM,
        messages: [{ role: 'user', content: userMsg }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      raw = textBlock?.type === 'text' ? textBlock.text : ''
    } catch (llmErr) {
      console.error('[synopsis] Anthropic call failed:', llmErr)
      return NextResponse.json({ error: 'LLM call failed', detail: String(llmErr) }, { status: 500 })
    }
    const synopsis = parseJSON(raw)
    if (!synopsis) {
      console.error('[synopsis] JSON parse failed. Raw response:', raw.slice(0, 500))
      return NextResponse.json({ error: 'Could not parse LLM response', raw: raw.slice(0, 500) }, { status: 500 })
    }

    const where = synopsis?.where || null
    const when = synopsis?.when || null
    const whoRaw = synopsis?.who || []
    const mood = synopsis?.mood || null
    const tags = synopsis?.tags || []
    const summary = synopsis?.summary || null

    // Match extracted people against user's contacts.
    // Strategy:
    //   1. Strip honorifics (Dr., Mr., Mrs., Ms., Prof., Rev., etc.) before
    //      comparing — otherwise "Dr. Naiman" collides with "Dr. Richard Hayes"
    //      on the "Dr." prefix.
    //   2. If the cleaned query has >=2 tokens, only match a contact whose
    //      cleaned full_name equals the query OR whose cleaned last-name
    //      matches the query's last-name AND at least one other token aligns.
    //   3. If the cleaned query is a single token, fall back to first-name
    //      match ONLY if the stored contact's first cleaned token equals it.
    const HONORIFICS = new Set(['dr', 'dr.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'mx', 'mx.', 'prof', 'prof.', 'professor', 'rev', 'rev.', 'sr', 'sr.', 'jr', 'jr.', 'sir', 'dame', 'lord', 'lady'])
    const cleanName = (name: string): string =>
      name.trim().toLowerCase().split(/\s+/).filter((tok) => !HONORIFICS.has(tok.replace(/\.$/, ''))).join(' ')

    let people: { name: string | null; relation: string | null; existing: boolean; contactId?: string }[] = []
    if (whoRaw.length > 0) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name, relationship_type')
        .eq('user_id', user.id)
      type Indexed = { id: string; full_name: string; relationship_type?: string | null; cleaned: string; tokens: string[] }
      const indexed: Indexed[] = []
      for (const c of contacts || []) {
        if (!c.full_name) continue
        const cleaned = cleanName(c.full_name)
        indexed.push({
          id: c.id,
          full_name: c.full_name,
          relationship_type: c.relationship_type,
          cleaned,
          tokens: cleaned.split(/\s+/).filter(Boolean),
        })
      }
      people = whoRaw.map((entry) => {
        if (!entry.name) return { name: null, relation: entry.relation, existing: false }
        const name = entry.name.trim()
        const cleanedQuery = cleanName(name)
        const queryTokens = cleanedQuery.split(/\s+/).filter(Boolean)
        let match: Indexed | undefined

        if (queryTokens.length === 0) {
          // Query was only an honorific — never matches anything.
          match = undefined
        } else if (queryTokens.length === 1) {
          // Single token: match when the contact's FIRST cleaned token equals it.
          // Falls back to exact cleaned full_name match for one-word contacts.
          const q = queryTokens[0]
          match = indexed.find((c) => c.tokens[0] === q) || indexed.find((c) => c.cleaned === q)
        } else {
          // Multi token: require the entire cleaned name to match, or
          // last-name + first-name both appear on the contact.
          match = indexed.find((c) => c.cleaned === cleanedQuery)
          if (!match) {
            const qLast = queryTokens[queryTokens.length - 1]
            const qFirst = queryTokens[0]
            match = indexed.find((c) => c.tokens.length >= 2 && c.tokens[c.tokens.length - 1] === qLast && c.tokens[0] === qFirst)
          }
        }

        return match
          ? { name: match.full_name, relation: match.relationship_type || entry.relation || null, existing: true, contactId: match.id }
          : { name, relation: entry.relation, existing: false }
      })
    }

    // Persist key fields back to the memory so future reads carry the captured data.
    if (memoryId) {
      try {
        const admin = createAdminClient()
        const updates: Record<string, any> = {}

        // In merge mode, load existing entities + tags so arrays can be
        // unioned rather than overwritten. Newer-wins applies to scalars
        // like location/date per the product decision.
        let existingEntities: any = {}
        let existingTags: string[] = []
        if (mode === 'merge') {
          const { data: cur } = await admin
            .from('memories')
            .select('extracted_entities, tags')
            .eq('id', memoryId)
            .maybeSingle()
          existingEntities = (cur?.extracted_entities as any) || {}
          existingTags = Array.isArray(cur?.tags) ? (cur!.tags as string[]) : []
        }

        if (where) updates.location_name = where
        // Only write memory_date when the phrase parses to a real date;
        // don't clobber with "when I was 12" etc.
        if (when) {
          const parsed = new Date(when)
          if (!isNaN(parsed.getTime()) && /\d/.test(when)) {
            updates.memory_date = parsed.toISOString().split('T')[0]
          }
        }
        if (tags.length > 0) {
          updates.tags = mode === 'merge'
            ? Array.from(new Set([...existingTags, ...tags]))
            : tags
        }

        const newPeople = whoRaw
          .map((p) => {
            if (p.name && p.relation) return `${p.name} (${p.relation})`
            if (p.name) return p.name
            if (p.relation) return `(${p.relation})`
            return null
          })
          .filter((x): x is string => typeof x === 'string' && x.length > 0)

        const union = (a: unknown, b: string[]): string[] => {
          const left = Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : []
          return Array.from(new Set([...left, ...b]))
        }

        updates.extracted_entities = mode === 'merge'
          ? {
              ...existingEntities,
              topics:    union(existingEntities.topics, tags),
              people:    union(existingEntities.people, newPeople),
              times:     union(existingEntities.times, when ? [when] : []),
              locations: union(existingEntities.locations, where ? [where] : []),
              // Newer-wins for summary/mood when the new pass produced them.
              summary:   summary || existingEntities.summary || '',
              mood:      mood || existingEntities.mood || null,
              tags_ai:   union(existingEntities.tags_ai, tags),
              last_appended_at: new Date().toISOString(),
            }
          : {
              topics: tags,
              people: newPeople,
              times: when ? [when] : [],
              locations: where ? [where] : [],
              summary: summary || '',
              mood,
              tags_ai: tags,
              extracted_at: new Date().toISOString(),
            }
        await admin.from('memories').update(updates).eq('id', memoryId)

        // Only persist people with either a linked contact or a concrete name.
        // Relation-only entries stay client-side until the user fills in a name.
        const linkable = people.filter((p) => !!p.contactId || !!p.name)
        if (linkable.length > 0) {
          const rows = linkable.map((p) => ({
            memory_id: memoryId,
            contact_id: p.contactId || null,
            raw_name: p.contactId ? null : p.name,
            user_id: user.id,
          }))
          await admin.from('memory_people').upsert(rows as any, { ignoreDuplicates: true, onConflict: 'memory_id,contact_id' })
        }
      } catch (err) {
        console.error('[synopsis] persist failed:', err)
      }
    }

    return NextResponse.json({
      where,
      when,
      who: people,
      mood,
      tags,
      summary,
    })
  } catch (err) {
    console.error('[synopsis] error:', err)
    return NextResponse.json({ error: 'Failed to generate synopsis', detail: String(err) }, { status: 500 })
  }
}
