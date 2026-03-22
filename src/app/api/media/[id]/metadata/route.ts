import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function geocodeLocation(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return null
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1`
    )
    if (!res.ok) return null
    const data = await res.json()
    const coords = data.features?.[0]?.center
    if (coords) return { lng: coords[0], lat: coords[1] }
    return null
  } catch {
    return null
  }
}

/**
 * PATCH /api/media/[id]/metadata — Update date/location on a media item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: mediaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, any> = {}

  if (body.taken_at !== undefined) updates.taken_at = body.taken_at
  if (body.location_name !== undefined) {
    updates.description = body.location_name
    // Geocode location to get coordinates for map filter
    if (body.location_name) {
      const coords = await geocodeLocation(body.location_name)
      if (coords) {
        updates.exif_lat = coords.lat
        updates.exif_lng = coords.lng
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('memory_media')
    .update(updates)
    .eq('id', mediaId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
