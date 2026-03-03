import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic to avoid build-time evaluation of canvas/face-api
export const dynamic = 'force-dynamic'

// Lazy import to avoid build-time issues with native modules
const getFaceDetection = () => import('@/lib/ai/faceDetection')

// Auto-tag threshold - 80% confidence to auto-match
const AUTO_TAG_THRESHOLD = 0.5 // face-api distance (lower = better match)

// Helper to parse embedding from Supabase (could be string or array)
function parseEmbedding(embedding: any): number[] | null {
  if (!embedding) return null
  if (Array.isArray(embedding)) return embedding
  if (typeof embedding === 'string') {
    try {
      const cleaned = embedding.replace(/^\[|\]$/g, '')
      const parsed = cleaned.split(',').map(Number)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

/**
 * POST /api/media/[id]/detect-faces - Run face detection on a photo
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: mediaId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get media record
  const { data: media, error: mediaError } = await supabase
    .from('memory_media')
    .select('id, file_url, file_type, user_id')
    .eq('id', mediaId)
    .eq('user_id', user.id)
    .single()

  if (mediaError || !media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }

  if (!media.file_type?.includes('image')) {
    return NextResponse.json({ error: 'Not an image' }, { status: 400 })
  }

  // Load face detection module and ensure models are ready
  const { detectFaces, ensureModels, matchFace } = await getFaceDetection()
  const modelsReady = await ensureModels()
  if (!modelsReady) {
    return NextResponse.json({ 
      error: 'Face detection models not available',
      hint: 'Run scripts/download-face-models.sh to download models'
    }, { status: 503 })
  }

  try {
    // Fetch the image
    const imageResponse = await fetch(media.file_url)
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Detect faces
    const faces = await detectFaces(imageBuffer)

    if (faces.length === 0) {
      return NextResponse.json({ 
        success: true, 
        faces: [],
        message: 'No faces detected in this image'
      })
    }

    // Get all known tagged faces for this user (for auto-matching)
    const { data: knownFaces } = await supabase
      .from('memory_face_tags')
      .select('face_embedding, contact_id')
      .eq('user_id', user.id)
      .eq('is_confirmed', true)
      .not('contact_id', 'is', null)

    // Build known faces map (contact_id -> best embedding)
    const knownFaceMap = new Map<string, number[]>()
    for (const kf of knownFaces || []) {
      const embedding = parseEmbedding(kf.face_embedding)
      if (kf.contact_id && embedding && !knownFaceMap.has(kf.contact_id)) {
        knownFaceMap.set(kf.contact_id, embedding)
      }
    }
    const knownForMatching = Array.from(knownFaceMap.entries()).map(([id, embedding]) => ({
      id,
      embedding,
    }))

    // Delete existing unconfirmed face tags for this media
    await supabase
      .from('memory_face_tags')
      .delete()
      .eq('media_id', mediaId)
      .eq('user_id', user.id)
      .eq('is_confirmed', false)

    // Process faces - auto-tag if high confidence match found
    const faceRecords = faces.map(face => {
      let contactId = null
      let isConfirmed = false

      // Try to auto-match against known faces
      if (knownForMatching.length > 0) {
        const match = matchFace(face.embedding, knownForMatching, AUTO_TAG_THRESHOLD)
        if (match) {
          contactId = match.contactId
          isConfirmed = true // Auto-confirmed high-confidence match
          console.log(`Auto-tagged face with contact ${contactId} (confidence: ${match.confidence}%)`)
        }
      }

      return {
        media_id: mediaId,
        user_id: user.id,
        box_left: face.boundingBox.x,
        box_top: face.boundingBox.y,
        box_width: face.boundingBox.width,
        box_height: face.boundingBox.height,
        confidence: face.confidence,
        face_embedding: JSON.stringify(face.embedding),
        age: face.age,
        gender: face.gender,
        expression: face.expressions ? Object.entries(face.expressions).sort((a, b) => b[1] - a[1])[0]?.[0] : null,
        contact_id: contactId,
        is_confirmed: isConfirmed,
        confirmed_at: isConfirmed ? new Date().toISOString() : null,
      }
    })

    const { data: insertedFaces, error: insertError } = await supabase
      .from('memory_face_tags')
      .insert(faceRecords)
      .select('id, contact_id, is_confirmed')

    if (insertError) {
      console.error('Failed to insert faces:', insertError)
      return NextResponse.json({ error: 'Failed to save detected faces' }, { status: 500 })
    }

    const autoTaggedCount = insertedFaces?.filter(f => f.is_confirmed).length || 0

    return NextResponse.json({
      success: true,
      facesDetected: faces.length,
      autoTagged: autoTaggedCount,
      faces: faces.map((f, i) => ({
        id: insertedFaces?.[i]?.id,
        boundingBox: f.boundingBox,
        confidence: f.confidence,
        age: f.age,
        gender: f.gender,
        autoTagged: insertedFaces?.[i]?.is_confirmed || false,
        contactId: insertedFaces?.[i]?.contact_id,
      })),
    })

  } catch (error) {
    console.error('Face detection error:', error)
    return NextResponse.json({ 
      error: 'Face detection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
