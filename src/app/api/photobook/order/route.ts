import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe'
import { estimateOrder } from '@/lib/marketplace/providers/prodigi'
import { randomUUID } from 'crypto'
import {
  ADD_ONS,
  COVER_TYPES,
  PAPER_FINISH,
  BINDING,
  normalizeAddOns,
  normalizeProductOptions,
} from '@/lib/photobook/product-options'

// Markup percentage for photobook orders
const MARKUP_PERCENTAGE = 0.30 // 30%

// POST /api/photobook/order - Place order with Prodigi, create Stripe payment
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    project_id,
    shipping_address,
    shipping_method = 'standard',
    payment_method_id, // Stripe payment method ID (optional - for immediate charge)
    return_url, // URL to return to after payment
  } = body

  if (!project_id) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
  }

  if (!shipping_address) {
    return NextResponse.json({ error: 'shipping_address is required' }, { status: 400 })
  }

  const requiredFields = ['name', 'line1', 'city', 'zip', 'countryCode']
  for (const field of requiredFields) {
    if (!shipping_address[field]) {
      return NextResponse.json(
        { error: `shipping_address.${field} is required` },
        { status: 400 }
      )
    }
  }

  // Fetch project with pages
  const { data: project, error: projectError } = await supabase
    .from('photobook_projects')
    .select(`
      *,
      photobook_pages (
        id,
        page_number,
        page_type,
        layout,
        content
      )
    `)
    .eq('id', project_id)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  if (project.status === 'ordered') {
    return NextResponse.json(
      { error: 'This project has already been ordered' },
      { status: 400 }
    )
  }

  if (!project.product_sku) {
    return NextResponse.json(
      { error: 'Project does not have a product SKU configured' },
      { status: 400 }
    )
  }

  // Generate idempotency key for Prodigi
  const idempotencyKey = randomUUID()

  try {
    // PR 3: fold cover/finish/binding + add-on prices into the order cost
    // and forward the picks to Prodigi as attributes for fulfillment config.
    const productOptions = normalizeProductOptions(project.product_options)
    const selectedAddOns = normalizeAddOns(project.add_ons)
    const optionDelta =
      (COVER_TYPES.find((c) => c.id === productOptions.coverType)?.priceDelta ?? 0) +
      (PAPER_FINISH.find((c) => c.id === productOptions.paperFinish)?.priceDelta ?? 0) +
      (BINDING.find((c) => c.id === productOptions.binding)?.priceDelta ?? 0)
    const addOnsAmount = selectedAddOns.reduce(
      (sum, id) => sum + (ADD_ONS.find((a) => a.id === id)?.price ?? 0),
      0,
    )

    // Get fresh quote for order total
    const quote = await estimateOrder(
      [{
        productId: project.product_sku,
        variantId: project.product_sku,
        quantity: 1,
        attributes: {
          pageCount: String(project.page_count),
          coverType: productOptions.coverType,
          paperFinish: productOptions.paperFinish,
          binding: productOptions.binding,
          addOns: selectedAddOns.join(','),
          size: String(project.size ?? ''),
        },
      }],
      {
        line1: shipping_address.line1,
        line2: shipping_address.line2,
        city: shipping_address.city,
        state: shipping_address.state,
        zip: shipping_address.zip,
        countryCode: shipping_address.countryCode,
      }
    )

    // Calculate total with markup. Option deltas ride along with the print
    // subtotal (they're hardware/material upgrades), add-ons are billed at
    // their flat retail price on top.
    const adjustedSubtotal = Math.max(0, quote.subtotal + optionDelta)
    const productCostWithMarkup = adjustedSubtotal * (1 + MARKUP_PERCENTAGE)
    const totalWithMarkup =
      productCostWithMarkup + addOnsAmount + quote.shipping + quote.tax
    const totalCents = Math.round(totalWithMarkup * 100)

    // Create Stripe Payment Intent
    const paymentIntent = await getStripeServer().paymentIntents.create({
      amount: totalCents,
      currency: quote.currency.toLowerCase(),
      metadata: {
        project_id,
        user_id: user.id,
        type: 'photobook_order',
        idempotency_key: idempotencyKey,
      },
      automatic_payment_methods: {
        enabled: true,
      },
      ...(payment_method_id && {
        payment_method: payment_method_id,
        confirm: true,
        return_url: return_url || `${process.env.NEXT_PUBLIC_APP_URL}/photobook/order-complete`,
      }),
    })

    // Save order to database using admin client
    const adminSupabase = createAdminClient()
    
    const { data: order, error: orderError } = await adminSupabase
      .from('photobook_orders')
      .insert({
        user_id: user.id,
        project_id,
        stripe_payment_intent_id: paymentIntent.id,
        idempotency_key: idempotencyKey,
        status: 'pending_payment',
        shipping_name: shipping_address.name,
        shipping_line1: shipping_address.line1,
        shipping_line2: shipping_address.line2,
        shipping_city: shipping_address.city,
        shipping_state: shipping_address.state,
        shipping_zip: shipping_address.zip,
        shipping_country: shipping_address.countryCode,
        shipping_method,
        product_cost: adjustedSubtotal + addOnsAmount,
        markup_amount: adjustedSubtotal * MARKUP_PERCENTAGE,
        shipping_cost: quote.shipping,
        tax_amount: quote.tax,
        total_amount: totalWithMarkup,
        currency: quote.currency,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      // Cancel the payment intent if order save fails
      await getStripeServer().paymentIntents.cancel(paymentIntent.id)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Update project status
    await supabase
      .from('photobook_projects')
      .update({ 
        status: 'ordered',
        updated_at: new Date().toISOString()
      })
      .eq('id', project_id)

    // Return payment intent client secret for frontend to complete payment
    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        total_amount: totalWithMarkup,
        currency: quote.currency,
      },
      payment: {
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Photobook order error:', error)
    return NextResponse.json(
      { error: 'Failed to process order' },
      { status: 500 }
    )
  }
}
