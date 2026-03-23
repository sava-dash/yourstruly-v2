import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/memories/[id]/media — Add a photo to a memory
 * 
 * Supports:
 * - Owner adding their own photo to their memory
 * - Circle member adding their photo to a shared memory (collaboration)
 * 
 * Body: { media_id: string }
 */
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

  const body = await request.json()
  const { media_id } = body

  if (!media_id) {
    return NextResponse.json({ error: 'media_id is required' }, { status: 400 })
  }

  // 1. Verify the user owns the media they're attaching
  const { data: media, error: mediaError } = await supabase
    .from('memory_media')
    .select('id, user_id, memory_id')
    .eq('id', media_id)
    .eq('user_id', user.id)
    .single()

  if (mediaError || !media) {
    return NextResponse.json({ error: 'Media not found or not owned by you' }, { status: 404 })
  }

  // 2. Check authorization: user owns the memory OR has access via circle
  const { data: memory } = await supabase
    .from('memories')
    .select('id, user_id')
    .eq('id', memoryId)
    .single()

  if (!memory) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
  }

  let authorized = memory.user_id === user.id

  if (!authorized) {
    // Check if this memory is shared to a circle where the user is a member
    const { data: sharedToCircle } = await supabase
      .from('circle_content')
      .select(`
        id,
        circle_id,
        circle_members!inner (
          user_id,
          invite_status
        )
      `)
      .eq('content_type', 'memory')
      .eq('content_id', memoryId)
      .eq('circle_members.user_id', user.id)
      .eq('circle_members.invite_status', 'accepted')
      .limit(1)

    if (sharedToCircle && sharedToCircle.length > 0) {
      authorized = true
    }

    // Also check direct memory shares
    if (!authorized) {
      const { data: directShare } = await supabase
        .from('memory_shares')
        .select('id')
        .eq('memory_id', memoryId)
        .eq('shared_with_user_id', user.id)
        .eq('status', 'accepted')
        .limit(1)

      if (directShare && directShare.length > 0) {
        authorized = true
      }
    }
  }

  if (!authorized) {
    return NextResponse.json(
      { error: 'You do not have access to add photos to this memory' },
      { status: 403 }
    )
  }

  // 3. Attach the photo to the memory
  const { data: updated, error: updateError } = await supabase
    .from('memory_media')
    .update({ memory_id: memoryId })
    .eq('id', media_id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError) {
    console.error('Failed to attach media to memory:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, media: updated })
}
