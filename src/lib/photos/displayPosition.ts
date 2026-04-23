/**
 * Smart photo framing helpers.
 *
 * Given Rekognition face boxes (normalized 0-1), compute a focal point that
 * we store on `memory_media.display_position_x/y` and render as a CSS
 * `object-position: X% Y%` value. Keeping the focal point on the face means
 * an `object-fit: cover` crop shows the face instead of the torso.
 */

export interface BoundingBoxLike {
  /** Left edge, 0-1 */
  x?: number
  /** Top edge, 0-1 */
  y?: number
  /** Width, 0-1 */
  width?: number
  /** Height, 0-1 */
  height?: number
  /** Some callsites persist the box in `{left, top, width, height}` form */
  left?: number
  top?: number
  /** 0-100 Rekognition confidence */
  confidence?: number
}

export interface FaceLike {
  boundingBox?: BoundingBoxLike
  /** Same box, flat. Supports either {left,top} or {x,y} keys. */
  x?: number
  y?: number
  left?: number
  top?: number
  width?: number
  height?: number
  confidence?: number
}

export interface DisplayPosition {
  /** 0-1; horizontal focal point in the image */
  x: number
  /** 0-1; vertical focal point in the image */
  y: number
}

/**
 * When no face data is available, bias toward the top of the photo — faces
 * typically live in the upper third of a portrait, so this beats the default
 * 50/50 center crop that chops faces and keeps torsos.
 */
export const DEFAULT_DISPLAY_POSITION: DisplayPosition = { x: 0.5, y: 0.3 }

function readBox(face: FaceLike): { left: number; top: number; width: number; height: number } | null {
  const bb = face.boundingBox ?? face
  const left = bb.x ?? bb.left
  const top = bb.y ?? bb.top
  const width = bb.width
  const height = bb.height
  if (left == null || top == null || width == null || height == null) return null
  return { left: Number(left), top: Number(top), width: Number(width), height: Number(height) }
}

/**
 * Pick the "primary" face — the one whose center we'll anchor the crop to.
 * We rank by box area × confidence so a big confident face beats a tiny
 * background face, but confidence breaks ties between similar-sized faces.
 */
export function pickPrimaryFace<T extends FaceLike>(faces: T[] | null | undefined): T | null {
  if (!faces || faces.length === 0) return null
  let best: T | null = null
  let bestScore = -Infinity
  for (const face of faces) {
    const box = readBox(face)
    if (!box) continue
    const area = Math.max(0, box.width) * Math.max(0, box.height)
    const confidence = face.boundingBox?.confidence ?? face.confidence ?? 100
    const score = area * (confidence / 100)
    if (score > bestScore) {
      bestScore = score
      best = face
    }
  }
  return best
}

/**
 * Compute the focal point from detected faces. Returns NULL if there are no
 * usable faces so callers can decide whether to persist the default or leave
 * the column NULL (which signals "no detection ran / use runtime fallback").
 */
export function computeDisplayPosition(faces: FaceLike[] | null | undefined): DisplayPosition | null {
  const primary = pickPrimaryFace(faces)
  if (!primary) return null
  const box = readBox(primary)
  if (!box) return null
  const x = clamp01(box.left + box.width / 2)
  const y = clamp01(box.top + box.height / 2)
  return { x, y }
}

/**
 * Convert a focal point (or null) into a CSS `object-position` value.
 * NULL falls back to the top-biased default.
 */
export function toObjectPositionCss(pos: Partial<DisplayPosition> | null | undefined): string {
  const x = pos?.x != null ? clamp01(Number(pos.x)) : DEFAULT_DISPLAY_POSITION.x
  const y = pos?.y != null ? clamp01(Number(pos.y)) : DEFAULT_DISPLAY_POSITION.y
  return `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}
