import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Public endpoint for recipients to view a postscript by access token
 * Uses admin client to bypass RLS since recipients are unauthenticated
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  
  if (!token || token.length < 10) {
    return NextResponse.json(
      { error: 'Invalid access token' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Fetch postscript by access token
  const { data: postscript, error } = await supabase
    .from('postscripts')
    .select(`
      id,
      title,
      message,
      delivery_date,
      has_gift,
      gift_type,
      gift_details,
      video_url,
      status,
      opened_at,
      created_at,
      user_id,
      attachments:postscript_attachments(
        id,
        file_url,
        file_type,
        file_name
      )
    `)
    .eq('access_token', token)
    .single()

  if (error || !postscript) {
    console.log('[PostScript View] Token not found:', token.substring(0, 10) + '...', error?.message)
    return NextResponse.json(
      { error: 'This PostScript was not found or the link has expired.' },
      { status: 404 }
    )
  }

  // Allow viewing for all statuses — sender previews drafts, recipients see sent/opened

  // Resolve sender name from profiles table
  let senderName = 'Someone special'
  let senderAvatar: string | undefined
  if (postscript.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', postscript.user_id)
      .single()
    if (profile) {
      senderName = profile.full_name || senderName
      senderAvatar = profile.avatar_url || undefined
    }
  }

  return NextResponse.json({
    postscript: {
      id: postscript.id,
      title: postscript.title,
      message: postscript.message,
      delivery_date: postscript.delivery_date,
      has_gift: postscript.has_gift,
      gift_type: postscript.gift_type,
      gift_details: postscript.gift_details,
      video_url: postscript.video_url,
      status: postscript.status,
      opened_at: postscript.opened_at,
      sender_name: senderName,
      sender_avatar: senderAvatar,
      attachments: postscript.attachments || []
    }
  })
}

/**
 * Mark postscript as opened
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('postscripts')
    .update({ 
      status: 'opened',
      opened_at: new Date().toISOString()
    })
    .eq('access_token', token)
    .is('opened_at', null) // Only update if not already opened

  if (error) {
    console.error('[PostScript View] Error marking as opened:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
