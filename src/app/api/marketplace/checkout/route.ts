/**
 * Marketplace Cart Checkout
 * POST /api/marketplace/checkout
 *
 * Creates a Stripe Checkout Session for all cart items.
 * Collects shipping address via Stripe's built-in UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe';

/* ─── Request body types ──────────────────────────────────────────────── */

interface CheckoutItem {
  productId: string;
  name: string;
  quantity: number;
  priceCents: number;
  image?: string;
  variant?: string;
}

/* ─── Validation ──────────────────────────────────────────────────────── */

const MAX_TOTAL_CENTS = 1_000_000; // $10,000 sanity cap

function validateItems(
  items: unknown,
): { valid: true; parsed: CheckoutItem[] } | { valid: false; error: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'Cart is empty' };
  }

  const parsed: CheckoutItem[] = [];
  let totalCents = 0;

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      return { valid: false, error: 'Invalid item in cart' };
    }

    const { productId, name, quantity, priceCents, image, variant } = item as Record<string, unknown>;

    if (typeof productId !== 'string' || !productId) {
      return { valid: false, error: 'Each item must have a productId' };
    }
    if (typeof name !== 'string' || !name) {
      return { valid: false, error: 'Each item must have a name' };
    }
    if (typeof quantity !== 'number' || quantity < 1 || !Number.isInteger(quantity)) {
      return { valid: false, error: 'Each item must have a positive integer quantity' };
    }
    if (typeof priceCents !== 'number' || priceCents <= 0 || !Number.isInteger(priceCents)) {
      return { valid: false, error: 'Each item must have a positive price in cents' };
    }

    totalCents += priceCents * quantity;

    parsed.push({
      productId,
      name,
      quantity,
      priceCents,
      image: typeof image === 'string' && image ? image : undefined,
      variant: typeof variant === 'string' && variant ? variant : undefined,
    });
  }

  if (totalCents > MAX_TOTAL_CENTS) {
    return { valid: false, error: 'Order total exceeds $10,000 limit' };
  }

  return { valid: true, parsed };
}

/* ─── Handler ─────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in to checkout' }, { status: 401 });
    }

    const body = await req.json();
    const result = validateItems(body.items);

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { parsed: items } = result;
    const stripe = getStripeServer();

    // Build Stripe line items
    const lineItems = items.map((item) => ({
      price_data: {
        currency: 'usd',
        unit_amount: item.priceCents,
        product_data: {
          name: item.name + (item.variant ? ` (${item.variant})` : ''),
          images: item.image ? [item.image] : undefined,
        },
      },
      quantity: item.quantity,
    }));

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email ?? undefined,
      line_items: lineItems,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
      metadata: {
        userId: user.id,
        itemCount: String(items.length),
        source: 'marketplace',
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[marketplace/checkout] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
