import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

/**
 * POST /api/mobile-upload/token
 *
 * Creates a short-lived upload token for a user. The token is stored in the
 * `mobile_upload_tokens` table with a 1-hour expiry. When scanned via QR code,
 * the mobile page uses this token to upload files to the user's account
 * without requiring a fresh login.
 *
 * Response: { token, url, expiresAt }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a one-time token
    const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').slice(0, 16)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    // Store the token via admin client (table has RLS)
    const admin = createAdminClient()
    const { error } = await admin
      .from('mobile_upload_tokens')
      .insert({
        token,
        user_id: user.id,
        expires_at: expiresAt,
      })

    if (error) {
      // Graceful fallback if the table doesn't exist yet — use signed URL approach
      console.error('[mobile-upload/token] insert failed:', error.message)
      return NextResponse.json({
        error: 'Mobile upload tokens table not set up yet. Run the migration.',
        details: error.message,
      }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love'
    const url = `${baseUrl}/m/upload?token=${token}`

    return NextResponse.json({ token, url, expiresAt })
  } catch (err) {
    console.error('[mobile-upload/token] error:', err)
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }
}
