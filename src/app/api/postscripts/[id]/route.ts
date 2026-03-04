import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  console.log('[PostScript GET] Fetching postscript:', id)
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.log('[PostScript GET] Auth error:', authError?.message || 'No user')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  console.log('[PostScript GET] User ID:', user.id)

  // First check if postscript exists at all (for debugging)
  const { data: anyPostscript, error: checkError } = await supabase
    .from('postscripts')
    .select('id, user_id')
    .eq('id', id)
    .single()
  
  if (checkError) {
    console.log('[PostScript GET] Postscript lookup failed:', checkError.code, checkError.message)
    // Check if UUID is valid format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      console.log('[PostScript GET] Invalid UUID format:', id)
      return NextResponse.json({ error: 'Invalid PostScript ID format' }, { status: 400 })
    }
  } else if (anyPostscript && anyPostscript.user_id !== user.id) {
    console.log('[PostScript GET] Postscript exists but belongs to different user')
    return NextResponse.json({ error: 'PostScript not found' }, { status: 404 })
  }

  const { data: postscript, error } = await supabase
    .from('postscripts')
    .select(`
      *,
      recipient:contacts!recipient_contact_id(id, full_name, relationship_type, avatar_url),
      attachments:postscript_attachments(*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('[PostScript GET] No postscript found for id:', id, 'user:', user.id)
      return NextResponse.json({ error: 'PostScript not found' }, { status: 404 })
    }
    console.error('[PostScript GET] Database error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[PostScript GET] Found postscript:', postscript.id, postscript.title)
  return NextResponse.json({ postscript })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('postscripts')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'PostScript not found' }, { status: 404 })
  }

  const body = await request.json()
  const {
    recipient_contact_id,
    recipient_name,
    recipient_email,
    recipient_phone,
    title,
    message,
    video_url,
    delivery_type,
    delivery_date,
    delivery_event,
    delivery_recurring,
    requires_confirmation,
    confirmation_contacts,
    has_gift,
    gift_type,
    gift_details,
    gift_budget,
    status,
    attachments,
    memories,
    wisdom
  } = body

  // Update postscript
  const updateData: Record<string, any> = {}
  if (recipient_contact_id !== undefined) updateData.recipient_contact_id = recipient_contact_id
  if (recipient_name !== undefined) updateData.recipient_name = recipient_name
  if (recipient_email !== undefined) updateData.recipient_email = recipient_email
  if (recipient_phone !== undefined) updateData.recipient_phone = recipient_phone
  if (title !== undefined) updateData.title = title
  if (message !== undefined) updateData.message = message
  if (video_url !== undefined) updateData.video_url = video_url
  if (delivery_type !== undefined) updateData.delivery_type = delivery_type
  if (delivery_date !== undefined) updateData.delivery_date = delivery_date
  if (delivery_event !== undefined) updateData.delivery_event = delivery_event
  if (delivery_recurring !== undefined) updateData.delivery_recurring = delivery_recurring
  if (requires_confirmation !== undefined) updateData.requires_confirmation = requires_confirmation
  if (confirmation_contacts !== undefined) updateData.confirmation_contacts = confirmation_contacts
  if (has_gift !== undefined) updateData.has_gift = has_gift
  if (gift_type !== undefined) updateData.gift_type = gift_type
  if (gift_details !== undefined) updateData.gift_details = gift_details
  if (gift_budget !== undefined) updateData.gift_budget = gift_budget
  if (status !== undefined) updateData.status = status

  const { data: postscript, error } = await supabase
    .from('postscripts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating postscript:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Handle attachments if provided
  if (attachments !== undefined) {
    // Delete existing attachments
    await supabase
      .from('postscript_attachments')
      .delete()
      .eq('postscript_id', id)

    // Add new attachments
    if (attachments.length > 0) {
      const attachmentRecords = attachments.map((att: any) => ({
        postscript_id: id,
        file_url: att.file_url,
        file_key: att.file_key,
        file_type: att.file_type,
        file_name: att.file_name,
        file_size: att.file_size
      }))

      await supabase
        .from('postscript_attachments')
        .insert(attachmentRecords)
    }
  }

  // Handle memory attachments if provided
  if (memories !== undefined) {
    // Delete existing memory attachments
    await supabase
      .from('postscript_memory_attachments')
      .delete()
      .eq('postscript_id', id)

    // Add new memory attachments
    if (memories.length > 0) {
      const memoryRecords = memories.map((mem: any) => ({
        postscript_id: id,
        user_id: user.id,
        memory_id: mem.id,
        memory_title: mem.title,
        memory_date: mem.date,
        memory_image_url: mem.imageUrl
      }))

      await supabase
        .from('postscript_memory_attachments')
        .insert(memoryRecords)
    }
  }

  // Handle wisdom attachments if provided
  if (wisdom !== undefined) {
    // Delete existing wisdom attachments
    await supabase
      .from('postscript_wisdom_attachments')
      .delete()
      .eq('postscript_id', id)

    // Add new wisdom attachments
    if (wisdom.length > 0) {
      const wisdomRecords = wisdom.map((wis: any) => ({
        postscript_id: id,
        user_id: user.id,
        wisdom_id: wis.id,
        wisdom_title: wis.title,
        wisdom_category: wis.category
      }))

      await supabase
        .from('postscript_wisdom_attachments')
        .insert(wisdomRecords)
    }
  }

  return NextResponse.json({ postscript })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delete postscript (attachments cascade)
  const { error } = await supabase
    .from('postscripts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting postscript:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
