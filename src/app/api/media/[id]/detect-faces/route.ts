import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/media/[id]/detect-faces - Detect faces in a media item using AWS Rekognition
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the media item from memory_media table
    const { data: media, error: mediaError } = await supabase
      .from('memory_media')
      .select('id, file_url, file_type, ai_faces, ai_processed')
      .eq('id', mediaId)
      .single()

    if (mediaError || !media) {
      console.error('Media not found:', mediaId, mediaError)
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Only process images
    if (media.file_type !== 'image') {
      return NextResponse.json({ 
        success: true, 
        message: 'Not an image', 
        faces: [] 
      })
    }

    // Check if already processed
    if (media.ai_processed && media.ai_faces && Array.isArray(media.ai_faces) && media.ai_faces.length > 0) {
      // Return existing faces
      const { data: existingTags } = await supabase
        .from('memory_face_tags')
        .select(`
          id,
          box_left,
          box_top,
          box_width,
          box_height,
          confidence,
          contact_id,
          contacts(id, full_name)
        `)
        .eq('media_id', mediaId)
      
      const faces = existingTags?.map(tag => {
        // Supabase returns single relation as object (cast through unknown for type safety)
        const contact = tag.contacts as unknown as { id: string; full_name: string } | null
        return {
          id: tag.id,
          boundingBox: {
            Left: Number(tag.box_left),
            Top: Number(tag.box_top),
            Width: Number(tag.box_width),
            Height: Number(tag.box_height),
          },
          confidence: tag.confidence,
          contact_id: tag.contact_id,
          contact_name: contact?.full_name || null
        }
      }) || []

      return NextResponse.json({ success: true, faces, cached: true })
    }

    // Use AWS Rekognition to detect faces
    try {
      const { RekognitionClient, DetectFacesCommand } = await import('@aws-sdk/client-rekognition')
      
      const rekognition = new RekognitionClient({
        region: process.env.AWS_REGION || 'us-east-2',
      })

      // Fetch the image
      const imageResponse = await fetch(media.file_url)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`)
      }
      const imageBuffer = await imageResponse.arrayBuffer()

      const command = new DetectFacesCommand({
        Image: {
          Bytes: new Uint8Array(imageBuffer),
        },
        Attributes: ['DEFAULT'],
      })

      const result = await rekognition.send(command)
      const detectedFaces = result.FaceDetails || []

      // Filter faces with confidence > 80%
      const validFaces = detectedFaces.filter(f => f.BoundingBox && f.Confidence && f.Confidence > 80)

      // Save to ai_faces column
      const faceData = validFaces.map(face => ({
        left: face.BoundingBox!.Left,
        top: face.BoundingBox!.Top,
        width: face.BoundingBox!.Width,
        height: face.BoundingBox!.Height,
        confidence: face.Confidence,
      }))

      await supabase
        .from('memory_media')
        .update({ 
          ai_faces: faceData,
          ai_processed: true 
        })
        .eq('id', mediaId)

      // Insert into memory_face_tags table
      const insertedFaces = []
      for (const face of validFaces) {
        const { data: inserted, error: insertError } = await supabase
          .from('memory_face_tags')
          .insert({
            media_id: mediaId,
            user_id: user.id,
            box_left: face.BoundingBox!.Left,
            box_top: face.BoundingBox!.Top,
            box_width: face.BoundingBox!.Width,
            box_height: face.BoundingBox!.Height,
            confidence: face.Confidence,
            is_auto_detected: true,
          })
          .select('id')
          .single()
        
        if (!insertError && inserted) {
          insertedFaces.push({
            id: inserted.id,
            boundingBox: {
              Left: face.BoundingBox!.Left,
              Top: face.BoundingBox!.Top,
              Width: face.BoundingBox!.Width,
              Height: face.BoundingBox!.Height,
            },
            confidence: face.Confidence,
            contact_id: null,
            contact_name: null,
          })
        }
      }

      return NextResponse.json({ 
        success: true, 
        faces: insertedFaces,
        detected: validFaces.length
      })

    } catch (rekError: any) {
      console.error('Rekognition error:', rekError?.message || rekError)
      
      // Mark as processed to avoid retrying
      await supabase
        .from('memory_media')
        .update({ ai_processed: true, ai_faces: [] })
        .eq('id', mediaId)

      return NextResponse.json({ 
        success: false, 
        error: 'Face detection failed',
        message: rekError?.message || 'Unknown error',
        faces: [] 
      })
    }

  } catch (error: any) {
    console.error('Detect faces error:', error)
    return NextResponse.json({ 
      error: 'Face detection failed',
      message: error?.message || 'Unknown error',
      faces: [] 
    }, { status: 500 })
  }
}
