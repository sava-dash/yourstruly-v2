/**
 * PostScript Gift Fulfillment
 * POST /api/postscripts/[id]/gifts/fulfill
 * 
 * Called when a postscript is delivered to send the attached gift(s) via Goody.
 * Only processes gifts with payment_status='paid' and status='paid'.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as Goody from '@/lib/marketplace/providers/goody'

// Goody Gift of Choice product ID
const GOODY_FLEX_GIFT_PRODUCT_ID = 'b54200a5-b7a9-4812-bab3-d65bb81c3c16'

// Lazy-init Supabase admin client
let _supabaseAdmin: ReturnType<typeof createClient> | null = null
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
    )
  }
  return _supabaseAdmin
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postscriptId } = await params

  // Verify internal API key or admin access
  const authHeader = request.headers.get('authorization')
  const internalKey = process.env.INTERNAL_API_KEY
  
  if (!internalKey || authHeader !== `Bearer ${internalKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  // Get postscript with recipient info
  const { data: postscript, error: postscriptError } = await supabase
    .from('postscripts')
    .select(`
      id,
      title,
      recipient_name,
      recipient_email,
      recipient_phone,
      recipient_contact_id,
      contacts:recipient_contact_id (
        id,
        full_name,
        email,
        phone
      )
    `)
    .eq('id', postscriptId)
    .single()

  if (postscriptError || !postscript) {
    return NextResponse.json({ error: 'PostScript not found' }, { status: 404 })
  }

  // Get paid gifts for this postscript
  const { data: gifts, error: giftsError } = await supabase
    .from('postscript_gifts')
    .select('*')
    .eq('postscript_id', postscriptId)
    .eq('payment_status', 'paid')
    .eq('status', 'paid')

  if (giftsError) {
    console.error('Error fetching gifts:', giftsError)
    return NextResponse.json({ error: 'Failed to fetch gifts' }, { status: 500 })
  }

  if (!gifts || gifts.length === 0) {
    return NextResponse.json({ 
      success: true, 
      message: 'No paid gifts to fulfill',
      fulfilled: 0 
    })
  }

  // Get recipient info
  const contact = Array.isArray(postscript.contacts) 
    ? postscript.contacts[0] 
    : postscript.contacts
  
  const recipientName = contact?.full_name || postscript.recipient_name || 'Friend'
  const recipientEmail = contact?.email || postscript.recipient_email
  const nameParts = recipientName.split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || undefined

  const results: Array<{ giftId: string; success: boolean; error?: string; giftLink?: string }> = []

  // Process each gift
  for (const gift of gifts) {
    try {
      // Build cart items based on gift type
      const cartItems = []
      
      if (gift.gift_type === 'choice') {
        // Gift of Choice - use flex gift product with variable price
        cartItems.push({
          productId: GOODY_FLEX_GIFT_PRODUCT_ID,
          quantity: gift.quantity || 1,
          variablePrice: gift.flex_gift_amount, // Amount in cents
        })
      } else {
        // Specific product
        cartItems.push({
          productId: gift.product_id,
          quantity: gift.quantity || 1,
        })
      }

      // Create order via Goody
      const orderBatch = await Goody.createOrderBatch({
        fromName: 'YoursTruly',
        sendMethod: 'link_multiple_custom_list', // Get link, don't auto-email
        recipients: [{
          first_name: firstName,
          last_name: lastName,
          email: recipientEmail,
        }],
        cartItems,
        message: gift.gift_type === 'choice'
          ? `You've received a special gift! Choose anything you'd like up to $${Math.round(gift.flex_gift_amount / 100)}.`
          : `You've received a special gift!`,
        swap: gift.gift_type === 'choice' ? 'multiple' : 'single',
      })

      // Extract gift link
      const giftLink = orderBatch.orders_preview?.[0]?.individual_gift_link

      // Update gift record
      await supabase
        .from('postscript_gifts')
        .update({
          status: 'sent',
          provider_order_batch_id: orderBatch.id,
          gift_links: giftLink ? [giftLink] : [],
          provider_data: {
            ...gift.provider_data,
            goody_order_batch: orderBatch,
          },
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', gift.id)

      results.push({
        giftId: gift.id,
        success: true,
        giftLink,
      })

    } catch (error: any) {
      console.error(`Error fulfilling gift ${gift.id}:`, error)
      
      // Update gift with error
      await supabase
        .from('postscript_gifts')
        .update({
          status: 'failed',
          provider_data: {
            ...gift.provider_data,
            error: error.message,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', gift.id)

      results.push({
        giftId: gift.id,
        success: false,
        error: error.message,
      })
    }
  }

  const fulfilled = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return NextResponse.json({
    success: failed === 0,
    fulfilled,
    failed,
    results,
  })
}
