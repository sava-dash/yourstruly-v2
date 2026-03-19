import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  let month = searchParams.get('month')

  // Default to previous month
  if (!month) {
    const now = new Date()
    now.setMonth(now.getMonth() - 1)
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const [year, mo] = month.split('-').map(Number)
  const startDate = new Date(year, mo - 1, 1).toISOString()
  const endDate = new Date(year, mo, 1).toISOString()
  const monthName = new Date(year, mo - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const [memories, photos, voices, wisdom, tags] = await Promise.all([
    supabase.from('memories').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', startDate).lt('created_at', endDate),
    supabase.from('memory_media').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('file_type', 'image').gte('created_at', startDate).lt('created_at', endDate),
    supabase.from('memory_media').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('file_type', 'audio').gte('created_at', startDate).lt('created_at', endDate),
    supabase.from('wisdom_entries').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', startDate).lt('created_at', endDate),
    supabase.from('face_tags').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).not('contact_id', 'is', null).gte('created_at', startDate).lt('created_at', endDate),
  ])

  const memoriesCount = memories.count || 0
  const photosCount = photos.count || 0
  const voicesCount = voices.count || 0
  const wisdomCount = wisdom.count || 0
  const tagsCount = tags.count || 0
  const totalItems = memoriesCount + photosCount + voicesCount + wisdomCount

  // Generate highlights
  const highlights: string[] = []
  if (memoriesCount > 0) highlights.push(`You created ${memoriesCount} memor${memoriesCount === 1 ? 'y' : 'ies'} 📝`)
  if (photosCount > 0) highlights.push(`You uploaded ${photosCount} photo${photosCount === 1 ? '' : 's'} 📸`)
  if (voicesCount > 0) highlights.push(`You recorded ${voicesCount} voice memor${voicesCount === 1 ? 'y' : 'ies'} 🎙️`)
  if (wisdomCount > 0) highlights.push(`You shared ${wisdomCount} piece${wisdomCount === 1 ? '' : 's'} of wisdom 💡`)
  if (tagsCount > 0) highlights.push(`You tagged ${tagsCount} face${tagsCount === 1 ? '' : 's'} in photos 👤`)
  if (totalItems >= 20) highlights.push('🔥 Your most active month yet!')
  if (totalItems === 0) highlights.push('No activity this month — start preserving your legacy!')

  return NextResponse.json({
    month,
    monthName,
    memories_count: memoriesCount,
    photos_count: photosCount,
    voices_count: voicesCount,
    wisdom_count: wisdomCount,
    tags_count: tagsCount,
    total_items: totalItems,
    highlights,
  })
}
