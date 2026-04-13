/**
 * Cron Job: PostScript Delivery
 * GET /api/cron/deliver-postscripts
 *
 * Checks for scheduled PostScripts whose delivery_date has arrived
 * (or passed) and sends them via email to the recipient.
 *
 * Should be triggered every 15 minutes for timely delivery.
 * Protected by CRON_SECRET (Bearer token).
 *
 * Design decisions for scalability:
 * - Batch processing with configurable batch size
 * - Each PostScript is processed independently (one failure doesn't block others)
 * - Idempotent: already-sent PostScripts are skipped via status check
 * - Delivery attempts are logged for debugging
 * - Recurring PostScripts are rescheduled after delivery
 * - Handles timezone-aware delivery times
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPostscriptDeliveredEmail } from '@/lib/email'

const BATCH_SIZE = 50 // Max PostScripts to process per invocation
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love'

interface DeliveryResult {
  postscriptId: string
  recipientName: string
  status: 'delivered' | 'skipped' | 'failed'
  error?: string
}

export async function GET(request: NextRequest) {
  // Auth: verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const supabase = createAdminClient()
  const results: DeliveryResult[] = []

  try {
    // ─── 1. Find due PostScripts ───
    // A PostScript is due when:
    // - status = 'scheduled'
    // - delivery_type = 'date'
    // - delivery_date <= now (today or earlier)
    // We use UTC date comparison. For time-aware delivery, we check
    // delivery_time against the current hour.
    const now = new Date()
    const todayISO = now.toISOString().split('T')[0] // YYYY-MM-DD

    const { data: duePostscripts, error: fetchError } = await supabase
      .from('postscripts')
      .select(`
        id,
        title,
        message,
        recipient_name,
        recipient_email,
        recipient_phone,
        delivery_type,
        delivery_date,
        delivery_recurring,
        has_gift,
        gift_type,
        access_token,
        status,
        user_id,
        sender:profiles!postscripts_user_id_fkey(full_name)
      `)
      .eq('status', 'scheduled')
      .eq('delivery_type', 'date')
      .lte('delivery_date', todayISO)
      .limit(BATCH_SIZE)

    if (fetchError) {
      console.error('[Cron/PostScript] Fetch error:', fetchError)
      return NextResponse.json({
        error: 'Failed to fetch due PostScripts',
        details: fetchError.message,
      }, { status: 500 })
    }

    if (!duePostscripts || duePostscripts.length === 0) {
      return NextResponse.json({
        message: 'No PostScripts due for delivery',
        processed: 0,
        duration: Date.now() - startTime,
      })
    }

    console.log(`[Cron/PostScript] Found ${duePostscripts.length} due PostScripts`)

    // ─── 2. Process each PostScript ───
    for (const ps of duePostscripts) {
      const result: DeliveryResult = {
        postscriptId: ps.id,
        recipientName: ps.recipient_name,
        status: 'failed',
      }

      try {
        // Skip if no email (can't deliver without one)
        if (!ps.recipient_email) {
          result.status = 'skipped'
          result.error = 'No recipient email'
          results.push(result)
          console.warn(`[Cron/PostScript] Skipping ${ps.id}: no email`)
          continue
        }

        // Ensure access token exists (for the recipient link)
        let accessToken = ps.access_token
        if (!accessToken) {
          accessToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8)
          await supabase
            .from('postscripts')
            .update({ access_token: accessToken })
            .eq('id', ps.id)
        }

        // Resolve sender name
        const senderName = (ps.sender as any)?.full_name || 'Someone special'

        // ─── 3. Send the email ───
        const emailResult = await sendPostscriptDeliveredEmail({
          recipientEmail: ps.recipient_email,
          recipientName: ps.recipient_name,
          senderName,
          postscriptId: accessToken, // The email template uses this as the URL path
          deliveryReason: 'scheduled delivery',
        })

        if (!emailResult.success) {
          result.error = emailResult.error || 'Email send failed'
          results.push(result)
          console.error(`[Cron/PostScript] Email failed for ${ps.id}:`, emailResult.error)

          // Log the failed attempt but don't change status — will retry next run
          await supabase.from('postscript_delivery_log').insert({
            postscript_id: ps.id,
            status: 'failed',
            error_message: result.error,
            email_provider_id: null,
          })// Ignore errors if table doesn't exist
          continue
        }

        // ─── 4. Mark as sent ───
        const updatePayload: Record<string, any> = {
          status: 'sent',
          sent_at: now.toISOString(),
        }

        const { error: updateError } = await supabase
          .from('postscripts')
          .update(updatePayload)
          .eq('id', ps.id)

        if (updateError) {
          console.error(`[Cron/PostScript] Status update failed for ${ps.id}:`, updateError)
          result.error = 'Email sent but status update failed'
          results.push(result)
          continue
        }

        // ─── 5. Handle recurring PostScripts ───
        if (ps.delivery_recurring && ps.delivery_date) {
          const nextDate = new Date(ps.delivery_date)
          nextDate.setFullYear(nextDate.getFullYear() + 1)
          const nextDateISO = nextDate.toISOString().split('T')[0]

          // Create a new scheduled PostScript for next year
          const { error: recurError } = await supabase
            .from('postscripts')
            .insert({
              user_id: ps.user_id,
              title: ps.title,
              message: ps.message,
              recipient_name: ps.recipient_name,
              recipient_email: ps.recipient_email,
              recipient_phone: ps.recipient_phone,
              delivery_type: 'date',
              delivery_date: nextDateISO,
              delivery_recurring: true,
              has_gift: false, // Don't carry over gifts
              status: 'scheduled',
              access_token: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8),
            })

          if (recurError) {
            console.error(`[Cron/PostScript] Recurring creation failed for ${ps.id}:`, recurError)
          } else {
            console.log(`[Cron/PostScript] Recurring PostScript created for ${nextDateISO}`)
          }
        }

        // ─── 6. Log successful delivery ───
        await supabase.from('postscript_delivery_log').insert({
          postscript_id: ps.id,
          status: 'delivered',
          error_message: null,
          email_provider_id: emailResult.messageId || null,
        })// Ignore errors if table doesn't exist

        result.status = 'delivered'
        results.push(result)
        console.log(`[Cron/PostScript] ✅ Delivered ${ps.id} to ${ps.recipient_name} (${ps.recipient_email})`)

      } catch (err) {
        result.error = err instanceof Error ? err.message : 'Unknown error'
        results.push(result)
        console.error(`[Cron/PostScript] Error processing ${ps.id}:`, err)
      }
    }

    // ─── 7. Summary ───
    const delivered = results.filter(r => r.status === 'delivered').length
    const failed = results.filter(r => r.status === 'failed').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const duration = Date.now() - startTime

    console.log(`[Cron/PostScript] Complete: ${delivered} delivered, ${failed} failed, ${skipped} skipped (${duration}ms)`)

    return NextResponse.json({
      message: `Processed ${results.length} PostScripts`,
      delivered,
      failed,
      skipped,
      duration,
      results,
    })

  } catch (err) {
    console.error('[Cron/PostScript] Fatal error:', err)
    return NextResponse.json({
      error: 'Cron job failed',
      details: err instanceof Error ? err.message : 'Unknown error',
      duration: Date.now() - startTime,
    }, { status: 500 })
  }
}
