import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateChatResponse, checkProviderConfig } from '@/lib/ai/providers'

const EXTRACTION_PROMPT = `You are an entity extractor for a memory/legacy app. Given a user's spoken text about a memory or life event, extract structured entities.

Return ONLY valid JSON with this schema:
{
  "title": "A short, meaningful title for this memory (max 60 chars)",
  "entities": [
    { "type": "location", "value": "the place name" },
    { "type": "date", "value": "the date or time period" },
    { "type": "person", "value": "person's name" },
    { "type": "mood", "value": "the emotional tone" },
    { "type": "topic", "value": "the theme or activity" }
  ]
}

Rules:
- Extract ALL entities mentioned, even implicit ones
- For dates, normalize to readable form ("Summer 2019", "March 2020", "Last Christmas")
- For locations, use the most specific name mentioned
- For people, extract each person separately
- For mood, infer from tone (joyful, nostalgic, bittersweet, peaceful, exciting, etc.)
- For topic, identify the core theme (vacation, family dinner, birthday, graduation, etc.)
- Title should be evocative, not just descriptive ("Summer at the Lake" not "Trip description")
- Return empty entities array if nothing can be extracted
- ONLY return JSON, no other text`

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text } = await request.json()
  if (!text) {
    return NextResponse.json({ error: 'Text required' }, { status: 400 })
  }

  const config = checkProviderConfig()
  if (!config.chat) {
    // Fallback: basic extraction without AI
    return NextResponse.json({
      title: text.slice(0, 60),
      entities: [],
    })
  }

  try {
    const response = await generateChatResponse(text, {
      systemPrompt: EXTRACTION_PROMPT,
      maxTokens: 500,
      temperature: 0.3,
    })

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return NextResponse.json(parsed)
    }

    return NextResponse.json({
      title: text.slice(0, 60),
      entities: [],
    })
  } catch (err) {
    console.error('Extraction error:', err)
    return NextResponse.json({
      title: text.slice(0, 60),
      entities: [],
    })
  }
}
