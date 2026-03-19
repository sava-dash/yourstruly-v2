import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BADGE_DEFINITIONS } from '../route'
import { DEFAULT_CONFIG, mergeConfig } from '@/lib/gamification-config'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get existing badges
  const { data: existingBadges } = await supabase
    .from('user_badges')
    .select('badge_type')
    .eq('user_id', user.id)

  const earned = new Set((existingBadges || []).map(b => b.badge_type))

  // Get counts
  const [memories, photos, voices, shares, tags, stats] = await Promise.all([
    supabase.from('memories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('memory_media').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('file_type', 'image'),
    supabase.from('memory_media').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('file_type', 'audio'),
    supabase.from('memory_shares').select('id', { count: 'exact', head: true }).eq('shared_by', user.id),
    supabase.from('face_tags').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('contact_id', 'is', null),
    supabase.from('engagement_stats').select('current_streak_days, longest_streak_days').eq('user_id', user.id).single(),
  ])

  const memoryCount = memories.count || 0
  const photoCount = photos.count || 0
  const voiceCount = voices.count || 0
  const shareCount = shares.count || 0
  const tagCount = tags.count || 0
  const streakDays = stats.data?.longest_streak_days || stats.data?.current_streak_days || 0

  // Check completeness (memories with title + description + location + photo)
  const { data: completeMemories } = await supabase
    .from('memories')
    .select('id, title, description, location_name')
    .eq('user_id', user.id)
    .not('title', 'is', null)
    .not('description', 'is', null)
    .not('location_name', 'is', null)
    .limit(10)

  const completeCount = completeMemories?.length || 0

  // Evaluate badges
  const checks: Record<string, boolean> = {
    first_memory: memoryCount >= 1,
    memory_10: memoryCount >= 10,
    memory_50: memoryCount >= 50,
    first_voice: voiceCount >= 1,
    first_share: shareCount >= 1,
    streak_7: streakDays >= 7,
    streak_30: streakDays >= 30,
    photo_25: photoCount >= 25,
    tagger: tagCount >= 10,
    completionist: completeCount >= 5,
  }

  const newlyEarned: string[] = []

  for (const [badgeType, qualifies] of Object.entries(checks)) {
    if (qualifies && !earned.has(badgeType)) {
      const def = BADGE_DEFINITIONS.find(b => b.type === badgeType)
      if (!def) continue

      const { error } = await supabase
        .from('user_badges')
        .upsert({
          user_id: user.id,
          badge_type: badgeType,
          badge_name: def.name,
          badge_emoji: def.emoji,
        }, { onConflict: 'user_id,badge_type' })

      if (!error) newlyEarned.push(badgeType)
    }
  }

  // Fetch updated list
  const { data: allBadges } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', user.id)
    .order('earned_at')

  return NextResponse.json({
    earned: allBadges || [],
    newlyEarned,
    all: BADGE_DEFINITIONS,
  })
}
