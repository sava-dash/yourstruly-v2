import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import exifr from 'exifr'
import { generateSmartTags } from '@/lib/ai/smartTags'

// Force dynamic to avoid build-time evaluation of canvas/face-api
export const dynamic = 'force-dynamic'

// Lazy import to avoid build-time issues with native modules
const getFaceDetection = () => import('@/lib/ai/faceDetection')

// POST /api/memories/[id]/media - Upload media to memory
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memoryId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify memory belongs to user
  const { data: memory } = await supabase
    .from('memories')
    .select('id')
    .eq('id', memoryId)
    .eq('user_id', user.id)
    .single()

  if (!memory) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const fileType = file.type.startsWith('image/') ? 'image' : 
                   file.type.startsWith('video/') ? 'video' : null

  if (!fileType) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${user.id}/${memoryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Extract EXIF data server-side
  let exifLat: number | null = null
  let exifLng: number | null = null
  let takenAt: string | null = null
  let cameraMake: string | null = null
  let cameraModel: string | null = null
  let dateSource: 'exif' | 'filename' | null = null

  if (fileType === 'image') {
    try {
      const exif = await exifr.parse(buffer, {
        pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude', 'Make', 'Model'],
        gps: true,
      })
      if (exif) {
        // GPS coordinates
        if (exif.latitude && exif.longitude) {
          exifLat = exif.latitude
          exifLng = exif.longitude
        }
        // Date taken from EXIF
        const dateField = exif.DateTimeOriginal || exif.CreateDate
        if (dateField) {
          const exifDate = dateField instanceof Date ? dateField : new Date(dateField)
          // Sanity check: date should be between 1990 and now+1year
          const now = new Date()
          const minDate = new Date('1990-01-01')
          const maxDate = new Date(now.getFullYear() + 1, 11, 31)
          if (exifDate >= minDate && exifDate <= maxDate) {
            takenAt = exifDate.toISOString()
            dateSource = 'exif'
          }
        }
        // Camera info
        cameraMake = exif.Make || null
        cameraModel = exif.Model || null
      }
    } catch (e) {
      console.log('EXIF extraction failed (normal for some images):', e)
    }
  }

  // Fallback: Try to parse date from filename if no EXIF date
  if (!takenAt) {
    const parsedDate = parseDateFromFilename(file.name)
    if (parsedDate) {
      takenAt = parsedDate.toISOString()
      dateSource = 'filename'
    }
  }

  const { error: uploadError } = await supabase.storage
    .from('memories')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('memories')
    .getPublicUrl(fileName)

  // Face detection disabled temporarily due to TextEncoder compatibility issues in container
  // TODO: Fix canvas/face-api compatibility for Docker deployment
  let detectedFaces: Array<{
    boundingBox: { x: number; y: number; width: number; height: number }
    confidence: number
    embedding: number[]
    age?: number
    gender?: string
    expression?: string
  }> = []

  // Face detection disabled - uncomment when fixed:
  // if (fileType === 'image') {
  //   try {
  //     const { detectFaces, getDominantExpression } = await getFaceDetection()
  //     const faces = await detectFaces(buffer)
  //     detectedFaces = faces.map(f => ({
  //       boundingBox: f.boundingBox,
  //       confidence: f.confidence,
  //       embedding: f.embedding,
  //       age: f.age,
  //       gender: f.gender,
  //       expression: f.expressions ? getDominantExpression(f.expressions) : undefined,
  //     }))
  //   } catch (e) {
  //     console.error('Face detection failed:', e)
  //     // Continue without face data
  //   }
  // }

  // No XP for photo upload - only backstory earns XP

  // Get image dimensions (for images)
  let width = null
  let height = null

  if (fileType === 'image') {
    // Simple dimension detection from buffer header
    // For production, use sharp or similar
    try {
      const dimensions = getImageDimensions(buffer)
      width = dimensions.width
      height = dimensions.height
    } catch (e) {
      // Ignore dimension errors
    }
  }

  // Check if this should be cover
  const { count } = await supabase
    .from('memory_media')
    .select('id', { count: 'exact', head: true })
    .eq('memory_id', memoryId)

  const isCover = count === 0

  // Create media record with EXIF data
  const { data: media, error: mediaError } = await supabase
    .from('memory_media')
    .insert({
      memory_id: memoryId,
      user_id: user.id,
      file_url: publicUrl,
      file_key: fileName,
      file_type: fileType,
      mime_type: file.type,
      file_size: file.size,
      width,
      height,
      is_cover: isCover,
      // EXIF data (extracted server-side)
      exif_lat: exifLat,
      exif_lng: exifLng,
      taken_at: takenAt,
      camera_make: cameraMake,
      camera_model: cameraModel,
      // AI analysis
      ai_faces: detectedFaces.map(f => ({
        boundingBox: f.boundingBox,
        confidence: f.confidence,
        age: f.age,
        gender: f.gender,
        expression: f.expression,
      })),
      ai_processed: detectedFaces.length > 0,
    })
    .select()
    .single()

  if (mediaError) {
    console.error('Media record error:', mediaError)
    return NextResponse.json({ error: 'Failed to save media' }, { status: 500 })
  }

  console.log('[Media Upload] Successfully saved media:', {
    mediaId: media.id,
    memoryId,
    userId: user.id,
    fileType,
    fileSize: file.size,
  })

  // Store face embeddings for recognition (if faces detected)
  if (detectedFaces.length > 0) {
    const faceRecords = detectedFaces.map((face) => ({
      media_id: media.id,
      user_id: user.id,
      box_left: face.boundingBox.x,
      box_top: face.boundingBox.y,
      box_width: face.boundingBox.width,
      box_height: face.boundingBox.height,
      confidence: Math.round(face.confidence * 100),
      face_embedding: face.embedding,
      age: face.age,
      gender: face.gender,
      expression: face.expression,
      is_auto_detected: true,
      is_confirmed: false,
    }))

    await supabase.from('memory_face_tags').insert(faceRecords)
  }

  // Update parent memory with EXIF data if it doesn't have date/location yet
  if (exifLat || exifLng || takenAt) {
    const { data: currentMemory } = await supabase
      .from('memories')
      .select('memory_date, location_lat, location_lng')
      .eq('id', memoryId)
      .single()

    const updates: Record<string, unknown> = {}
    
    // Update date if memory has no date or has today's placeholder date
    if (takenAt && (!currentMemory?.memory_date || currentMemory.memory_date === new Date().toISOString().split('T')[0])) {
      updates.memory_date = takenAt.split('T')[0]
    }
    
    // Update location if memory has no location
    if (exifLat && exifLng && !currentMemory?.location_lat) {
      updates.location_lat = exifLat
      updates.location_lng = exifLng
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('memories').update(updates).eq('id', memoryId)
    }
  }

  // Generate smart tags async (don't block response)
  // This runs in the background after response is sent
  if (fileType === 'image') {
    generateSmartTags(buffer, file.type || 'image/jpeg')
      .then(async (tags) => {
        if (tags.allTags.length > 0) {
          const adminSupabase = await createClient()
          await adminSupabase
            .from('memory_media')
            .update({
              ai_labels: {
                scene: tags.scene,
                setting: tags.setting,
                activities: tags.activities,
                objects: tags.objects,
                people: tags.people,
                mood: tags.mood,
                weather: tags.weather,
                allTags: tags.allTags,
                caption: tags.caption,
                category: tags.category,
                analyzedAt: new Date().toISOString(),
              },
              ai_processed: true,
            })
            .eq('id', media.id)

          // Update parent memory with AI data if not set
          const memoryUpdates: Record<string, string> = {}
          
          const { data: currentMemory } = await adminSupabase
            .from('memories')
            .select('ai_category, ai_mood, ai_summary')
            .eq('id', memoryId)
            .single()

          if (!currentMemory?.ai_category && tags.category) {
            memoryUpdates.ai_category = tags.category
          }
          if (!currentMemory?.ai_mood && tags.mood.length > 0) {
            memoryUpdates.ai_mood = tags.mood[0]
          }
          if (!currentMemory?.ai_summary && tags.caption) {
            memoryUpdates.ai_summary = tags.caption
          }

          if (Object.keys(memoryUpdates).length > 0) {
            await adminSupabase
              .from('memories')
              .update(memoryUpdates)
              .eq('id', memoryId)
          }
        }
      })
      .catch((err) => {
        console.error('Background smart tag generation failed:', err)
      })
  }

  return NextResponse.json({ 
    media,
    faces: detectedFaces.map(f => ({
      boundingBox: f.boundingBox,
      age: f.age,
      gender: f.gender,
      expression: f.expression,
    })),
  })
}

