import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendInvitation } from '@/lib/interviews/notify';
import { nanoid } from 'nanoid';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love';

// GET /api/cron/recurring-interviews
// Finds completed interview_sessions with cadence != 'once' whose
// last_response_at is older than the cadence interval. Clones each
// (same questions, recipient, sender_note, new token), sets
// parent_session_id, and dispatches a fresh invite.
//
// Auth: `Authorization: Bearer <CRON_SECRET>` only. Query-param secrets
// are rejected (they get logged by load balancers / access logs).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail loud rather than silently accepting unauthenticated cron hits.
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Idempotency guard: insert a (name, run_date) row. If it already exists,
  // another worker is handling today's run — exit early with 200 OK.
  const runDate = new Date().toISOString().slice(0, 10);
  const { data: lockRow, error: lockErr } = await admin
    .from('cron_runs')
    .insert({ name: 'recurring-interviews', run_date: runDate })
    .select('name')
    .maybeSingle();
  if (lockErr) {
    // Unique-violation means another worker already claimed today.
    const code = (lockErr as { code?: string }).code;
    if (code === '23505') {
      return NextResponse.json({ ok: true, skipped: 'already-ran-today' });
    }
    console.error('[recurring-cron] lock insert failed', lockErr);
    return NextResponse.json({ error: lockErr.message }, { status: 500 });
  }
  if (!lockRow) {
    return NextResponse.json({ ok: true, skipped: 'already-ran-today' });
  }

  const intervals: Record<string, number> = {
    monthly: 30,
    quarterly: 90,
    annual: 365,
  };

  const { data: candidates, error } = await admin
    .from('interview_sessions')
    .select('id, user_id, contact_id, invitee_name, phone_number, email_address, custom_questions, cadence, last_response_at, completed_at, sender_note, session_questions:session_questions(question_text)')
    .neq('cadence', 'once')
    .eq('status', 'completed')
    .limit(200);

  if (error) {
    console.error('[recurring-cron] query error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const due = (candidates || []).filter(c => {
    const days = intervals[c.cadence as string];
    if (!days) return false;
    const anchor = c.last_response_at || c.completed_at;
    if (!anchor) return false;
    const age = (now - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24);
    return age >= days;
  });

  let cloned = 0;
  const errors: string[] = [];

  for (const src of due) {
    try {
      // Skip if a child clone already exists and is still active
      const { data: existingChild } = await admin
        .from('interview_sessions')
        .select('id, status')
        .eq('parent_session_id', src.id)
        .in('status', ['pending', 'in_progress'])
        .limit(1);
      if (existingChild && existingChild.length > 0) continue;

      const accessToken = nanoid(32);
      const questions = Array.isArray(src.custom_questions) && src.custom_questions.length > 0
        ? src.custom_questions
        : (Array.isArray(src.session_questions)
            ? src.session_questions.map((q: { question_text: string }) => q.question_text).filter(Boolean)
            : null);

      const { data: newSession, error: insErr } = await admin
        .from('interview_sessions')
        .insert({
          user_id: src.user_id,
          contact_id: src.contact_id,
          access_token: accessToken,
          status: 'pending',
          invitee_name: src.invitee_name,
          phone_number: src.phone_number,
          email_address: src.email_address,
          custom_questions: questions,
          cadence: src.cadence,
          parent_session_id: src.id,
          sender_note: src.sender_note || null,
        })
        .select('id')
        .single();
      if (insErr || !newSession) {
        errors.push(`clone ${src.id}: ${insErr?.message || 'unknown'}`);
        continue;
      }

      const { data: senderProfile } = await admin
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', src.user_id)
        .single();
      const senderName = senderProfile?.display_name || senderProfile?.full_name || 'Someone';

      const link = `${APP_URL}/interview/${accessToken}`;
      const method: 'sms' | 'email' | 'auto' =
        src.phone_number && src.email_address ? 'auto'
          : src.phone_number ? 'sms' : 'email';

      await sendInvitation({
        method,
        recipient: {
          name: src.invitee_name || 'friend',
          phone: src.phone_number,
          email: src.email_address,
        },
        link,
        sender: { name: senderName, userId: src.user_id },
        customMessage: null,
        type: 'interview_recurring',
        targetId: newSession.id,
      });

      await admin
        .from('interview_sessions')
        .update({ invite_sent_at: new Date().toISOString() })
        .eq('id', newSession.id);

      cloned++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown';
      errors.push(`session ${src.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: true,
    examined: candidates?.length || 0,
    due: due.length,
    cloned,
    errors,
  });
}
