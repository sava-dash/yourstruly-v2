import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/interviews/responses/[id]/flag  { flagged?: boolean }
// Toggle flag (default on). Only the owner may flag.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let flagged = true;
  try {
    const body = await req.json();
    if (typeof body?.flagged === 'boolean') flagged = body.flagged;
  } catch { /* default on */ }

  const { data: row, error: lookupErr } = await supabase
    .from('video_responses')
    .select('id, user_id')
    .eq('id', id)
    .single();
  if (lookupErr || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const newValue = flagged ? new Date().toISOString() : null;
  const { error } = await supabase
    .from('video_responses')
    .update({ flagged_at: newValue })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, flagged_at: newValue });
}
