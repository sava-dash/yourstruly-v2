import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { indexFace } from '@/lib/aws/rekognition'

// POST /api/face-tags - Create a face tag (and index face for future recognition)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { mediaId, contactId, boundingBox } = body

    if (!mediaId || !contactId || !boundingBox) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify media belongs to user
    const { data: media } = await supabase
      .from('memory_media')
      .select('id, user_id, file_url')
      .eq('id', mediaId)
      .eq('user_id', user.id)
      .single()

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Verify contact belongs to user
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, full_name, avatar_url')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Check if tag already exists for this face box
    const { data: existingTag } = await supabase
      .from('memory_face_tags')
      .select('id, aws_face_id')
      .eq('media_id', mediaId)
      .eq('box_left', boundingBox.x)
      .eq('box_top', boundingBox.y)
      .eq('box_width', boundingBox.width)
      .eq('box_height', boundingBox.height)
      .maybeSingle()

    // Index this face in Rekognition for future auto-tagging
    let awsFaceId: string | null = null
    
    try {
      // Download the image
      const imageRes = await fetch(media.file_url)
      const imageBuffer = Buffer.from(await imageRes.arrayBuffer())
      
      // Index the face with contact ID
      awsFaceId = await indexFace(imageBuffer, user.id, contactId)
      
      if (awsFaceId) {
        console.log(`[Face Tag] ✅ Indexed face in Rekognition: ${awsFaceId}`)
      }
    } catch (err) {
      console.error('[Face Tag] Failed to index face in Rekognition:', err)
      // Continue without indexing - user can still tag manually
    }

    if (existingTag) {
      // Update existing tag
      const { data: updated, error: updateError } = await supabase
        .from('memory_face_tags')
        .update({
          contact_id: contactId,
          is_confirmed: true,
          aws_face_id: awsFaceId,
        })
        .eq('id', existingTag.id)
        .select()
        .single()

      if (updateError) {
        console.error('Face tag update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update face tag' },
          { status: 500 }
        )
      }

      console.log(`[Face Tag] Updated tag for ${contact.full_name}`)
      return NextResponse.json({ faceTag: updated })
    }

    // Create new tag
    const { data: faceTag, error: insertError } = await supabase
      .from('memory_face_tags')
      .insert({
        media_id: mediaId,
        user_id: user.id,
        contact_id: contactId,
        box_left: boundingBox.x,
        box_top: boundingBox.y,
        box_width: boundingBox.width,
        box_height: boundingBox.height,
        confidence: 100, // User-confirmed
        is_auto_detected: false,
        is_confirmed: true,
        aws_face_id: awsFaceId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Face tag creation error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create face tag' },
        { status: 500 }
      )
    }

    console.log('[Face Tag] Created:', {
      faceTagId: faceTag.id,
      mediaId,
      contactId,
      contactName: contact.full_name,
      awsFaceId,
    })

    return NextResponse.json({ faceTag })
  } catch (error) {
    console.error('Face tag error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
