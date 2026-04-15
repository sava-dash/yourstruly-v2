/**
 * Cron: PostScript Reminders
 *
 * GET /api/cron/postscript-reminders
 *
 * Runs daily (recommend 13:00 UTC / 14:00 UTC in DST — scheduled externally
 * to land around 9am Eastern). Auth: Bearer CRON_SECRET (reject if unset).
 *
 * For every postscript with status='scheduled' and delivery_date 14, 7, or 0
 * days from now, sends a single email to the sender and writes a matching
 * `notifications` row. Template depends on whether the postscript has any
 * unpaid attached gift:
 *
 *   hasUnpaidGift?   daysUntil  →  template
 *   yes              14            unpaidGift14Days
 *   yes              7             unpaidGift7Days
 *   yes              0             unpaidGiftDayOf        (delivery skipped)
 *   no               7             paidPostscript7Days
 *   no               0             paidPostscriptDayOf
 *   no               14            (no nudge — nothing to say yet)
 *
 * Idempotency is enforced two ways:
 *  - Shared `cron_runs` guard: only one invocation per UTC day progresses.
 *  - `postscript_reminders_sent` has UNIQUE(postscript_id, days_until) so
 *    even if the guard is bypassed, we never re-send the same nudge.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import {
  getReminderCandidates,
  loadSentReminderSet,
  shouldSendReminder,
  type PostscriptCandidate,
} from '@/lib/postscripts/reminders';
import {
  unpaidGift14Days,
  unpaidGift7Days,
  unpaidGiftDayOf,
  paidPostscript7Days,
  paidPostscriptDayOf,
  type BuiltEmail,
} from '@/lib/emails/postscript-reminders';

const FROM_EMAIL = process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love';

interface ResultRow {
  postscriptId: string;
  daysUntil: number;
  hasUnpaidGift: boolean;
  status: 'sent' | 'skipped' | 'failed' | 'already-sent';
  error?: string;
}

function pickTemplate(c: PostscriptCandidate, args: {
  senderFirstName: string;
  amountDue?: number;
  payUrl?: string;
}): BuiltEmail | null {
  const base = {
    senderFirstName: args.senderFirstName,
    recipientName: c.recipient_name,
    postscriptId: c.id,
    deliveryDate: c.delivery_date,
    amountDue: args.amountDue,
    payUrl: args.payUrl,
  };
  if (c.hasUnpaidGift) {
    if (c.daysUntil === 14) return unpaidGift14Days(base);
    if (c.daysUntil === 7) return unpaidGift7Days(base);
    if (c.daysUntil === 0) return unpaidGiftDayOf(base);
  } else {
    if (c.daysUntil === 7) return paidPostscript7Days(base);
    if (c.daysUntil === 0) return paidPostscriptDayOf(base);
    // daysUntil=14 on fully-paid postscripts: intentionally no email.
  }
  return null;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const startedAt = Date.now();

  // --- cron_runs idempotency guard ---
  const runDate = new Date().toISOString().slice(0, 10);
  const { error: lockErr } = await supabase
    .from('cron_runs')
    .insert({ name: 'postscript-reminders', run_date: runDate });
  if (lockErr) {
    const code = (lockErr as { code?: string }).code;
    if (code === '23505') {
      return NextResponse.json({ ok: true, skipped: 'already-ran-today' });
    }
    console.error('[postscript-reminders] lock insert failed', lockErr);
    return NextResponse.json({ error: lockErr.message }, { status: 500 });
  }

  const candidates = await getReminderCandidates(supabase);
  if (candidates.length === 0) {
    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startedAt,
      counts: { sent: 0, skipped: 0, failed: 0 },
    });
  }

  const sentSet = await loadSentReminderSet(
    supabase,
    candidates.map((c) => c.id),
  );

  // Bulk-load sender profiles once.
  const userIds = Array.from(new Set(candidates.map((c) => c.user_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, full_name')
    .in('id', userIds);
  const profileById = new Map<string, {
    email: string | null;
    firstName: string;
  }>();
  for (const p of (profiles ?? []) as Array<{
    id: string;
    email: string | null;
    first_name: string | null;
    full_name: string | null;
  }>) {
    const firstName =
      p.first_name || (p.full_name ? p.full_name.split(' ')[0] : '') || 'there';
    profileById.set(p.id, { email: p.email, firstName });
  }

  const resend = getResend();
  const results: ResultRow[] = [];

  for (const c of candidates) {
    const row: ResultRow = {
      postscriptId: c.id,
      daysUntil: c.daysUntil,
      hasUnpaidGift: c.hasUnpaidGift,
      status: 'skipped',
    };

    try {
      if (!shouldSendReminder(c.id, c.daysUntil, sentSet)) {
        row.status = 'already-sent';
        results.push(row);
        continue;
      }

      const profile = profileById.get(c.user_id);
      if (!profile?.email) {
        row.status = 'skipped';
        row.error = 'sender has no email';
        results.push(row);
        continue;
      }

      const payUrl = c.hasUnpaidGift
        ? `${APP_URL}/dashboard/postscripts/${c.id}?pay=1`
        : undefined;

      const email = pickTemplate(c, {
        senderFirstName: profile.firstName,
        amountDue: c.unpaidAmountDue ?? undefined,
        payUrl,
      });

      if (!email) {
        // e.g. paid postscript at 14 days — no message to send, but record
        // so we don't reconsider on re-runs the same day.
        await supabase.from('postscript_reminders_sent').insert({
          postscript_id: c.id,
          days_until: c.daysUntil,
        });
        row.status = 'skipped';
        row.error = 'no template for this state';
        results.push(row);
        continue;
      }

      // Reserve the idempotency row FIRST. If the unique constraint fires,
      // another run beat us and we bail cleanly.
      const { error: reserveErr } = await supabase
        .from('postscript_reminders_sent')
        .insert({
          postscript_id: c.id,
          days_until: c.daysUntil,
        });
      if (reserveErr) {
        const code = (reserveErr as { code?: string }).code;
        if (code === '23505') {
          row.status = 'already-sent';
          results.push(row);
          continue;
        }
        row.status = 'failed';
        row.error = reserveErr.message;
        results.push(row);
        continue;
      }

      // Send the email (graceful if RESEND_API_KEY missing).
      if (resend) {
        const { error: sendErr } = await resend.emails.send({
          from: FROM_EMAIL,
          to: profile.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
        if (sendErr) {
          console.error('[postscript-reminders] resend failed', c.id, sendErr);
          row.error = sendErr.message;
          // Keep the reservation row so we don't spam on retry. Still record
          // status so the in-app banner gets written below.
        }
      } else {
        console.warn('[postscript-reminders] resend not configured — email skipped');
      }

      // In-app notification row — so the dashboard bell picks it up.
      await createNotification(supabase, {
        userId: c.user_id,
        type: 'postscript-reminder',
        payload: {
          postscriptId: c.id,
          daysUntil: c.daysUntil,
          hasUnpaidGift: c.hasUnpaidGift,
          recipientName: c.recipient_name,
          amountDue: c.unpaidAmountDue ?? undefined,
        },
      });

      row.status = row.error ? 'failed' : 'sent';
      results.push(row);
    } catch (err) {
      console.error('[postscript-reminders] candidate failed', c.id, err);
      row.status = 'failed';
      row.error = err instanceof Error ? err.message : 'unknown error';
      results.push(row);
    }
  }

  const counts = {
    sent: results.filter((r) => r.status === 'sent').length,
    skipped: results.filter((r) => r.status === 'skipped' || r.status === 'already-sent').length,
    failed: results.filter((r) => r.status === 'failed').length,
  };

  // Update cron_runs row with final stats.
  await supabase
    .from('cron_runs')
    .update({
      finished_at: new Date().toISOString(),
      notes: { counts, durationMs: Date.now() - startedAt },
    })
    .eq('name', 'postscript-reminders')
    .eq('run_date', runDate);

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    counts,
    results,
  });
}
