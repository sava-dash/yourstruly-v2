import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStorageQuota } from '@/lib/storage/quota'

/**
 * POST /api/mobile-upload
 *
 * Public endpoint for uploading media via a mobile-upload token.
 * Validates the token, checks expiry, then uploads to Supabase Storage
 * and creates a memory_media row (orphan, memory_id=NULL).
 *
 * Form data: { token, file }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const token = formData.get('token') as string
    const file = formData.get('file') as File | null

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }
    if (!file) {
      return NextResponse.json({ error: 'File required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Validate token
    const { data: tokenRow, error: tokenErr } = await admin
      .from('mobile_upload_tokens')
      .select('user_id, expires_at, used_at')
      .eq('token', token)
      .single()

    if (tokenErr || !tokenRow) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }

    // Size limit
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
    }

    const userId = tokenRow.user_id
    const fileType = file.type.startsWith('image/') ? 'image' :
                     file.type.startsWith('video/') ? 'video' : null
    if (!fileType) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Enforce tier storage quota (share the helper used by /api/upload).
    const quota = await getStorageQuota(admin, userId)
    if (file.size > quota.remaining) {
      return NextResponse.json(
        {
          error: 'Storage limit reached',
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
        },
        { status: 413 },
      )
    }

    // Upload to storage
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${fileExt}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract EXIF metadata for images (GPS + date taken) so "Add Backstory"
    // can pre-fill the When & Where card with the actual capture details.
    let exifData: { lat?: number; lng?: number; takenAt?: string; locationName?: string } = {}
    if (fileType === 'image') {
      try {
        const exifr = (await import('exifr')).default
        const exif = await exifr.parse(buffer, { gps: true })
        if (exif) {
          if (exif.latitude && exif.longitude) {
            exifData.lat = exif.latitude
            exifData.lng = exif.longitude
            try {
              const { reverseGeocode } = await import('@/lib/geo/reverseGeocode')
              const name = await reverseGeocode(exif.latitude, exif.longitude)
              if (name) exifData.locationName = name
            } catch {}
          }
          const dateField = exif.DateTimeOriginal || exif.CreateDate
          if (dateField) {
            const d = dateField instanceof Date ? dateField : new Date(dateField)
            const minDate = new Date('1990-01-01')
            const maxDate = new Date(new Date().getFullYear() + 1, 11, 31)
            if (d >= minDate && d <= maxDate) exifData.takenAt = d.toISOString()
          }
        }
      } catch (e) {
        console.log('[mobile-upload] EXIF extraction failed:', e)
      }
    }

    const { error: uploadError } = await admin.storage
      .from('memories')
      .upload(fileName, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('[mobile-upload] storage error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = admin.storage.from('memories').getPublicUrl(fileName)

    // Create memory_media row with EXIF metadata
    const { data: mediaRow, error: insertErr } = await admin
      .from('memory_media')
      .insert({
        user_id: userId,
        file_url: publicUrl,
        file_key: fileName,
        file_type: fileType,
        is_cover: false,
        sort_order: 0,
        taken_at: exifData.takenAt || null,
        exif_lat: exifData.lat || null,
        exif_lng: exifData.lng || null,
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('[mobile-upload] db insert failed:', insertErr)
      return NextResponse.json({ error: 'Failed to save media record' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      mediaId: mediaRow?.id,
      url: publicUrl,
    })
  } catch (err) {
    console.error('[mobile-upload] error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
