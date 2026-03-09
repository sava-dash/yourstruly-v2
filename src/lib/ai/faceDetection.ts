/**
 * Face Detection Service (Open Source)
 *
 * Uses @vladmandic/face-api (face-api.js fork) for:
 * - Face detection
 * - Face embeddings (128-dim descriptors)
 * - Face matching/recognition
 *
 * Models are loaded from /public/models/face-api/
 *
 * NOTE: All face-api / canvas imports are DYNAMIC to prevent the module
 * from being evaluated at server startup (which crashes ECS because
 * @tensorflow/tfjs-node is not in the Docker image).
 */

import * as path from 'path'
import * as fs from 'fs'

// Track if models are loaded
let modelsLoaded = false
let modelsLoading: Promise<void> | null = null

// Models directory
const MODELS_DIR =
  process.env.FACE_MODELS_PATH ||
  path.join(process.cwd(), 'public', 'models', 'face-api')

// ============================================
// INTERFACES
// ============================================

export interface DetectedFace {
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  confidence: number
  embedding: number[] // 128-dimensional descriptor
  age?: number
  gender?: string
  genderProbability?: number
  expressions?: Record<string, number>
}

export interface FaceMatch {
  contactId: string
  distance: number
  confidence: number
}

// ============================================
// MODEL LOADING (lazy)
// ============================================

/**
 * Load face detection models (only once, only when actually needed).
 * Dynamic imports prevent startup crash when tfjs-node is missing.
 */
export async function loadModels(): Promise<void> {
  if (modelsLoaded) return
  if (modelsLoading) return modelsLoading

  modelsLoading = (async () => {
    if (!fs.existsSync(MODELS_DIR)) {
      console.warn(`Face models not found at ${MODELS_DIR}. Face detection disabled.`)
      return
    }

    try {
      // Dynamic import — only evaluated here, not at module load time
      const faceapi = await import('@vladmandic/face-api').catch(() => null)
      if (!faceapi) {
        console.warn('face-api unavailable (missing tfjs-node). Face detection disabled.')
        return
      }

      const { Canvas, Image, ImageData } = await import('canvas').catch(() => ({
        Canvas: undefined,
        Image: undefined,
        ImageData: undefined,
      }))

      if (!Canvas || !Image || !ImageData) {
        console.warn('canvas package unavailable. Face detection disabled.')
        return
      }

      // @ts-ignore
      faceapi.env.monkeyPatch({ Canvas, Image, ImageData })

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_DIR),
        faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_DIR),
        faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_DIR),
        faceapi.nets.ageGenderNet.loadFromDisk(MODELS_DIR),
        faceapi.nets.faceExpressionNet.loadFromDisk(MODELS_DIR),
      ])

      modelsLoaded = true
      console.log('✅ Face detection models loaded')
    } catch (e) {
      console.error('Failed to load face models:', e)
    }
  })()

  return modelsLoading
}

// ============================================
// FACE DETECTION
// ============================================

/**
 * Detect all faces in an image and extract embeddings
 */
export async function detectFaces(imageBuffer: Buffer): Promise<DetectedFace[]> {
  await loadModels()
  if (!modelsLoaded) return []

  try {
    const faceapi = await import('@vladmandic/face-api').catch(() => null)
    if (!faceapi) return []

    const { Image } = await import('canvas').catch(() => ({ Image: undefined }))
    if (!Image) return []

    const img = await loadImage(imageBuffer, Image as any)

    const detections = await faceapi
      .detectAllFaces(img as any)
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withAgeAndGender()
      .withFaceExpressions()

    return detections.map((det) => {
      const box = det.detection.box
      return {
        boundingBox: {
          x: box.x / img.width,
          y: box.y / img.height,
          width: box.width / img.width,
          height: box.height / img.height,
        },
        confidence: det.detection.score,
        embedding: Array.from(det.descriptor),
        age: Math.round(det.age),
        gender: det.gender,
        genderProbability: det.genderProbability,
        expressions: det.expressions as unknown as Record<string, number>,
      }
    })
  } catch (e) {
    console.error('Face detection error:', e)
    return []
  }
}

/**
 * Detect single face (best for profile photos)
 */
export async function detectSingleFace(imageBuffer: Buffer): Promise<DetectedFace | null> {
  const faces = await detectFaces(imageBuffer)
  if (faces.length === 0) return null
  return faces.reduce((best, face) =>
    face.confidence > best.confidence ? face : best
  )
}

// ============================================
// FACE MATCHING (pure math — no native deps)
// ============================================

export function calculateFaceDistance(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== 128 || embedding2.length !== 128) {
    throw new Error('Embeddings must be 128-dimensional')
  }
  let sum = 0
  for (let i = 0; i < 128; i++) {
    const diff = embedding1[i] - embedding2[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

export function distanceToConfidence(distance: number): number {
  const confidence = Math.max(0, Math.min(100, (1 - distance / 1.2) * 100))
  return Math.round(confidence * 10) / 10
}

export function matchFace(
  faceEmbedding: number[],
  knownFaces: Array<{ id: string; embedding: number[] }>,
  threshold = 0.6
): FaceMatch | null {
  let bestMatch: FaceMatch | null = null
  let bestDistance = Infinity

  for (const known of knownFaces) {
    const distance = calculateFaceDistance(faceEmbedding, known.embedding)
    if (distance < threshold && distance < bestDistance) {
      bestDistance = distance
      bestMatch = { contactId: known.id, distance, confidence: distanceToConfidence(distance) }
    }
  }
  return bestMatch
}

export function findAllMatches(
  faceEmbedding: number[],
  knownFaces: Array<{ id: string; embedding: number[] }>,
  maxResults = 5,
  threshold = 0.8
): FaceMatch[] {
  const matches: FaceMatch[] = []
  for (const known of knownFaces) {
    const distance = calculateFaceDistance(faceEmbedding, known.embedding)
    if (distance < threshold) {
      matches.push({ contactId: known.id, distance, confidence: distanceToConfidence(distance) })
    }
  }
  return matches.sort((a, b) => a.distance - b.distance).slice(0, maxResults)
}

// ============================================
// UTILITIES
// ============================================

async function loadImage(buffer: Buffer, ImageClass: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const img = new ImageClass()
    img.onload = () => resolve(img)
    img.onerror = (err: any) => reject(err)
    img.src = buffer
  })
}

export function getDominantExpression(expressions: Record<string, number>): string {
  const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || 'neutral'
}

export function isAvailable(): boolean {
  return modelsLoaded
}

export async function ensureModels(): Promise<boolean> {
  await loadModels()
  return modelsLoaded
}
