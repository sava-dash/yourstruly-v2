/**
 * Helpers for the /api/cron/postscript-reminders job.
 *
 * - getReminderCandidates(): loads postscripts due in 14/7/0 days and their
 *   unpaid-gift rollup in a small number of queries.
 * - shouldSendReminder(): checks the idempotency set so a re-run never
 *   re-fires the same (postscript, daysUntil) nudge.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const REMINDER_DAYS = [14, 7, 0] as const;
export type ReminderDays = (typeof REMINDER_DAYS)[number];

export interface PostscriptCandidate {
  id: string;
  user_id: string;
  recipient_name: string;
  delivery_date: string; // ISO YYYY-MM-DD
  daysUntil: ReminderDays;
  hasUnpaidGift: boolean;
  unpaidAmountDue: number | null;
}

interface PostscriptRow {
  id: string;
  user_id: string;
  recipient_name: string | null;
  delivery_date: string | null;
  status: string | null;
}

interface GiftRow {
  postscript_id: string;
  payment_status: string | null;
  price: number | null;
  quantity: number | null;
}

function isoDaysFromNow(daysUntil: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysUntil);
  return d.toISOString().slice(0, 10);
}

/**
 * Loads scheduled postscripts whose `delivery_date` falls on one of the
 * reminder offsets (14, 7, 0 days out). Returns them bucketed with their
 * unpaid-gift status so the caller can pick the right template.
 */
export async function getReminderCandidates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
): Promise<PostscriptCandidate[]> {
  const targets: { daysUntil: ReminderDays; iso: string }[] = REMINDER_DAYS.map((d) => ({
    daysUntil: d,
    iso: isoDaysFromNow(d),
  }));
  const targetISOs = targets.map((t) => t.iso);

  const { data: postscripts, error } = await supabase
    .from('postscripts')
    .select('id, user_id, recipient_name, delivery_date, status')
    .eq('status', 'scheduled')
    .eq('delivery_type', 'date')
    .in('delivery_date', targetISOs);

  if (error) {
    console.error('[postscripts/reminders] fetch postscripts failed', error);
    return [];
  }
  const rows = (postscripts ?? []) as PostscriptRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: gifts, error: giftsErr } = await supabase
    .from('postscript_gifts')
    .select('postscript_id, payment_status, price, quantity')
    .in('postscript_id', ids);
  if (giftsErr) {
    console.error('[postscripts/reminders] fetch gifts failed', giftsErr);
  }
  const giftRows = (gifts ?? []) as GiftRow[];

  const unpaidByPs = new Map<string, number>();
  for (const g of giftRows) {
    if (g.payment_status && g.payment_status !== 'paid') {
      const unit = Number(g.price ?? 0);
      const qty = Number(g.quantity ?? 1);
      const due = unit * qty;
      unpaidByPs.set(g.postscript_id, (unpaidByPs.get(g.postscript_id) ?? 0) + due);
    }
  }

  const byIso = new Map<string, ReminderDays>();
  for (const t of targets) byIso.set(t.iso, t.daysUntil);

  const out: PostscriptCandidate[] = [];
  for (const r of rows) {
    if (!r.delivery_date || !r.recipient_name) continue;
    const daysUntil = byIso.get(r.delivery_date);
    if (daysUntil == null) continue;
    const unpaidAmount = unpaidByPs.get(r.id);
    out.push({
      id: r.id,
      user_id: r.user_id,
      recipient_name: r.recipient_name,
      delivery_date: r.delivery_date,
      daysUntil,
      hasUnpaidGift: unpaidAmount != null && unpaidAmount > 0,
      unpaidAmountDue: unpaidAmount != null && unpaidAmount > 0 ? unpaidAmount : null,
    });
  }
  return out;
}

/**
 * Loads the set of (postscript_id, days_until) tuples we've already nudged
 * so the caller can skip duplicates within the same cron invocation.
 */
export async function loadSentReminderSet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  postscriptIds: string[],
): Promise<Set<string>> {
  const set = new Set<string>();
  if (postscriptIds.length === 0) return set;
  const { data, error } = await supabase
    .from('postscript_reminders_sent')
    .select('postscript_id, days_until')
    .in('postscript_id', postscriptIds);
  if (error) {
    console.error('[postscripts/reminders] fetch sent-log failed', error);
    return set;
  }
  for (const row of (data ?? []) as { postscript_id: string; days_until: number }[]) {
    set.add(`${row.postscript_id}:${row.days_until}`);
  }
  return set;
}

export function shouldSendReminder(
  postscriptId: string,
  daysUntil: number,
  alreadySentSet: Set<string>,
): boolean {
  return !alreadySentSet.has(`${postscriptId}:${daysUntil}`);
}

export function reminderKey(postscriptId: string, daysUntil: number): string {
  return `${postscriptId}:${daysUntil}`;
}
