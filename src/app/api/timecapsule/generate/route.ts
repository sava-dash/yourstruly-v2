/**
 * User-triggered Time Capsule generation.
 *
 * Generates and emails the previous quarter's recap for the authenticated
 * user only. Mirrors the per-user branch of /api/cron/quarterly-timecapsule
 * without requiring CRON_SECRET. Used by the "Send me one now" button on
 * /dashboard/timecapsule.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend } from '@/lib/email';
import { aggregateQuarter, previousQuarter } from '@/lib/digest/quarterly';
import { buildTimeCapsuleEmail } from '@/lib/emails/timecapsule';

const FROM_EMAIL = process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>';

export async function POST() {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use the admin client for the actual aggregation/email work — same code
  // path as the cron route, just scoped to one user.
  const supabase = createAdminClient();
  const resend = getResend();
  const { period, start, end } = previousQuarter();

  // Profile row is optional — fall back to auth user data if missing or
  // partially populated. The `profiles` table doesn't have a first_name
  // column, so we derive it from full_name.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const email = profile?.email || user.email || null;
  const fullName =
    profile?.full_name ||
    (user.user_metadata as Record<string, unknown> | undefined)?.full_name as string | undefined ||
    (user.user_metadata as Record<string, unknown> | undefined)?.name as string | undefined ||
    '';
  const firstName = fullName ? String(fullName).split(' ')[0] : '';

  try {
    const summary = await aggregateQuarter(supabase, user.id, start, end, period);

    if (
      summary.memoriesCount === 0 &&
      summary.photosCount === 0 &&
      summary.wisdomCount === 0 &&
      summary.postscriptsCount === 0
    ) {
      return NextResponse.json({
        ok: true,
        period,
        skipped: true,
        reason: 'No content for the previous quarter yet.',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: capsule, error: capsuleErr } = await (supabase.from('time_capsules') as any)
      .upsert(
        {
          user_id: user.id,
          period,
          period_start: start.toISOString().slice(0, 10),
          period_end: end.toISOString().slice(0, 10),
          summary_json: summary,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,period' },
      )
      .select('id')
      .single();
    if (capsuleErr || !capsule) {
      return NextResponse.json(
        { error: capsuleErr?.message || 'Could not save time capsule' },
        { status: 500 },
      );
    }

    const capsuleId = (capsule as { id: string }).id;

    if (!email || !resend) {
      return NextResponse.json({
        ok: true,
        period,
        capsuleId,
        emailSent: false,
        reason: !email ? 'No email on file' : 'Email service not configured',
      });
    }

    const { subject, html, text } = buildTimeCapsuleEmail({
      firstName,
      period,
      capsuleId,
      memoriesCount: summary.memoriesCount,
      photosCount: summary.photosCount,
      wisdomCount: summary.wisdomCount,
      postscriptsCount: summary.postscriptsCount,
      topMemories: summary.topMemories,
      topPhotos: summary.topPhotos,
      topWisdom: summary.topWisdom,
    });

    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
      text,
    });
    if (sendError) {
      return NextResponse.json(
        { error: sendError.message, capsuleId },
        { status: 502 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('time_capsules') as any)
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', capsuleId);

    return NextResponse.json({ ok: true, period, capsuleId, emailSent: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
