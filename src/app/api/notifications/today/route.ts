/**
 * GET  /api/notifications/today — returns today's notifications for the
 *   signed-in user, plus the latest unread (any time) so the dashboard
 *   banner has something to show even after midnight.
 *
 * POST /api/notifications/today — body: { id: string, action: 'read' }
 *   marks a single notification read.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTodaysNotifications, markNotificationRead } from '@/lib/notifications';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = await getTodaysNotifications(supabase, user.id);

  const { data: latestUnreadRows } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  const latestUnread = latestUnreadRows && latestUnreadRows.length > 0 ? latestUnreadRows[0] : null;
  // Priority hint so UI surfaces (e.g. MemoryOfTheDayBanner) can defensively
  // render only for the notification type they're designed for.
  type Priority = 'memory-of-the-day' | 'weekly-story' | 'other' | null;
  let priority: Priority = null;
  if (latestUnread) {
    const t = (latestUnread as { type?: string }).type;
    priority = t === 'memory-of-the-day' || t === 'weekly-story' ? t : 'other';
  }

  return NextResponse.json({ today, latestUnread, priority });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? '');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  const ok = await markNotificationRead(supabase, user.id, id);
  return NextResponse.json({ ok });
}
