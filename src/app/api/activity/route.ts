import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Validate audio URL - must be http/https URL or start with expected S3 patterns
function isValidAudioUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (typeof url !== 'string') return undefined
  
  // Must be a proper URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // S3 signed URLs or CDN URLs
  if (url.startsWith('s3://') || url.includes('.s3.') || url.includes('cloudfront')) {
    return url
  }
  
  // Not a valid URL (e.g., "conversation", "voice", etc.)
  return undefined
}

export type ActivityType = 
  | 'memory_shared' 
  | 'wisdom_shared' 
  | 'circle_message' 
  | 'circle_invite' 
  | 'circle_content'
  | 'wisdom_comment'
  | 'memory_created'
  | 'wisdom_created'
  | 'contact_added'
  | 'photos_uploaded'
  | 'interview_response'
  | 'postscript_created'

export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  actor?: {
    id: string
    name: string
    avatar_url?: string
  }
  thumbnail?: string
  audio_url?: string  // Must be a valid URL (http/https or S3)
  link: string
  metadata?: Record<string, any>
}

// GET /api/activity - Get aggregated activity feed
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 500)

  const activities: ActivityItem[] = []

  // 1. Shared memories (where I'm the recipient)
  const { data: memoryShares } = await supabase
    .from('memory_shares')
    .select(`
      id,
      created_at,
      memory_id,
      memory:memories (
        id,
        title,
        description,
        location_name,
        media:memory_media(file_url, file_type)
      ),
      owner:profiles!memory_shares_shared_by_user_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('shared_with_user_id', user.id)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (memoryShares) {
    for (const share of memoryShares) {
      const memory = Array.isArray(share.memory) ? share.memory[0] : share.memory
      const owner = Array.isArray(share.owner) ? share.owner[0] : share.owner
      // Get memory ID from nested object or fallback to share.memory_id
      const memoryId = memory?.id || share.memory_id
      // Skip if owner is missing or we have no memory ID at all
      if (!owner || !memoryId) continue
      
      const mediaArray = memory?.media ? (Array.isArray(memory.media) ? memory.media : [memory.media]) : []
      const firstImage = mediaArray.find((m: any) => m.file_type === 'image' && m.file_url?.startsWith('http'))
      
      activities.push({
        id: `memory_share_${share.id}`,
        type: 'memory_shared',
        title: memory?.title || 'A memory',
        description: `${owner.full_name} shared a memory with you`,
        timestamp: share.created_at,
        actor: {
          id: owner.id,
          name: owner.full_name,
          avatar_url: owner.avatar_url
        },
        thumbnail: firstImage?.file_url,
        link: `/dashboard/memories/${memoryId}`,
        metadata: { 
          memoryId,
          location: memory?.location_name
        }
      })
    }
  }

  // 2. Shared wisdom (where I'm the recipient via contact)
  // First get my contact records (where someone has me as their contact)
  const { data: myContactRecords } = await supabase
    .from('contacts')
    .select('id, user_id')
    .eq('email', user.email)

  let wisdomShares: any = null
  if (myContactRecords && myContactRecords.length > 0) {
    const contactIds = myContactRecords.map(c => c.id)
    
    const result = await supabase
      .from('knowledge_shares')
      .select(`
        id,
        created_at,
        knowledge_id,
        knowledge:knowledge_entries!knowledge_shares_knowledge_id_fkey (
          id,
          prompt_text,
          category
        ),
        owner:profiles!knowledge_shares_owner_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .in('contact_id', contactIds)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    wisdomShares = result.data
  }

  if (wisdomShares) {
    for (const share of wisdomShares) {
      const knowledge = Array.isArray(share.knowledge) ? share.knowledge[0] : share.knowledge
      const owner = Array.isArray(share.owner) ? share.owner[0] : share.owner
      // Get knowledge ID from nested object or fallback to share.knowledge_id
      const knowledgeId = knowledge?.id || share.knowledge_id
      // Skip if owner is missing or we have no knowledge ID at all
      if (!owner || !knowledgeId) continue
      
      activities.push({
        id: `wisdom_share_${share.id}`,
        type: 'wisdom_shared',
        title: knowledge?.prompt_text || 'Wisdom',
        description: `${owner.full_name} shared wisdom with you`,
        timestamp: share.created_at,
        actor: {
          id: owner.id,
          name: owner.full_name,
          avatar_url: owner.avatar_url
        },
        link: `/dashboard/wisdom/${knowledgeId}`,
        metadata: { knowledgeId, category: knowledge?.category }
      })
    }
  }

  // 3. Circle messages (in circles I'm a member of)
  const { data: myCircleMemberships } = await supabase
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')

  if (myCircleMemberships && myCircleMemberships.length > 0) {
    const circleIds = myCircleMemberships.map(m => m.circle_id)
    
    const { data: circleMessages } = await supabase
      .from('circle_messages')
      .select(`
        id,
        content,
        created_at,
        circle_id,
        sender:profiles!circle_messages_sender_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        circle:circles (
          id,
          name
        )
      `)
      .in('circle_id', circleIds)
      .neq('sender_id', user.id) // Don't show my own messages
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (circleMessages) {
      for (const msg of circleMessages) {
        const sender = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender
        const circle = Array.isArray(msg.circle) ? msg.circle[0] : msg.circle
        if (!sender || !circle) continue
        
        activities.push({
          id: `circle_message_${msg.id}`,
          type: 'circle_message',
          title: circle.name,
          description: `${sender.full_name}: ${msg.content?.substring(0, 60) || 'sent media'}${msg.content && msg.content.length > 60 ? '...' : ''}`,
          timestamp: msg.created_at,
          actor: {
            id: sender.id,
            name: sender.full_name,
            avatar_url: sender.avatar_url
          },
          link: `/dashboard/circles/${msg.circle_id}`,
          metadata: { circleId: msg.circle_id, messageId: msg.id }
        })
      }
    }

    // 4. Circle content (shared to circles I'm in)
    const { data: circleContent } = await supabase
      .from('circle_content')
      .select(`
        id,
        content_type,
        content_id,
        created_at,
        circle_id,
        memory:memories (
          id,
          title
        ),
        knowledge:knowledge_entries (
          id,
          prompt_text
        ),
        shared_by:profiles!circle_content_shared_by_fkey (
          id,
          full_name,
          avatar_url
        ),
        circle:circles (
          id,
          name
        )
      `)
      .in('circle_id', circleIds)
      .neq('shared_by', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (circleContent) {
      for (const content of circleContent) {
        const sharedBy = Array.isArray(content.shared_by) ? content.shared_by[0] : content.shared_by
        const circle = Array.isArray(content.circle) ? content.circle[0] : content.circle
        const memory = Array.isArray(content.memory) ? content.memory[0] : content.memory
        const knowledge = Array.isArray(content.knowledge) ? content.knowledge[0] : content.knowledge
        if (!sharedBy || !circle) continue
        
        // Get content ID from nested object or fallback to content.content_id
        let contentId: string | undefined
        if (content.content_type === 'memory') {
          contentId = memory?.id || content.content_id
        } else {
          contentId = knowledge?.id || content.content_id
        }
        
        // Skip if we have no content ID at all
        if (!contentId) continue
        
        const contentTitle = memory?.title || knowledge?.prompt_text || 'Content'
        const contentType = content.content_type === 'memory' ? 'a memory' : 'wisdom'
        
        activities.push({
          id: `circle_content_${content.id}`,
          type: 'circle_content',
          title: contentTitle,
          description: `${sharedBy.full_name} shared ${contentType} to ${circle.name}`,
          timestamp: content.created_at,
          actor: {
            id: sharedBy.id,
            name: sharedBy.full_name,
            avatar_url: sharedBy.avatar_url
          },
          link: content.content_type === 'memory' 
            ? `/dashboard/memories/${contentId}` 
            : `/dashboard/wisdom/${contentId}`,
          metadata: { circleId: content.circle_id }
        })
      }
    }
  }

  // 5. Pending circle invites
  const { data: pendingInvites } = await supabase
    .from('circle_members')
    .select(`
      id,
      created_at,
      circle:circles (
        id,
        name,
        description
      ),
      invited_by_user:profiles!circle_members_invited_by_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('user_id', user.id)
    .eq('invite_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (pendingInvites) {
    for (const invite of pendingInvites) {
      const circle = Array.isArray(invite.circle) ? invite.circle[0] : invite.circle
      const invitedBy = Array.isArray(invite.invited_by_user) ? invite.invited_by_user[0] : invite.invited_by_user
      if (!circle) continue
      
      activities.push({
        id: `circle_invite_${invite.id}`,
        type: 'circle_invite',
        title: circle.name,
        description: invitedBy 
          ? `${invitedBy.full_name} invited you to join`
          : 'You have been invited to join',
        timestamp: invite.created_at,
        actor: invitedBy ? {
          id: invitedBy.id,
          name: invitedBy.full_name,
          avatar_url: invitedBy.avatar_url
        } : undefined,
        link: `/dashboard/circles/${circle.id}`,
        metadata: { circleId: circle.id, inviteId: invite.id }
      })
    }
  }

  // 6. User's own memories (recently created) - with first photo and metadata
  const { data: myMemories } = await supabase
    .from('memories')
    .select(`
      id, 
      title, 
      description, 
      created_at,
      memory_date,
      location_name,
      location_lat,
      location_lng,
      audio_url,
      category,
      media:memory_media(file_url, file_type)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Batch-fetch face-tagged contact names for all memories
  const memoryFaceTagMap: Record<string, string[]> = {}
  if (myMemories && myMemories.length > 0) {
    const memoryIds = myMemories.map(m => m.id)
    const { data: faceTags } = await supabase
      .from('memory_face_tags')
      .select(`
        contact_id,
        memory_media!inner(memory_id),
        contacts(full_name)
      `)
      .in('memory_media.memory_id', memoryIds)
      .not('contact_id', 'is', null)

    if (faceTags) {
      for (const tag of faceTags) {
        const media = tag.memory_media as any
        const memoryId = media?.memory_id
        const contact = tag.contacts as any
        const name = contact?.full_name
        if (memoryId && name) {
          if (!memoryFaceTagMap[memoryId]) memoryFaceTagMap[memoryId] = []
          if (!memoryFaceTagMap[memoryId].includes(name)) {
            memoryFaceTagMap[memoryId].push(name)
          }
        }
      }
    }
  }

  if (myMemories) {
    for (const memory of myMemories) {
      const mediaArray = Array.isArray(memory.media) ? memory.media : (memory.media ? [memory.media] : [])
      const firstImage = mediaArray.find((m: any) => m.file_type === 'image' && m.file_url?.startsWith('http'))
      
      activities.push({
        id: `memory_created_${memory.id}`,
        type: 'memory_created',
        title: memory.title || 'Untitled Memory',
        description: memory.description || '',
        timestamp: memory.memory_date || memory.created_at,
        link: `/dashboard/memories/${memory.id}`,
        thumbnail: firstImage?.file_url,
        audio_url: isValidAudioUrl(memory.audio_url),
        metadata: { 
          memoryId: memory.id,
          location: memory.location_name,
          lat: memory.location_lat,
          lng: memory.location_lng,
          category: memory.category,
          tagged_people: memoryFaceTagMap[memory.id] || []
        }
      })
    }
  }

  // 7. User's own wisdom (recently captured)
  const { data: myWisdom } = await supabase
    .from('knowledge_entries')
    .select('id, prompt_text, category, audio_url, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (myWisdom) {
    for (const wisdom of myWisdom) {
      activities.push({
        id: `wisdom_created_${wisdom.id}`,
        type: 'wisdom_created',
        title: wisdom.prompt_text?.slice(0, 60) || 'Wisdom',
        description: 'You captured new wisdom',
        timestamp: wisdom.created_at,
        audio_url: isValidAudioUrl(wisdom.audio_url),
        link: `/dashboard/wisdom/${wisdom.id}`,
        metadata: { wisdomId: wisdom.id, category: wisdom.category }
      })
    }
  }

  // 8. User's own contacts (recently added)
  const { data: myContacts } = await supabase
    .from('contacts')
    .select('id, full_name, relationship, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (myContacts) {
    for (const contact of myContacts) {
      activities.push({
        id: `contact_added_${contact.id}`,
        type: 'contact_added',
        title: contact.full_name || 'New Contact',
        description: `You added ${contact.full_name}${contact.relationship ? ` (${contact.relationship})` : ''}`,
        timestamp: contact.created_at,
        link: `/dashboard/contacts/${contact.id}`,
        metadata: { contactId: contact.id }
      })
    }
  }

  // 9. User's photo uploads (recent media)
  const { data: myPhotos } = await supabase
    .from('memory_media')
    .select(`
      id,
      memory_id,
      file_url,
      file_type,
      created_at,
      taken_at,
      memory:memories!memory_media_memory_id_fkey (
        id,
        title,
        memory_date
      )
    `)
    .eq('user_id', user.id)
    .eq('file_type', 'image')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (myPhotos) {
    for (const photo of myPhotos) {
      const memory = Array.isArray(photo.memory) ? photo.memory[0] : photo.memory
      const memoryId = memory?.id || photo.memory_id
      if (!memoryId) continue
      // Skip entries with invalid URLs (e.g. "text-only", "conversation")
      if (!photo.file_url?.startsWith('http')) continue

      // Use taken_at (EXIF date) > memory_date > created_at
      const photoDate = photo.taken_at || memory?.memory_date || photo.created_at

      activities.push({
        id: `photo_uploaded_${photo.id}`,
        type: 'photos_uploaded',
        title: 'Image uploaded',
        description: memory?.title ? `Added to "${memory.title}"` : 'You uploaded an image',
        timestamp: photoDate,
        link: `/dashboard/memories/${memoryId}`,
        thumbnail: photo.file_url,
        metadata: { photoId: photo.id, memoryId, tagged_people: memoryFaceTagMap[memoryId] || [] }
      })
    }
  }

  // 10. User's interview responses (video responses)
  const { data: myInterviews } = await supabase
    .from('video_responses')
    .select(`
      id,
      created_at,
      video_url,
      audio_url,
      thumbnail_url,
      session_id,
      session_question:session_questions!video_responses_session_question_id_fkey (
        id,
        question_text,
        session:interview_sessions!session_questions_session_id_fkey (
          id,
          title,
          contact:contacts!interview_sessions_contact_id_fkey (
            id,
            full_name
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (myInterviews) {
    for (const response of myInterviews) {
      const sessionQuestion = Array.isArray(response.session_question) 
        ? response.session_question[0] 
        : response.session_question
      const session = sessionQuestion?.session
        ? (Array.isArray(sessionQuestion.session) ? sessionQuestion.session[0] : sessionQuestion.session)
        : null
      const contact = session?.contact
        ? (Array.isArray(session.contact) ? session.contact[0] : session.contact)
        : null

      const questionText = sessionQuestion?.question_text || 'Interview question'
      const sessionTitle = session?.title || (contact?.full_name ? `Interview with ${contact.full_name}` : 'Interview')

      activities.push({
        id: `interview_response_${response.id}`,
        type: 'interview_response',
        title: questionText.length > 60 ? questionText.slice(0, 60) + '...' : questionText,
        description: `You answered for ${sessionTitle}`,
        timestamp: response.created_at,
        link: `/dashboard/interviews/${response.session_id}`,
        thumbnail: (response.thumbnail_url?.startsWith('http') ? response.thumbnail_url : null) 
          || (response.video_url?.startsWith('http') ? response.video_url : null),
        audio_url: isValidAudioUrl(response.audio_url) || isValidAudioUrl(response.video_url),
        metadata: { 
          responseId: response.id,
          sessionId: response.session_id,
          contactName: contact?.full_name
        }
      })
    }
  }

  // 11. User's postscripts (recently created)
  const { data: myPostscripts, error: postscriptsError } = await supabase
    .from('postscripts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (postscriptsError) {
    console.error('Error fetching postscripts:', postscriptsError)
  }

  console.log('Postscripts query result:', { count: myPostscripts?.length, error: postscriptsError })

  if (myPostscripts && myPostscripts.length > 0) {
    // Fetch contact names separately
    const contactIds = myPostscripts
      .map(p => p.recipient_contact_id)
      .filter(Boolean)
    
    let contactMap: Record<string, any> = {}
    if (contactIds.length > 0) {
      const { data: recipients } = await supabase
        .from('contacts')
        .select('id, full_name')
        .in('id', contactIds)
      
      if (recipients) {
        contactMap = recipients.reduce((acc, c) => ({ ...acc, [c.id]: c }), {})
      }
    }

    for (const postscript of myPostscripts) {
      const recipient = postscript.recipient_contact_id ? contactMap[postscript.recipient_contact_id] : null
      
      activities.push({
        id: `postscript_created_${postscript.id}`,
        type: 'postscript_created',
        title: postscript.title || 'PostScript',
        description: recipient 
          ? `PostScript for ${recipient.full_name}`
          : 'You created a PostScript',
        timestamp: postscript.created_at,
        link: `/dashboard/postscripts/${postscript.id}`,
        metadata: { 
          postscriptId: postscript.id,
          recipient_name: recipient?.full_name,
          delivery_date: postscript.delivery_date,
          trigger_event: postscript.trigger_event
        }
      })
    }
  }

  // Sort all activities by timestamp (most recent first)
  activities.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  // Limit final result
  const limitedActivities = activities.slice(0, limit)

  return NextResponse.json({ 
    activities: limitedActivities,
    total: activities.length
  })
}
