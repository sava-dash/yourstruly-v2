/**
 * Goody Commerce API - Webhook Handler
 * POST /api/webhooks/goody
 * 
 * Handles webhook events from Goody Commerce API.
 * Goody uses Svix for webhook delivery.
 * 
 * Webhook events:
 * - order_batch.created: When an order batch is newly created
 * - order_batch.completed: When an order batch is fully processed
 * - order.created: When an order is created and ready to be opened
 * - order.gift_opened: When a gift is opened by the recipient
 * - order.gift_accepted: When a gift has been accepted by the recipient
 * - order.thank_you_note_added: When recipient adds a thank you note
 * - order.shipped: When an order starts shipping
 * - order.delivered: When an order is fully delivered
 * - order.canceled: When an order has been canceled
 * - order.refunded: When an order has been refunded
 * 
 * Security: Webhooks should be verified using Svix signatures.
 * The webhook secret can be obtained from your Goody dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy-init Supabase admin client
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

// Webhook event types
interface GoodyWebhookEvent {
  type: string;
  data: {
    id: string;
    [key: string]: unknown;
  };
}

/**
 * POST /api/webhooks/goody
 * 
 * Headers expected from Svix:
 * - svix-id: Unique message ID
 * - svix-timestamp: Unix timestamp
 * - svix-signature: Webhook signature
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Get Svix headers for signature verification
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    // Log webhook receipt for debugging
    console.log('Goody webhook received:', {
      type: payload.type,
      id: svixId,
      timestamp: svixTimestamp,
    });

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.GOODY_WEBHOOK_SECRET;
    if (webhookSecret && svixId && svixTimestamp && svixSignature) {
      // Note: In production, you should verify the signature using Svix library
      // import { Webhook } from 'svix';
      // const wh = new Webhook(webhookSecret);
      // wh.verify(JSON.stringify(payload), { 'svix-id': svixId, ... });
      
      // For now, we'll just check that headers exist
      // TODO: Implement full signature verification when Svix library is added
    }

    // Process the webhook event
    const event = payload as GoodyWebhookEvent;
    
    switch (event.type) {
      case 'order_batch.created':
        await handleOrderBatchCreated(event.data);
        break;
        
      case 'order_batch.completed':
        await handleOrderBatchCompleted(event.data);
        break;
        
      case 'order.created':
        await handleOrderCreated(event.data);
        break;
        
      case 'order.gift_opened':
        await handleGiftOpened(event.data);
        break;
        
      case 'order.gift_accepted':
        await handleGiftAccepted(event.data);
        break;
        
      case 'order.thank_you_note_added':
        await handleThankYouNoteAdded(event.data);
        break;
        
      case 'order.shipped':
        await handleOrderShipped(event.data);
        break;
        
      case 'order.delivered':
        await handleOrderDelivered(event.data);
        break;
        
      case 'order.canceled':
        await handleOrderCanceled(event.data);
        break;
        
      case 'order.refunded':
        await handleOrderRefunded(event.data);
        break;
        
      default:
        console.log(`Unhandled Goody webhook event: ${event.type}`);
    }

    // Return success response
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Goody webhook error:', error);
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Event handlers

async function handleOrderBatchCreated(data: Record<string, unknown>) {
  console.log('Order batch created:', data.id);
  
  // Update any records in our database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('postscript_gifts') as any)
    .update({
      status: 'created',
      updated_at: new Date().toISOString(),
    })
    .eq('provider_order_batch_id', data.id);
    
  if (error) {
    console.error('Error updating order batch status:', error);
  }
}

async function handleOrderBatchCompleted(data: Record<string, unknown>) {
  console.log('Order batch completed:', data.id);
  
  // Update status to completed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('postscript_gifts') as any)
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('provider_order_batch_id', data.id);
    
  if (error) {
    console.error('Error updating order batch status:', error);
  }
}

async function handleOrderCreated(data: Record<string, unknown>) {
  console.log('Order created:', data.id);
  
  // Store order details
  // This could trigger notifications to the sender
}

async function handleGiftOpened(data: Record<string, unknown>) {
  console.log('Gift opened:', data.id);
  
  // Record that the gift was viewed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('postscript_gift_events') as any).insert({
    order_id: data.id,
    event_type: 'gift_opened',
    metadata: data,
    created_at: new Date().toISOString(),
  });
  
  if (error) {
    console.error('Error recording gift opened event:', error);
  }
}

async function handleGiftAccepted(data: Record<string, unknown>) {
  console.log('Gift accepted:', data.id);
  
  // Record acceptance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('postscript_gift_events') as any).insert({
    order_id: data.id,
    event_type: 'gift_accepted',
    metadata: data,
    created_at: new Date().toISOString(),
  });
  
  // Update the main gift record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (getSupabaseAdmin().from('postscript_gifts') as any)
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider_order_id', data.id);
  
  if (error) {
    console.error('Error recording gift accepted event:', error);
  }
}

async function handleThankYouNoteAdded(data: Record<string, unknown> & { thank_you_note?: string }) {
  console.log('Thank you note added:', data.id);
  
  // Store the thank you note
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('postscript_gifts') as any)
    .update({
      thank_you_note: data.thank_you_note,
      updated_at: new Date().toISOString(),
    })
    .eq('provider_order_id', data.id);
  
  if (error) {
    console.error('Error storing thank you note:', error);
  }
}

async function handleOrderShipped(data: Record<string, unknown> & { 
  shipments?: Array<{
    tracking_number?: string;
    tracking_url?: string;
    carrier?: string;
  }>;
}) {
  console.log('Order shipped:', data.id);
  
  // Update with tracking information
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('postscript_gifts') as any)
    .update({
      status: 'shipped',
      tracking_number: data.shipments?.[0]?.tracking_number,
      tracking_url: data.shipments?.[0]?.tracking_url,
      carrier: data.shipments?.[0]?.carrier,
      shipped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider_order_id', data.id);
  
  if (error) {
    console.error('Error updating shipped status:', error);
  }
}

async function handleOrderDelivered(data: Record<string, unknown>) {
  console.log('Order delivered:', data.id);
  
  // Update delivery status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('postscript_gifts') as any)
    .update({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider_order_id', data.id);
  
  if (error) {
    console.error('Error updating delivered status:', error);
  }
}

async function handleOrderCanceled(data: Record<string, unknown>) {
  console.log('Order canceled:', data.id);
  
  // Update status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('postscript_gifts') as any)
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('provider_order_id', data.id);
  
  if (error) {
    console.error('Error updating canceled status:', error);
  }
}

async function handleOrderRefunded(data: Record<string, unknown>) {
  console.log('Order refunded:', data.id);
  
  // Update status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin().from('postscript_gifts') as any)
    .update({
      status: 'refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('provider_order_id', data.id);
  
  if (error) {
    console.error('Error updating refunded status:', error);
  }
}

/**
 * GET /api/webhooks/goody
 * 
 * Returns information about the webhook endpoint
 * and required configuration for the Goody dashboard.
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return NextResponse.json({
    endpoint: `${appUrl}/api/webhooks/goody`,
    status: 'active',
    events: [
      'order_batch.created',
      'order_batch.completed',
      'order.created',
      'order.gift_opened',
      'order.gift_accepted',
      'order.thank_you_note_added',
      'order.shipped',
      'order.delivered',
      'order.canceled',
      'order.refunded',
    ],
    configuration: {
      dashboardUrl: process.env.GOODY_COMMERCE_SANDBOX === 'true'
        ? 'https://sandbox.ongoody.com/plus/organization/api/commerce'
        : 'https://www.ongoody.com/plus/organization/api/commerce',
      note: 'Configure this webhook URL in your Goody dashboard under Organization → Commerce API',
    },
  });
}
