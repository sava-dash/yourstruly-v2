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

  // Fetch media with EXIF GPS data (includes manually-set locations via metadata PATCH)
  const { data: media } = await supabase
    .from('memory_media')
    .select('id, file_url, file_type, created_at, taken_at, exif_lat, exif_lng, description')
    .eq('user_id', user.id)
    .not('exif_lat', 'is', null)
    .not('exif_lng', 'is', null)
    .order('taken_at', { ascending: false, nullsFirst: false })
    .limit(500)

  const items = (media || []).map(m => ({
    id: m.id,
    file_url: m.file_url,
    filename: 'Photo',
    created_at: m.created_at,
    taken_at: m.taken_at,
    location_name: m.description || null, // location_name stored in description field by metadata PATCH
    location_lat: m.exif_lat,
    location_lng: m.exif_lng,
  }))

  return NextResponse.json({ items })
}
