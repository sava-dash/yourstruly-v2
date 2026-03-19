import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Get the challenge
  const { data: challenge } = await supabase
    .from('weekly_challenges')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

  if (challenge.completed) {
    return NextResponse.json({ challenge, message: 'Already completed' })
  }

  const newCount = challenge.current_count + 1
  const completed = newCount >= challenge.target_count

  const { data: updated, error } = await supabase
    .from('weekly_challenges')
    .update({
      current_count: newCount,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Award XP if completed
  if (completed) {
    try {
      await supabase.rpc('add_xp', { p_user_id: user.id, p_xp: challenge.xp_reward })
    } catch {
      // Fallback: increment XP directly
      const { data: stats } = await supabase
        .from('engagement_stats')
        .select('total_xp')
        .eq('user_id', user.id)
        .single()
      if (stats) {
        await supabase
          .from('engagement_stats')
          .update({ total_xp: (stats.total_xp || 0) + (challenge.xp_reward || 0) })
          .eq('user_id', user.id)
      }
    }
  }

  return NextResponse.json({ challenge: updated, justCompleted: completed })
}
