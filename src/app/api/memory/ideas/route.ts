import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

// Three short angles a person can speak about for a given memory prompt.
// Powers the "Ideas" popup on the story card. The model is asked, in
// the persona of a friendly journalist, to surface broad doorways into
// the memory — never advice, never future-prediction, never weird body
// probes. Returns STRICT JSON.
const IDEAS_SYSTEM = `You are a warm, very friendly journalist helping someone start sharing a personal memory.

Return STRICT JSON with this exact shape:
{ "ideas": [string, string, string] }

Goal: give them THREE short, broad doorways into the memory — concrete enough to spark a thought, open enough to let them go anywhere. Each idea is 4-12 words.

Format rules (CRITICAL):
- Each idea is plain text on its own line — NO bullets, NO dashes, NO numbering, NO line breaks within an idea, NO trailing punctuation other than "?".
- Three ideas total. Distinct angles — don't repeat the same theme.
- Examples: "Who else was in the room", "What you remember saying first", "The song that was playing", "Where you were standing", "What it smelled like", "What surprised you most".

Forbidden:
- No advice, no future-prediction, no presumed loss/regret/sadness.
- No therapist tone, no coachy "what did you learn".
- No weird body-state probes (hands, feet, breathing).
- Don't repeat the prompt itself.
- Return JSON only. No prose, no code fences.`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const promptText = typeof body.promptText === 'string' ? body.promptText.slice(0, 400) : ''
    // Optional avoid list — previously-shown ideas the client wants to
    // exclude on a "shuffle". Pass last 6 so the model doesn't loop.
    const avoidRaw: unknown = body.avoid
    const avoid: string[] = Array.isArray(avoidRaw)
      ? avoidRaw.filter((s: unknown): s is string => typeof s === 'string').slice(-6)
      : []

    const userMsg = `Prompt:\n${promptText || '(none)'}` + (
      avoid.length > 0
        ? `\n\nAlready shown (do not repeat or paraphrase):\n${avoid.map((a) => `- ${a}`).join('\n')}`
        : ''
    )

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 220,
      // Higher temperature on shuffle so we don't get the same trio.
      temperature: avoid.length > 0 ? 0.85 : 0.65,
      system: IDEAS_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const raw = textBlock?.type === 'text' ? textBlock.text : ''

    // Sanitize a single idea line — strip leading list markers, trailing
    // braces/quotes, cap length.
    const sanitize = (s: string): string => {
      let out = s.trim().replace(/^[-*•·\d.)\s"'`]+/, '').replace(/["'`{}]+$/, '').trim()
      if (out.length > 120) out = out.slice(0, 120).trimEnd()
      return out
    }

    let ideas: string[] = []
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed.ideas)) {
          ideas = parsed.ideas
            .filter((s: unknown): s is string => typeof s === 'string')
            .map(sanitize)
            .filter((s: string) => s.length >= 3)
        }
      }
    } catch (err) {
      console.error('[ideas] parse failed:', err)
    }

    // Fallback: pluck up to 3 reasonable lines from the raw text.
    if (ideas.length < 3 && raw) {
      const lines = raw
        .split('\n')
        .map(sanitize)
        .filter(
          (l) =>
            l.length >= 3 &&
            l.length < 160 &&
            !l.startsWith('{') &&
            !l.startsWith('}') &&
            !l.includes('"ideas"'),
        )
      for (const l of lines) {
        if (ideas.length >= 3) break
        if (!ideas.includes(l)) ideas.push(l)
      }
    }

    // Always return exactly 3 (pad with sensible generics if the model
    // misbehaved — better than rendering an empty popover).
    const generics = [
      'Who else was there',
      'Where you were standing',
      'What you remember saying',
      'The song or sound in the room',
      'What surprised you',
      'What made you laugh',
    ]
    while (ideas.length < 3) {
      const next = generics.find((g) => !ideas.includes(g))
      if (!next) break
      ideas.push(next)
    }
    ideas = ideas.slice(0, 3)

    return NextResponse.json({ ideas })
  } catch (err) {
    console.error('[ideas] error:', err)
    return NextResponse.json({ ideas: [] })
  }
}
