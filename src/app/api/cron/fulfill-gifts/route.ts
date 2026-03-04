/**
 * Cron Job: Fulfill PostScript Gifts
 * GET /api/cron/fulfill-gifts
 * 
 * Runs daily to check for PostScript gifts that need to be sent to Goody.
 * Timing rules:
 * - Gift of Choice (choice): Send 7 days before delivery
 * - Physical products (product): Send 21 days before delivery
 * 
 * Should be called by a cron service (e.g., Vercel Cron, AWS EventBridge)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDays, isAfter, isBefore, parseISO, startOfDay } from 'date-fns'

// Days before delivery to send each gift type
const FULFILLMENT_LEAD_DAYS = {
  choice: 7,   // Gift of Choice - 1 week before
  product: 21, // Physical product - 3 weeks before
}

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

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const today = startOfDay(new Date())
  
  const results = {
    processed: 0,
    fulfilled: 0,
    failed: 0,
    skipped: 0,
    details: [] as Array<{
      postscriptId: string
      giftId: string
      giftType: string
      status: 'fulfilled' | 'failed' | 'skipped'
      error?: string
    }>,
  }

  try {
    // Get all paid gifts that haven't been sent yet
    const { data: pendingGifts, error: fetchError } = await supabase
      .from('postscript_gifts')
      .select(`
        id,
        postscript_id,
        gift_type,
        flex_gift_amount,
        product_id,
        name,
        quantity,
        provider_data,
        postscripts:postscript_id (
          id,
          delivery_date,
          delivery_type,
          recipient_name,
          recipient_email,
          recipient_phone,
          recipient_contact_id,
          status
        )
      `)
      .eq('payment_status', 'paid')
      .eq('status', 'paid')
      .is('sent_at', null)

    if (fetchError) {
      console.error('Error fetching pending gifts:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch pending gifts' }, { status: 500 })
    }

    if (!pendingGifts || pendingGifts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending gifts to process',
        ...results,
      })
    }

    // Process each gift
    for (const gift of pendingGifts) {
      results.processed++
      
      const postscript = Array.isArray(gift.postscripts) 
        ? gift.postscripts[0] 
        : gift.postscripts

      if (!postscript) {
        results.skipped++
        results.details.push({
          postscriptId: gift.postscript_id,
          giftId: gift.id,
          giftType: gift.gift_type || 'unknown',
          status: 'skipped',
          error: 'PostScript not found',
        })
        continue
      }

      // Skip if postscript is cancelled or already sent
      if (postscript.status === 'cancelled' || postscript.status === 'sent') {
        results.skipped++
        results.details.push({
          postscriptId: gift.postscript_id,
          giftId: gift.id,
          giftType: gift.gift_type || 'unknown',
          status: 'skipped',
          error: `PostScript status: ${postscript.status}`,
        })
        continue
      }

      // For "passing" type, skip (will be triggered manually)
      if (postscript.delivery_type === 'passing') {
        results.skipped++
        results.details.push({
          postscriptId: gift.postscript_id,
          giftId: gift.id,
          giftType: gift.gift_type || 'unknown',
          status: 'skipped',
          error: 'Delivery type is "passing" - manual trigger required',
        })
        continue
      }

      // Check if it's time to fulfill
      if (!postscript.delivery_date) {
        results.skipped++
        results.details.push({
          postscriptId: gift.postscript_id,
          giftId: gift.id,
          giftType: gift.gift_type || 'unknown',
          status: 'skipped',
          error: 'No delivery date set',
        })
        continue
      }

      const deliveryDate = parseISO(postscript.delivery_date)
      const giftType = gift.gift_type || 'product'
      const leadDays = FULFILLMENT_LEAD_DAYS[giftType as keyof typeof FULFILLMENT_LEAD_DAYS] || 21
      const fulfillmentDate = addDays(deliveryDate, -leadDays)

      // Only fulfill if we've reached or passed the fulfillment date
      if (isBefore(today, fulfillmentDate)) {
        results.skipped++
        results.details.push({
          postscriptId: gift.postscript_id,
          giftId: gift.id,
          giftType,
          status: 'skipped',
          error: `Too early - fulfillment date is ${fulfillmentDate.toISOString().split('T')[0]}`,
        })
        continue
      }

      // Time to fulfill this gift!
      try {
        const fulfillResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/postscripts/${gift.postscript_id}/gifts/fulfill`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!fulfillResponse.ok) {
          const errorData = await fulfillResponse.json()
          throw new Error(errorData.error || 'Fulfillment failed')
        }

        results.fulfilled++
        results.details.push({
          postscriptId: gift.postscript_id,
          giftId: gift.id,
          giftType,
          status: 'fulfilled',
        })

      } catch (fulfillError: any) {
        console.error(`Failed to fulfill gift ${gift.id}:`, fulfillError)
        results.failed++
        results.details.push({
          postscriptId: gift.postscript_id,
          giftId: gift.id,
          giftType,
          status: 'failed',
          error: fulfillError.message,
        })
      }
    }

    return NextResponse.json({
      success: results.failed === 0,
      ...results,
    })

  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    )
  }
}
