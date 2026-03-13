import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/contacts/[id]/photos - Get all photos tagged with this contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contactId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get contact info
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, full_name, avatar_url')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Get all photos where this contact is tagged
    const { data: faceTags } = await supabase
      .from('memory_face_tags')
      .select(`
        media:memory_media!inner (
          id,
          file_url,
          memory_id,
          created_at,
          memory:memories!inner (
            id,
            title,
            memory_date,
            location_name
          )
        )
      `)
      .eq('contact_id', contactId)
      .eq('user_id', user.id)
      .eq('is_confirmed', true)
      .order('created_at', { ascending: false })

    // Remove duplicates (same photo might have multiple faces)
    const uniquePhotos = new Map()
    faceTags?.forEach((tag: any) => {
      const mediaId = tag.media.id
      if (!uniquePhotos.has(mediaId)) {
        uniquePhotos.set(mediaId, {
          mediaId: tag.media.id,
          fileUrl: tag.media.file_url,
          memoryId: tag.media.memory_id,
          createdAt: tag.media.created_at,
          memoryTitle: tag.media.memory.title,
          memoryDate: tag.media.memory.memory_date,
          location: tag.media.memory.location_name,
        })
      }
    })

    const photos = Array.from(uniquePhotos.values())

    return NextResponse.json({
      albumInfo: {
        name: contact.full_name,
        avatarUrl: contact.avatar_url,
        photoCount: photos.length,
      },
      photos,
    })

  } catch (error) {
    console.error('Contact photos error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contact photos' },
      { status: 500 }
    )
  }
}
