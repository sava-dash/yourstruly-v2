import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/media/[id]/detect-faces - Detect faces in a media item
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

    // Get the media item to find the image URL
    const { data: media, error: mediaError } = await supabase
      .from('memory_media')
      .select('id, file_url, file_type')
      .eq('id', mediaId)
      .single()

    if (mediaError || !media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Only process images
    if (media.file_type !== 'image') {
      return NextResponse.json({ success: true, message: 'Not an image', faces: 0 })
    }

    // Check if AWS Rekognition is configured
    const hasRekognition = process.env.AWS_ACCESS_KEY_ID && 
                           process.env.AWS_SECRET_ACCESS_KEY &&
                           process.env.AWS_REGION

    if (!hasRekognition) {
      // Return success but no faces detected (feature not configured)
      return NextResponse.json({ 
        success: true, 
        message: 'Face detection not configured',
        faces: 0 
      })
    }

    // Use AWS Rekognition to detect faces
    try {
      const { RekognitionClient, DetectFacesCommand } = await import('@aws-sdk/client-rekognition')
      
      const rekognition = new RekognitionClient({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      })

      // Fetch the image
      const imageResponse = await fetch(media.file_url)
      const imageBuffer = await imageResponse.arrayBuffer()

      const command = new DetectFacesCommand({
        Image: {
          Bytes: new Uint8Array(imageBuffer),
        },
        Attributes: ['DEFAULT'],
      })

      const result = await rekognition.send(command)
      const detectedFaces = result.FaceDetails || []

      // Save detected faces to database
      for (const face of detectedFaces) {
        if (face.BoundingBox && face.Confidence && face.Confidence > 80) {
          await supabase.from('media_faces').insert({
            media_id: mediaId,
            bounding_box: {
              left: face.BoundingBox.Left,
              top: face.BoundingBox.Top,
              width: face.BoundingBox.Width,
              height: face.BoundingBox.Height,
            },
            confidence: face.Confidence,
          })
        }
      }

      return NextResponse.json({ 
        success: true, 
        faces: detectedFaces.filter(f => f.Confidence && f.Confidence > 80).length 
      })

    } catch (rekError) {
      console.error('Rekognition error:', rekError)
      // Return success but note the error (don't block the user)
      return NextResponse.json({ 
        success: true, 
        message: 'Face detection unavailable',
        faces: 0 
      })
    }

  } catch (error) {
    console.error('Detect faces error:', error)
    return NextResponse.json({ error: 'Face detection failed' }, { status: 500 })
  }
}
