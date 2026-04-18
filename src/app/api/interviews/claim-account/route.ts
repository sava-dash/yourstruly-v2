import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { findAuthUserIdByEmail } from '@/lib/admin/users';

// POST /api/interviews/claim-account
// Body: { token, email, fullName }
// Effect:
//   1. Verifies the interview session is completed.
//   2. Finds or creates a Supabase auth user for `email` (magic-link flow).
//   3. Ensures a profile row exists.
//   4. Copies every video_responses row for the session into memories under
//      the new user, tagged with memory_type='interview_received' +
//      source='gifted_interview'. Each question becomes the memory title,
//      each answer the content.
//   5. Returns { ok: true, userId } so the client can trigger a magic link.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token: string | undefined = body?.token;
    const email: string | undefined = body?.email?.trim?.().toLowerCase?.();
    const fullName: string | undefined = body?.fullName?.trim?.();

    if (!token || !email) {
      return NextResponse.json({ error: 'token and email required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: session, error: sessionError } = await admin
      .from('interview_sessions')
      .select('id, user_id, status, invitee_name, completed_at')
      .eq('access_token', token)
      .single();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }
    if (session.status !== 'completed' && !session.completed_at) {
      return NextResponse.json({ error: 'Interview not complete' }, { status: 400 });
    }

    // Find existing user by email or create via admin API.
    // NOTE: We avoid `admin.auth.admin.listUsers()` without pagination — it
    // silently caps at 1000 rows which fails duplicate-detection at scale.
    // `findAuthUserIdByEmail` queries the profiles table first (has email
    // column) and only paginates listUsers as a fallback.
    let userId: string | null = await findAuthUserIdByEmail(admin, email);

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: {
          full_name: fullName || session.invitee_name || null,
          source: 'gifted_interview',
        },
      });
      if (createErr || !created?.user) {
        return NextResponse.json({
          error: 'Could not create account',
          details: createErr?.message,
        }, { status: 500 });
      }
      userId = created.user.id;
    }

    // Ensure profile row
    try {
      await admin.from('profiles').upsert({
        id: userId,
        full_name: fullName || session.invitee_name || null,
      }, { onConflict: 'id' });
    } catch {
      // profile may not exist / may have different shape; non-blocking
    }

    // Copy responses into memories
    const { data: responses } = await admin
      .from('video_responses')
      .select('id, transcript, ai_summary, session_question_id')
      .eq('session_id', session.id);

    if (responses && responses.length > 0) {
      const qIds = responses
        .map(r => r.session_question_id)
        .filter((id): id is string => !!id);
      const questionMap = new Map<string, string>();
      if (qIds.length > 0) {
        const { data: qs } = await admin
          .from('session_questions')
          .select('id, question_text')
          .in('id', qIds);
        (qs || []).forEach((q: { id: string; question_text: string }) =>
          questionMap.set(q.id, q.question_text)
        );
      }

      const nowIso = new Date().toISOString();
      const rows = responses.map(r => ({
        user_id: userId,
        title: r.session_question_id
          ? (questionMap.get(r.session_question_id) || 'Interview answer')
          : 'Interview answer',
        content: r.transcript || r.ai_summary || '',
        memory_type: 'interview_received',
        source: 'gifted_interview',
        metadata: {
          video_response_id: r.id,
          gifted_from_session: session.id,
          claimed_at: nowIso,
        },
        created_at: nowIso,
      }));
      // Best-effort insert; schema mismatch just logs.
      const { error: memErr } = await admin.from('memories').insert(rows);
      if (memErr) console.warn('[claim-account] memory insert warning:', memErr.message);
    }

    // Mark the session as claimed so it stops showing up as claimable on
    // future signups and also capture the email we just used for matching.
    try {
      await admin
        .from('interview_sessions')
        .update({
          claimed_by_user_id: userId,
          interviewee_email: email,
        })
        .eq('id', session.id);
    } catch (markErr) {
      console.warn('[claim-account] mark-claimed warning:', markErr);
    }

    // Fire magic link (non-blocking success)
    let magicLinkSent = false;
    try {
      const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love'}/dashboard?welcome=from-interview`;
      const { error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      });
      magicLinkSent = !linkErr;
    } catch {
      // non-blocking
    }

    return NextResponse.json({ ok: true, userId, magicLinkSent });
  } catch (err) {
    console.error('[claim-account] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
