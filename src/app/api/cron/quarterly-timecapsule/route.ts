/**
 * Cron: Quarterly Time Capsule (F3)
 *
 * Schedule: first day of each quarter (Jan 1, Apr 1, Jul 1, Oct 1) at 8:00 ET.
 * Aggregates the previous quarter's content per user and emails an HTML
 * recap (PDF attempted via dynamic pdf-lib import; skipped silently if absent).
 *
 * Auth: Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend } from '@/lib/email';
import { aggregateQuarter, previousQuarter } from '@/lib/digest/quarterly';
import { buildTimeCapsuleEmail } from '@/lib/emails/timecapsule';

const FROM_EMAIL = process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>';

interface UserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  full_name: string | null;
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
  const resend = getResend();
  const { period, start, end } = previousQuarter();

  const startedAt = Date.now();
  const sent: string[] = [];
  const skipped: string[] = [];
  const failed: { userId: string; reason: string }[] = [];

  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, first_name, full_name')
    .limit(1000);
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  for (const u of (users ?? []) as UserRow[]) {
    try {
      const summary = await aggregateQuarter(supabase, u.id, start, end, period);

      // Skip empty quarters — don't spam users with nothing to celebrate.
      if (
        summary.memoriesCount === 0 &&
        summary.photosCount === 0 &&
        summary.wisdomCount === 0 &&
        summary.postscriptsCount === 0
      ) {
        skipped.push(u.id);
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: capsule, error: capsuleErr } = await (supabase.from('time_capsules') as any)
        .upsert(
          {
            user_id: u.id,
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
        failed.push({ userId: u.id, reason: capsuleErr?.message || 'capsule insert failed' });
        continue;
      }

      if (!u.email || !resend) {
        skipped.push(u.id);
        continue;
      }

      const firstName = u.first_name || (u.full_name ? u.full_name.split(' ')[0] : '');
      const { subject, html, text } = buildTimeCapsuleEmail({
        firstName,
        period,
        capsuleId: (capsule as { id: string }).id,
        memoriesCount: summary.memoriesCount,
        photosCount: summary.photosCount,
        wisdomCount: summary.wisdomCount,
        postscriptsCount: summary.postscriptsCount,
        topMemories: summary.topMemories,
        topPhotos: summary.topPhotos,
        topWisdom: summary.topWisdom,
      });

      // PDF generation is best-effort (lib may be missing).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attachments: any[] = [];
      try {
        // Dynamic import via a non-literal specifier so TS doesn't require
        // the package at type-check time. pdf-lib is optional.
        const specifier = 'pdf-lib';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfModule: any = await import(/* webpackIgnore: true */ specifier).catch(() => null);
        if (pdfModule?.PDFDocument) {
          const { PDFDocument, StandardFonts, rgb } = pdfModule;
          const doc = await PDFDocument.create();
          const page = doc.addPage([612, 792]);
          const font = await doc.embedFont(StandardFonts.Helvetica);
          page.drawText(`${period} Time Capsule`, { x: 50, y: 740, size: 22, font, color: rgb(0.25, 0.42, 0.34) });
          page.drawText(`Memories: ${summary.memoriesCount}  Photos: ${summary.photosCount}  Wisdom: ${summary.wisdomCount}`, {
            x: 50, y: 700, size: 12, font,
          });
          let y = 660;
          for (const item of summary.topMemories) {
            page.drawText(`• ${item.title}`.slice(0, 80), { x: 50, y, size: 11, font });
            y -= 18;
          }
          const bytes = await doc.save();
          attachments.push({ filename: `${period.replace(' ', '-')}-time-capsule.pdf`, content: Buffer.from(bytes) });
        }
      } catch (pdfErr) {
        console.warn('[quarterly-timecapsule] PDF generation skipped:', pdfErr);
      }

      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: u.email,
        subject,
        html,
        text,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      if (sendError) {
        failed.push({ userId: u.id, reason: sendError.message });
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('time_capsules') as any)
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', (capsule as { id: string }).id);

      sent.push(u.id);
    } catch (err) {
      failed.push({ userId: u.id, reason: err instanceof Error ? err.message : 'unknown' });
    }
  }

  return NextResponse.json({
    ok: true,
    period,
    durationMs: Date.now() - startedAt,
    counts: { sent: sent.length, skipped: skipped.length, failed: failed.length },
    failed,
  });
}
