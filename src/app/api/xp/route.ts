import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/xp — fetch current XP total
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profileRes, xpRes] = await Promise.all([
    supabase.from('profiles').select('total_xp').eq('id', user.id).single(),
    supabase.from('user_xp').select('available_xp').eq('user_id', user.id).single(),
  ])

  if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 500 })

  // Use available_xp (spendable) as the display value if it exists,
  // otherwise fall back to total_xp (lifetime). This keeps the dashboard
  // XP counter in sync with the credits trade modal.
  const availableXp = xpRes.data?.available_xp
  const totalXp = profileRes.data?.total_xp ?? 0

  return NextResponse.json({ totalXp: availableXp ?? totalXp })
}

// POST /api/xp — add XP points
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { amount, reason, sourceId } = body

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }
  if (!reason || typeof reason !== 'string') {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
  }

  // Use the atomic function to add XP
  const { data, error } = await supabase.rpc('add_user_xp', {
    p_user_id: user.id,
    p_amount: amount,
    p_reason: reason,
    p_source_id: sourceId || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ totalXp: data })
}
