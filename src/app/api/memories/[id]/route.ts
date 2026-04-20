import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/memories/[id] - Get a single memory with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get memory with media
    const { data: memory, error } = await supabase
      .from('memories')
      .select(`
        *,
        media:memory_media(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    // Get tagged contacts
    const { data: tags } = await supabase
      .from('memory_contact_tags')
      .select('contact_id, contacts(id, full_name)')
      .eq('memory_id', id)

    const tagged_contacts = tags?.map(t => t.contacts).filter(Boolean) || []

    return NextResponse.json({ ...memory, tagged_contacts })
  } catch (err) {
    console.error('Error fetching memory:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/memories/[id] - Update a memory
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, date, location_name, category, mood, audio_url, video_url, is_favorite, exclude_from_avatar } = body

    // Build update object with only provided fields
    const updates: Record<string, any> = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (date !== undefined) updates.memory_date = date
    if (location_name !== undefined) updates.location_name = location_name
    if (category !== undefined) updates.category = category
    if (mood !== undefined) updates.mood = mood
    if (audio_url !== undefined) updates.audio_url = audio_url
    if (video_url !== undefined) updates.video_url = video_url
    if (is_favorite !== undefined) updates.is_favorite = is_favorite
    if (exclude_from_avatar !== undefined) updates.exclude_from_avatar = !!exclude_from_avatar

    const { data: memory, error } = await supabase
      .from('memories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating memory:', error)
      return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 })
    }

    return NextResponse.json(memory)
  } catch (err) {
    console.error('Error updating memory:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/memories/[id] - Delete a memory
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting memory:', error)
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting memory:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
