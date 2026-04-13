import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/postscripts/ai-draft
 *
 * Generate a heartfelt message draft based on the recipient, occasion,
 * and the user's memories. Helps users who freeze when writing something
 * this important.
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const recipientName = (body.recipientName || '').toString().slice(0, 100)
    const relationship = (body.relationship || '').toString().slice(0, 50)
    const occasion = (body.occasion || '').toString().slice(0, 50)
    const deliveryType = (body.deliveryType || 'date').toString()
    const tone = (body.tone || 'heartfelt').toString()
    const additionalContext = (body.context || '').toString().slice(0, 300)

    // Pull some of the user's memories for authentic detail
    let memoryContext = ''
    try {
      const { data: memories } = await supabase
        .from('memories')
        .select('title, description, ai_summary')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (memories && memories.length > 0) {
        const snippets = memories
          .map(m => m.ai_summary || m.title)
          .filter(Boolean)
          .slice(0, 3)
        if (snippets.length > 0) {
          memoryContext = `\n\nThe sender has shared these memories recently: ${snippets.join('; ')}`
        }
      }
    } catch {}

    // Pull sender's name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    const senderName = profile?.full_name || 'the sender'

    const occasionDesc = deliveryType === 'after_passing'
      ? 'to be delivered after the sender has passed away'
      : deliveryType === 'event'
        ? `for the recipient's ${occasion}`
        : `scheduled for future delivery`

    const toneGuides: Record<string, string> = {
      heartfelt: 'Warm, sincere, and emotionally resonant. Let love shine through every sentence.',
      funny: 'Light-hearted and warm with gentle humor. Make them smile through happy tears.',
      wise: 'Thoughtful and reflective. Share life lessons wrapped in love.',
      encouraging: 'Uplifting and empowering. Give them strength and confidence.',
    }
    const toneGuide = toneGuides[tone] || 'Warm and heartfelt.'

    const systemPrompt = `You write deeply personal messages for a legacy messaging app called YoursTruly.
These are messages people leave for their loved ones — sometimes for birthdays, sometimes for after they're gone.
This is the most meaningful thing this person will ever write. Treat it with that gravity.

Rules:
- Write 3-5 paragraphs, 150-250 words total
- First person, as if ${senderName} is speaking directly to ${recipientName}
- Reference specific, believable details that feel authentic
- No clichés, no generic platitudes
- No emojis, no markdown formatting
- End with something that will stay with the reader
- Tone: ${toneGuide}
- The message is ${occasionDesc}${relationship ? `. The recipient is the sender's ${relationship}` : ''}.`

    const userMessage = [
      `Write a PostScript message from ${senderName} to ${recipientName}.`,
      relationship ? `Relationship: ${relationship}` : null,
      occasion ? `Occasion: ${occasion}` : null,
      additionalContext ? `Additional context: ${additionalContext}` : null,
      memoryContext || null,
    ].filter(Boolean).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      temperature: 0.8,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    const draft = textBlock?.type === 'text' ? textBlock.text.trim() : ''

    if (!draft) {
      return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
    }

    // Also generate a title suggestion
    const titleResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 30,
      temperature: 0.7,
      system: 'Generate a short, evocative title (3-7 words) for this personal message. No quotes, no punctuation at the end. Examples: "To My Dearest Daughter", "For When You Need This Most", "A Letter About Us".',
      messages: [{ role: 'user', content: draft.slice(0, 200) }],
    })
    const titleBlock = titleResponse.content.find(b => b.type === 'text')
    const suggestedTitle = titleBlock?.type === 'text' ? titleBlock.text.trim().replace(/^["']|["']$/g, '') : ''

    return NextResponse.json({ draft, suggestedTitle })
  } catch (err) {
    console.error('[/api/postscripts/ai-draft] error:', err)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
