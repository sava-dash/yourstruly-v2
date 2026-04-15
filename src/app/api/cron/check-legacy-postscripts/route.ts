/**
 * Cron Job: Legacy-Executor PostScript Check (F3)
 * GET /api/cron/check-legacy-postscripts
 *
 * Runs daily. Finds postscripts with trigger_type='legacy_executor' where:
 *   - executor_verified_at IS NULL
 *   - the owning user has not signed in for >= LEGACY_INACTIVITY_DAYS days
 *
 * For each match, sends the named executor a one-click verify email.
 * The executor confirms via /legacy-confirm/[token].
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend } from '@/lib/email'

const LEGACY_INACTIVITY_DAYS = parseInt(process.env.LEGACY_INACTIVITY_DAYS || '180', 10)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love'
const FROM_EMAIL = process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>'
const BATCH_SIZE = 50

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const supabase = createAdminClient()

  // 1) Find candidate postscripts
  const { data: candidates, error: fetchErr } = await supabase
    .from('postscripts')
    .select('id, user_id, executor_email, executor_name, recipient_name, title')
    .eq('trigger_type', 'legacy_executor')
    .is('executor_verified_at', null)
    .eq('status', 'scheduled')
    .not('executor_email', 'is', null)
    .limit(BATCH_SIZE)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ message: 'No legacy candidates', processed: 0, duration: Date.now() - startedAt })
  }

  const cutoff = new Date(Date.now() - LEGACY_INACTIVITY_DAYS * 24 * 60 * 60 * 1000)
  const resend = getResend()

  let emailed = 0
  let skipped = 0
  const errors: Array<{ id: string; error: string }> = []

  for (const ps of candidates) {
    try {
      // Check user's last_sign_in_at
      const { data: userResp, error: userErr } = await supabase.auth.admin.getUserById(ps.user_id)
      if (userErr || !userResp?.user) {
        skipped++
        continue
      }
      const lastSignIn = userResp.user.last_sign_in_at ? new Date(userResp.user.last_sign_in_at) : null
      if (lastSignIn && lastSignIn > cutoff) {
        skipped++
        continue
      }

      // Skip if we already sent a token in the last 30 days
      const { data: existingToken } = await supabase
        .from('legacy_executor_tokens')
        .select('id, sent_at, confirmed_at')
        .eq('postscript_id', ps.id)
        .is('confirmed_at', null)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingToken?.sent_at) {
        const sentAge = Date.now() - new Date(existingToken.sent_at).getTime()
        if (sentAge < 30 * 24 * 60 * 60 * 1000) {
          skipped++
          continue
        }
      }

      // Generate a fresh token
      const token =
        crypto.randomUUID().replace(/-/g, '') +
        crypto.randomUUID().replace(/-/g, '').slice(0, 8)

      const { error: insErr } = await supabase
        .from('legacy_executor_tokens')
        .insert({
          postscript_id: ps.id,
          token,
          executor_email: ps.executor_email!,
          executor_name: ps.executor_name,
          user_id: ps.user_id,
        })
      if (insErr) {
        errors.push({ id: ps.id, error: insErr.message })
        continue
      }

      // Resolve sender name
      let senderName = 'Someone you know'
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', ps.user_id)
        .single()
      if (profile?.full_name) senderName = profile.full_name

      const verifyUrl = `${APP_URL}/legacy-confirm/${token}`
      const subject = `${senderName} asked you to confirm something on YoursTruly`
      const html = `
        <div style="font-family: 'Inter Tight', system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #2d2d2d; background: #F2F1E5;">
          <h2 style="font-family: Playfair Display, serif; color: #406A56; font-weight: 600;">A gentle ask, ${ps.executor_name || 'friend'}.</h2>
          <p>Some time ago, ${senderName} wrote a message and named you as the trusted person who would let us know when the time came to deliver it.</p>
          <p>We haven't seen ${senderName} on YoursTruly for a while, and we want to make sure we don't deliver too soon.</p>
          <p style="margin: 28px 0;">
            <a href="${verifyUrl}" style="background:#406A56;color:#fff;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block;">Open the confirmation page</a>
          </p>
          <p style="font-size: 13px; color: #666;">If you got this by mistake, just ignore the email — nothing will happen.</p>
          <p style="font-size: 12px; color: #999; margin-top: 32px;">YoursTruly · ${APP_URL}</p>
        </div>
      `
      const text =
        `${ps.executor_name || 'Hello'},\n\n` +
        `${senderName} named you as a trusted contact on YoursTruly.\n` +
        `We haven't seen them for a while. Please open the link below if you can confirm:\n\n${verifyUrl}\n\n` +
        `If this isn't right, ignore this email.`

      if (resend) {
        const { error: emailErr } = await resend.emails.send({
          from: FROM_EMAIL,
          to: ps.executor_email!,
          subject,
          html,
          text,
        })
        if (emailErr) {
          errors.push({ id: ps.id, error: emailErr.message })
          continue
        }
      } else {
        console.warn('[Cron/Legacy] Resend not configured — token created but no email sent', { token })
      }
      emailed++
    } catch (err) {
      errors.push({ id: ps.id, error: err instanceof Error ? err.message : 'Unknown' })
    }
  }

  return NextResponse.json({
    processed: candidates.length,
    emailed,
    skipped,
    errors,
    duration: Date.now() - startedAt,
  })
}
