import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import exifr from 'exifr'
import { detectFaces, getDominantEmotion, searchFaces } from '@/lib/aws/rekognition'
import { reverseGeocode } from '@/lib/geo/reverseGeocode'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const bucket = (formData.get('bucket') as string) || 'uploads'

  // Validate bucket name — prevent access to arbitrary storage buckets
  const ALLOWED_BUCKETS = ['uploads', 'memories', 'avatars', 'videos']
  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
  }

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Enforce file size limit (50MB)
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
  }

  const fileType = file.type.startsWith('image/') ? 'image' : 
                   file.type.startsWith('video/') ? 'video' : null

  if (!fileType) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Extract EXIF data for images
  let exifData: {
    lat?: number
    lng?: number
    takenAt?: string
    cameraMake?: string
    cameraModel?: string
    locationName?: string
  } = {}

  if (fileType === 'image') {
    try {
      const exif = await exifr.parse(buffer, { gps: true })
      if (exif) {
        // GPS coordinates
        if (exif.latitude && exif.longitude) {
          exifData.lat = exif.latitude
          exifData.lng = exif.longitude
          
          // Reverse geocode to get location name
          const locationName = await reverseGeocode(exif.latitude, exif.longitude)
          if (locationName) {
            exifData.locationName = locationName
          }
        }
        
        // Date taken
        const dateField = exif.DateTimeOriginal || exif.CreateDate
        if (dateField) {
          const exifDate = dateField instanceof Date ? dateField : new Date(dateField)
          const now = new Date()
          const minDate = new Date('1990-01-01')
          const maxDate = new Date(now.getFullYear() + 1, 11, 31)
          if (exifDate >= minDate && exifDate <= maxDate) {
            exifData.takenAt = exifDate.toISOString()
          }
        }
        
        // Camera info
        exifData.cameraMake = exif.Make || undefined
        exifData.cameraModel = exif.Model || undefined
      }
    } catch (e) {
      console.log('[Upload] EXIF extraction failed:', e)
    }
  }

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false
    })

  if (uploadError) {
    console.error('[Upload] Storage error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName)

  // Face detection for images
  let detectedFaces: Array<{
    boundingBox: { x: number; y: number; width: number; height: number }
    confidence: number
    age?: { low: number; high: number }
    gender?: string
    expression?: string
    suggestions?: Array<{ contactId: string; contactName: string; similarity: number }>
  }> = []

  if (fileType === 'image') {
    try {
      console.log('[Upload] Starting face detection...')
      const faces = await detectFaces(buffer)
      
      // For each detected face, search for matches
      const facesWithSuggestions = await Promise.all(
        faces.map(async (face) => {
          let suggestions: Array<{ contactId: string; contactName: string; similarity: number }> = []
          
          try {
            const matches = await searchFaces(buffer, user.id, 70)
            
            if (matches.length > 0) {
              const contactIds = matches.map(m => m.contactId)
              const { data: contacts } = await supabase
                .from('contacts')
                .select('id, full_name')
                .in('id', contactIds)
              
              suggestions = matches.map(match => {
                const contact = contacts?.find(c => c.id === match.contactId)
                return {
                  contactId: match.contactId,
                  contactName: contact?.full_name || 'Unknown',
                  similarity: Math.round(match.similarity),
                }
              }).slice(0, 3)
              
              console.log(`[Upload] Found ${suggestions.length} face match suggestions`)
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            console.log('[Upload] Face search failed (no indexed faces yet):', errorMessage)
          }
          
          return {
            boundingBox: face.boundingBox,
            confidence: face.confidence,
            age: face.age,
            gender: face.gender,
            expression: face.emotions ? getDominantEmotion(face.emotions) : undefined,
            suggestions,
          }
        })
      )
      
      detectedFaces = facesWithSuggestions
      console.log(`[Upload] ✅ Found ${detectedFaces.length} faces`)
    } catch (e) {
      console.error('[Upload] Face detection failed:', e)
    }
  }

  return NextResponse.json({ 
    url: publicUrl,
    path: uploadData.path,
    bucket,
    exif: exifData,
    faces: detectedFaces,
  })
}
