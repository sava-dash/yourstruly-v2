import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/engagement/reflect
 *
 * Given a just-saved memory's text + context, return a short, warm
 * 2-line reflection that makes the user feel heard. Used by the
 * celebration modal shown after Save & Finish.
 *
 * Uses Haiku (not Sonnet) for latency — this is on the user's critical
 * path right after they tap "Save & Finish" and needs to land in <1s.
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

const SYSTEM_PROMPT =
  'You write 2 short sentences (max 28 words total) for a memory-capture app. ' +
  'The user just saved a personal memory. Line 1: reflect back one specific thing they said, in their own spirit. ' +
  'Line 2: a small, genuine affirmation — never cheesy. ' +
  'Rules: second person, plain text, no emojis, no quotes, no questions, no markdown. Never start with "I".'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    // Tight input clamps — keep tokens low for latency.
    const memoryText = (body.memoryText || '').toString().slice(0, 600)
    const promptText = (body.promptText || '').toString().slice(0, 160)
    const contactName = (body.contactName || '').toString().slice(0, 60)
    const memoryId = (body.memoryId || '').toString() || null

    if (!memoryText.trim()) {
      return NextResponse.json({ reflection: defaultReflection() })
    }

    const userMessage = [
      promptText ? `Prompt: ${promptText}` : null,
      contactName ? `About: ${contactName}` : null,
      `Memory: ${memoryText}`,
    ]
      .filter(Boolean)
      .join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const reflection = textBlock?.type === 'text' ? textBlock.text.trim() : ''

    // Generate a richer AI summary for the slideshow (separate from the 2-line reflection).
    // Runs in parallel — doesn't block the response.
    if (memoryId && memoryText.trim()) {
      const summaryPrompt =
        'Write a warm, reflective 2-3 sentence summary of this personal memory. ' +
        'Weave together the key details and emotions into a flowing narrative. ' +
        'Write in first person as if the person is reminiscing. ' +
        'Be specific — reference actual details they shared. No emojis, no markdown.'
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        temperature: 0.6,
        system: summaryPrompt,
        messages: [{ role: 'user', content: [
          promptText ? `Topic: ${promptText}` : null,
          `What they shared: ${memoryText}`,
        ].filter(Boolean).join('\n') }],
      }).then(async (summaryRes) => {
        const summaryBlock = summaryRes.content.find((b) => b.type === 'text')
        const summary = summaryBlock?.type === 'text' ? summaryBlock.text.trim() : null
        if (summary) {
          await supabase.from('memories').update({ ai_summary: summary }).eq('id', memoryId)
        }
      }).catch((err) => {
        console.error('[reflect] ai_summary generation failed (non-blocking):', err)
      })
    }

    return NextResponse.json({
      reflection: reflection || defaultReflection(),
    })
  } catch (err) {
    console.error('[/api/engagement/reflect] error', err)
    return NextResponse.json({ reflection: defaultReflection() })
  }
}

function defaultReflection(): string {
  return "That's a piece of your story now, safely kept.\nThank you for taking the time to put it into words."
}
