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
// Auth: CRON_SECRET as `?secret=` or `Authorization: Bearer`.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const provided = url.searchParams.get('secret')
    || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (secret && provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

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
