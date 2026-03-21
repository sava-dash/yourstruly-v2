import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { XP_REWARDS } from '@/lib/xp/xpService'
import { indexFace } from '@/lib/aws/rekognition'

/**
 * POST /api/media/[id]/tag - Tag a person in a photo
 * 
 * Awards XP_REWARDS.TAG_PERSON_IN_PHOTO (5 XP) per tag
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: mediaId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { faceId, contactId } = body

  if (!faceId || !contactId) {
    return NextResponse.json({ error: 'faceId and contactId required' }, { status: 400 })
  }

  // Verify face belongs to user's media
  const { data: face } = await supabase
    .from('memory_face_tags')
    .select('id, contact_id, is_confirmed')
    .eq('id', faceId)
    .eq('user_id', user.id)
    .single()

  if (!face) {
    return NextResponse.json({ error: 'Face not found' }, { status: 404 })
  }

  // Check if already tagged (no double XP)
  const alreadyTagged = face.contact_id && face.is_confirmed

  // Update face with contact
  const { error } = await supabase
    .from('memory_face_tags')
    .update({
      contact_id: contactId,
      is_confirmed: true,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', faceId)

  if (error) {
    return NextResponse.json({ error: 'Failed to tag face' }, { status: 500 })
  }

  // Award XP if this is a new tag
  let xpAwarded = 0
  if (!alreadyTagged) {
    await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_amount: XP_REWARDS.TAG_PERSON_IN_PHOTO,
      p_action: 'tag_person',
      p_description: 'Tagged a person in photo',
      p_reference_type: 'media_face',
      p_reference_id: faceId,
    })
    xpAwarded = XP_REWARDS.TAG_PERSON_IN_PHOTO

    // Index face in Rekognition collection for future auto-matching
    try {
      const { data: media } = await supabase
        .from('memory_face_tags')
        .select('media_id, memory_media!inner(file_url)')
        .eq('id', faceId)
        .single()

      if (media) {
        const mediaRecord = media.memory_media as unknown as { file_url: string }
        const imageRes = await fetch(mediaRecord.file_url)
        if (imageRes.ok) {
          const buffer = Buffer.from(await imageRes.arrayBuffer())
          await indexFace(buffer, user.id, contactId)
        }
      }
    } catch (indexErr) {
      // Non-blocking — don't fail the tag if indexing fails
      console.error('[Tag] Face indexing failed (non-blocking):', indexErr)
    }
  }

  return NextResponse.json({ 
    success: true,
    xpAwarded,
  })
}

/**
 * DELETE /api/media/[id]/tag - Remove tag from a face
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: mediaId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { faceId } = body

  if (!faceId) {
    return NextResponse.json({ error: 'faceId required' }, { status: 400 })
  }

  // Remove tag (but keep face and embedding for future matching)
  const { error } = await supabase
    .from('memory_face_tags')
    .update({
      contact_id: null,
      is_confirmed: false,
      confirmed_at: null,
    })
    .eq('id', faceId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
