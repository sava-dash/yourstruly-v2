import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Cancel a scheduled postscript within the cancel window (F2).
 * Eligibility:
 *  - status = 'scheduled'
 *  - sent_at IS NULL
 *  - delivery is still in the future, OR row was created < 24h ago
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: ps, error: fetchErr } = await supabase
    .from('postscripts')
    .select('id, status, sent_at, delivery_date, created_at, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !ps) {
    return NextResponse.json({ error: 'PostScript not found' }, { status: 404 })
  }

  if (ps.status !== 'scheduled') {
    return NextResponse.json({ error: `Cannot cancel a postscript with status "${ps.status}"` }, { status: 409 })
  }
  if (ps.sent_at) {
    return NextResponse.json({ error: 'PostScript already sent' }, { status: 409 })
  }

  // `delivery_date` is a DATE column in Postgres — parse as UTC midnight
  // so the cancel-window math is stable regardless of server timezone.
  const now = Date.now()
  const createdMs = ps.created_at ? new Date(ps.created_at).getTime() : 0
  const deliveryMs = ps.delivery_date
    ? new Date(`${ps.delivery_date}T00:00:00Z`).getTime()
    : Infinity
  const within24h = new Date(ps.created_at).getTime() > now - 24 * 60 * 60 * 1000 && createdMs > 0
  const futureDelivery = deliveryMs > now

  if (!within24h && !futureDelivery) {
    return NextResponse.json({ error: 'Cancel window has closed' }, { status: 409 })
  }

  const { error: updErr } = await supabase
    .from('postscripts')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
