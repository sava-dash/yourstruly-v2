import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/smart-albums - Get smart albums (grouped by people, events, etc.)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'people' // people, family, events

    if (type === 'people') {
      // Group photos by tagged people
      const { data: faceTags } = await supabase
        .from('memory_face_tags')
        .select(`
          contact_id,
          contacts!inner (
            id,
            full_name,
            avatar_url,
            relationship
          ),
          media:memory_media!inner (
            id,
            file_url,
            memory_id,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_confirmed', true)
        .order('created_at', { ascending: false })

      // Group by contact
      const albumMap = new Map<string, {
        contactId: string
        contactName: string
        avatarUrl?: string
        relationship?: string
        photoCount: number
        coverPhoto: string
        photos: Array<{
          mediaId: string
          fileUrl: string
          memoryId: string
          createdAt: string
        }>
      }>()

      faceTags?.forEach((tag: any) => {
        const contactId = tag.contact_id
        const contact = tag.contacts
        const media = tag.media

        if (!albumMap.has(contactId)) {
          albumMap.set(contactId, {
            contactId,
            contactName: contact.full_name,
            avatarUrl: contact.avatar_url,
            relationship: contact.relationship,
            photoCount: 0,
            coverPhoto: media.file_url,
            photos: [],
          })
        }

        const album = albumMap.get(contactId)!
        album.photoCount++
        album.photos.push({
          mediaId: media.id,
          fileUrl: media.file_url,
          memoryId: media.memory_id,
          createdAt: media.created_at,
        })
      })

      const albums = Array.from(albumMap.values())
        .sort((a, b) => b.photoCount - a.photoCount)

      return NextResponse.json({ albums, type: 'people' })
    }

    if (type === 'family') {
      // Photos with family members
      const { data: faceTags } = await supabase
        .from('memory_face_tags')
        .select(`
          media:memory_media!inner (
            id,
            file_url,
            memory_id,
            created_at
          ),
          contacts!inner (
            relationship
          )
        `)
        .eq('user_id', user.id)
        .eq('is_confirmed', true)
        .in('contacts.relationship', ['parent', 'sibling', 'child', 'spouse', 'partner'])
        .order('created_at', { ascending: false })

      const uniquePhotos = new Map()
      faceTags?.forEach((tag: any) => {
        const mediaId = tag.media.id
        if (!uniquePhotos.has(mediaId)) {
          uniquePhotos.set(mediaId, tag.media)
        }
      })

      return NextResponse.json({
        albums: [{
          albumId: 'family',
          albumName: 'Family',
          photoCount: uniquePhotos.size,
          coverPhoto: uniquePhotos.values().next().value?.file_url,
          photos: Array.from(uniquePhotos.values()),
        }],
        type: 'family',
      })
    }

    if (type === 'events') {
      // Group photos by date/location clusters
      // TODO: Implement event detection based on date + location + people
      return NextResponse.json({ albums: [], type: 'events' })
    }

    return NextResponse.json({ albums: [], type })

  } catch (error) {
    console.error('Smart albums error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch smart albums' },
      { status: 500 }
    )
  }
}
