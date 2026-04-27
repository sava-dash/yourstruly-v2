import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

// Persona: a very friendly journalist whose only job is to help the
// person preserve a memory as fully and naturally as possible. Never a
// therapist, life coach, or anything that infers feelings/regrets.
const FOLLOWUP_SYSTEM = `You are a warm, very friendly journalist helping someone preserve a personal memory.

Return STRICT JSON with this exact shape:
{ "suggestions": [string] }

Persona + tone:
- Friendly journalist. Curious, kind, conversational. Never therapist-y, never coachy, never solemn.
- Goal: help them recall and share the memory more fully — names, places, time of day, who said what, what made them laugh, the song that was playing, the weather, the food, the smell, what happened next.

Output rules (CRITICAL):
- Return EXACTLY ONE follow-up. A single line. 8-16 words. One sentence, ending in a question mark.
- The single line must be plain text — NO line breaks, NO bullets, NO dashes, NO multi-angle lists, NO headers, NO quotes around the question.
- Conversational like a friend would ask. Examples: "Who else was there with you?", "What were you eating that night?", "What time of day was it?", "What was on the radio?".

Forbidden:
- Never project loss, regret, sadness, fear, or advice.
- Never predict the future or moralize ("you'll realize…", "you'll regret…", "the friendships you're worried about losing…").
- Never ask weird body-state details ("what were you doing with your hands", "where were your feet", "how were you breathing"). No invasive sensory probes.
- Don't repeat what they already said. Don't ask generic "how did you feel" unless no other angle exists.
- Return JSON only. No prose, no code fences.`

const STARTER_SYSTEM = `You are a warm, very friendly journalist helping someone start sharing a memory.

Return STRICT JSON with this exact shape:
{ "suggestions": [string] }

Persona + tone:
- Friendly journalist. Curious, kind, light. Help them find a doorway into the memory.

Output rules (CRITICAL):
- Return EXACTLY ONE starter. A single line. 6-14 words. Plain text only.
- NO line breaks, NO bullets, NO dashes, NO lists, NO headers, NO multi-angle bundles. One short suggestion or one short question.
- Examples: "Who else was in the room?", "Where you were when it clicked", "The song that was playing", "What you remember saying first".

Forbidden:
- Never presume loss, regret, sadness, what they're "worried about", or what they'll come to regret. No advice. No future-prediction.
- Never ask weird body-state details (hands, feet, breathing).
- Don't repeat the prompt; this is a direction to explore WITHIN it.
- Return JSON only. No prose, no code fences.`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const promptText = typeof body.promptText === 'string' ? body.promptText.slice(0, 400) : ''
    const transcript = typeof body.transcript === 'string' ? body.transcript.slice(0, 3000) : ''
    const force = body.force === true
    const recentHadFollowups: unknown = body.recentHadFollowups

    const isStarter = !transcript.trim()

    // "Earned" gating — only generate a follow-up when the transcript has
    // some substance. 15 words lets most real answers through while still
    // filtering one-liners. A concrete detail (name/place/year/time) OR
    // a longer answer (30+ words) is enough.
    if (!force && !isStarter) {
      const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length
      const hasDetail =
        /[A-Z][a-z]+\s/.test(transcript) /* name-ish */ ||
        /\b(in|at)\s+[A-Z][a-z]+/.test(transcript) /* place */ ||
        /\b(19|20)\d{2}\b/.test(transcript) /* year */ ||
        /\b(yesterday|last\s+(week|month|year)|when\s+i\s+was)\b/i.test(transcript) /* time */ ||
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(transcript)
      // Earned if: ≥8 words with a detail, OR ≥25 words without. This lets
      // short-but-specific answers ("I love Nirvana and Green Day") get a
      // follow-up, while a bare "yeah" doesn't.
      const earned = (wordCount >= 8 && hasDetail) || wordCount >= 25
      if (!earned) {
        return NextResponse.json({ suggestions: [] })
      }
      if (
        Array.isArray(recentHadFollowups) &&
        recentHadFollowups.length >= 2 &&
        recentHadFollowups.slice(-2).every(Boolean)
      ) {
        return NextResponse.json({ suggestions: [] })
      }
    }

    const userMsg = isStarter
      ? `Prompt:\n${promptText || '(none)'}`
      : `Prompt: ${promptText || '(none)'}\n\nWhat they shared:\n${transcript}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      temperature: 0.55,
      system: isStarter ? STARTER_SYSTEM : FOLLOWUP_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const raw = textBlock?.type === 'text' ? textBlock.text : ''

    // Force the model's output to a single clean line, regardless of
    // whether it returned multi-line / bulleted angle bundles. We keep
    // only the first non-empty, non-meta line, strip leading list
    // markers/quotes, and cap length so the bubble never blows up.
    const sanitize = (s: string): string => {
      const firstLine = s
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l && !/^[—–-]+$/.test(l))
      if (!firstLine) return ''
      let out = firstLine.replace(/^[-*•·\d.)\s"'`]+/, '').replace(/["'`{}]+$/, '').trim()
      if (out.length > 200) out = out.slice(0, 200).trimEnd()
      return out
    }

    let suggestions: string[] = []
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed.suggestions)) {
          suggestions = parsed.suggestions
            .filter((s: unknown) => typeof s === 'string')
            .map((s: string) => sanitize(s))
            .filter(Boolean)
            .slice(0, 1)
        }
      }
    } catch (err) {
      console.error('[followups] parse failed:', err)
    }

    // Fallback: if parsing failed, accept the first reasonable line from raw
    if (suggestions.length === 0 && raw) {
      const cleaned = sanitize(raw)
      if (cleaned && cleaned.length >= 6 && !cleaned.startsWith('{') && !cleaned.includes('"suggestions"')) {
        suggestions = [cleaned]
      }
    }

    if (suggestions.length === 0) {
      console.warn('[followups] returned empty. isStarter:', isStarter, 'raw sample:', raw.slice(0, 200))
    }

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[followups] error:', err)
    return NextResponse.json({ suggestions: [] })
  }
}
