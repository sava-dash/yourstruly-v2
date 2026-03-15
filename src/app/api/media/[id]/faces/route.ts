import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/media/[id]/faces - Get tagged faces for a media item
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

    // Get faces for this media item
    const { data: faces, error } = await supabase
      .from('media_faces')
      .select(`
        id,
        bounding_box,
        confidence,
        contact_id,
        contact:contacts(id, full_name, avatar_url)
      `)
      .eq('media_id', mediaId)
      .order('confidence', { ascending: false })

    if (error) {
      console.error('Error fetching faces:', error)
      return NextResponse.json({ faces: [] })
    }

    return NextResponse.json({ faces: faces || [] })
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

    const { faceId, contactId } = await request.json()

    if (!faceId || !contactId) {
      return NextResponse.json({ error: 'faceId and contactId required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('media_faces')
      .update({ contact_id: contactId })
      .eq('id', faceId)
      .eq('media_id', mediaId)

    if (error) {
      console.error('Error tagging face:', error)
      return NextResponse.json({ error: 'Failed to tag face' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tag face error:', error)
    return NextResponse.json({ error: 'Failed to tag face' }, { status: 500 })
  }
}
