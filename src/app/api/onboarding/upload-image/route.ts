import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import exifr from 'exifr';

// Reverse geocode GPS coordinates to a readable location name
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return null;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=place,locality,neighborhood&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.features?.length > 0) {
      return data.features[0].place_name || data.features[0].text;
    }
  } catch (e) {
    console.error('Reverse geocode failed:', e);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only images are allowed' }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // =========================================================
    // 1. EXTRACT EXIF METADATA
    // =========================================================
    let exifLat: number | null = null;
    let exifLng: number | null = null;
    let takenAt: string | null = null;

    try {
      const exif = await exifr.parse(buffer, {
        gps: true,
        // Don't use pick — it can exclude GPSLatitudeRef/GPSLongitudeRef needed for hemisphere
      });
      if (exif) {
        if (exif.latitude != null && exif.longitude != null) {
          exifLat = exif.latitude;
          exifLng = exif.longitude;
          // Sanity check: Las Vegas is ~36.17, -115.14
          // If lat/lng seem swapped or wrong hemisphere, log for debugging
          console.log(`EXIF GPS: lat=${exifLat}, lng=${exifLng}`);
        }
        const dateField = exif.DateTimeOriginal || exif.CreateDate;
        if (dateField) {
          const exifDate = dateField instanceof Date ? dateField : new Date(dateField);
          const now = new Date();
          if (exifDate >= new Date('1990-01-01') && exifDate <= new Date(now.getFullYear() + 1, 11, 31)) {
            takenAt = exifDate.toISOString();
          }
        }
      }
    } catch (e) {
      console.log('EXIF extraction skipped:', e);
    }

    // =========================================================
    // 1b. REVERSE GEOCODE LOCATION
    // =========================================================
    let locationName: string | null = null;
    if (exifLat && exifLng) {
      locationName = await reverseGeocode(exifLat, exifLng);
    }

    // =========================================================
    // 2. UPLOAD TO STORAGE
    // =========================================================
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).slice(2);
    const fileName = `${user.id}/onboarding/${timestamp}-${randomId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('memories')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('memories')
      .getPublicUrl(fileName);

    // =========================================================
    // 3. GET OR CREATE "Onboarding Gallery" MEMORY
    //    (needed until memory_id NOT NULL constraint is relaxed)
    // =========================================================
    let onboardingMemoryId: string;

    const { data: existing } = await supabase
      .from('memories')
      .select('id')
      .eq('user_id', user.id)
      .eq('memory_type', 'onboarding_gallery')
      .single();

    if (existing) {
      onboardingMemoryId = existing.id;
    } else {
      const { data: created, error: memErr } = await supabase
        .from('memories')
        .insert({
          user_id: user.id,
          title: 'Photo Uploads',
          description: 'Photos uploaded during setup',
          memory_type: 'onboarding_gallery',
          memory_date: new Date().toISOString(),
          tags: ['onboarding', 'gallery'],
        })
        .select()
        .single();

      if (memErr || !created) {
        console.error('Failed to create onboarding memory:', memErr);
        return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
      }
      onboardingMemoryId = created.id;
    }

    // =========================================================
    // 4. CREATE MEDIA RECORD IN GALLERY
    // =========================================================
    const { data: media, error: mediaError } = await supabase
      .from('memory_media')
      .insert({
        user_id: user.id,
        memory_id: onboardingMemoryId,
        file_url: publicUrl,
        file_key: fileName,
        file_type: 'image',
        mime_type: file.type || 'image/jpeg',
        file_size: file.size,
        is_cover: false,
        exif_lat: exifLat,
        exif_lng: exifLng,
        taken_at: takenAt,
      })
      .select()
      .single();

    if (mediaError) {
      console.error('Media record error:', mediaError);
      return NextResponse.json({ success: true, fileUrl: publicUrl, mediaId: null, memoryId: onboardingMemoryId });
    }

    // =========================================================
    // 5. TRIGGER FACE DETECTION (async - don't block response)
    // =========================================================
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`;

    fetch(`${baseUrl}/api/media/${media.id}/detect-faces`, {
      method: 'POST',
      headers: { 'Cookie': request.headers.get('cookie') || '' },
    }).catch(e => console.error('Face detection trigger failed:', e));

    // =========================================================
    // 6. GENERATE ENGAGEMENT PROMPT FOR THIS PHOTO (async)
    // =========================================================
    fetch(`${baseUrl}/api/engagement/generate-photo-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        mediaId: media.id,
        photoUrl: publicUrl,
        takenAt,
        isOnboarding: true,
      }),
    }).catch(e => console.error('Engagement prompt generation failed:', e));

    return NextResponse.json({
      success: true,
      fileUrl: publicUrl,
      mediaId: media.id,
      memoryId: onboardingMemoryId,
      metadata: {
        takenAt,
        hasLocation: !!(exifLat && exifLng),
        locationName,
        lat: exifLat,
        lng: exifLng,
      },
    });

  } catch (error) {
    console.error('Onboarding upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
