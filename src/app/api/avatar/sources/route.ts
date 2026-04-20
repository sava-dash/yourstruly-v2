import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Avatar source management.
 *
 *   GET  /api/avatar/sources              → recent self-avatar source memories (incl/excl)
 *   GET  /api/avatar/sources?contactId=X  → recent loved-one avatar source video_responses
 *
 *   POST /api/avatar/sources/toggle is in ./toggle/route.ts and flips one row
 *
 * Returns id + display title + body preview + exclude_from_avatar so the
 * "What your avatar knows" panel can render a manage-list. Only rows the
 * caller could plausibly want to exclude — meaningful body length, not
 * already wiped — show up here.
 */

const PREVIEW_LEN = 160;
const DEFAULT_LIMIT = 30;

async function verifyContactOwnership(
  admin: ReturnType<typeof createAdminClient>,
  ownerUserId: string,
  contactId: string
) {
  const { data } = await (admin.from('contacts') as any)
    .select('id')
    .eq('id', contactId)
    .eq('user_id', ownerUserId)
    .maybeSingle();
  return !!data;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();
  const url = new URL(request.url);
  const contactId = url.searchParams.get('contactId');
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT));

  // Loved-one avatar: list the contact's video_responses (with ownership check).
  if (contactId) {
    if (!(await verifyContactOwnership(admin, user.id, contactId))) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    const { data: rows, error } = await (admin.from('video_responses') as any)
      .select('id, transcript, exclude_from_avatar, session_question_id, created_at')
      .eq('contact_id', contactId)
      .eq('user_id', user.id)
      .not('transcript', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('[avatar/sources] video_responses err:', error);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }
    // Resolve question text in one extra round trip so the panel has labels.
    const qIds = (rows || []).map((r: any) => r.session_question_id).filter(Boolean);
    const qMap = new Map<string, string>();
    if (qIds.length > 0) {
      const { data: qs } = await (admin.from('session_questions') as any)
        .select('id, question_text')
        .in('id', qIds);
      for (const q of qs || []) qMap.set(q.id as string, q.question_text as string);
    }
    return NextResponse.json({
      kind: 'video_responses',
      contactId,
      sources: (rows || []).map((r: any) => ({
        type: 'video_response',
        id: r.id,
        title: r.session_question_id
          ? (qMap.get(r.session_question_id) || 'Interview answer')
          : 'Interview answer',
        preview: (r.transcript || '').slice(0, PREVIEW_LEN),
        excluded: !!r.exclude_from_avatar,
        createdAt: r.created_at,
      })),
    });
  }

  // Self avatar: list memories. Skip empty bodies + interview-typed rows
  // (those never feed the self avatar regardless of the toggle).
  const { data: rows, error } = await (admin.from('memories') as any)
    .select('id, title, description, ai_summary, embedding_text, exclude_from_avatar, memory_type, created_at')
    .eq('user_id', user.id)
    .not('memory_type', 'in', '(interview,interview_received,interview_response)')
    .order('created_at', { ascending: false })
    .limit(limit * 2);
  if (error) {
    console.error('[avatar/sources] memories err:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  const filtered = (rows || [])
    .map((r: any) => ({
      ...r,
      _body: (r.description || r.ai_summary || r.embedding_text || '').toString(),
    }))
    .filter((r: any) => r._body.length >= 40)
    .slice(0, limit);

  return NextResponse.json({
    kind: 'memories',
    contactId: null,
    sources: filtered.map((r: any) => ({
      type: 'memory',
      id: r.id,
      title: r.title || '(Untitled)',
      preview: r._body.slice(0, PREVIEW_LEN),
      excluded: !!r.exclude_from_avatar,
      createdAt: r.created_at,
    })),
  });
}
