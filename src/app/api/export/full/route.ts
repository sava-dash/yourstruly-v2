import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import JSZip from 'jszip'

export const maxDuration = 300 // 5 minutes for large exports

// Helper to extract storage path from Supabase URL
function getStoragePath(url: string): { bucket: string; path: string } | null {
  if (!url) return null
  
  // Match Supabase storage URLs
  // Format: https://xxx.supabase.co/storage/v1/object/public/bucket/path
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)
  if (match) {
    return { bucket: match[1], path: decodeURIComponent(match[2]) }
  }
  return null
}

// Helper to download file from URL
async function downloadFile(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('Failed to download:', url, error)
    return null
  }
}

// Get file extension from URL or content-type
function getExtension(url: string): string {
  const urlPath = url.split('?')[0]
  const ext = urlPath.split('.').pop()?.toLowerCase()
  if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'mp3', 'wav', 'pdf'].includes(ext)) {
    return ext
  }
  return 'bin'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const zip = new JSZip()
    const mediaMapping: Record<string, string> = {} // old URL -> new path in zip
    let totalFiles = 0

    // Fetch all user data
    const [
      profileRes,
      memoriesRes,
      contactsRes,
      educationRes,
      postscriptsRes,
      postscriptAttachmentsRes,
      wisdomRes,
      circlesRes,
      circleMembershipsRes,
      petsRes,
      mediaItemsRes,
      albumsRes,
      smartAlbumsRes,
      interviewSessionsRes,
      videoResponsesRes,
      voiceClonesRes,
      voiceSamplesRes,
      ordersRes,
      chatSessionsRes,
      chatMessagesRes,
      xpRes,
      xpTransactionsRes,
      streakRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('memories').select('*').eq('user_id', user.id),
      supabase.from('contacts').select('*').eq('user_id', user.id),
      supabase.from('education_history').select('*').eq('user_id', user.id),
      supabase.from('postscripts').select('*').eq('user_id', user.id),
      supabase.from('postscript_attachments').select('*').eq('user_id', user.id),
      supabase.from('knowledge_entries').select('*').eq('user_id', user.id),
      supabase.from('circles').select('*').eq('created_by', user.id),
      supabase.from('circle_members').select('*').eq('user_id', user.id),
      supabase.from('pets').select('*').eq('user_id', user.id),
      supabase.from('media_items').select('*').eq('user_id', user.id),
      supabase.from('memory_albums').select('*').eq('user_id', user.id),
      supabase.from('smart_albums').select('*').eq('user_id', user.id),
      supabase.from('interview_sessions').select('*').eq('user_id', user.id),
      supabase.from('video_responses').select('*').eq('user_id', user.id),
      supabase.from('voice_clones').select('*').eq('user_id', user.id),
      supabase.from('voice_clone_samples').select('*').eq('user_id', user.id),
      supabase.from('marketplace_orders').select('*').eq('user_id', user.id),
      supabase.from('chat_sessions').select('*').eq('user_id', user.id),
      supabase.from('chat_messages').select('*').eq('user_id', user.id),
      supabase.from('user_xp').select('*').eq('user_id', user.id).single(),
      supabase.from('xp_transactions').select('*').eq('user_id', user.id),
      supabase.from('streak_log').select('*').eq('user_id', user.id),
    ])

    // Get memory-related data
    const memoryIds = memoriesRes.data?.map(m => m.id) || []
    const [memoryMediaRes, memoryCommentsRes, memorySharesRes] = await Promise.all([
      memoryIds.length > 0 
        ? supabase.from('memory_media').select('*').in('memory_id', memoryIds)
        : { data: [] },
      memoryIds.length > 0 
        ? supabase.from('memory_comments').select('*').in('memory_id', memoryIds)
        : { data: [] },
      memoryIds.length > 0 
        ? supabase.from('memory_shares').select('*').in('memory_id', memoryIds)
        : { data: [] },
    ])

    // Get circle-related data
    const circleIds = circlesRes.data?.map(c => c.id) || []
    const [circleContentRes, circleMessagesRes, circlePostscriptsRes] = await Promise.all([
      circleIds.length > 0
        ? supabase.from('circle_content').select('*').in('circle_id', circleIds)
        : { data: [] },
      circleIds.length > 0
        ? supabase.from('circle_messages').select('*').in('circle_id', circleIds)
        : { data: [] },
      circleIds.length > 0
        ? supabase.from('circle_postscripts').select('*').in('circle_id', circleIds)
        : { data: [] },
    ])

    // === DOWNLOAD AND ZIP MEDIA FILES ===

    // 1. Profile avatar
    if (profileRes.data?.avatar_url) {
      const file = await downloadFile(profileRes.data.avatar_url)
      if (file) {
        const ext = getExtension(profileRes.data.avatar_url)
        const path = `profile/avatar.${ext}`
        zip.file(path, file)
        mediaMapping[profileRes.data.avatar_url] = path
        totalFiles++
      }
    }

    // 2. Memory media
    const memoryMedia = memoryMediaRes.data || []
    for (const media of memoryMedia) {
      if (media.url) {
        const file = await downloadFile(media.url)
        if (file) {
          const ext = getExtension(media.url)
          const path = `memories/${media.memory_id}/${media.id}.${ext}`
          zip.file(path, file)
          mediaMapping[media.url] = path
          totalFiles++
        }
      }
      // Also handle thumbnail_url if exists
      if (media.thumbnail_url) {
        const file = await downloadFile(media.thumbnail_url)
        if (file) {
          const ext = getExtension(media.thumbnail_url)
          const path = `memories/${media.memory_id}/${media.id}_thumb.${ext}`
          zip.file(path, file)
          mediaMapping[media.thumbnail_url] = path
          totalFiles++
        }
      }
    }

    // 3. Gallery media items
    const mediaItems = mediaItemsRes.data || []
    for (const item of mediaItems) {
      if (item.url) {
        const file = await downloadFile(item.url)
        if (file) {
          const ext = getExtension(item.url)
          const path = `gallery/${item.id}.${ext}`
          zip.file(path, file)
          mediaMapping[item.url] = path
          totalFiles++
        }
      }
      if (item.thumbnail_url) {
        const file = await downloadFile(item.thumbnail_url)
        if (file) {
          const ext = getExtension(item.thumbnail_url)
          const path = `gallery/${item.id}_thumb.${ext}`
          zip.file(path, file)
          mediaMapping[item.thumbnail_url] = path
          totalFiles++
        }
      }
    }

    // 4. Contact avatars
    const contacts = contactsRes.data || []
    for (const contact of contacts) {
      if (contact.avatar_url) {
        const file = await downloadFile(contact.avatar_url)
        if (file) {
          const ext = getExtension(contact.avatar_url)
          const path = `contacts/${contact.id}.${ext}`
          zip.file(path, file)
          mediaMapping[contact.avatar_url] = path
          totalFiles++
        }
      }
    }

    // 5. Pet photos
    const pets = petsRes.data || []
    for (const pet of pets) {
      if (pet.photo_url) {
        const file = await downloadFile(pet.photo_url)
        if (file) {
          const ext = getExtension(pet.photo_url)
          const path = `pets/${pet.id}.${ext}`
          zip.file(path, file)
          mediaMapping[pet.photo_url] = path
          totalFiles++
        }
      }
    }

    // 6. Voice clone samples
    const voiceSamples = voiceSamplesRes.data || []
    for (const sample of voiceSamples) {
      if (sample.audio_url) {
        const file = await downloadFile(sample.audio_url)
        if (file) {
          const ext = getExtension(sample.audio_url)
          const path = `voice_samples/${sample.id}.${ext}`
          zip.file(path, file)
          mediaMapping[sample.audio_url] = path
          totalFiles++
        }
      }
    }

    // 7. Video responses
    const videoResponses = videoResponsesRes.data || []
    for (const video of videoResponses) {
      if (video.video_url) {
        const file = await downloadFile(video.video_url)
        if (file) {
          const ext = getExtension(video.video_url)
          const path = `video_responses/${video.id}.${ext}`
          zip.file(path, file)
          mediaMapping[video.video_url] = path
          totalFiles++
        }
      }
    }

    // 8. Postscript attachments
    const postscriptAttachments = postscriptAttachmentsRes.data || []
    for (const attachment of postscriptAttachments) {
      if (attachment.url) {
        const file = await downloadFile(attachment.url)
        if (file) {
          const ext = getExtension(attachment.url)
          const path = `postscript_attachments/${attachment.id}.${ext}`
          zip.file(path, file)
          mediaMapping[attachment.url] = path
          totalFiles++
        }
      }
    }

    // === BUILD DATA JSON ===
    const exportData = {
      _meta: {
        exported_at: new Date().toISOString(),
        version: '2.1',
        format: 'full_with_media',
        user_id: user.id,
        user_email: user.email,
        total_media_files: totalFiles,
      },
      _media_mapping: mediaMapping, // Old URL -> path in zip
      profile: profileRes.data,
      education_history: educationRes.data || [],
      memories: memoriesRes.data || [],
      memory_media: memoryMediaRes.data || [],
      memory_comments: memoryCommentsRes.data || [],
      memory_shares: memorySharesRes.data || [],
      contacts: contactsRes.data || [],
      postscripts: postscriptsRes.data || [],
      postscript_attachments: postscriptAttachmentsRes.data || [],
      wisdom: wisdomRes.data || [],
      circles: circlesRes.data || [],
      circle_memberships: circleMembershipsRes.data || [],
      circle_content: circleContentRes.data || [],
      circle_messages: circleMessagesRes.data || [],
      circle_postscripts: circlePostscriptsRes.data || [],
      pets: petsRes.data || [],
      media_items: mediaItemsRes.data || [],
      albums: albumsRes.data || [],
      smart_albums: smartAlbumsRes.data || [],
      interview_sessions: interviewSessionsRes.data || [],
      video_responses: videoResponsesRes.data || [],
      voice_clones: voiceClonesRes.data || [],
      voice_clone_samples: voiceSamplesRes.data || [],
      orders: ordersRes.data || [],
      chat_sessions: chatSessionsRes.data || [],
      chat_messages: chatMessagesRes.data || [],
      xp: xpRes.data || null,
      xp_transactions: xpTransactionsRes.data || [],
      streaks: streakRes.data || [],
    }

    // Add JSON to zip
    zip.file('data.json', JSON.stringify(exportData, null, 2))

    // Generate zip
    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    // Return as download
    const filename = `yourstruly-full-backup-${new Date().toISOString().split('T')[0]}.zip`
    
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Full export error:', error)
    return NextResponse.json(
      { error: 'Export failed. Please try again.' },
      { status: 500 }
    )
  }
}
