/**
 * Goody Commerce API - Orders
 * POST /api/goody/orders
 * 
 * Creates a gift order batch through Goody Commerce API.
 * Supports both gift links (no address required) and direct shipping.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as Goody from '@/lib/marketplace/providers/goody';

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

/**
 * POST /api/goody/orders
 * 
 * Request body:
 * {
 *   fromName: string;           // Sender's name
 *   sendMethod: 'email_and_link' | 'link_multiple_custom_list' | 'direct_send';
 *   recipients: [{
 *     firstName: string;
 *     lastName?: string;
 *     email?: string;           // Required for email_and_link
 *     phone?: string;
 *     address?: {               // Required for direct_send
 *       firstName: string;
 *       lastName: string;
 *       address1: string;
 *       address2?: string;
 *       city: string;
 *       state: string;
 *       postalCode: string;
 *       country: string;
 *     }
 *   }];
 *   cartItems: [{
 *     productId: string;
 *     quantity: number;
 *   }];
 *   message?: string;           // Gift message
 *   cardId?: string;            // Digital greeting card ID
 *   scheduledSendOn?: string;   // ISO 8601 date for scheduled sends
 *   expiresAt?: string;         // ISO 8601 date for gift expiration
 *   
 *   // PostScript integration
 *   postscriptId?: string;
 *   contactId?: string;
 * }
 * 
 * Response:
 * {
 *   success: true;
 *   orderBatch: GoodyOrderBatch;
 *   giftLinks: string[];        // Individual gift links for recipients
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Goody is configured
    if (!Goody.isConfigured()) {
      return NextResponse.json(
        { 
          error: 'Goody Commerce API not configured',
          message: 'Please set GOODY_COMMERCE_API_KEY in environment variables',
        },
        { status: 503 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.fromName) {
      return NextResponse.json(
        { error: 'fromName is required' },
        { status: 400 }
      );
    }

    if (!body.sendMethod) {
      return NextResponse.json(
        { error: 'sendMethod is required' },
        { status: 400 }
      );
    }

    if (!body.recipients || !Array.isArray(body.recipients) || body.recipients.length === 0) {
      return NextResponse.json(
        { error: 'recipients array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!body.cartItems || !Array.isArray(body.cartItems) || body.cartItems.length === 0) {
      return NextResponse.json(
        { error: 'cartItems array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate recipient data based on send method
    for (const recipient of body.recipients) {
      if (!recipient.firstName) {
        return NextResponse.json(
          { error: 'Each recipient must have a firstName' },
          { status: 400 }
        );
      }

      if (body.sendMethod === 'email_and_link' && !recipient.email) {
        return NextResponse.json(
          { error: 'email is required for each recipient when using email_and_link send method' },
          { status: 400 }
        );
      }

      if (body.sendMethod === 'direct_send') {
        if (!recipient.address) {
          return NextResponse.json(
            { error: 'address is required for each recipient when using direct_send' },
            { status: 400 }
          );
        }
        const addr = recipient.address;
        if (!addr.address1 || !addr.city || !addr.state || !addr.postalCode || !addr.country) {
          return NextResponse.json(
            { error: 'address must include address1, city, state, postalCode, and country' },
            { status: 400 }
          );
        }
      }
    }

    // Transform recipients to Goody format
    const goodyRecipients = body.recipients.map((r: {
      firstName: string;
      lastName?: string;
      email?: string;
      phone?: string;
      address?: {
        firstName: string;
        lastName: string;
        address1: string;
        address2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
    }) => ({
      first_name: r.firstName,
      last_name: r.lastName,
      email: r.email,
      phone: r.phone,
      mailing_address: r.address ? {
        first_name: r.address.firstName,
        last_name: r.address.lastName,
        address_1: r.address.address1,
        address_2: r.address.address2,
        city: r.address.city,
        state: r.address.state,
        postal_code: r.address.postalCode,
        country: r.address.country,
      } : undefined,
    }));

    // Calculate price first (optional but recommended)
    const priceEstimate = await Goody.calculatePrice({
      sendMethod: body.sendMethod,
      recipients: goodyRecipients,
      cartItems: body.cartItems.map((item: { productId: string; quantity: number }) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });

    // Create the order batch
    const orderBatch = await Goody.createOrderBatch({
      fromName: body.fromName,
      sendMethod: body.sendMethod,
      recipients: goodyRecipients,
      cartItems: body.cartItems.map((item: { productId: string; quantity: number }) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      message: body.message,
      cardId: body.cardId,
      scheduledSendOn: body.scheduledSendOn,
      expiresAt: body.expiresAt,
    });

    // Store order information in database if postscriptId is provided
    if (body.postscriptId) {
      const giftLinks = orderBatch.orders_preview?.map((order: { individual_gift_link: string }) => order.individual_gift_link) || [];
      
      // Store in database for tracking
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (getSupabaseAdmin().from('postscript_gifts') as any).insert({
        postscript_id: body.postscriptId,
        contact_id: body.contactId,
        provider: 'goody',
        provider_order_batch_id: orderBatch.id,
        status: orderBatch.send_status,
        amount_total: priceEstimate?.amountTotal || null,
        gift_links: giftLinks,
        metadata: {
          from_name: body.fromName,
          message: body.message,
          cart_items: body.cartItems,
          send_method: body.sendMethod,
        },
        created_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error('Error storing gift order in database:', dbError);
        // Don't fail the request, just log the error
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      orderBatch: {
        id: orderBatch.id,
        sendStatus: orderBatch.send_status,
        fromName: orderBatch.from_name,
        message: orderBatch.message,
        ordersCount: orderBatch.orders_count,
        recipientsCount: orderBatch.recipients_count,
        sendMethod: orderBatch.send_method,
        isScheduledSend: orderBatch.is_scheduled_send,
        scheduledSendOn: orderBatch.scheduled_send_on,
        expiresAt: orderBatch.expires_at,
      },
      giftLinks: orderBatch.orders_preview?.map((order: { 
        id: string; 
        individual_gift_link: string;
        recipient_first_name: string;
        recipient_last_name?: string;
        status: string;
      }) => ({
        orderId: order.id,
        link: order.individual_gift_link,
        recipientName: `${order.recipient_first_name} ${order.recipient_last_name || ''}`.trim(),
        status: order.status,
      })) || [],
      priceEstimate: priceEstimate ? {
        product: priceEstimate.amountProduct / 100,
        shipping: priceEstimate.amountShipping / 100,
        processingFee: priceEstimate.amountProcessingFee / 100,
        preTaxTotal: priceEstimate.amountPreTaxTotal / 100,
        tax: priceEstimate.amountTax ? priceEstimate.amountTax / 100 : null,
        total: priceEstimate.amountTotal ? priceEstimate.amountTotal / 100 : null,
        currency: 'USD',
      } : null,
    });

  } catch (error) {
    console.error('Goody create order error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/goody/orders
 * 
 * Query parameters:
 * - orderBatchId: Get specific order batch details
 * - page: Page number for listing (default: 1)
 * - perPage: Items per page (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    // Check if Goody is configured
    if (!Goody.isConfigured()) {
      return NextResponse.json(
        { 
          error: 'Goody Commerce API not configured',
          message: 'Please set GOODY_COMMERCE_API_KEY in environment variables',
        },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const orderBatchId = searchParams.get('orderBatchId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') || '50')));

    if (orderBatchId) {
      // Get specific order batch
      const orderBatch = await Goody.getOrderBatch(orderBatchId);
      return NextResponse.json({ orderBatch });
    }

    // List all order batches
    const orderBatches = await Goody.listOrderBatches(page, perPage);
    return NextResponse.json({ orderBatches });

  } catch (error) {
    console.error('Goody orders API error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
