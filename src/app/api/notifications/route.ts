import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'

// GET /api/notifications - List user's notifications
export const GET = withAuth(async (request, { user, supabase }) => {
  const searchParams = request.nextUrl.searchParams
  const unreadOnly = searchParams.get('unread') === 'true'
  const limit = parseInt(searchParams.get('limit') || '20')

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data: notifications, error } = await query

  if (error) {
    console.error('List notifications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null)

  return NextResponse.json({
    notifications,
    unread_count: unreadCount || 0
  })
})

// PATCH /api/notifications - Mark notifications as read
export const PATCH = withAuth(async (request, { user, supabase }) => {
  const body = await request.json()
  const { notification_ids, mark_all_read } = body

  if (mark_all_read) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (notification_ids && Array.isArray(notification_ids)) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .in('id', notification_ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Must provide notification_ids or mark_all_read' }, { status: 400 })
})
