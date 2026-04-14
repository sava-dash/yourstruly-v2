import { NextResponse } from 'next/server'

/**
 * DEPRECATED — Stripe Checkout Session redirect flow.
 *
 * Replaced by the in-page PaymentIntent + Stripe Elements flow driven by
 * `/api/photobook/order` and `CheckoutFlow.tsx`. The old redirect left
 * paid orders stranded because nothing submitted them to Prodigi.
 *
 * This stub returns HTTP 410 Gone so any stale client code fails loudly
 * rather than silently creating orphan Stripe sessions.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint deprecated. Use /api/photobook/order.' },
    { status: 410 }
  )
}
