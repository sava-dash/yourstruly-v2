import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { analyzeMood } from '@/lib/ai/moodAnalysis'
import { reverseGeocode } from '@/lib/geo/reverseGeocode'
import { extractAndPersistWithMetrics } from '@/lib/interviews/extract-entities'
import { generateEmbedding } from '@/lib/ai/providers'

// GET /api/memories - List memories
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const category = searchParams.get('category')
  const year = searchParams.get('year')

  let query = supabase
    .from('memories')
    .select(`
      *,
      memory_media (
        id,
        file_url,
        file_type,
        is_cover,
        ai_labels,
        width,
        height
      )
    `)
    .eq('user_id', user.id)
    .order('memory_date', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (category) {
    query = query.eq('ai_category', category)
  }

  if (year) {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    query = query.gte('memory_date', startDate).lte('memory_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ memories: data })
}

// POST /api/memories - Create memory
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    title,
    description,
    memory_date,
    memory_type = 'moment',
    location_name,
    location_lat,
    location_lng,
  } = body

  // Reverse geocode if we have coordinates but no location name
  let resolvedLocationName = location_name;
  if (!resolvedLocationName && location_lat && location_lng) {
    resolvedLocationName = await reverseGeocode(location_lat, location_lng);
  }

  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: user.id,
      title,
      description,
      memory_date,
      memory_type,
      location_name: resolvedLocationName,
      location_lat,
      location_lng,
    })
    .select()
    .single()

  if (error) {
    console.error('Memory creation error:', error)
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }

  // If attach_media_id is provided, link the existing photo to this memory
  if (body.attach_media_id) {
    const { error: attachError } = await supabase
      .from('memory_media')
      .update({ memory_id: data.id, is_cover: true })
      .eq('id', body.attach_media_id)
      .eq('user_id', user.id)
    
    if (attachError) {
      console.error('Failed to attach media to memory:', attachError)
    }
  }

  // Auto-analyze mood with AI (non-blocking)
  analyzeMoodInBackground(supabase, data.id, title, description, memory_type)

  // Auto-extract entities (people / places / times / topics) from the
  // memory text so the avatar's persona-synth and RAG pipelines see
  // them. Skipped for memories without meaningful description (extractor
  // also enforces a min length).
  if (typeof description === 'string' && description.length > 0) {
    extractAndPersistWithMetrics(createAdminClient(), {
      videoResponseId: null,
      memoryId: data.id,
      transcript: description,
      userId: user.id,
    })
  }

  // Auto-embed so the memory is immediately visible to the RAG search
  // RPC. Non-blocking — takes ~300ms via Gemini free tier and doesn't
  // affect the POST response.
  embedMemoryInBackground(createAdminClient(), data.id, data)

  return NextResponse.json({ memory: data })
}

/**
 * Build the embedding text for a memory and write it + the pgvector
 * embedding onto the row. Fire-and-forget — mirrors the shape of
 * buildEmbeddingText in /api/embeddings/route.ts so organic creates and
 * the bulk endpoint share the same embedding space.
 */
async function embedMemoryInBackground(
  admin: ReturnType<typeof createAdminClient>,
  memoryId: string,
  row: any
) {
  try {
    const parts = [
      `Memory: ${row.title || 'Untitled memory'}`,
      row.description,
      row.memory_date ? `Date: ${row.memory_date}` : '',
      row.location_name ? `Location: ${row.location_name}` : '',
      row.ai_category ? `Category: ${row.ai_category}` : '',
      row.ai_mood ? `Mood: ${row.ai_mood}` : '',
      row.ai_summary,
    ].filter(Boolean)
    const embeddingText = parts.join(' | ')
    if (embeddingText.length < 10) return

    const embedding = await generateEmbedding(embeddingText)
    await admin.from('memories')
      .update({ embedding, embedding_text: embeddingText })
      .eq('id', memoryId)
  } catch (err) {
    console.error('[memories] embed failed for', memoryId, err instanceof Error ? err.message : err)
  }
}

// Analyze mood in background (non-blocking)
async function analyzeMoodInBackground(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memoryId: string,
  title: string | null,
  description: string | null,
  memoryType: string | null
) {
  try {
    const analysis = await analyzeMood(
      title || '',
      description,
      memoryType,
      []
    )

    await supabase
      .from('memories')
      .update({
        mood: analysis.mood,
        mood_confidence: analysis.confidence,
        mood_override: false
      })
      .eq('id', memoryId)
  } catch (error) {
    console.error('Mood analysis failed for memory:', memoryId, error)
    // Non-critical, don't throw
  }
}