// Simple dimension detection (JPEG/PNG only)
function getImageDimensions(buffer: Buffer): { width: number; height: number } {
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    }
  }
  
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break
      const marker = buffer[offset + 1]
      if (marker === 0xc0 || marker === 0xc2) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        }
      }
      const length = buffer.readUInt16BE(offset + 2)
      offset += 2 + length
    }
  }

  return { width: 0, height: 0 }
}

// Parse date from common filename patterns
function parseDateFromFilename(filename: string): Date | null {
  // Remove extension
  const name = filename.replace(/\.[^/.]+$/, '')
  
  // Pattern: WhatsApp Image 2026-02-18 at 3.17.34 PM
  const whatsappMatch = name.match(/(\d{4})-(\d{2})-(\d{2}) at (\d{1,2})\.(\d{2})\.(\d{2}) (AM|PM)/i)
  if (whatsappMatch) {
    let [, year, month, day, hour, min, sec, ampm] = whatsappMatch
    let hourNum = parseInt(hour)
    if (ampm.toUpperCase() === 'PM' && hourNum < 12) hourNum += 12
    if (ampm.toUpperCase() === 'AM' && hourNum === 12) hourNum = 0
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hourNum, parseInt(min), parseInt(sec))
  }
  
  // Pattern: IMG_20231225_143052 or VID_20231225_143052
  const imgMatch = name.match(/(?:IMG|VID|PXL|DCIM)_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/i)
  if (imgMatch) {
    const [, year, month, day, hour, min, sec] = imgMatch
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min), parseInt(sec))
  }
  
  // Pattern: Screenshot_2023-12-25-14-30-52 or Screenshot 2023-12-25 at 14.30.52
  const screenshotMatch = name.match(/Screenshot[_\s](\d{4})-(\d{2})-(\d{2})[-_\s](?:at\s)?(\d{2})[-.](\d{2})[-.](\d{2})/i)
  if (screenshotMatch) {
    const [, year, month, day, hour, min, sec] = screenshotMatch
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min), parseInt(sec))
  }
  
  // Pattern: 2023-12-25 or 2023_12_25 or 20231225
  const dateOnlyMatch = name.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    const yearNum = parseInt(year)
    // Sanity check: year should be reasonable (1990-2030)
    if (yearNum >= 1990 && yearNum <= 2030) {
      return new Date(yearNum, parseInt(month) - 1, parseInt(day), 12, 0, 0)
    }
  }
  
  return null
}
