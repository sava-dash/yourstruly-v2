import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CONFIG, mergeConfig, type GamificationConfig } from '@/lib/gamification-config'

// Check if user is admin (first user or specific email)
async function isAdmin(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .single()
  return profile?.role === 'admin' || profile?.email?.includes('chuckpatel')
}

// GET - fetch gamification config (public, used by components)
export async function GET() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'gamification')
    .single()

  const config = mergeConfig(data?.value as Partial<GamificationConfig> | null)
  return NextResponse.json(config)
}

// PUT - update gamification config (admin only)
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await isAdmin(supabase, user.id)
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const body = await request.json()

  // Upsert into site_config
  const { error } = await supabase
    .from('site_config')
    .upsert({
      key: 'gamification',
      value: body,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }, { onConflict: 'key' })

  if (error) {
    // If table doesn't exist, try creating it
    console.error('Config save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, config: mergeConfig(body) })
}
