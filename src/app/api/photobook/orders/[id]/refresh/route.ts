import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrderStatus as getProdigiOrderStatus } from '@/lib/marketplace/providers/prodigi'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/photobook/orders/[id]/refresh
 *
 * Calls Prodigi to refresh the local order's status + tracking. Rate-limited
 * to once per minute per order (based on `updated_at`) so the order page can
 * call this on mount without hammering the upstream provider.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: order, error } = await supabase
    .from('photobook_orders')
    .select('id, prodigi_order_id, status, tracking_number, tracking_url, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (!order.prodigi_order_id) {
    return NextResponse.json({ order, refreshed: false, reason: 'no_prodigi_id' })
  }

  // Rate-limit: skip refresh if updated within the last minute.
  if (order.updated_at) {
    const last = new Date(order.updated_at).getTime()
    if (Date.now() - last < 60_000) {
      return NextResponse.json({ order, refreshed: false, reason: 'rate_limited' })
    }
  }

  try {
    const status = await getProdigiOrderStatus(order.prodigi_order_id)
    const statusMap: Record<string, string> = {
      Draft: 'processing',
      AwaitingPayment: 'processing',
      InProgress: 'processing',
      Shipped: 'shipped',
      Complete: 'delivered',
      Cancelled: 'cancelled',
      OnHold: 'on_hold',
    }
    const newStatus = statusMap[status.status] || order.status
    const tracking = status.tracking?.[0]

    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }
    if (tracking?.number) updates.tracking_number = tracking.number
    if (tracking?.url) updates.tracking_url = tracking.url

    const admin = createAdminClient()
    const { data: updated, error: updErr } = await admin
      .from('photobook_orders')
      .update(updates)
      .eq('id', id)
      .select('id, status, tracking_number, tracking_url, updated_at')
      .single()
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }
    return NextResponse.json({ order: updated, refreshed: true })
  } catch (err) {
    console.error('refresh order error', err)
    return NextResponse.json({ error: 'Failed to refresh from printer' }, { status: 502 })
  }
}
