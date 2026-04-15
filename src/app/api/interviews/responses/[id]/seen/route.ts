import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/interviews/responses/[id]/seen — marks a response seen.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row, error: lookupErr } = await supabase
    .from('video_responses')
    .select('id, user_id, seen_at')
    .eq('id', id)
    .single();
  if (lookupErr || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (row.seen_at) {
    return NextResponse.json({ ok: true, seen_at: row.seen_at });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('video_responses')
    .update({ seen_at: now })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, seen_at: now });
}
