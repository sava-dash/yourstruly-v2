import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/interviews/responses/[id]/edit-transcript  { transcript }
// Owner-only. Updates video_responses.transcript + transcript_edited_at,
// and if a linked memory row exists (metadata.video_response_id), updates
// its content to mirror the new transcript.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let transcript = '';
  try {
    const body = await req.json();
    transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (!transcript) return NextResponse.json({ error: 'Transcript required' }, { status: 400 });
  if (transcript.length > 50000) {
    return NextResponse.json({ error: 'Transcript too long' }, { status: 413 });
  }

  const { data: row, error: lookupErr } = await supabase
    .from('video_responses')
    .select('id, user_id')
    .eq('id', id)
    .single();
  if (lookupErr || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('video_responses')
    .update({ transcript, transcript_edited_at: now })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort: update linked memory row by metadata match.
  try {
    const admin = createAdminClient();
    const { data: memories } = await admin
      .from('memories')
      .select('id, metadata')
      .eq('user_id', user.id)
      .contains('metadata', { video_response_id: id });
    if (memories && memories.length > 0) {
      await admin
        .from('memories')
        .update({ content: transcript, updated_at: now })
        .in('id', memories.map((m: { id: string }) => m.id));
    }
  } catch {
    // non-blocking
  }

  return NextResponse.json({ ok: true, transcript_edited_at: now });
}
