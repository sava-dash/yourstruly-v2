/**
 * Cron: Weekly Story (F1)
 *
 * Schedule: Sunday 7:00 ET (12:00 UTC during EST, 11:00 UTC during EDT — the
 * scheduler should be configured for the correct UTC time on the operator side).
 *
 * For each user with `profiles.weekly_story_enabled = true`, picks one curated
 * engagement prompt and sends a brand-styled Resend email with a single CTA.
 *
 * Auth: Bearer CRON_SECRET (matches deliver-postscripts convention).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend } from '@/lib/email';
import { buildWeeklyStoryEmail } from '@/lib/emails/weekly-story';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love';
const FROM_EMAIL = process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>';
const BATCH_SIZE = 200;

interface UserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  full_name: string | null;
  weekly_story_enabled: boolean | null;
}

interface PromptRow {
  id: string;
  title: string | null;
  prompt_text: string | null;
  contact_id: string | null;
  status: string | null;
  created_at: string;
  completed_at: string | null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ error: 'Resend not configured' }, { status: 500 });
  }

  const startedAt = Date.now();
  const sent: string[] = [];
  const skipped: string[] = [];
  const failed: { userId: string; reason: string }[] = [];

  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, first_name, full_name, weekly_story_enabled')
    .eq('weekly_story_enabled', true)
    .limit(BATCH_SIZE);

  if (usersError) {
    console.error('[weekly-story] fetch users failed', usersError);
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const thisMonth = new Date().getUTCMonth() + 1;

  for (const u of (users ?? []) as UserRow[]) {
    if (!u.email) {
      skipped.push(u.id);
      continue;
    }

    try {
      // Pull a small pool of open prompts for the user.
      const { data: prompts } = await supabase
        .from('engagement_prompts')
        .select('id, title, prompt_text, contact_id, status, created_at, completed_at')
        .eq('user_id', u.id)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      const pool = (prompts ?? []) as PromptRow[];
      if (pool.length === 0) {
        skipped.push(u.id);
        continue;
      }

      // Score: prompts about contacts whose birthday is this month rank highest.
      const contactIds = Array.from(new Set(pool.map((p) => p.contact_id).filter((x): x is string => !!x)));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let contactsById: Record<string, any> = {};
      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, full_name, avatar_url, birth_date')
          .in('id', contactIds);
        contactsById = Object.fromEntries(((contacts ?? []) as { id: string }[]).map((c) => [c.id, c]));
      }

      const scored = pool.map((p) => {
        let score = 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contact: any = p.contact_id ? contactsById[p.contact_id] : null;
        if (contact?.birth_date) {
          const m = new Date(contact.birth_date).getUTCMonth() + 1;
          if (m === thisMonth) score += 5;
        }
        // Recency boost (newer prompts > older).
        const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86_400_000;
        score += Math.max(0, 7 - ageDays) * 0.1;
        return { prompt: p, contact, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const pick = scored[0];
      const contact = pick.contact;

      // Tally totals (cheap counts).
      const [memCount, contactCount] = await Promise.all([
        supabase.from('memories').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
      ]);

      const firstName = u.first_name || (u.full_name ? u.full_name.split(' ')[0] : '');
      const promptTitle = pick.prompt.title || pick.prompt.prompt_text || 'Capture a memory today';
      const promptHint = pick.prompt.prompt_text && pick.prompt.title ? pick.prompt.prompt_text : undefined;

      const { subject, html, text } = buildWeeklyStoryEmail({
        firstName,
        promptId: pick.prompt.id,
        promptTitle,
        promptHint,
        contactName: contact?.full_name ?? null,
        contactPhotoUrl: contact?.avatar_url ?? null,
        memoriesCount: memCount.count ?? 0,
        lovedOnesCount: contactCount.count ?? 0,
        unsubscribeUrl: `${APP_URL}/dashboard/settings#notifications`,
      });

      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: u.email,
        subject,
        html,
        text,
      });
      if (sendError) {
        failed.push({ userId: u.id, reason: sendError.message });
        continue;
      }
      sent.push(u.id);
    } catch (err) {
      failed.push({ userId: u.id, reason: err instanceof Error ? err.message : 'unknown' });
    }
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    counts: { sent: sent.length, skipped: skipped.length, failed: failed.length },
    failed,
  });
}
