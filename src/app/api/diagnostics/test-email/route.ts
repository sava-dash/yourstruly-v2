import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

/**
 * Diagnostic endpoint to verify RESEND_API_KEY + EMAIL_FROM on the running
 * environment. Gated by CRON_SECRET so it's not publicly spammable.
 *
 * Usage:
 *   curl -X POST https://app.yourstruly.love/api/diagnostics/test-email \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"to":"you@example.com"}'
 *
 * Response: { ok: true, messageId, from } on success, or { ok: false, error }.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ ok: false, error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  let to: string;
  try {
    const body = await request.json();
    to = typeof body?.to === 'string' ? body.to : '';
  } catch {
    return NextResponse.json({ ok: false, error: 'Body must be JSON with a "to" field' }, { status: 400 });
  }
  if (!to || !to.includes('@')) {
    return NextResponse.json({ ok: false, error: 'Provide a valid "to" email' }, { status: 400 });
  }

  const from = process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>';
  const resend = new Resend(resendKey);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: 'YoursTruly — production Resend test',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #406A56; font-family: 'Playfair Display', serif;">Resend is working ✓</h1>
        <p>If you received this email, the production <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> on ECS are configured correctly.</p>
        <p style="color: #666; font-size: 13px;">Sent from: ${from}</p>
        <p style="color: #666; font-size: 13px;">At: ${new Date().toISOString()}</p>
      </div>
    `,
    text: `Resend is working. RESEND_API_KEY and EMAIL_FROM on ECS are configured correctly. From: ${from} at ${new Date().toISOString()}.`,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, name: error.name },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, messageId: data?.id, from, to });
}
