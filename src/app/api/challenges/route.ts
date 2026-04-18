import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CONFIG, mergeConfig, type GamificationConfig, type ChallengeTemplate } from '@/lib/gamification-config'

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

/** Pick 1 easy + 1 medium + 1 hard challenge */
function pickDifficultyMix(templates: ChallengeTemplate[]): ChallengeTemplate[] {
  const easy = templates.filter(t => t.difficulty === 'easy')
  const medium = templates.filter(t => t.difficulty === 'medium')
  const hard = templates.filter(t => t.difficulty === 'hard')

  const picks: ChallengeTemplate[] = []
  if (easy.length > 0) picks.push(pickRandom(easy, 1)[0])
  if (medium.length > 0) picks.push(pickRandom(medium, 1)[0])
  if (hard.length > 0) picks.push(pickRandom(hard, 1)[0])

  // Fallback: if any category is empty, fill from remaining
  while (picks.length < 3 && templates.length > picks.length) {
    const remaining = templates.filter(t => !picks.includes(t))
    if (remaining.length === 0) break
    picks.push(pickRandom(remaining, 1)[0])
  }

  return picks.slice(0, 3)
}

// GET - fetch current week's challenges
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekStart = getWeekStart()

  // Delete old weeks' challenges to prevent accumulation
  await supabase
    .from('weekly_challenges')
    .delete()
    .eq('user_id', user.id)
    .lt('week_start', weekStart)

  // Check if challenges exist for this week (strict week_start match)
  let { data: challenges } = await supabase
    .from('weekly_challenges')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .order('created_at')

  // Auto-generate if none exist — exactly 3 (1 easy + 1 medium + 1 hard)
  if (!challenges || challenges.length === 0) {
    const config = await getConfig(supabase)
    const picked = pickDifficultyMix(config.challengeTemplates)
    const newChallenges = picked.map(t => {
      const target = t.targets[Math.floor(Math.random() * t.targets.length)]
      const baseXp = (t.xpMultiplier || 20) * target
      // Hard challenges award 1.5x XP
      const xpReward = t.difficulty === 'hard' ? Math.round(baseXp * 1.5) : baseXp
      return {
        user_id: user.id,
        challenge_type: t.type,
        challenge_label: t.label.replace('{n}', String(target)),
        challenge_emoji: t.emoji,
        target_count: target,
        current_count: 0,
        xp_reward: xpReward,
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
        case 'enrich_memories': {
          // Count memories updated (edited) this week that have location or extra details
          const { count } = await supabase
            .from('memories')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('updated_at', weekStartDate)
            .not('location', 'is', null)
          actualCount = count || 0
          break
        }
        case 'share_memory': {
          // Count postscripts created/scheduled this week as proxy for shares
          const { count } = await supabase
            .from('postscripts')
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

  // --- Streak logic ---
  // Check if all 3 challenges are completed this week
  const allCompleted = enriched.length === 3 && enriched.every((c: any) => c.completed)

  if (allCompleted) {
    // Fetch current streak info from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('challenge_streak, last_challenge_week')
      .eq('id', user.id)
      .single()

    const currentStreak = profile?.challenge_streak || 0
    const lastWeek = profile?.last_challenge_week || ''

    // Only update streak if we haven't already recorded this week
    if (lastWeek !== weekStart) {
      // Check if last_challenge_week was the previous week (consecutive)
      const prevWeekDate = new Date(weekStart)
      prevWeekDate.setDate(prevWeekDate.getDate() - 7)
      const prevWeekStr = prevWeekDate.toISOString().split('T')[0]

      const newStreak = lastWeek === prevWeekStr ? currentStreak + 1 : 1

      await supabase
        .from('profiles')
        .update({
          challenge_streak: newStreak,
          last_challenge_week: weekStart,
        })
        .eq('id', user.id)
    }
  }

  // Fetch streak for response
  const { data: profileData } = await supabase
    .from('profiles')
    .select('challenge_streak, last_challenge_week')
    .eq('id', user.id)
    .single()

  const streak = profileData?.challenge_streak || 0
  // Streak XP bonus: 10% per 2 consecutive weeks, capped at 30%
  const streakBonus = Math.min(Math.floor(streak / 2) * 10, 30)

  return NextResponse.json({ challenges: enriched, weekStart, streak, streakBonus })
}
