import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('postscripts')
    .select(`
      *,
      recipient:contacts!recipient_contact_id(id, full_name, relationship_type, avatar_url),
      circle:circles!circle_id(id, name),
      attachments:postscript_attachments(id, file_url, file_type)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching postscripts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ postscripts: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    recipient_contact_id,
    circle_id,
    recipient_name,
    recipient_email,
    recipient_phone,
    title,
    message,
    video_url,
    audio_url,
    delivery_type = 'date',
    delivery_date,
    delivery_event,
    delivery_recurring = false,
    requires_confirmation = false,
    confirmation_contacts = [],
    has_gift = false,
    gift_type,
    gift_details,
    gift_budget,
    status = 'draft',
    attachments = [],
    memories = [],
    wisdom = [],
    skip_credit_check = false // For admin/system use
  } = body

  // Validate required fields
  if (!title || !recipient_name) {
    return NextResponse.json(
      { error: 'Title and recipient name are required' },
      { status: 400 }
    )
  }

  // Check and deduct postscript credit (unless it's a draft or system bypass)
  if (status !== 'draft' && !skip_credit_check) {
    // Check credit balance
    const { data: creditBalance, error: creditError } = await supabase
      .rpc('get_postscript_credits', { p_user_id: user.id })

    if (creditError) {
      console.error('Error checking credits:', creditError)
      // Continue without credit check if function doesn't exist
    } else if (creditBalance !== null && creditBalance <= 0) {
      return NextResponse.json(
        { error: 'No postscript credits remaining. Please purchase more credits or trade XP.' },
        { status: 402 } // Payment Required
      )
    }
  }

  // Generate a unique access token for recipient viewing
  const accessToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8)

  // Create postscript - ensure empty strings become null for date fields
  const { data: postscript, error } = await supabase
    .from('postscripts')
    .insert({
      user_id: user.id,
      access_token: accessToken,
      recipient_contact_id: recipient_contact_id || null,
      circle_id: circle_id || null,
      recipient_name,
      recipient_email: recipient_email || null,
      recipient_phone: recipient_phone || null,
      title,
      message: message || null,
      video_url: video_url || null,
      audio_url: audio_url || null,
      delivery_type,
      delivery_date: delivery_date || null,
      delivery_event: delivery_event || null,
      delivery_recurring,
      requires_confirmation,
      confirmation_contacts,
      has_gift,
      gift_type: gift_type || null,
      gift_details: gift_details || null,
      gift_budget: gift_budget || null,
      status
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating postscript:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Deduct credit for non-draft postscripts
  if (status !== 'draft' && !skip_credit_check) {
    const { error: deductError } = await supabase
      .rpc('use_postscript_credit', { 
        p_user_id: user.id, 
        p_postscript_id: postscript.id,
        p_description: `Created postscript: ${title}`
      })
    
    if (deductError) {
      console.error('Error deducting credit:', deductError)
      // Don't fail the request, credit tracking is non-critical
    }
  }

  // Add attachments if provided
  if (attachments.length > 0) {
    const attachmentRecords = attachments.map((att: any) => ({
      postscript_id: postscript.id,
      file_url: att.file_url,
      file_key: att.file_key,
      file_type: att.file_type,
      file_name: att.file_name,
      file_size: att.file_size
    }))

    const { error: attError } = await supabase
      .from('postscript_attachments')
      .insert(attachmentRecords)

    if (attError) {
      console.error('Error adding attachments:', attError)
    }
  }

  // Add memory attachments if provided
  if (memories.length > 0) {
    const memoryAttachmentRecords = memories.map((mem: any) => ({
      postscript_id: postscript.id,
      user_id: user.id,
      memory_id: mem.id,
      memory_title: mem.title,
      memory_date: mem.date,
      memory_image_url: mem.imageUrl
    }))

    const { error: memError } = await supabase
      .from('postscript_memory_attachments')
      .insert(memoryAttachmentRecords)

    if (memError) {
      console.error('Error adding memory attachments:', memError)
    }
  }

  // Add wisdom attachments if provided
  if (wisdom.length > 0) {
    const wisdomAttachmentRecords = wisdom.map((wis: any) => ({
      postscript_id: postscript.id,
      user_id: user.id,
      wisdom_id: wis.id,
      wisdom_title: wis.title,
      wisdom_category: wis.category
    }))

    const { error: wisError } = await supabase
      .from('postscript_wisdom_attachments')
      .insert(wisdomAttachmentRecords)

    if (wisError) {
      console.error('Error adding wisdom attachments:', wisError)
    }
  }

  return NextResponse.json({ postscript }, { status: 201 })
}
