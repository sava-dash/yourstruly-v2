import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

const FOLLOWUP_SYSTEM = `You help someone explore a personal memory in more depth.

Given a memory prompt and what they've already shared, return 3 warm, specific follow-up questions that invite them to go deeper.

Return STRICT JSON with this exact shape:
{ "suggestions": [string, string, string] }

Rules:
- Each question is 8-16 words, conversational, not interrogative.
- Target sensory detail, emotional resonance, or specific people/moments.
- Don't ask for what they already said. Don't ask generic "how did you feel" unless no other angle exists.
- Return JSON only. No prose, no code fences.`

const STARTER_SYSTEM = `You help someone start answering a personal memory prompt by offering specific angles they could explore.

Given only the prompt (they haven't answered yet), return 3 short "ideas to speak about" that give them concrete starting points.

Return STRICT JSON with this exact shape:
{ "suggestions": [string, string, string] }

Rules:
- Each idea is 6-14 words, written as a gentle suggestion or angle (not a question). Example: "The first time you realized it mattered" or "A small detail only you would remember".
- Cover different angles: sensory detail, a specific person, a turning point, an emotion.
- Don't repeat the prompt. These are directions to explore WITHIN the prompt.
- Return JSON only. No prose, no code fences.`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const promptText = typeof body.promptText === 'string' ? body.promptText.slice(0, 400) : ''
    const transcript = typeof body.transcript === 'string' ? body.transcript.slice(0, 3000) : ''

    const isStarter = !transcript.trim()
    const userMsg = isStarter
      ? `Prompt:\n${promptText || '(none)'}`
      : `Prompt: ${promptText || '(none)'}\n\nWhat they shared:\n${transcript}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 220,
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
            .slice(0, 3)
        }
      }
    } catch (err) {
      console.error('[followups] parse failed:', err)
    }

    // Fallback: if parsing failed, split raw text into up to 3 lines
    if (suggestions.length === 0 && raw) {
      suggestions = raw
        .split('\n')
        .map((l) => l.replace(/^[-*\d.)\s"]+/, '').replace(/["]+$/, '').trim())
        .filter((l) => l.length > 10 && l.length < 200)
        .slice(0, 3)
    }

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[followups] error:', err)
    return NextResponse.json({ suggestions: [] })
  }
}
