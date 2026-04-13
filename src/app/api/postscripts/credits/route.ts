import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch user's postscript credit info
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Read credits directly from user_xp table (single source of truth)
  const { data: userXp } = await supabase
    .from('user_xp')
    .select('postscripts_available, postscripts_used, is_premium, available_xp')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    credits: {
      total_credits: userXp?.postscripts_available ?? 0,
      used_this_month: userXp?.postscripts_used ?? 0,
      is_premium: userXp?.is_premium ?? false,
      seat_count: 1,
      monthly_allowance: userXp?.is_premium ? 3 : 0,
      next_refresh_date: null
    },
    xp: {
      available: userXp?.available_xp ?? 0,
      trade_cost: 200
    }
  })
}

// POST - Purchase or trade for credits
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, bundle_type } = body

  // Handle XP trade
  if (action === 'trade_xp') {
    const { data: success, error } = await supabase
      .rpc('trade_xp_for_postscript', { p_user_id: user.id, p_xp_cost: 200 })

    if (error || !success) {
      console.error('XP trade error:', error)
      return NextResponse.json(
        { error: error?.message || 'Insufficient XP. You need 200 XP to trade for 1 postscript credit.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully traded 200 XP for 1 postscript credit!' 
    })
  }

  // Handle bundle purchase (creates a Stripe checkout session)
  if (action === 'purchase') {
    const bundles: Record<string, { amount: number; price_cents: number; name: string }> = {
      '1_pack': { amount: 1, price_cents: 500, name: '1 Postscript Credit' },
      '5_pack': { amount: 5, price_cents: 2000, name: '5 Postscript Credits' }
    }

    const bundle = bundles[bundle_type]
    if (!bundle) {
      return NextResponse.json({ error: 'Invalid bundle type' }, { status: 400 })
    }

    // For now, directly add credits (in production, use Stripe)
    // TODO: Implement Stripe checkout for real payments
    const { data: success, error } = await supabase
      .rpc('add_purchased_credits', {
        p_user_id: user.id,
        p_amount: bundle.amount,
        p_price_cents: bundle.price_cents,
        p_bundle_type: bundle_type,
        p_stripe_payment_id: null // Would be from Stripe in production
      })

    if (error || !success) {
      console.error('Purchase error:', error)
      return NextResponse.json(
        { error: error?.message || 'Failed to add credits' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${bundle.amount} postscript credit(s)!`
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
