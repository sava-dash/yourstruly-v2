import { createClient } from '@/lib/supabase/client'

// ============================================
// Types
// ============================================

// Local type definitions (face detection now handled server-side via AWS Rekognition)
interface DetectedFace {
  descriptor: Float32Array
  box: { x: number; y: number; width: number; height: number }
  confidence: number
  age?: number
  gender?: string
  expression?: string
}

interface FaceDetectionResult {
  faces: DetectedFace[]
}

// ============================================
// Exported Types
// ============================================
export interface Face {
  id: string
  name: string | null
  contact_id: string | null
  thumbnail_url: string | null
  face_count: number
  created_at: string
}

export interface FaceWithStats extends Face {
  memory_count: number
  latest_memory_date: string | null
}

export interface FaceTag {
  id: string
  media_id: string
  face_id: string | null
  contact_id: string | null
  box_left: number
  box_top: number
  box_width: number
  box_height: number
  confidence: number
  age: number | null
  gender: string | null
  expression: string | null
}

// ============================================
// Store detected faces in database
// ============================================
export async function storeFaceDetections(
  mediaId: string,
  userId: string,
  detections: DetectedFace[],
  mediaUrl: string
): Promise<FaceTag[]> {
  const supabase = createClient()
  const storedTags: FaceTag[] = []

  for (const face of detections) {
    // Convert Float32Array to regular array for storage
    const embeddingArray = Array.from(face.descriptor)
    
    // Call find_or_create_face_cluster function
    const { data: faceId, error: clusterError } = await supabase.rpc(
      'find_or_create_face_cluster',
      {
        p_user_id: userId,
        p_embedding: embeddingArray,
        p_media_id: mediaId,
        p_threshold: 0.55
      }
    )
    
    if (clusterError) {
      console.error('Error creating face cluster:', clusterError)
      continue
    }

    // Store the face tag
    const { data: tag, error: tagError } = await supabase
      .from('memory_face_tags')
      .insert({
        media_id: mediaId,
        user_id: userId,
        face_id: faceId,
        face_embedding: embeddingArray,
        box_left: face.box.x,
        box_top: face.box.y,
        box_width: face.box.width,
        box_height: face.box.height,
        confidence: face.confidence,
        age: face.age,
        gender: face.gender,
        expression: face.expression,
        is_auto_detected: true,
      })
      .select()
      .single()

    if (tagError) {
      console.error('Error storing face tag:', tagError)
      continue
    }

    storedTags.push(tag)
  }

  // Update face thumbnails if needed
  await updateFaceThumbnails(userId, mediaUrl, detections, storedTags)

  return storedTags
}

// ============================================
// Update face cluster thumbnails
// ============================================
async function updateFaceThumbnails(
  userId: string,
  mediaUrl: string,
  detections: DetectedFace[],
  storedTags: FaceTag[]
) {
  const supabase = createClient()

  for (let i = 0; i < storedTags.length; i++) {
    const tag = storedTags[i]
    const face = detections[i]
    
    if (!tag.face_id) continue

    // Check if face cluster needs a thumbnail
    const { data: cluster } = await supabase
      .from('faces')
      .select('thumbnail_url')
      .eq('id', tag.face_id)
      .single()

    if (!cluster?.thumbnail_url) {
      // Generate cropped face thumbnail URL
      // In production, you'd crop and upload to storage
      // For now, store the source URL with crop params
      const cropParams = new URLSearchParams({
        crop: `${face.box.x},${face.box.y},${face.box.width},${face.box.height}`,
      })
      const thumbnailUrl = `${mediaUrl}?${cropParams.toString()}`

      await supabase
        .from('faces')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', tag.face_id)
    }
  }
}

// ============================================
// Get all face clusters for user
// ============================================
export async function getFaces(): Promise<FaceWithStats[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  const { data, error } = await supabase.rpc('get_faces_with_stats', {
    p_user_id: user.id
  })

  if (error) {
    console.error('Error fetching faces:', error)
    return []
  }

  return data || []
}

// ============================================
// Get face by ID
// ============================================
export async function getFaceById(faceId: string): Promise<Face | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('faces')
    .select('*')
    .eq('id', faceId)
    .single()

  if (error) {
    console.error('Error fetching face:', error)
    return null
  }

  return data
}

// ============================================
// Update face name
// ============================================
export async function updateFaceName(
  faceId: string,
  name: string
): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('faces')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', faceId)

  if (error) {
    console.error('Error updating face name:', error)
    return false
  }

  return true
}

// ============================================
// Link face to contact
// ============================================
export async function linkFaceToContact(
  faceId: string,
  contactId: string
): Promise<boolean> {
  const supabase = createClient()
  
  // Get contact name
  const { data: contact } = await supabase
    .from('contacts')
    .select('full_name')
    .eq('id', contactId)
    .single()

  const { error } = await supabase
    .from('faces')
    .update({ 
      contact_id: contactId,
      name: contact?.full_name || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', faceId)

  if (error) {
    console.error('Error linking face to contact:', error)
    return false
  }

  // Also update all face tags for this cluster
  await supabase
    .from('memory_face_tags')
    .update({ contact_id: contactId })
    .eq('face_id', faceId)

  return true
}

// ============================================
// Merge face clusters
// ============================================
export async function mergeFaces(
  keepFaceId: string,
  mergeFaceId: string
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false

  const { error } = await supabase.rpc('merge_face_clusters', {
    p_user_id: user.id,
    p_keep_face_id: keepFaceId,
    p_merge_face_id: mergeFaceId
  })

  if (error) {
    console.error('Error merging faces:', error)
    return false
  }

  return true
}

// ============================================
// Hide/show face cluster
// ============================================
export async function toggleFaceVisibility(
  faceId: string,
  isHidden: boolean
): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('faces')
    .update({ is_hidden: isHidden })
    .eq('id', faceId)

  if (error) {
    console.error('Error toggling face visibility:', error)
    return false
  }

  return true
}

// ============================================
// Get memories containing a face
// ============================================
export async function getMemoriesWithFace(faceId: string): Promise<any[]> {
  const supabase = createClient()
  
  const { data: tags } = await supabase
    .from('memory_face_tags')
    .select('memory_media!inner(memory_id)')
    .eq('face_id', faceId)

  if (!tags || tags.length === 0) return []

  const memoryIds = [...new Set(tags.map((t: any) => t.memory_media?.memory_id).filter(Boolean))]

  const { data: memories } = await supabase
    .from('memories')
    .select('*, memory_media(id, file_url, file_type, is_cover)')
    .in('id', memoryIds)
    .order('memory_date', { ascending: false })

  return memories || []
}

// ============================================
// Get faces detected in a specific memory
// ============================================
export async function getFacesInMemory(memoryId: string): Promise<(FaceTag & { face: Face | null })[]> {
  const supabase = createClient()
  
  const { data: tags } = await supabase
    .from('memory_face_tags')
    .select(`
      *,
      face:faces(id, name, contact_id, thumbnail_url),
      memory_media!inner(memory_id)
    `)
    .eq('memory_media.memory_id', memoryId)

  return tags || []
}

// ============================================
// Delete a face cluster
// ============================================
export async function deleteFace(faceId: string): Promise<boolean> {
  const supabase = createClient()
  
  // First unlink all face tags
  await supabase
    .from('memory_face_tags')
    .update({ face_id: null })
    .eq('face_id', faceId)

  // Then delete the face cluster
  const { error } = await supabase
    .from('faces')
    .delete()
    .eq('id', faceId)

  if (error) {
    console.error('Error deleting face:', error)
    return false
  }

  return true
}
