import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { DEFAULT_CONFIG, mergeConfig } from '@/lib/gamification-config'

// Legacy export — still works but prefer loading from DB config
export const BADGE_DEFINITIONS = DEFAULT_CONFIG.badges

// GET - return user's badges
export const GET = withAuth(async (_request, { user, supabase }) => {
  const { data: earned } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', user.id)
    .order('earned_at')

  // Load config for latest badge definitions
  let config = DEFAULT_CONFIG
  try {
    const { data: configData } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', 'gamification')
      .single()
    config = mergeConfig(configData?.value || null)
  } catch {}

  return NextResponse.json({
    earned: earned || [],
    all: config.badges,
  })
})
