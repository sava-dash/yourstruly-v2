/**
 * Standalone Stripe webhook for Gift-a-Year (F4).
 *
 * Why a separate endpoint? The existing webhook at /api/webhooks/stripe handles
 * subscription + postscript_gift events. Rather than risk regressions there,
 * Stripe should fire `checkout.session.completed` events with metadata
 * `type=gift_subscription` to BOTH endpoints (or this one only — see report).
 *
 * Operator action: register `https://app.yourstruly.love/api/webhooks/stripe-gifts`
 * in the Stripe dashboard with at minimum the `checkout.session.completed`
 * event and set `STRIPE_WEBHOOK_SECRET_GIFTS` env var.
 */
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend } from '@/lib/email';
import { GIFT_TIERS, type GiftTier } from '@/lib/gifts';
import { buildGiftRedemptionEmail } from '@/lib/emails/gift-redemption';

const FROM_EMAIL = process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_GIFTS || process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature/secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeServer().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-gifts] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true, ignored: event.type });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.type !== 'gift_subscription') {
    return NextResponse.json({ received: true, ignored: 'not a gift' });
  }

  try {
    await handleGiftCheckout(session);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[stripe-gifts] processing failed', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handleGiftCheckout(session: Stripe.Checkout.Session) {
  const supabase = createAdminClient();
  const md = session.metadata ?? {};
  const tier = md.tier as GiftTier;
  const config = GIFT_TIERS[tier];
  if (!config) {
    console.error('[stripe-gifts] unknown tier', tier);
    return;
  }

  const recipientEmail = String(md.recipient_email ?? '').toLowerCase();
  const recipientName = String(md.recipient_name ?? '');
  const purchaserName = String(md.purchaser_name ?? '') || 'A friend';
  const purchaserUserId = md.purchaser_user_id && String(md.purchaser_user_id).trim() !== ''
    ? String(md.purchaser_user_id)
    : null;
  const message = md.message ? String(md.message) : null;

  const expiresAt = new Date();
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: gift, error } = await (supabase.from('gift_subscriptions') as any)
    .insert({
      purchaser_user_id: purchaserUserId,
      purchaser_email: session.customer_email,
      purchaser_name: purchaserName,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      tier,
      amount_cents: config.amountCents,
      stripe_session_id: session.id,
      stripe_payment_intent_id: (session.payment_intent as string) ?? null,
      status: 'paid',
      expires_at: expiresAt.toISOString(),
      message,
    })
    .select('id, redemption_token')
    .single();

  if (error || !gift) {
    console.error('[stripe-gifts] insert failed', error);
    throw error ?? new Error('Insert failed');
  }

  const resend = getResend();
  if (!resend) {
    console.warn('[stripe-gifts] resend not configured; skipping recipient email');
    return;
  }

  const { subject, html, text } = buildGiftRedemptionEmail({
    recipientName,
    purchaserName,
    message,
    tierName: config.name,
    redemptionToken: (gift as { redemption_token: string }).redemption_token,
  });

  await resend.emails.send({
    from: FROM_EMAIL,
    to: recipientEmail,
    subject,
    html,
    text,
  });
}
