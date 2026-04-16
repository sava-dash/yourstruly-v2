/**
 * PostScript Gift Checkout
 * POST /api/postscripts/[id]/gifts/checkout
 * 
 * Creates a Stripe checkout session for a gift attached to a postscript.
 * Supports both specific products and Gift of Choice (flex gifts).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripeServer } from '@/lib/stripe'

// Goody Gift of Choice product ID
const GOODY_FLEX_GIFT_PRODUCT_ID = 'b54200a5-b7a9-4812-bab3-d65bb81c3c16'

// Markup percentage (30%)
const MARKUP_PERCENT = 0.30

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: postscriptId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify postscript ownership
  const { data: postscript } = await supabase
    .from('postscripts')
    .select('id, title, recipient_name, delivery_date, delivery_type')
    .eq('id', postscriptId)
    .eq('user_id', user.id)
    .single()

  if (!postscript) {
    return NextResponse.json({ error: 'PostScript not found' }, { status: 404 })
  }

  const body = await request.json()
  const {
    giftType,           // 'product' or 'choice'
    flexGiftAmount,     // For Gift of Choice: amount in dollars (e.g., 50 for $50)
    productId,          // For specific product
    productName,        // Product display name
    productImage,       // Product image URL
    productPrice,       // Product price in dollars
    quantity = 1,
  } = body

  // Validate based on gift type
  if (giftType === 'choice') {
    if (!flexGiftAmount || flexGiftAmount < 15) {
      return NextResponse.json(
        { error: 'Gift of Choice requires an amount of at least $15' },
        { status: 400 }
      )
    }
  } else if (giftType === 'product') {
    if (!productId || !productName || !productPrice) {
      return NextResponse.json(
        { error: 'Product gifts require productId, productName, and productPrice' },
        { status: 400 }
      )
    }
  } else {
    return NextResponse.json(
      { error: 'giftType must be "product" or "choice"' },
      { status: 400 }
    )
  }

  // Calculate amounts
  let baseAmount: number
  let displayName: string
  let displayImage: string | undefined

  if (giftType === 'choice') {
    baseAmount = flexGiftAmount * 100 // Convert to cents
    displayName = `Gift of Choice - $${flexGiftAmount}`
    displayImage = 'https://assets.ongoody.com/store/gift-of-choice-card.png'
  } else {
    baseAmount = productPrice * 100 // Convert to cents
    displayName = productName
    displayImage = productImage
  }

  // Apply markup
  const amountWithMarkup = Math.round(baseAmount * (1 + MARKUP_PERCENT))

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email, full_name')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id
  const stripe = getStripeServer()

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || profile?.email,
      name: profile?.full_name,
      metadata: { userId: user.id },
    })
    customerId = customer.id

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  // Create the gift record first (unpaid)
  const resolvedProductId = giftType === 'choice' ? GOODY_FLEX_GIFT_PRODUCT_ID : productId
  const { data: gift, error: giftError } = await supabase
    .from('postscript_gifts')
    .insert({
      postscript_id: postscriptId,
      user_id: user.id, // Required by NOT NULL + RLS policy on legacy schema
      // Legacy NOT NULL columns from 044_marketplace_postscript_gifts.sql — populate
      // with sensible defaults so the insert does not violate constraints on installs
      // that still carry the pre-cleanup schema.
      code: resolvedProductId || 'goody-gift',
      market: 'goody',
      title: displayName,
      product_id: resolvedProductId,
      // provider column omitted — defaults to 'goody' at DB level;
      // avoids PGRST204 when PostgREST schema cache is stale.
      name: displayName,
      description: giftType === 'choice'
        ? `Recipient chooses any gift up to $${flexGiftAmount}`
        : null,
      image_url: displayImage,
      price: baseAmount / 100, // Store in dollars
      // currency column defaults to 'USD' at the DB level; omitting the key
      // avoids intermittent PGRST204 "column not found" errors when the
      // PostgREST schema cache is stale after a migration.
      quantity,
      qty: quantity, // Legacy NOT NULL column alongside quantity; keep them in sync
      gift_type: giftType,
      flex_gift_amount: giftType === 'choice' ? flexGiftAmount * 100 : null, // Store in cents
      amount_paid: amountWithMarkup,
      amount_to_provider: baseAmount,
      payment_status: 'pending',
      status: 'pending',
      provider_data: {
        goody_product_id: resolvedProductId,
        is_flex_gift: giftType === 'choice',
      },
    })
    .select()
    .single()

  if (giftError) {
    console.error('[postscript_gifts insert] ', giftError)
    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev) {
      return NextResponse.json(
        {
          error: 'Failed to create gift record',
          code: giftError.code,
          message: giftError.message,
          hint: giftError.hint,
          details: giftError.details,
        },
        { status: 500 }
      )
    }
    // Production: short correlation id, verbose log server-side only.
    const correlationId = `gift-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    console.error(`[postscript_gifts insert] correlationId=${correlationId}`, {
      code: giftError.code,
      message: giftError.message,
      hint: giftError.hint,
      details: giftError.details,
    })
    return NextResponse.json(
      {
        error: 'Failed to create gift record',
        code: giftError.code,
        message: giftError.message,
        correlationId,
      },
      { status: 500 }
    )
  }

  // Create Stripe checkout session
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: displayName,
              description: giftType === 'choice'
                ? `Gift of Choice for ${postscript.recipient_name || 'recipient'} - they pick what they want!`
                : `Gift for ${postscript.recipient_name || 'recipient'}`,
              images: displayImage ? [displayImage] : undefined,
              metadata: {
                giftId: gift.id,
                postscriptId,
                giftType,
              },
            },
            unit_amount: amountWithMarkup,
          },
          quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/postscripts/${postscriptId}?gift_payment=success&gift_id=${gift.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/postscripts/${postscriptId}?gift_payment=cancelled&gift_id=${gift.id}`,
      metadata: {
        type: 'postscript_gift',
        giftId: gift.id,
        postscriptId,
        userId: user.id,
        giftType,
        flexGiftAmount: giftType === 'choice' ? flexGiftAmount.toString() : undefined,
      },
      payment_intent_data: {
        metadata: {
          type: 'postscript_gift',
          giftId: gift.id,
          postscriptId,
        },
      },
    })

    // Update gift with checkout session ID
    await supabase
      .from('postscript_gifts')
      .update({ 
        provider_data: {
          ...gift.provider_data,
          stripe_checkout_session_id: session.id,
        }
      })
      .eq('id', gift.id)

    return NextResponse.json({
      checkoutUrl: session.url,
      giftId: gift.id,
      sessionId: session.id,
    })

  } catch (stripeError) {
    console.error('Stripe checkout error:', stripeError)
    
    // Clean up the gift record
    await supabase
      .from('postscript_gifts')
      .delete()
      .eq('id', gift.id)

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
