/**
 * CMYK Soft-Proof Heuristic
 *
 * Scan thumbnails of photos used in the book and flag those that are
 * likely to shift noticeably when printed. We sample a small thumbnail
 * to an offscreen canvas, compute the average HSV saturation, and flag
 * photos with either:
 *   - average saturation > SATURATION_THRESHOLD
 *   - a dominant hue sitting in a flagged out-of-gamut range
 *     (vivid magentas ~290-330deg, electric blues ~210-240deg)
 *
 * Pure functions — the editor calls `scanPhotos(list)` and renders
 * results in `CMYKWarnings`.
 */

export interface PhotoInput {
  mediaId: string
  /** Smallest URL available. */
  thumbnailUrl: string
  /** 1-based page number the photo is on. */
  pageNumber: number
  /** Optional human label for the panel. */
  label?: string
}

export interface PhotoWarning {
  mediaId: string
  pageNumber: number
  label?: string
  reason: string
  avgSaturation: number
  dominantHue: number
}

const SATURATION_THRESHOLD = 0.85
/** Sample stride — every Nth pixel — keeps this fast for large images. */
const SAMPLE_STRIDE = 4
const SAMPLE_SIZE = 64

/** Hue ranges (degrees) that tend to shift in CMYK conversion. */
const HUE_DANGER_RANGES: Array<[number, number]> = [
  [210, 240], // electric blue
  [290, 330], // vivid magenta / hot pink
]

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max
  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      default:
        h = (rn - gn) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s, v }
}

function isDangerHue(hue: number): boolean {
  return HUE_DANGER_RANGES.some(([lo, hi]) => hue >= lo && hue <= hi)
}

async function loadImageToCanvas(url: string): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = SAMPLE_SIZE
        canvas.height = SAMPLE_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
        resolve(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export interface PhotoAnalysis {
  avgSaturation: number
  dominantHue: number
  flagged: boolean
  reason: string | null
}

export function analyzeImageData(data: ImageData): PhotoAnalysis {
  const { data: px, width, height } = data
  const hueBuckets = new Array<number>(36).fill(0) // 10deg buckets
  let sumSat = 0
  let samples = 0
  for (let y = 0; y < height; y += SAMPLE_STRIDE) {
    for (let x = 0; x < width; x += SAMPLE_STRIDE) {
      const i = (y * width + x) * 4
      const r = px[i]
      const g = px[i + 1]
      const b = px[i + 2]
      const { h, s, v } = rgbToHsv(r, g, b)
      // Skip near-black and near-white; they dominate averages otherwise.
      if (v < 0.08 || s < 0.05) continue
      sumSat += s
      samples += 1
      hueBuckets[Math.min(35, Math.floor(h / 10))] += s
    }
  }
  const avgSaturation = samples > 0 ? sumSat / samples : 0
  let bestBucket = 0
  let bestWeight = -1
  hueBuckets.forEach((w, i) => {
    if (w > bestWeight) {
      bestWeight = w
      bestBucket = i
    }
  })
  const dominantHue = bestBucket * 10 + 5

  let flagged = false
  let reason: string | null = null
  if (avgSaturation > SATURATION_THRESHOLD) {
    flagged = true
    reason = 'Highly saturated colors may look duller in print.'
  } else if (isDangerHue(dominantHue) && avgSaturation > 0.6) {
    flagged = true
    reason = 'Vivid blues/magentas tend to shift when converted to CMYK.'
  }
  return { avgSaturation, dominantHue, flagged, reason }
}

export async function scanPhoto(photo: PhotoInput): Promise<PhotoWarning | null> {
  const data = await loadImageToCanvas(photo.thumbnailUrl)
  if (!data) return null
  const result = analyzeImageData(data)
  if (!result.flagged || !result.reason) return null
  return {
    mediaId: photo.mediaId,
    pageNumber: photo.pageNumber,
    label: photo.label,
    reason: result.reason,
    avgSaturation: result.avgSaturation,
    dominantHue: result.dominantHue,
  }
}

/**
 * Scan a batch of photos. Failed loads are skipped silently.
 */
export async function scanPhotos(photos: PhotoInput[]): Promise<PhotoWarning[]> {
  const results = await Promise.all(photos.map(scanPhoto))
  return results.filter((r): r is PhotoWarning => r !== null)
}
