import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/xp — fetch current XP total
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ totalXp: data?.total_xp ?? 0 })
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
