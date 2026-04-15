/**
 * F5: Resilient interview invite — SMS retry x2 (1s backoff) + email fallback.
 * Every attempt logged to notification_log for the sender's delivery trail.
 */
import { sendSMS, SMS_TEMPLATES } from '@/lib/telnyx';
import { getResend } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/admin';

export type NotifyMethod = 'sms' | 'email' | 'auto';
export interface SendInvitationArgs {
  method: NotifyMethod;
  recipient: { name: string; phone?: string | null; email?: string | null };
  link: string;
  sender: { name: string; userId?: string | null };
  customMessage?: string | null;
  type?: string;
  targetId?: string | null;
}
type Status = 'sent' | 'failed' | 'fallback';
export interface SendInvitationResult {
  delivered: boolean;
  channel: 'sms' | 'email' | null;
  attempts: Array<{ channel: 'sms' | 'email'; status: Status; error?: string }>;
}

const FROM = process.env.EMAIL_FROM || 'YoursTruly <hello@yourstruly.love>';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function logAttempt(o: {
  userId?: string | null; type: string; channel: 'sms' | 'email';
  targetId?: string | null; targetAddress?: string | null;
  status: Status; errorMessage?: string | null; attemptNumber: number;
}) {
  try {
    await createAdminClient().from('notification_log').insert({
      user_id: o.userId || null, type: o.type, channel: o.channel,
      target_id: o.targetId || null, target_address: o.targetAddress || null,
      status: o.status, error_message: o.errorMessage || null,
      attempt_number: o.attemptNumber,
    });
  } catch { /* logging best-effort */ }
}

async function tryEmail(to: string, subject: string, html: string) {
  try {
    const resend = getResend();
    if (!resend) return { ok: false, error: 'Email service not configured' };
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Email failed' }; }
}

function buildHtml(senderName: string, message: string, link: string) {
  return `<div style="font-family:Georgia,serif;max-width:580px;margin:0 auto;padding:40px 20px;color:#2d2d2d;">
    <h2 style="font-size:22px;margin-bottom:12px;">${senderName} asked you a question</h2>
    <p style="font-size:16px;color:#555;line-height:1.6;margin-bottom:32px;">${message}</p>
    <div style="text-align:center;margin:32px 0;"><a href="${link}" style="background:#406A56;color:#fff;padding:14px 32px;text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;display:inline-block;">Answer the Question</a></div>
    <p style="color:#999;font-size:13px;text-align:center;">Or copy: <a href="${link}" style="color:#406A56;">${link}</a></p></div>`;
}

export async function sendInvitation(a: SendInvitationArgs): Promise<SendInvitationResult> {
  const { method, recipient, link, sender, customMessage, type = 'interview_invite', targetId } = a;
  const attempts: SendInvitationResult['attempts'] = [];
  const smsBody = customMessage ? `${customMessage}\n\n${link}` : SMS_TEMPLATES.interviewInvite(sender.name, link);
  const emailMsg = customMessage || `${sender.name} would love to hear your answer. It only takes a few minutes.`;
  const html = buildHtml(sender.name, emailMsg, link);
  const subject = `${sender.name} asked you a question on YoursTruly`;
  const baseLog = { userId: sender.userId, type, targetId };

  if ((method === 'sms' || method === 'auto') && recipient.phone) {
    for (let n = 1; n <= 2; n++) {
      const r = await sendSMS(recipient.phone, smsBody);
      const status: Status = r.success ? 'sent' : 'failed';
      attempts.push({ channel: 'sms', status, error: r.error });
      await logAttempt({ ...baseLog, channel: 'sms', targetAddress: recipient.phone, status, errorMessage: r.error, attemptNumber: n });
      if (r.success) return { delivered: true, channel: 'sms', attempts };
      if (n < 2) await sleep(1000);
    }
    if (recipient.email) {
      const r = await tryEmail(recipient.email, subject, html);
      const status: Status = r.ok ? 'fallback' : 'failed';
      attempts.push({ channel: 'email', status, error: r.error });
      await logAttempt({ ...baseLog, channel: 'email', targetAddress: recipient.email, status, errorMessage: r.error, attemptNumber: 1 });
      if (r.ok) return { delivered: true, channel: 'email', attempts };
    }
    return { delivered: false, channel: null, attempts };
  }

  if ((method === 'email' || method === 'auto') && recipient.email) {
    const r = await tryEmail(recipient.email, subject, html);
    const status: Status = r.ok ? 'sent' : 'failed';
    attempts.push({ channel: 'email', status, error: r.error });
    await logAttempt({ ...baseLog, channel: 'email', targetAddress: recipient.email, status, errorMessage: r.error, attemptNumber: 1 });
    return { delivered: r.ok, channel: r.ok ? 'email' : null, attempts };
  }

  return { delivered: false, channel: null, attempts };
}
