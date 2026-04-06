import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface GeocodeFeature {
  center: [number, number];
  place_name: string;
}

interface GeocodeResponse {
  features: GeocodeFeature[];
}

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number; address: string } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || !query) return null;

  try {
    const encoded = encodeURIComponent(query);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1`;
    const response = await fetch(url);

    if (!response.ok) return null;

    const data: GeocodeResponse = await response.json();
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        lng: feature.center[0],
        lat: feature.center[1],
        address: feature.place_name,
      };
    }
  } catch (error) {
    console.error('Mapbox geocoding error:', error);
  }

  return null;
}

// GET /api/voice/places — list user's personal places
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: places, error } = await supabase
      .from('personal_places')
      .select('*')
      .eq('user_id', user.id)
      .order('use_count', { ascending: false });

    if (error) {
      console.error('Error fetching places:', error);
      return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
    }

    return NextResponse.json({ places: places ?? [] });
  } catch (error) {
    console.error('Places GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/voice/places — create a new personal place
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, aliases, address, city, state, lat, lng, linked_contact_id } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required and must be a string' }, { status: 400 });
    }

    let resolvedLat = lat ?? null;
    let resolvedLng = lng ?? null;
    let resolvedAddress = address ?? null;

    // Geocode if we have address info but no coordinates
    if (resolvedLat === null || resolvedLng === null) {
      const parts = [address, city, state].filter(Boolean);
      if (parts.length > 0) {
        const geocoded = await geocodeAddress(parts.join(', '));
        if (geocoded) {
          resolvedLat = geocoded.lat;
          resolvedLng = geocoded.lng;
          if (!resolvedAddress) {
            resolvedAddress = geocoded.address;
          }
        }
      }
    }

    const { data: place, error } = await supabase
      .from('personal_places')
      .insert({
        user_id: user.id,
        name,
        aliases: aliases ?? [],
        address: resolvedAddress,
        city: city ?? null,
        state: state ?? null,
        lat: resolvedLat,
        lng: resolvedLng,
        linked_contact_id: linked_contact_id ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating place:', error);
      return NextResponse.json({ error: 'Failed to create place' }, { status: 500 });
    }

    return NextResponse.json({ place }, { status: 201 });
  } catch (error) {
    console.error('Places POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
