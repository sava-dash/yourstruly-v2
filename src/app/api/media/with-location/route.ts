import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/media/with-location
 * Returns all user media that has location data (from EXIF or manual)
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: media } = await supabase
    .from('memory_media')
    .select('id, file_url, file_type, created_at, taken_at, location_name, location_lat, location_lng, original_filename')
    .eq('user_id', user.id)
    .not('location_lat', 'is', null)
    .not('location_lng', 'is', null)
    .order('taken_at', { ascending: false, nullsFirst: false })
    .limit(500)

  const items = (media || []).map(m => ({
    id: m.id,
    file_url: m.file_url,
    filename: m.original_filename || 'Photo',
    created_at: m.created_at,
    taken_at: m.taken_at,
    location_name: m.location_name,
    location_lat: m.location_lat,
    location_lng: m.location_lng,
  }))

  return NextResponse.json({ items })
}
