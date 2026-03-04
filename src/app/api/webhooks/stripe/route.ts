import Stripe from 'stripe';
import { getStripeServer } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Lazy-init Supabase admin client (avoids build-time env issues)
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return _supabaseAdmin;
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature')!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = getStripeServer().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }

      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }

      case 'invoice.payment_failed': {
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        await handleTrialEnding(event.data.object as Stripe.Subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  const checkoutType = session.metadata?.type;

  // Handle PostScript gift payments
  if (checkoutType === 'postscript_gift') {
    await handlePostscriptGiftPayment(session);
    return;
  }

  // Handle subscription checkout
  if (!userId || !planId) {
    console.error('Missing userId or planId in checkout session metadata');
    return;
  }

  // Fetch the subscription details from Stripe
  const subscription = await getStripeServer().subscriptions.retrieve(subscriptionId) as any;

  // Create or update subscription in database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('subscriptions') as any).upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: subscription.items.data[0]?.price.id,
    plan_id: planId,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_start: subscription.trial_start 
      ? new Date(subscription.trial_start * 1000).toISOString() 
      : null,
    trial_end: subscription.trial_end 
      ? new Date(subscription.trial_end * 1000).toISOString() 
      : null,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'stripe_subscription_id',
  });

  if (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }

  console.log(`Subscription created/updated for user ${userId}`);
}

async function handleSubscriptionUpdated(subscription: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('subscriptions') as any)
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at 
        ? new Date(subscription.canceled_at * 1000).toISOString() 
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  console.log(`Subscription updated: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('subscriptions') as any)
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }

  console.log(`Subscription canceled: ${subscription.id}`);
}

async function handlePaymentFailed(invoice: any) {
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('subscriptions') as any)
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error marking subscription as past_due:', error);
    throw error;
  }

  console.log(`Payment failed for subscription: ${subscriptionId}`);
}

async function handleTrialEnding(subscription: Stripe.Subscription) {
  // Could send email notification here
  console.log(`Trial ending soon for subscription: ${subscription.id}`);
}

async function handlePostscriptGiftPayment(session: Stripe.Checkout.Session) {
  const giftId = session.metadata?.giftId;
  const postscriptId = session.metadata?.postscriptId;
  const userId = session.metadata?.userId;
  const paymentIntentId = session.payment_intent as string;

  if (!giftId || !postscriptId) {
    console.error('Missing giftId or postscriptId in postscript gift checkout metadata');
    return;
  }

  const supabase = getSupabaseAdmin();

  // Update the gift record with payment info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('postscript_gifts') as any)
    .update({
      payment_intent_id: paymentIntentId,
      payment_status: 'paid',
      status: 'paid', // Ready to be fulfilled when postscript is sent
      updated_at: new Date().toISOString(),
    })
    .eq('id', giftId);

  if (error) {
    console.error('Error updating postscript gift payment status:', error);
    throw error;
  }

  // Update postscript has_gift flag
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('postscripts') as any)
    .update({ 
      has_gift: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postscriptId);

  console.log(`PostScript gift payment completed: gift=${giftId}, postscript=${postscriptId}, user=${userId}`);
}
