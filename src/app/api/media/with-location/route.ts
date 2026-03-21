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

  // Fetch media with any location data (location_lat/lng OR exif_lat/lng)
  const { data: media } = await supabase
    .from('memory_media')
    .select('id, file_url, file_type, created_at, taken_at, location_name, location_lat, location_lng, exif_lat, exif_lng, original_filename')
    .eq('user_id', user.id)
    .order('taken_at', { ascending: false, nullsFirst: false })
    .limit(1000)

  // Filter to items with any geo data and normalize
  const items = (media || [])
    .filter(m => (m.location_lat && m.location_lng) || (m.exif_lat && m.exif_lng))
    .map(m => ({
      id: m.id,
      file_url: m.file_url,
      filename: m.original_filename || 'Photo',
      created_at: m.created_at,
      taken_at: m.taken_at,
      location_name: m.location_name,
      location_lat: m.location_lat || m.exif_lat,
      location_lng: m.location_lng || m.exif_lng,
    }))
    .slice(0, 500)

  return NextResponse.json({ items })
}
