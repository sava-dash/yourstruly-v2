import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const CreatePaymentSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    price: z.number().positive().max(10000),
    quantity: z.number().int().positive().max(100),
    variant: z.object({
      id: z.string(),
      name: z.string(),
    }).optional(),
  })).min(1).max(50),
  shippingAddress: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
    address1: z.string().min(1).max(200),
    address2: z.string().max(200).optional(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    zipCode: z.string().min(1).max(20),
    country: z.string().max(5).default('US'),
  }),
  isGift: z.boolean().optional(),
  giftMessage: z.string().max(500).optional(),
  testMode: z.boolean().optional().default(false),
});

// Support test mode vs live mode
const getStripeClient = (testMode: boolean) => {
  const key = testMode 
    ? process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY 
    : process.env.STRIPE_SECRET_KEY;
  
  return new Stripe(key || '', {
    apiVersion: '2026-01-28.clover',
  });
};


/**
 * POST /api/marketplace/checkout/create-payment
 * Creates a Stripe PaymentIntent for the checkout
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const {
      shippingAddress,
      isGift,
      giftMessage,
      testMode,
    } = parsed.data;
    // Create mutable copy so server-side price override can modify items
    const items = parsed.data.items.map(item => ({ ...item }));

    // Get appropriate Stripe client
    const stripe = getStripeClient(testMode);

    // Server-side price validation — never trust client-supplied prices
    const productIds = items.map(item => item.id);
    const { data: products } = await supabase
      .from('marketplace_products')
      .select('id, price')
      .in('id', productIds);

    if (products && products.length > 0) {
      const priceMap = new Map(products.map(p => [p.id, p.price]));
      for (const item of items) {
        const serverPrice = priceMap.get(item.id);
        if (serverPrice !== undefined) {
          item.price = serverPrice; // Override with server-side price
        }
      }
    }

    // Calculate totals using validated prices
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 50 ? 0 : 5.99;
    const tax = subtotal * 0.08; // 8% estimated tax
    const total = subtotal + shipping + tax;

    // Convert to cents for Stripe
    const amountCents = Math.round(total * 100);

    // Create line items description
    const description = items
      .map(item => `${item.name}${item.variant ? ` (${item.variant.name})` : ''} x${item.quantity}`)
      .join(', ');

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: user.id,
        items_count: items.length.toString(),
        items_json: JSON.stringify(items.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          variant_id: i.variant?.id,
        }))),
        shipping_name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        shipping_email: shippingAddress.email,
        shipping_address: `${shippingAddress.address1}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}`,
        is_gift: isGift ? 'true' : 'false',
        gift_message: giftMessage || '',
      },
      description: description.substring(0, 1000), // Stripe limit
      receipt_email: shippingAddress.email,
      shipping: {
        name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        phone: shippingAddress.phone || undefined,
        address: {
          line1: shippingAddress.address1,
          line2: shippingAddress.address2 || undefined,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.zipCode,
          country: shippingAddress.country || 'US',
        },
      },
    });

    // Optionally store order in database
    if (user) {
      await supabase.from('marketplace_orders').insert({
        user_id: user.id,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
        items: items,
        subtotal,
        shipping,
        tax,
        total,
        shipping_address: shippingAddress,
        is_gift: isGift || false,
        gift_message: giftMessage || null,
      }).select().single();
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
