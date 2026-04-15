/**
 * POST /api/gifts/checkout — creates a Stripe Checkout Session in `payment`
 * mode for a Gift-a-Year purchase (F4). Auth optional: anonymous purchasers
 * are supported (purchaser_user_id stays null).
 *
 * Body: { tier, recipientEmail, recipientName, message?, purchaserName? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe';
import { GIFT_TIERS, type GiftTier } from '@/lib/gifts';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tier = String(body?.tier ?? '') as GiftTier;
    const config = GIFT_TIERS[tier];
    if (!config) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    const recipientEmail = String(body?.recipientEmail ?? '').trim().toLowerCase();
    const recipientName = String(body?.recipientName ?? '').trim();
    const purchaserName = String(body?.purchaserName ?? '').trim();
    const message = body?.message ? String(body.message).slice(0, 500) : '';

    if (!recipientEmail || !/^\S+@\S+\.\S+$/.test(recipientEmail)) {
      return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 });
    }
    if (!recipientName) {
      return NextResponse.json({ error: 'Recipient name required' }, { status: 400 });
    }

    let purchaserUserId: string | null = null;
    let purchaserEmail: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        purchaserUserId = user.id;
        purchaserEmail = user.email ?? null;
      }
    } catch {
      // anonymous
    }

    const stripe = getStripeServer();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: purchaserEmail ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: config.amountCents,
            product_data: {
              name: `Gift: ${config.name}`,
              description: config.tagline,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/gift/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/gift?canceled=1`,
      metadata: {
        type: 'gift_subscription',
        tier,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        purchaser_user_id: purchaserUserId ?? '',
        purchaser_name: purchaserName,
        message,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('[gifts/checkout] error', err);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
