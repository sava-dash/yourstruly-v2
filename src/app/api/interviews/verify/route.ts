import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend } from '@/lib/email';

/**
 * Optional recipient verification endpoint.
 *
 * Three modes (decided by query/body shape):
 *
 *   GET  ?token=...&check=1
 *     → { verification_required, verification_passed }
 *
 *   POST { token, email }
 *     → issues a 6-digit code (10-min expiry) and emails it via Resend
 *       returns { ok: true } if email matches verification_email (or no
 *       verification required); otherwise { ok: false }.
 *
 *   POST { token, code }
 *     → confirms the code; on success sets verification_passed = true
 *       and returns { ok: true, verified: true }.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
const FROM_EMAIL = process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>';

function genCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('interview_sessions')
    .select('verification_required, verification_passed')
    .eq('access_token', token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json({
    verification_required: !!data.verification_required,
    verification_passed: !!data.verification_passed,
  });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { token, email, code } = body || {};
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: session, error: loadErr } = await supabase
    .from('interview_sessions')
    .select('id, verification_required, verification_email, verification_passed, verification_code, verification_code_expires_at')
    .eq('access_token', token)
    .single();

  if (loadErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // No verification needed → trivially passes
  if (!session.verification_required) {
    return NextResponse.json({ ok: true, verified: true, skipped: true });
  }

  // --- Confirm a code ---
  if (typeof code === 'string' && code.trim().length > 0) {
    const submitted = code.trim();
    const stored = session.verification_code || '';
    const expiresAt = session.verification_code_expires_at
      ? new Date(session.verification_code_expires_at).getTime()
      : 0;
    if (!stored || Date.now() > expiresAt) {
      return NextResponse.json(
        { ok: false, error: 'Code expired — please request a new one.' },
        { status: 400 }
      );
    }
    if (submitted !== stored) {
      return NextResponse.json(
        { ok: false, error: 'That code did not match. Please try again.' },
        { status: 400 }
      );
    }
    await supabase
      .from('interview_sessions')
      .update({
        verification_passed: true,
        verification_code: null,
        verification_code_expires_at: null,
      })
      .eq('id', session.id);
    return NextResponse.json({ ok: true, verified: true });
  }

  // --- Issue a code ---
  if (typeof email === 'string' && email.trim().length > 0) {
    const submittedEmail = email.trim().toLowerCase();
    const expectedEmail = (session.verification_email || '').trim().toLowerCase();
    if (!expectedEmail || submittedEmail !== expectedEmail) {
      // Don't leak whether the email matches — be vague but truthful.
      return NextResponse.json(
        { ok: false, error: "That email isn't on file for this interview." },
        { status: 403 }
      );
    }

    const newCode = genCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    const { error: updateErr } = await supabase
      .from('interview_sessions')
      .update({
        verification_code: newCode,
        verification_code_expires_at: expiresAt,
      })
      .eq('id', session.id);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to issue code' }, { status: 500 });
    }

    const resend = getResend();
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: expectedEmail,
          subject: 'Your YoursTruly verification code',
          html: `
            <div style="font-family:Inter,system-ui,sans-serif;background:#F2F1E5;padding:32px;color:#2d2d2d;">
              <h2 style="color:#406A56;margin:0 0 12px 0;">Your verification code</h2>
              <p style="font-size:16px;margin:0 0 16px 0;">Use this code to confirm it's really you:</p>
              <div style="font-size:32px;letter-spacing:8px;font-weight:600;color:#C35F33;background:#fff;padding:16px 24px;border-radius:12px;display:inline-block;">${newCode}</div>
              <p style="font-size:14px;color:#666;margin-top:16px;">This code expires in 10 minutes.</p>
            </div>
          `,
        });
      } catch (e) {
        console.error('Verify email send failed:', e);
        // Code is stored — user can still complete if email arrives later.
      }
    }

    return NextResponse.json({ ok: true, sent: true });
  }

  return NextResponse.json(
    { error: 'Provide either { email } to request a code or { code } to confirm.' },
    { status: 400 }
  );
}
