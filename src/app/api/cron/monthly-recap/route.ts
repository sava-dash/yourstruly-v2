/**
 * Cron Job: Monthly Recap Email
 * GET /api/cron/monthly-recap
 *
 * Sends a personalized recap email to every active user with activity
 * in the previous month. Should be triggered on the 1st of each month.
 *
 * Protected by CRON_SECRET (Bearer token).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend } from '@/lib/email'
import { buildMonthlyRecapEmail, type MonthlyRecapData } from '@/lib/emails/monthly-recap'

const FROM_EMAIL = process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
}

/**
 * Fetch recap stats for a single user in a given date range.
 */
async function getUserRecapData(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  startDate: string,
  endDate: string
) {
  const [memories, photos, voices, wisdom, tags] = await Promise.all([
    supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lt('created_at', endDate),
    supabase
      .from('memory_media')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('file_type', 'image')
      .gte('created_at', startDate)
      .lt('created_at', endDate),
    supabase
      .from('memory_media')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('file_type', 'audio')
      .gte('created_at', startDate)
      .lt('created_at', endDate),
    supabase
      .from('wisdom_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lt('created_at', endDate),
    supabase
      .from('face_tags')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('contact_id', 'is', null)
      .gte('created_at', startDate)
      .lt('created_at', endDate),
  ])

  const memoriesCount = memories.count || 0
  const photosCount = photos.count || 0
  const voicesCount = voices.count || 0
  const wisdomCount = wisdom.count || 0
  const tagsCount = tags.count || 0
  const totalItems = memoriesCount + photosCount + voicesCount + wisdomCount

  // Generate highlights
  const highlights: string[] = []
  if (memoriesCount > 0) highlights.push(`You created ${memoriesCount} memor${memoriesCount === 1 ? 'y' : 'ies'} 📝`)
  if (photosCount > 0) highlights.push(`You uploaded ${photosCount} photo${photosCount === 1 ? '' : 's'} 📸`)
  if (voicesCount > 0) highlights.push(`You recorded ${voicesCount} voice memor${voicesCount === 1 ? 'y' : 'ies'} 🎙️`)
  if (wisdomCount > 0) highlights.push(`You shared ${wisdomCount} piece${wisdomCount === 1 ? '' : 's'} of wisdom 💡`)
  if (tagsCount > 0) highlights.push(`You tagged ${tagsCount} face${tagsCount === 1 ? '' : 's'} in photos 👤`)
  if (totalItems >= 20) highlights.push('🔥 Your most active month yet!')

  return {
    memoriesCount,
    photosCount,
    voicesCount,
    wisdomCount,
    tagsCount,
    totalItems,
    highlights,
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resend = getResend()
  if (!resend) {
    return NextResponse.json(
      { error: 'Email service not configured (RESEND_API_KEY missing)' },
      { status: 500 }
    )
  }

  // Calculate previous month range
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const startDate = prevMonth.toISOString()
  const endDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthName = prevMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const supabase = createAdminClient()

  const results = {
    total_users: 0,
    emailed: 0,
    skipped: 0,
    failed: 0,
    errors: [] as Array<{ email: string; error: string }>,
  }

  try {
    // Fetch all active users via auth.users joined with profiles
    // Using profiles table which has user_id, full_name, etc.
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')

    if (profilesError) {
      console.error('[MonthlyRecap] Failed to fetch profiles:', profilesError)
      return NextResponse.json(
        { error: 'Failed to fetch user profiles', details: profilesError.message },
        { status: 500 }
      )
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, message: 'No users found', ...results })
    }

    results.total_users = profiles.length
    console.log(`[MonthlyRecap] Processing ${profiles.length} users for ${monthName}`)

    for (const profile of profiles as UserProfile[]) {
      if (!profile.email) {
        results.skipped++
        continue
      }

      try {
        const recapData = await getUserRecapData(supabase, profile.id, startDate, endDate)

        // Skip users with zero activity
        if (recapData.totalItems === 0) {
          results.skipped++
          continue
        }

        const emailData: MonthlyRecapData = {
          userName: profile.full_name || 'there',
          monthName,
          ...recapData,
        }

        const { subject, html, text } = buildMonthlyRecapEmail(emailData)

        const { error: sendError } = await resend.emails.send({
          from: FROM_EMAIL,
          to: profile.email,
          subject,
          html,
          text,
        })

        if (sendError) {
          console.error(`[MonthlyRecap] Failed to email ${profile.email}:`, sendError)
          results.failed++
          results.errors.push({ email: profile.email, error: sendError.message })
        } else {
          console.log(`[MonthlyRecap] Sent recap to ${profile.email} (${recapData.totalItems} items)`)
          results.emailed++
        }
      } catch (err: any) {
        console.error(`[MonthlyRecap] Error processing ${profile.email}:`, err)
        results.failed++
        results.errors.push({ email: profile.email, error: err.message || 'Unknown error' })
      }
    }

    console.log(`[MonthlyRecap] Done: ${results.emailed} sent, ${results.skipped} skipped, ${results.failed} failed`)

    return NextResponse.json({
      success: results.failed === 0,
      month: monthName,
      ...results,
    })
  } catch (error: any) {
    console.error('[MonthlyRecap] Cron job error:', error)
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    )
  }
}
