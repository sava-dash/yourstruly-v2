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

  // Compute current_count from actual data for each challenge
  const weekStartDate = `${weekStart}T00:00:00.000Z`
  const now = new Date().toISOString()
  
  const enriched = await Promise.all((challenges || []).map(async (c: any) => {
    let actualCount = c.current_count
    try {
      switch (c.challenge_type) {
        case 'tag_faces': {
          const { count } = await supabase
            .from('memory_face_tags')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_confirmed', true)
            .gte('confirmed_at', weekStartDate)
          actualCount = count || 0
          break
        }
        case 'record_voice': {
          const { count } = await supabase
            .from('memories')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .not('audio_url', 'is', null)
            .gte('created_at', weekStartDate)
          actualCount = count || 0
          break
        }
        case 'complete_prompts': {
          const { count } = await supabase
            .from('knowledge_entries')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', weekStartDate)
          actualCount = count || 0
          break
        }
        case 'add_photos': {
          const { count } = await supabase
            .from('memory_media')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('file_type', 'image')
            .gte('created_at', weekStartDate)
          actualCount = count || 0
          break
        }
        case 'add_memories': {
          const { count } = await supabase
            .from('memories')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', weekStartDate)
          actualCount = count || 0
          break
        }
        case 'add_wisdom': {
          const { count } = await supabase
            .from('knowledge_entries')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', weekStartDate)
          actualCount = count || 0
          break
        }
      }
    } catch {}

    const completed = actualCount >= c.target_count
    
    // Update in DB if counts changed
    if (actualCount !== c.current_count || completed !== c.completed) {
      await supabase
        .from('weekly_challenges')
        .update({ 
          current_count: actualCount,
          completed,
          completed_at: completed && !c.completed ? new Date().toISOString() : c.completed_at,
        })
        .eq('id', c.id)
    }

    return { ...c, current_count: actualCount, completed }
  }))

  return NextResponse.json({ challenges: enriched, weekStart })
}
