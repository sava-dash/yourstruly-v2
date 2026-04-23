import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectFaces, searchFaces } from '@/lib/aws/rekognition'
import { computeDisplayPosition } from '@/lib/photos/displayPosition'

// POST /api/media/[id]/detect-faces - Detect faces + search for matches in user's Rekognition collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the media item
    const { data: media, error: mediaError } = await supabase
      .from('memory_media')
      .select('id, file_url, file_type, ai_faces, ai_processed')
      .eq('id', mediaId)
      .single()

    if (mediaError || !media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    if (media.file_type !== 'image') {
      return NextResponse.json({ success: true, message: 'Not an image', faces: [] })
    }

    // If already processed, return existing faces with any matches
    if (media.ai_processed && media.ai_faces && Array.isArray(media.ai_faces) && media.ai_faces.length > 0) {
      const { data: existingTags } = await supabase
        .from('memory_face_tags')
        .select(`
          id,
          box_left,
          box_top,
          box_width,
          box_height,
          confidence,
          contact_id,
          rekognition_face_id,
          contacts(id, full_name, avatar_url)
        `)
        .eq('media_id', mediaId)
      
      const faces = (existingTags || []).map(tag => {
        const contact = tag.contacts as unknown as { id: string; full_name: string; avatar_url?: string } | null
        return {
          id: tag.id,
          boundingBox: {
            Left: Number(tag.box_left),
            Top: Number(tag.box_top),
            Width: Number(tag.box_width),
            Height: Number(tag.box_height),
          },
          confidence: tag.confidence,
          contact_id: tag.contact_id,
          contact_name: contact?.full_name || null,
        }
      })

      return NextResponse.json({ success: true, faces, cached: true })
    }

    // Fetch image
    const imageResponse = await fetch(media.file_url)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`)
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Step 1: Detect faces using Rekognition
    const detectedFaces = await detectFaces(imageBuffer)
    const validFaces = detectedFaces.filter(f => f.confidence > 80)

    // Save to ai_faces column
    const faceData = validFaces.map(face => ({
      left: face.boundingBox.x,
      top: face.boundingBox.y,
      width: face.boundingBox.width,
      height: face.boundingBox.height,
      confidence: face.confidence,
      age: face.age,
      gender: face.gender,
    }))

    const displayPosition = computeDisplayPosition(faceData)

    await supabase
      .from('memory_media')
      .update({
        ai_faces: faceData,
        ai_processed: true,
        display_position_x: displayPosition?.x ?? null,
        display_position_y: displayPosition?.y ?? null,
      })
      .eq('id', mediaId)

    // Step 2: Search for matches in user's Rekognition collection
    // We search with the full image — Rekognition will find the largest face
    // For multiple faces, we crop each face region and search individually
    let allMatches: Map<number, { contactId: string; similarity: number; contactName?: string; avatarUrl?: string }[]> = new Map()

    try {
      if (validFaces.length === 1) {
        // Single face — search with full image
        const matches = await searchFaces(imageBuffer, user.id, 70)
        if (matches.length > 0) {
          // Look up contact names
          const contactIds = matches.map(m => m.contactId).filter(Boolean)
          const { data: contactData } = await supabase
            .from('contacts')
            .select('id, full_name, avatar_url')
            .in('id', contactIds)

          const contactMap = new Map((contactData || []).map(c => [c.id, c]))
          
          allMatches.set(0, matches.map(m => ({
            contactId: m.contactId,
            similarity: m.similarity,
            contactName: contactMap.get(m.contactId)?.full_name,
            avatarUrl: contactMap.get(m.contactId)?.avatar_url,
          })))
        }
      } else if (validFaces.length > 1) {
        // Multiple faces — crop each and search
        // Note: We can use the full image for SearchFacesByImage since Rekognition
        // returns the largest face. For a more robust approach we'd crop, but
        // that requires image manipulation. Instead, search once for the biggest face
        // and for others we skip (they can be manually tagged).
        const matches = await searchFaces(imageBuffer, user.id, 70)
        if (matches.length > 0) {
          const contactIds = matches.map(m => m.contactId).filter(Boolean)
          const { data: contactData } = await supabase
            .from('contacts')
            .select('id, full_name, avatar_url')
            .in('id', contactIds)

          const contactMap = new Map((contactData || []).map(c => [c.id, c]))

          // Assign to the largest face (Rekognition searches the largest by default)
          let largestIdx = 0
          let largestArea = 0
          validFaces.forEach((f, i) => {
            const area = f.boundingBox.width * f.boundingBox.height
            if (area > largestArea) { largestArea = area; largestIdx = i }
          })

          allMatches.set(largestIdx, matches.map(m => ({
            contactId: m.contactId,
            similarity: m.similarity,
            contactName: contactMap.get(m.contactId)?.full_name,
            avatarUrl: contactMap.get(m.contactId)?.avatar_url,
          })))
        }
      }
    } catch (searchErr) {
      // Non-blocking — detection still succeeded even if search fails
      console.error('[detect-faces] Face search failed (non-blocking):', searchErr)
    }

    // Step 3: Insert face tags with suggestions
    const insertedFaces = []
    for (let i = 0; i < validFaces.length; i++) {
      const face = validFaces[i]
      const faceMatches = allMatches.get(i) || []

      // If we have a high-confidence match (>90%), auto-tag it
      const autoMatch = faceMatches.find(m => m.similarity >= 90)

      const { data: inserted, error: insertError } = await supabase
        .from('memory_face_tags')
        .insert({
          media_id: mediaId,
          user_id: user.id,
          box_left: face.boundingBox.x,
          box_top: face.boundingBox.y,
          box_width: face.boundingBox.width,
          box_height: face.boundingBox.height,
          confidence: face.confidence,
          is_auto_detected: true,
          // Auto-tag if high confidence match
          contact_id: autoMatch ? autoMatch.contactId : null,
          is_confirmed: !!autoMatch,
          confirmed_at: autoMatch ? new Date().toISOString() : null,
        })
        .select('id')
        .single()
      
      if (!insertError && inserted) {
        insertedFaces.push({
          id: inserted.id,
          boundingBox: {
            Left: face.boundingBox.x,
            Top: face.boundingBox.y,
            Width: face.boundingBox.width,
            Height: face.boundingBox.height,
          },
          confidence: face.confidence,
          age: face.age,
          gender: face.gender,
          contact_id: autoMatch?.contactId || null,
          contact_name: autoMatch?.contactName || null,
          suggestions: faceMatches.filter(m => !autoMatch || m.contactId !== autoMatch.contactId).map(m => ({
            contactId: m.contactId,
            contactName: m.contactName,
            avatarUrl: m.avatarUrl,
            similarity: m.similarity,
          })),
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      faces: insertedFaces,
      detected: validFaces.length,
      autoTagged: insertedFaces.filter(f => f.contact_id).length,
    })

  } catch (error: any) {
    console.error('Detect faces error:', error)
    return NextResponse.json({ 
      error: 'Face detection failed',
      message: error?.message || 'Unknown error',
      faces: [] 
    }, { status: 500 })
  }
}
