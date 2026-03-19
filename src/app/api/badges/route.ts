import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const BADGE_DEFINITIONS = [
  { type: 'first_memory', name: 'First Memory', emoji: '📝', description: 'Created your first memory' },
  { type: 'memory_10', name: 'Memory Collector', emoji: '📚', description: 'Created 10 memories' },
  { type: 'memory_50', name: 'Memory Vault', emoji: '🏛️', description: 'Created 50 memories' },
  { type: 'first_voice', name: 'Voice Keeper', emoji: '🎙️', description: 'Recorded your first voice memory' },
  { type: 'first_share', name: 'Generous Spirit', emoji: '💝', description: 'Shared your first memory' },
  { type: 'streak_7', name: 'Week Warrior', emoji: '🔥', description: '7-day engagement streak' },
  { type: 'streak_30', name: 'Monthly Master', emoji: '💪', description: '30-day engagement streak' },
  { type: 'photo_25', name: 'Shutterbug', emoji: '📸', description: 'Uploaded 25 photos' },
  { type: 'tagger', name: 'Face Finder', emoji: '👤', description: 'Tagged 10 faces in photos' },
  { type: 'completionist', name: 'Perfectionist', emoji: '✨', description: '5 memories at 100% completeness' },
]

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

  return NextResponse.json({
    earned: earned || [],
    all: BADGE_DEFINITIONS,
  })
}
