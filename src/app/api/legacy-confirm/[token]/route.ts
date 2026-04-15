import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET  /api/legacy-confirm/[token] — fetch token state (public; no auth)
 * POST /api/legacy-confirm/[token] — executor confirms; flips postscript executor_verified_at
 *
 * On confirm, the postscript is queued for delivery by setting:
 *   executor_verified_at = now()
 *   delivery_type = 'date'
 *   delivery_date = today
 * so the existing /api/cron/deliver-postscripts pipeline picks it up on the next run.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('legacy_executor_tokens')
    .select('id, postscript_id, executor_email, executor_name, confirmed_at, expires_at, user_id')
    .eq('token', token)
    .single()

  if (error || !row) {
    return NextResponse.json({ error: 'Link not found or expired' }, { status: 404 })
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This link has expired' }, { status: 410 })
  }

  let senderName: string | null = null
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', row.user_id)
    .single()
  if (profile?.full_name) senderName = profile.full_name

  return NextResponse.json({
    confirmed_at: row.confirmed_at,
    sender_name: senderName,
  })
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('legacy_executor_tokens')
    .select('id, postscript_id, confirmed_at, expires_at')
    .eq('token', token)
    .single()

  if (error || !row) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This link has expired' }, { status: 410 })
  }

  const nowIso = new Date().toISOString()

  if (!row.confirmed_at) {
    const { error: tokErr } = await supabase
      .from('legacy_executor_tokens')
      .update({ confirmed_at: nowIso })
      .eq('id', row.id)
    if (tokErr) {
      return NextResponse.json({ error: tokErr.message }, { status: 500 })
    }

    const todayISO = nowIso.split('T')[0]
    const { error: psErr } = await supabase
      .from('postscripts')
      .update({
        executor_verified_at: nowIso,
        delivery_type: 'date',
        delivery_date: todayISO,
        status: 'scheduled',
      })
      .eq('id', row.postscript_id)
    if (psErr) {
      return NextResponse.json({ error: psErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
