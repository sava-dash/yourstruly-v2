/**
 * AWS Rekognition Face Detection & Recognition
 * 
 * Features:
 * - Face detection in photos
 * - Face comparison (matching)
 * - Face collections (indexing)
 * - Age/gender/emotion detection
 */

import {
  RekognitionClient,
  DetectFacesCommand,
  DetectFacesCommandInput,
  SearchFacesByImageCommand,
  IndexFacesCommand,
  CreateCollectionCommand,
  DeleteFacesCommand,
  CompareFacesCommand,
  Attribute,
  BoundingBox,
} from '@aws-sdk/client-rekognition'

// ============================================
// INTERFACES
// ============================================

export interface DetectedFace {
  boundingBox: {
    x: number // normalized 0-1
    y: number
    width: number
    height: number
  }
  confidence: number
  age?: { low: number; high: number }
  gender?: string
  genderConfidence?: number
  emotions?: Array<{ type: string; confidence: number }>
  faceId?: string // Rekognition face ID (if indexed)
}

export interface FaceMatch {
  contactId: string
  similarity: number // 0-100
  faceId: string
}

// ============================================
// CLIENT
// ============================================

let rekognitionClient: RekognitionClient | null = null

function getRekognitionClient(): RekognitionClient {
  if (!rekognitionClient) {
    rekognitionClient = new RekognitionClient({
      region: process.env.AWS_REGION || 'us-east-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return rekognitionClient
}

// ============================================
// FACE DETECTION
// ============================================

/**
 * Detect all faces in an image
 */
export async function detectFaces(imageBuffer: Buffer): Promise<DetectedFace[]> {
  console.log('[Rekognition] Detecting faces, buffer size:', imageBuffer.length)
  
  const client = getRekognitionClient()
  
  const params: DetectFacesCommandInput = {
    Image: {
      Bytes: imageBuffer,
    },
    Attributes: [Attribute.ALL], // Get age, gender, emotions, etc.
  }

  try {
    const command = new DetectFacesCommand(params)
    const response = await command.send(client)
    
    const faces: DetectedFace[] = (response.FaceDetails || []).map((face) => {
      const box = face.BoundingBox!
      
      return {
        boundingBox: {
          x: box.Left || 0,
          y: box.Top || 0,
          width: box.Width || 0,
          height: box.Height || 0,
        },
        confidence: face.Confidence || 0,
        age: face.AgeRange ? {
          low: face.AgeRange.Low || 0,
          high: face.AgeRange.High || 0,
        } : undefined,
        gender: face.Gender?.Value,
        genderConfidence: face.Gender?.Confidence,
        emotions: (face.Emotions || []).map((e) => ({
          type: e.Type || 'UNKNOWN',
          confidence: e.Confidence || 0,
        })),
      }
    })

    console.log(`[Rekognition] ✅ Detected ${faces.length} faces`)
    return faces
    
  } catch (error) {
    console.error('[Rekognition] ❌ Face detection failed:', error)
    return []
  }
}

// ============================================
// FACE INDEXING (for recognition)
// ============================================

/**
 * Index a face into a collection (for future matching)
 * Collection name format: yourstruly-{userId}
 */
export async function indexFace(
  imageBuffer: Buffer,
  userId: string,
  contactId: string
): Promise<string | null> {
  console.log('[Rekognition] Indexing face for contact:', contactId)
  
  const client = getRekognitionClient()
  const collectionId = `yourstruly-${userId}`
  
  try {
    // Create collection if doesn't exist (idempotent)
    try {
      await client.send(new CreateCollectionCommand({ CollectionId: collectionId }))
      console.log('[Rekognition] ✅ Created collection:', collectionId)
    } catch (err: any) {
      if (err.name !== 'ResourceAlreadyExistsException') {
        throw err
      }
    }
    
    // Index the face
    const command = new IndexFacesCommand({
      CollectionId: collectionId,
      Image: { Bytes: imageBuffer },
      ExternalImageId: contactId, // Store contact ID as external ID
      MaxFaces: 1,
      QualityFilter: 'AUTO',
      DetectionAttributes: [Attribute.ALL],
    })
    
    const response = await command.send(client)
    
    if (response.FaceRecords && response.FaceRecords.length > 0) {
      const faceId = response.FaceRecords[0].Face?.FaceId
      console.log('[Rekognition] ✅ Indexed face:', faceId)
      return faceId || null
    }
    
    return null
    
  } catch (error) {
    console.error('[Rekognition] ❌ Face indexing failed:', error)
    return null
  }
}

/**
 * Search for matching faces in user's collection
 */
export async function searchFaces(
  imageBuffer: Buffer,
  userId: string,
  threshold: number = 80 // 80% similarity minimum
): Promise<FaceMatch[]> {
  console.log('[Rekognition] Searching for face matches')
  
  const client = getRekognitionClient()
  const collectionId = `yourstruly-${userId}`
  
  try {
    const command = new SearchFacesByImageCommand({
      CollectionId: collectionId,
      Image: { Bytes: imageBuffer },
      FaceMatchThreshold: threshold,
      MaxFaces: 5,
    })
    
    const response = await command.send(client)
    
    const matches: FaceMatch[] = (response.FaceMatches || []).map((match) => ({
      contactId: match.Face?.ExternalImageId || '',
      similarity: match.Similarity || 0,
      faceId: match.Face?.FaceId || '',
    }))
    
    console.log(`[Rekognition] ✅ Found ${matches.length} face matches`)
    return matches
    
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log('[Rekognition] No collection found (no indexed faces yet)')
      return []
    }
    console.error('[Rekognition] ❌ Face search failed:', error)
    return []
  }
}

/**
 * Compare two faces for similarity
 */
export async function compareFaces(
  sourceImage: Buffer,
  targetImage: Buffer,
  threshold: number = 80
): Promise<number | null> {
  console.log('[Rekognition] Comparing two faces')
  
  const client = getRekognitionClient()
  
  try {
    const command = new CompareFacesCommand({
      SourceImage: { Bytes: sourceImage },
      TargetImage: { Bytes: targetImage },
      SimilarityThreshold: threshold,
    })
    
    const response = await command.send(client)
    
    if (response.FaceMatches && response.FaceMatches.length > 0) {
      const similarity = response.FaceMatches[0].Similarity || 0
      console.log(`[Rekognition] ✅ Face similarity: ${similarity}%`)
      return similarity
    }
    
    console.log('[Rekognition] No face match')
    return null
    
  } catch (error) {
    console.error('[Rekognition] ❌ Face comparison failed:', error)
    return null
  }
}

/**
 * Delete a face from collection
 */
export async function deleteFace(userId: string, faceId: string): Promise<boolean> {
  console.log('[Rekognition] Deleting face:', faceId)
  
  const client = getRekognitionClient()
  const collectionId = `yourstruly-${userId}`
  
  try {
    await client.send(new DeleteFacesCommand({
      CollectionId: collectionId,
      FaceIds: [faceId],
    }))
    
    console.log('[Rekognition] ✅ Face deleted')
    return true
    
  } catch (error) {
    console.error('[Rekognition] ❌ Face deletion failed:', error)
    return false
  }
}

// ============================================
// UTILITIES
// ============================================

/**
 * Get dominant emotion from emotions array
 */
export function getDominantEmotion(emotions: Array<{ type: string; confidence: number }>): string {
  if (!emotions || emotions.length === 0) return 'UNKNOWN'
  
  const sorted = emotions.sort((a, b) => b.confidence - a.confidence)
  return sorted[0].type
}

/**
 * Convert Rekognition bounding box to our format
 */
export function normalizeBoundingBox(box: BoundingBox): {
  x: number
  y: number
  width: number
  height: number
} {
  return {
    x: box.Left || 0,
    y: box.Top || 0,
    width: box.Width || 0,
    height: box.Height || 0,
  }
}
