import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/media/[id]/faces - Get faces for a media item
export async function GET(
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

    // Get faces from memory_face_tags table
    const { data: faceTags, error } = await supabase
      .from('memory_face_tags')
      .select(`
        id,
        box_left,
        box_top,
        box_width,
        box_height,
        confidence,
        contact_id,
        contacts(id, full_name, avatar_url)
      `)
      .eq('media_id', mediaId)
      .order('confidence', { ascending: false })

    if (error) {
      console.error('Error fetching faces:', error)
      return NextResponse.json({ faces: [] })
    }

    // For untagged faces, search Rekognition collection for suggestions
    const untaggedFaces = (faceTags || []).filter(t => !t.contact_id)
    let suggestionsMap: Map<string, Array<{ contact: { id: string; full_name: string; avatar_url?: string }; confidence: number }>> = new Map()

    if (untaggedFaces.length > 0) {
      try {
        // Get the media URL to search
        const { data: media } = await supabase
          .from('memory_media')
          .select('file_url')
          .eq('id', mediaId)
          .single()

        if (media?.file_url) {
          const { searchFaces } = await import('@/lib/aws/rekognition')
          const imageRes = await fetch(media.file_url)
          if (imageRes.ok) {
            const buffer = Buffer.from(await imageRes.arrayBuffer())
            const matches = await searchFaces(buffer, user.id, 70)

            if (matches.length > 0) {
              const contactIds = matches.map(m => m.contactId).filter(Boolean)
              const { data: contactData } = await supabase
                .from('contacts')
                .select('id, full_name, avatar_url')
                .in('id', contactIds)

              const contactMap = new Map((contactData || []).map(c => [c.id, c]))

              // Assign suggestions to the largest untagged face
              let largestUntagged = untaggedFaces[0]
              let largestArea = 0
              for (const f of untaggedFaces) {
                const area = (Number(f.box_width) || 0) * (Number(f.box_height) || 0)
                if (area > largestArea) { largestArea = area; largestUntagged = f }
              }

              suggestionsMap.set(largestUntagged.id, matches.map(m => {
                const c = contactMap.get(m.contactId)
                return {
                  contact: {
                    id: m.contactId,
                    full_name: c?.full_name || 'Unknown',
                    avatar_url: c?.avatar_url,
                  },
                  confidence: m.similarity,
                }
              }))
            }
          }
        }
      } catch (searchErr) {
        // Non-blocking
        console.error('[faces] Rekognition search failed (non-blocking):', searchErr)
      }
    }

    // Transform to frontend format
    const faces = (faceTags || []).map(tag => {
      const contact = tag.contacts as unknown as { id: string; full_name: string; avatar_url?: string } | null
      return {
        id: tag.id,
        boundingBox: {
          x: Number(tag.box_left) || 0,
          y: Number(tag.box_top) || 0,
          width: Number(tag.box_width) || 0,
          height: Number(tag.box_height) || 0,
        },
        confidence: tag.confidence,
        tagged: !!tag.contact_id,
        contact: contact ? {
          id: contact.id,
          full_name: contact.full_name,
          avatar_url: contact.avatar_url,
        } : undefined,
        suggestions: suggestionsMap.get(tag.id) || [],
      }
    })

    return NextResponse.json({ faces })
  } catch (error) {
    console.error('Faces endpoint error:', error)
    return NextResponse.json({ faces: [] })
  }
}

// PATCH /api/media/[id]/faces - Tag a face with a contact
export async function PATCH(
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

    const body = await request.json()
    const { faceId, contactId, boundingBox, faceIndex } = body

    // If we have a faceId, update that specific face tag
    if (faceId) {
      const { error } = await supabase
        .from('memory_face_tags')
        .update({ contact_id: contactId })
        .eq('id', faceId)

      if (error) {
        console.error('Error tagging face:', error)
        return NextResponse.json({ error: 'Failed to tag face' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // If we have boundingBox but no faceId, create a new face tag
    if (boundingBox && contactId) {
      const { error } = await supabase
        .from('memory_face_tags')
        .insert({
          media_id: mediaId,
          user_id: user.id,
          contact_id: contactId,
          box_left: boundingBox.Left ?? boundingBox.left ?? 0,
          box_top: boundingBox.Top ?? boundingBox.top ?? 0,
          box_width: boundingBox.Width ?? boundingBox.width ?? 0,
          box_height: boundingBox.Height ?? boundingBox.height ?? 0,
          is_auto_detected: false,
        })

      if (error) {
        console.error('Error creating face tag:', error)
        return NextResponse.json({ error: 'Failed to create face tag' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // If we have faceIndex, find the face by index and update
    if (typeof faceIndex === 'number' && contactId) {
      const { data: faces } = await supabase
        .from('memory_face_tags')
        .select('id')
        .eq('media_id', mediaId)
        .order('confidence', { ascending: false })

      if (faces && faces[faceIndex]) {
        const { error } = await supabase
          .from('memory_face_tags')
          .update({ contact_id: contactId })
          .eq('id', faces[faceIndex].id)

        if (error) {
          console.error('Error tagging face by index:', error)
          return NextResponse.json({ error: 'Failed to tag face' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ error: 'Invalid request - need faceId, boundingBox, or faceIndex' }, { status: 400 })
  } catch (error) {
    console.error('Tag face error:', error)
    return NextResponse.json({ error: 'Failed to tag face' }, { status: 500 })
  }
}

// POST /api/media/[id]/faces - Create a manual face tag (click on photo)
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

    const body = await request.json()
    // Accept both camelCase (contactId) and snake_case (contact_id)
    const contactId = body.contactId || body.contact_id
    const boxLeft = body.box_left ?? (body.x != null ? Math.max(0, body.x - 0.05) : 0.45)
    const boxTop = body.box_top ?? (body.y != null ? Math.max(0, body.y - 0.05) : 0.45)
    const boxWidth = body.box_width ?? 0.1
    const boxHeight = body.box_height ?? 0.1

    if (!contactId) {
      return NextResponse.json({ error: 'contactId required' }, { status: 400 })
    }

    // Create a face tag at the clicked position (small default box)
    const { data: tag, error } = await supabase
      .from('memory_face_tags')
      .insert({
        media_id: mediaId,
        user_id: user.id,
        contact_id: contactId,
        box_left: boxLeft,
        box_top: boxTop,
        box_width: boxWidth,
        box_height: boxHeight,
        is_auto_detected: false,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating manual face tag:', error)
      return NextResponse.json({ error: 'Failed to create face tag' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: tag?.id })
  } catch (error) {
    console.error('Create face tag error:', error)
    return NextResponse.json({ error: 'Failed to create face tag' }, { status: 500 })
  }
}
