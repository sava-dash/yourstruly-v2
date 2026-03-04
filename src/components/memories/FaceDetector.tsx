'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from '@vladmandic/face-api'
import { Loader2, Users, CheckCircle2, AlertCircle } from 'lucide-react'

// ============================================
// Types
// ============================================
export interface DetectedFace {
  descriptor: Float32Array
  box: {
    x: number  // percentage 0-1
    y: number
    width: number
    height: number
  }
  confidence: number
  age?: number
  gender?: string
  expression?: string
}

export interface FaceDetectionResult {
  faces: DetectedFace[]
  imageWidth: number
  imageHeight: number
}

interface FaceDetectorProps {
  imageUrl: string
  onDetectionComplete?: (result: FaceDetectionResult) => void
  showPreview?: boolean
  autoProcess?: boolean
}

// ============================================
// Model Loading (singleton)
// ============================================
let modelsLoaded = false
let modelsLoading = false
const modelLoadPromise: { current: Promise<void> | null } = { current: null }

async function loadModels(): Promise<void> {
  if (modelsLoaded) return
  
  if (modelsLoading && modelLoadPromise.current) {
    return modelLoadPromise.current
  }
  
  modelsLoading = true
  
  modelLoadPromise.current = (async () => {
    const MODEL_URL = '/models/face-api'
    
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ])
    
    modelsLoaded = true
    modelsLoading = false
  })()
  
  return modelLoadPromise.current
}

// ============================================
// Detection Logic
// ============================================
export async function detectFaces(imageUrl: string): Promise<FaceDetectionResult> {
  await loadModels()
  
  // Create image element
  const img = await faceapi.fetchImage(imageUrl)
  
  // Detect faces with all features
  const detections = await faceapi
    .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors()
    .withAgeAndGender()
    .withFaceExpressions()
  
  // Convert to our format
  const faces: DetectedFace[] = detections.map(det => {
    const box = det.detection.box
    
    // Find dominant expression
    const expressions = det.expressions
    let dominantExpression = 'neutral'
    let maxScore = 0
    Object.entries(expressions).forEach(([expr, score]) => {
      if (score > maxScore) {
        maxScore = score
        dominantExpression = expr
      }
    })
    
    return {
      descriptor: det.descriptor,
      box: {
        x: box.x / img.width,
        y: box.y / img.height,
        width: box.width / img.width,
        height: box.height / img.height,
      },
      confidence: det.detection.score,
      age: Math.round(det.age),
      gender: det.gender,
      expression: dominantExpression,
    }
  })
  
  return {
    faces,
    imageWidth: img.width,
    imageHeight: img.height,
  }
}

// ============================================
// Face similarity calculation
// ============================================
export function calculateFaceSimilarity(desc1: Float32Array, desc2: Float32Array): number {
  // Euclidean distance converted to similarity (0-1)
  const distance = faceapi.euclideanDistance(Array.from(desc1), Array.from(desc2))
  // Distance of 0.6 is often used as threshold, so normalize around that
  return Math.max(0, 1 - distance / 1.2)
}

export function findBestMatch(
  descriptor: Float32Array,
  knownFaces: { id: string; descriptor: Float32Array }[],
  threshold = 0.55
): { id: string; similarity: number } | null {
  let bestMatch: { id: string; similarity: number } | null = null
  
  for (const known of knownFaces) {
    const similarity = calculateFaceSimilarity(descriptor, known.descriptor)
    if (similarity > threshold && (!bestMatch || similarity > bestMatch.similarity)) {
      bestMatch = { id: known.id, similarity }
    }
  }
  
  return bestMatch
}

// ============================================
// Component
// ============================================
export default function FaceDetector({
  imageUrl,
  onDetectionComplete,
  showPreview = false,
  autoProcess = true,
}: FaceDetectorProps) {
  const [loading, setLoading] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FaceDetectionResult | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const processed = useRef(false)

  // Load models on mount
  useEffect(() => {
    if (!modelsLoaded && !modelsLoading) {
      setLoadingModels(true)
      loadModels()
        .then(() => setLoadingModels(false))
        .catch(err => {
          setError('Failed to load face detection models')
          setLoadingModels(false)
        })
    }
  }, [])

  // Process image
  const processImage = useCallback(async () => {
    if (processed.current || loading) return
    
    try {
      setLoading(true)
      setError(null)
      processed.current = true
      
      const detectionResult = await detectFaces(imageUrl)
      setResult(detectionResult)
      onDetectionComplete?.(detectionResult)
      
    } catch (err) {
      console.error('Face detection error:', err)
      setError('Failed to detect faces')
    } finally {
      setLoading(false)
    }
  }, [imageUrl, onDetectionComplete, loading])

  // Auto-process when ready
  useEffect(() => {
    if (autoProcess && modelsLoaded && !processed.current) {
      processImage()
    }
  }, [autoProcess, processImage])

  // Draw face boxes on preview
  useEffect(() => {
    if (!showPreview || !result || !canvasRef.current || !imgRef.current) return
    
    const canvas = canvasRef.current
    const img = imgRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = img.width
    canvas.height = img.height
    
    ctx.drawImage(img, 0, 0)
    
    // Draw face boxes
    result.faces.forEach((face, idx) => {
      const x = face.box.x * img.width
      const y = face.box.y * img.height
      const w = face.box.width * img.width
      const h = face.box.height * img.height
      
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, w, h)
      
      // Label
      ctx.fillStyle = '#10b981'
      ctx.fillRect(x, y - 20, Math.min(w, 80), 20)
      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.fillText(`Face ${idx + 1}`, x + 4, y - 6)
    })
  }, [result, showPreview])

  // Loading states
  if (loadingModels) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading face detection...
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Detecting faces...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    )
  }

  if (!showPreview && result) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#406A56]">
        <CheckCircle2 className="w-4 h-4" />
        {result.faces.length} face{result.faces.length !== 1 ? 's' : ''} detected
      </div>
    )
  }

  if (showPreview) {
    return (
      <div className="relative">
        <img 
          ref={imgRef}
          src={imageUrl}
          alt="Face detection preview"
          className="hidden"
          crossOrigin="anonymous"
        />
        <canvas 
          ref={canvasRef}
          className="max-w-full rounded-lg"
        />
        {result && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 
                          bg-black/60 text-white text-xs px-2 py-1 rounded">
            <Users className="w-3.5 h-3.5" />
            {result.faces.length} face{result.faces.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    )
  }

  return null
}

// ============================================
// Hook for processing multiple images
// ============================================
export function useFaceDetection() {
  const [isReady, setIsReady] = useState(modelsLoaded)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!modelsLoaded) {
      loadModels().then(() => setIsReady(true))
    }
  }, [])

  const detectInImage = useCallback(async (imageUrl: string): Promise<FaceDetectionResult> => {
    if (!isReady) {
      await loadModels()
    }
    setIsLoading(true)
    try {
      return await detectFaces(imageUrl)
    } finally {
      setIsLoading(false)
    }
  }, [isReady])

  const detectInBatch = useCallback(async (
    imageUrls: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, FaceDetectionResult>> => {
    if (!isReady) {
      await loadModels()
    }
    setIsLoading(true)
    
    const results = new Map<string, FaceDetectionResult>()
    
    try {
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i]
        try {
          const result = await detectFaces(url)
          results.set(url, result)
        } catch (err) {
          console.error(`Failed to process ${url}:`, err)
        }
        onProgress?.(i + 1, imageUrls.length)
      }
    } finally {
      setIsLoading(false)
    }
    
    return results
  }, [isReady])

  return {
    isReady,
    isLoading,
    detectInImage,
    detectInBatch,
  }
}
