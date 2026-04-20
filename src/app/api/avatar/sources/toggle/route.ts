import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/avatar/sources/toggle
 * Body: { type: 'memory' | 'video_response', id: string, exclude: boolean }
 *
 * Flips exclude_from_avatar on a single source row. Both types are
 * authorized via the same ownership check (the row's user_id must
 * match the calling user) — for video_responses that means the
 * INTERVIEWER (the YT account holder), which matches who can see &
 * chat with the loved-one avatar.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }

  const type: string = body?.type;
  const id: string = body?.id;
  const exclude: boolean = !!body?.exclude;

  if ((type !== 'memory' && type !== 'video_response') || !id) {
    return NextResponse.json({ error: 'type must be "memory" or "video_response"; id required' }, { status: 400 });
  }

  const table = type === 'memory' ? 'memories' : 'video_responses';
  const admin = createAdminClient();

  // Ownership check before write — admin client bypasses RLS, so we
  // verify with an explicit user_id match.
  const { data: existing } = await (admin.from(table) as any)
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { error: updErr } = await (admin.from(table) as any)
    .update({ exclude_from_avatar: exclude })
    .eq('id', id);
  if (updErr) {
    console.error('[avatar/sources/toggle] update err:', updErr);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, type, id, excluded: exclude });
}
