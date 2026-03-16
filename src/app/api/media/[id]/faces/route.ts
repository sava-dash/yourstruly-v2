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

    // Transform to frontend format
    const faces = (faceTags || []).map(tag => {
      // Supabase returns single relation as object (cast through unknown for type safety)
      const contact = tag.contacts as unknown as { id: string; full_name: string; avatar_url?: string } | null
      return {
        id: tag.id,
        boundingBox: {
          Left: Number(tag.box_left) || 0,
          Top: Number(tag.box_top) || 0,
          Width: Number(tag.box_width) || 0,
          Height: Number(tag.box_height) || 0,
        },
        confidence: tag.confidence,
        contact_id: tag.contact_id,
        contact_name: contact?.full_name || null,
        contact_avatar: contact?.avatar_url || null,
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

    const { contactId, x, y } = await request.json()

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
        box_left: Math.max(0, (x || 0.5) - 0.05),
        box_top: Math.max(0, (y || 0.5) - 0.05),
        box_width: 0.1,
        box_height: 0.1,
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
