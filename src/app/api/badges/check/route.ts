import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { DEFAULT_CONFIG, mergeConfig } from '@/lib/gamification-config'

export const POST = withAuth(async (_request, { user, supabase }) => {
  // Load gamification config (DB overrides falling back to defaults)
  let config = DEFAULT_CONFIG
  try {
    const { data: configData } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', 'gamification')
      .single()
    config = mergeConfig(configData?.value || null)
  } catch {}

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
    .limit(100)

  const completeCount = completeMemories?.length || 0

  // Build metric values map
  const metricValues: Record<string, number> = {
    memories: memoryCount,
    photos: photoCount,
    voices: voiceCount,
    shares: shareCount,
    tags: tagCount,
    streak: streakDays,
    complete_memories: completeCount,
  }

  // Evaluate badges dynamically from config
  const newlyEarned: string[] = []

  for (const badge of config.badges) {
    if (!badge.criteria) continue
    const value = metricValues[badge.criteria.metric] ?? 0
    const qualifies = value >= badge.criteria.threshold

    if (qualifies && !earned.has(badge.type)) {
      const { error } = await supabase
        .from('user_badges')
        .upsert({
          user_id: user.id,
          badge_type: badge.type,
          badge_name: badge.name,
          badge_emoji: badge.emoji,
        }, { onConflict: 'user_id,badge_type' })

      if (!error) newlyEarned.push(badge.type)
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
    all: config.badges,
  })
})
