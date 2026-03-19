import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CONFIG, mergeConfig } from '@/lib/gamification-config'

// Legacy export for badge check route
export const BADGE_DEFINITIONS = DEFAULT_CONFIG.badges

// GET - return user's badges
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
}
