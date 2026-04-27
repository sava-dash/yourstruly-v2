import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

const FOLLOWUP_SYSTEM = `You help someone recall and share a personal memory by gently asking ONE light, broad follow-up question.

Return STRICT JSON with this exact shape:
{ "suggestions": [string] }

Rules:
- 8-16 words. Conversational, warm, light-hearted — like a curious friend, never a therapist.
- Goal: jog memory or evoke a vivid moment. Ask about who was there, where, a smell/sound/song, a small detail, what made them laugh, what surprised them.
- Stay broad and open — invite recall, don't presume. Never project loss, regret, sadness, fear, advice, or what they "should" have done.
- Do not predict the future, give wisdom, or moralize. No "you'll realize…", "you'll regret…", "the friendships you're worried about losing…".
- Don't repeat what they already said. Avoid generic "how did you feel" unless no other angle exists.
- Return JSON only. No prose, no code fences.`

const STARTER_SYSTEM = `You help someone start answering a memory prompt by offering ONE warm, broad angle they could explore.

Return STRICT JSON with this exact shape:
{ "suggestions": [string] }

Rules:
- 6-14 words. Light, inviting, curiosity-driven — not solemn or advisory.
- Suggest a sensory detail, a specific person, a place, a sound or smell, a small everyday moment. Examples: "The sound of that summer", "Who else was in the room", "A small detail only you would remember", "Where you were when it clicked".
- Stay broad and exploratory. Never presume loss, regret, sadness, what they're "worried about", or what they'll come to regret. Never give advice or predict the future.
- Don't repeat the prompt. This is a direction to explore WITHIN it.
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
    let suggestions: string[] = []
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed.suggestions)) {
          suggestions = parsed.suggestions
            .filter((s: unknown) => typeof s === 'string')
            .map((s: string) => s.trim())
            .filter(Boolean)
            .slice(0, 1)
        }
      }
    } catch (err) {
      console.error('[followups] parse failed:', err)
    }

    // Fallback: if parsing failed, accept any reasonable non-empty line from raw
    if (suggestions.length === 0 && raw) {
      suggestions = raw
        .split('\n')
        .map((l) => l.replace(/^[-*\d.)\s"]+/, '').replace(/["{}]+$/, '').trim())
        .filter((l) => l.length >= 6 && l.length < 240 && !l.startsWith('{') && !l.includes('"suggestions"'))
        .slice(0, 1)
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
