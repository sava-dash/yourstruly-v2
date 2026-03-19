import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CONFIG, mergeConfig, type GamificationConfig } from '@/lib/gamification-config'

async function getConfig(supabase: any): Promise<GamificationConfig> {
  try {
    const { data } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', 'gamification')
      .single()
    return mergeConfig(data?.value || null)
  } catch {
    return DEFAULT_CONFIG
  }
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

// GET - fetch current week's challenges
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekStart = getWeekStart()

  // Check if challenges exist for this week
  let { data: challenges } = await supabase
    .from('weekly_challenges')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .order('created_at')

  // Auto-generate if none exist
  if (!challenges || challenges.length === 0) {
    const config = await getConfig(supabase)
    const picked = pickRandom(config.challengeTemplates, 3)
    const newChallenges = picked.map(t => {
      const target = t.targets[Math.floor(Math.random() * t.targets.length)]
      return {
        user_id: user.id,
        challenge_type: t.type,
        challenge_label: t.label.replace('{n}', String(target)),
        challenge_emoji: t.emoji,
        target_count: target,
        current_count: 0,
        xp_reward: target * 20,
        week_start: weekStart,
      }
    })

    const { data: inserted, error } = await supabase
      .from('weekly_challenges')
      .insert(newChallenges)
      .select()

    if (error) {
      console.error('Challenge generation error:', error)
      return NextResponse.json({ challenges: [], weekStart })
    }
    challenges = inserted
  }

  return NextResponse.json({ challenges, weekStart })
}
