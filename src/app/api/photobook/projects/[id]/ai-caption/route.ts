import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/photobook/projects/[id]/ai-caption
 * Body: { mediaId: string }
 *
 * Reads EXIF (date/location) and face-tag info for the photo and returns
 * 3 short caption suggestions (≤60 chars each) for the user to pick from.
 * Tone: warm, plain, NOT cliched. Uses Haiku for speed + cost.
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

export async function POST(request: NextRequest, context: RouteContext) {
  await context.params // route id is contextual, not used in the model directly
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { mediaId?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const mediaId = (body.mediaId || '').toString()
  if (!mediaId) {
    return NextResponse.json({ error: 'mediaId required' }, { status: 400 })
  }

  // Load the media row + parent memory in one go (RLS gates ownership).
  const { data: media, error: mediaErr } = await supabase
    .from('memory_media')
    .select('id, memory_id, taken_at, exif_lat, exif_lng, file_type')
    .eq('id', mediaId)
    .single()

  if (mediaErr || !media) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  // Pull the parent memory for contextual title/description.
  let memoryTitle = ''
  let memoryDate = ''
  if (media.memory_id) {
    const { data: mem } = await supabase
      .from('memories')
      .select('title, memory_date')
      .eq('id', media.memory_id)
      .eq('user_id', user.id)
      .single()
    if (mem) {
      memoryTitle = mem.title || ''
      memoryDate = mem.memory_date || ''
    }
  }

  // Face tags: count + linked contact names where available.
  let peopleClause = 'no faces detected'
  try {
    const { data: faceTags } = await supabase
      .from('memory_face_tags')
      .select('face_id')
      .eq('media_id', mediaId)

    const faceIds = (faceTags || [])
      .map((t: { face_id: string | null }) => t.face_id)
      .filter((x): x is string => !!x)
    const count = (faceTags || []).length

    let names: string[] = []
    if (faceIds.length > 0) {
      const { data: faces } = await supabase
        .from('faces')
        .select('id, name')
        .in('id', faceIds)
        .eq('user_id', user.id)
      names = (faces || [])
        .map((f: { name: string | null }) => (f.name || '').trim())
        .filter(Boolean)
    }

    if (count > 0) {
      peopleClause = names.length > 0
        ? `${count} ${count === 1 ? 'person' : 'people'} (${names.slice(0, 4).join(', ')})`
        : `${count} ${count === 1 ? 'person' : 'people'}`
    }
  } catch {
    // Face data is optional context; don't fail the caption call.
  }

  const date = (media.taken_at || memoryDate || '').toString().slice(0, 10) || 'an unknown date'
  const location =
    media.exif_lat != null && media.exif_lng != null
      ? `near ${Number(media.exif_lat).toFixed(2)}, ${Number(media.exif_lng).toFixed(2)}`
      : 'an unknown place'

  const systemPrompt = `You write very short photo captions for a memory book aimed at adults 50+.
Rules:
- Return exactly 3 caption suggestions
- Each caption ≤60 characters
- Warm, plain English; NO clichés ("memories that last", "moments in time", etc.)
- No emojis, no quotes, no numbering
- One caption per line, nothing else
- Avoid repeating the photo metadata verbatim — make it feel human`

  const userMessage = [
    `Photo taken ${date}, ${location}, with ${peopleClause}.`,
    memoryTitle ? `Memory title: ${memoryTitle}` : null,
    'Suggest 3 captions.',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      temperature: 0.85,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const raw = textBlock?.type === 'text' ? textBlock.text : ''

    const suggestions = raw
      .split('\n')
      .map((s) => s.replace(/^[-*\d.\s"']+|["']+\s*$/g, '').trim())
      .filter((s) => s.length > 0)
      .slice(0, 3)
      .map((s) => (s.length > 60 ? s.slice(0, 60).trim() : s))

    if (suggestions.length === 0) {
      return NextResponse.json({ error: 'No suggestions generated' }, { status: 500 })
    }

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[/api/photobook/projects/[id]/ai-caption] error', err)
    return NextResponse.json({ error: 'Failed to generate caption' }, { status: 500 })
  }
}
