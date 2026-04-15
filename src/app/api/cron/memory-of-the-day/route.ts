/**
 * Cron: Memory of the Day (F2)
 *
 * Schedule: daily 9:00 ET. For each user, finds the oldest memory whose
 * month/day matches today (in any prior year) and writes a `memory-of-the-day`
 * notification row. Push delivery is intentionally NOT implemented yet
 * (no web-push infrastructure detected); the dashboard banner reads the row
 * directly via /api/notifications/today.
 *
 * Auth: Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification, hasNotificationForToday } from '@/lib/notifications';

interface UserRow { id: string }
interface MemoryRow {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  photo_url: string | null;
  created_at: string;
  event_date: string | null;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const startedAt = Date.now();

  // Shared cron_runs idempotency guard — bail on the duplicate insert.
  const runDate = new Date().toISOString().slice(0, 10);
  const { error: lockErr } = await supabase
    .from('cron_runs')
    .insert({ name: 'memory-of-the-day', run_date: runDate });
  if (lockErr) {
    const code = (lockErr as { code?: string }).code;
    if (code === '23505') {
      return NextResponse.json({ ok: true, skipped: 'already-ran-today' });
    }
    console.error('[memory-of-the-day] lock insert failed', lockErr);
    return NextResponse.json({ error: lockErr.message }, { status: 500 });
  }

  // Uses UTC midnight boundaries. User's local "today" may differ by up to
  // 24h; acceptable for a daily digest.
  const today = new Date();
  const todayMonth = today.getUTCMonth() + 1;
  const todayDay = today.getUTCDate();
  const thisYear = today.getUTCFullYear();

  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1000);
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const created: string[] = [];
  const skipped: string[] = [];

  for (const u of (users ?? []) as UserRow[]) {
    try {
      if (await hasNotificationForToday(supabase, u.id, 'memory-of-the-day')) {
        skipped.push(u.id);
        continue;
      }

      // Pull recent-ish memories (cap to keep it cheap) and filter in JS.
      const { data: memories } = await supabase
        .from('memories')
        .select('id, user_id, title, content, photo_url, created_at, event_date')
        .eq('user_id', u.id)
        .order('created_at', { ascending: true })
        .limit(500);

      const matches = ((memories ?? []) as MemoryRow[]).filter((m) => {
        const ref = m.event_date || m.created_at;
        if (!ref) return false;
        const d = new Date(ref);
        return (
          d.getUTCMonth() + 1 === todayMonth &&
          d.getUTCDate() === todayDay &&
          d.getUTCFullYear() < thisYear
        );
      });
      if (matches.length === 0) {
        skipped.push(u.id);
        continue;
      }
      const oldest = matches[0];
      const yearsAgo =
        thisYear - new Date(oldest.event_date || oldest.created_at).getUTCFullYear();

      await createNotification(supabase, {
        userId: u.id,
        type: 'memory-of-the-day',
        payload: {
          memoryId: oldest.id,
          yearsAgo,
          title: oldest.title || 'A memory',
          excerpt: (oldest.content || '').slice(0, 180),
          thumbnailUrl: oldest.photo_url,
        },
      });
      created.push(u.id);
    } catch (err) {
      console.error('[memory-of-the-day] user failed', u.id, err);
    }
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    counts: { created: created.length, skipped: skipped.length },
  });
}
