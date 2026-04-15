/**
 * Photobook Page Renderer
 * 
 * Renders photobook pages to canvas for preview and export.
 * Works in both browser (Canvas API) and server (node-canvas) environments.
 */

import QRCode from 'qrcode'
import type { LayoutTemplate, LayoutSlot, SlotPosition } from './templates'
import type { PageBackground, PageOverlay, TextOverlay, StickerOverlay } from './overlays'

// =============================================================================
// TYPES
// =============================================================================

export interface PageContent {
  /** Content for each slot, keyed by slot ID */
  slots: Record<string, SlotContent>
  /**
   * Optional page-level background override.
   *
   * Accepts either a plain CSS string (legacy — solid color or simple
   * `linear-gradient(...)`) or a structured `PageBackground` for the new
   * background picker (solid / gradient / texture).
   */
  background?: string | PageBackground | null
  /**
   * Optional page-level overlays (text + stickers) rendered AFTER the
   * template's own slots. Z-order guaranteed: background → template photo
   * slots → template text/qr slots → overlays.
   */
  overlays?: PageOverlay[]
}

export interface SlotContent {
  type: 'photo' | 'text' | 'qr'
  /** Photo: URL or data URI. Text: string content. QR: URL to encode */
  value: string
  /** Optional text styling overrides */
  style?: {
    color?: string
    fontFamily?: string
  }
  /**
   * Optional photo border drawn AFTER the photo pixels and BEFORE template
   * text/qr/overlays. Defaults to no border. Persisted in `content_json`.
   */
  border?: PhotoBorder
  /**
   * Optional photo filter applied to the photo's pixel area only. Defaults
   * to 'original'. Applied AFTER the photo is drawn and BEFORE the border.
   * Persisted in `content_json`.
   */
  filter?: PhotoFilter
  /**
   * Optional photo enhancement (brightness/contrast/saturation). Each value
   * is -100..+100 with 0 meaning "no change". Applied as pixel ops AFTER the
   * filter and BEFORE the border so they compose predictably.
   */
  enhance?: PhotoEnhance
}

/** Photo enhancement values in the range -100..+100 (0 = no change). */
export interface PhotoEnhance {
  brightness?: number
  contrast?: number
  saturation?: number
}

/** Photo border styles. Drawn over the slot bounds, after the photo pixels. */
export type PhotoBorderStyle =
  | 'none'
  | 'thin'
  | 'thick'
  | 'polaroid'
  | 'rounded'
  | 'film-strip'

export interface PhotoBorder {
  style: PhotoBorderStyle
  /** CSS color string. Defaults to YT Green (#406A56) for thin/thick. */
  color?: string
}

/** Photo filters. Applied as canvas pixel ops so the export PNG carries them. */
export type PhotoFilter =
  | 'original'
  | 'bw'
  | 'sepia'
  | 'warm'
  | 'cool'
  | 'faded'

export interface RenderOptions {
  /** Output width in pixels */
  width: number
  /** Output height in pixels */
  height: number
  /** Device pixel ratio for high-DPI rendering */
  devicePixelRatio?: number
  /** Whether to render slot borders (for editing) */
  showSlotBorders?: boolean
  /** Border color for empty slots */
  emptySlotColor?: string
  /** Whether to render placeholder text */
  showPlaceholders?: boolean
}

export interface RenderedPage {
  /** Canvas element (browser) or Canvas object (node) */
  canvas: HTMLCanvasElement | OffscreenCanvas
  /** Data URL of the rendered image */
  dataUrl: string
  /** Dimensions used */
  width: number
  height: number
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Convert percentage-based position to pixel coordinates
 */
function percentToPixels(
  position: SlotPosition,
  pageWidth: number,
  pageHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: (position.x / 100) * pageWidth,
    y: (position.y / 100) * pageHeight,
    width: (position.width / 100) * pageWidth,
    height: (position.height / 100) * pageHeight,
  }
}

/**
 * Load an image from URL
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Get font size in pixels based on slot height and size hint
 * For print (300 DPI), these map to approximately:
 * - sm: 12pt → 50px at 300dpi
 * - md: 16pt → 67px at 300dpi
 * - lg: 20pt → 83px at 300dpi
 * - xl: 28pt → 117px at 300dpi
 * - 2xl: 36pt → 150px at 300dpi
 */
function getFontSize(
  slotHeight: number,
  sizeHint?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | string
): number {
  // For print output, use fixed sizes that correspond to point sizes at 300 DPI
  // 1 point = 1/72 inch, at 300 DPI that's 300/72 ≈ 4.17 pixels per point
  const pxPerPoint = 300 / 72
  
  const pointSizes: Record<string, number> = {
    'sm': 12,
    'md': 16,
    'lg': 20,
    'xl': 28,
    '2xl': 36,
  }
  
  // Get point size, default to 16pt (md)
  const pointSize = pointSizes[sizeHint || 'md'] || 16
  
  // For preview (smaller canvas), scale down proportionally
  // Assuming a typical preview height of ~600px vs print height of ~3000px
  const scaleFactor = slotHeight / 150 // Rough scaling based on typical slot heights
  
  // Minimum of 12px for readability, max based on slot height
  const fontSize = Math.round(pointSize * Math.max(0.75, Math.min(scaleFactor, 4)))
  return Math.max(12, Math.min(fontSize, slotHeight * 0.8))
}

/**
 * Wrap text to fit within a given width
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  
  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

// =============================================================================
// PHOTO FILTERS + BORDERS (slot-level pixel ops + frame draws)
// =============================================================================

/**
 * Apply a color filter to the rectangle (x, y, w, h) of the canvas using
 * pixel-level math. Implementation choices match the spec; helpers stay
 * branch-free per pixel for speed on large print canvases.
 *
 * Skipped silently when:
 *   - filter is 'original' (no-op)
 *   - getImageData throws (cross-origin tainted canvas) — we log and continue
 *     so the photo still appears unfiltered rather than blanking the page.
 */
export function applyFilter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  filter: PhotoFilter | undefined
): void {
  if (!filter || filter === 'original') return
  if (w <= 0 || h <= 0) return

  const ix = Math.max(0, Math.floor(x))
  const iy = Math.max(0, Math.floor(y))
  const iw = Math.max(1, Math.floor(w))
  const ih = Math.max(1, Math.floor(h))

  let imageData: ImageData
  try {
    imageData = ctx.getImageData(ix, iy, iw, ih)
  } catch (err) {
    // Tainted canvas (cross-origin without CORS) — bail rather than crash.
    console.warn('applyFilter: getImageData failed, skipping filter', err)
    return
  }
  const d = imageData.data

  switch (filter) {
    case 'bw': {
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        d[i] = lum
        d[i + 1] = lum
        d[i + 2] = lum
      }
      break
    }
    case 'sepia': {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2]
        d[i]     = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b)
        d[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b)
        d[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b)
      }
      break
    }
    case 'warm': {
      for (let i = 0; i < d.length; i += 4) {
        d[i]     = Math.min(255, d[i] * 1.15)
        d[i + 2] = Math.max(0, d[i + 2] * 0.9)
      }
      break
    }
    case 'cool': {
      for (let i = 0; i < d.length; i += 4) {
        d[i]     = Math.max(0, d[i] * 0.9)
        d[i + 2] = Math.min(255, d[i + 2] * 1.15)
      }
      break
    }
    case 'faded': {
      for (let i = 0; i < d.length; i += 4) {
        // Lift blacks (+30) and reduce contrast (×0.85 around midpoint 128 after lift).
        d[i]     = clamp(0.85 * (d[i] + 30) + 0.15 * 128)
        d[i + 1] = clamp(0.85 * (d[i + 1] + 30) + 0.15 * 128)
        d[i + 2] = clamp(0.85 * (d[i + 2] + 30) + 0.15 * 128)
      }
      break
    }
  }
  ctx.putImageData(imageData, ix, iy)
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

/**
 * Apply brightness / contrast / saturation adjustments to the rectangle
 * (x, y, w, h) of the canvas. Each enhance value is in -100..+100 with 0
 * meaning no change. Applied AFTER the color filter and BEFORE the border.
 *
 * - brightness: adds value*2.55 to each RGB channel
 * - contrast: ((channel - 128) * (1 + value/100)) + 128, clamped
 * - saturation: shifts S in HSL by value/100, clamped
 *
 * Zero-valued channels short-circuit; a no-op call is free.
 */
export function applyEnhance(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  enhance: PhotoEnhance | undefined
): void {
  if (!enhance) return
  const b = enhance.brightness || 0
  const c = enhance.contrast || 0
  const s = enhance.saturation || 0
  if (b === 0 && c === 0 && s === 0) return
  if (w <= 0 || h <= 0) return

  const ix = Math.max(0, Math.floor(x))
  const iy = Math.max(0, Math.floor(y))
  const iw = Math.max(1, Math.floor(w))
  const ih = Math.max(1, Math.floor(h))

  let imageData: ImageData
  try {
    imageData = ctx.getImageData(ix, iy, iw, ih)
  } catch (err) {
    console.warn('applyEnhance: getImageData failed, skipping', err)
    return
  }
  const d = imageData.data
  const brightnessAdd = b * 2.55
  const contrastFactor = 1 + c / 100
  const saturationShift = s / 100

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], bl = d[i + 2]

    if (b !== 0) {
      r += brightnessAdd
      g += brightnessAdd
      bl += brightnessAdd
    }
    if (c !== 0) {
      r = (r - 128) * contrastFactor + 128
      g = (g - 128) * contrastFactor + 128
      bl = (bl - 128) * contrastFactor + 128
    }
    if (s !== 0) {
      // Convert to HSL, shift S, back to RGB (simplified, inline)
      const rn = clamp(r) / 255, gn = clamp(g) / 255, bn = clamp(bl) / 255
      const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
      const l = (max + min) / 2
      let h2 = 0, sat = 0
      const delta = max - min
      if (delta !== 0) {
        sat = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
        if (max === rn) h2 = ((gn - bn) / delta) % 6
        else if (max === gn) h2 = (bn - rn) / delta + 2
        else h2 = (rn - gn) / delta + 4
        h2 *= 60
        if (h2 < 0) h2 += 360
      }
      sat = Math.max(0, Math.min(1, sat + saturationShift))
      // HSL -> RGB
      const cc = (1 - Math.abs(2 * l - 1)) * sat
      const xx = cc * (1 - Math.abs(((h2 / 60) % 2) - 1))
      const m = l - cc / 2
      let rr = 0, gg = 0, bb = 0
      if (h2 < 60)      { rr = cc; gg = xx; bb = 0 }
      else if (h2 < 120){ rr = xx; gg = cc; bb = 0 }
      else if (h2 < 180){ rr = 0; gg = cc; bb = xx }
      else if (h2 < 240){ rr = 0; gg = xx; bb = cc }
      else if (h2 < 300){ rr = xx; gg = 0; bb = cc }
      else              { rr = cc; gg = 0; bb = xx }
      r = (rr + m) * 255
      g = (gg + m) * 255
      bl = (bb + m) * 255
    }

    d[i] = clamp(r)
    d[i + 1] = clamp(g)
    d[i + 2] = clamp(bl)
  }
  ctx.putImageData(imageData, ix, iy)
}

/**
 * Draw a photo border over the slot bounds. Called AFTER the photo pixels (and
 * filter) are committed to the canvas, BEFORE template text/qr/overlays.
 */
export function drawPhotoBorder(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  border: PhotoBorder | undefined
): void {
  if (!border || border.style === 'none') return
  const { x, y, width, height } = bounds
  const color = border.color || '#406A56'

  switch (border.style) {
    case 'thin': {
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)
      ctx.restore()
      return
    }
    case 'thick': {
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 8
      ctx.strokeRect(x + 4, y + 4, width - 8, height - 8)
      ctx.restore()
      return
    }
    case 'rounded': {
      // The renderPhotoSlot draws unrounded — clip a rounded shape OVER by
      // painting the four corner cutouts in white-ish "page" feel. We instead
      // overlay a rounded mask by using composite-out: erase the corners.
      const r = 12
      ctx.save()
      ctx.globalCompositeOperation = 'destination-in'
      ctx.beginPath()
      // roundRect is widely supported in modern Chromium/Firefox/Safari; fall
      // back to a manual path for older runtimes.
      if (typeof (ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect === 'function') {
        ctx.beginPath()
        ;(ctx as CanvasRenderingContext2D).roundRect(x, y, width, height, r)
      } else {
        // Manual rounded rect path
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + width - r, y)
        ctx.quadraticCurveTo(x + width, y, x + width, y + r)
        ctx.lineTo(x + width, y + height - r)
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
        ctx.lineTo(x + r, y + height)
        ctx.quadraticCurveTo(x, y + height, x, y + height - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      return
    }
    case 'polaroid': {
      // 16px white frame on top/left/right + 48px white bottom margin (caption
      // space). Subtle drop shadow underneath.
      const top = 16, side = 16, bottom = 48
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.18)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetY = 4
      // Outer white frame painted around the existing photo pixels using
      // four rectangles (we don't repaint the photo's interior).
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(x - side, y - top, width + side * 2, top)             // top bar
      ctx.fillRect(x - side, y + height, width + side * 2, bottom)        // bottom bar (caption)
      ctx.fillRect(x - side, y, side, height)                             // left bar
      ctx.fillRect(x + width, y, side, height)                            // right bar
      ctx.restore()
      return
    }
    case 'film-strip': {
      // Thick black bars top + bottom with 4 sprocket holes per side.
      const bar = Math.max(10, Math.round(height * 0.08))
      ctx.save()
      ctx.fillStyle = '#0E0E0E'
      ctx.fillRect(x, y, width, bar)
      ctx.fillRect(x, y + height - bar, width, bar)

      // Sprocket holes
      const holeCount = 4
      const holeW = Math.max(6, Math.round(width / (holeCount * 2 + 1)))
      const holeH = Math.max(4, Math.round(bar * 0.5))
      const yTop = y + (bar - holeH) / 2
      const yBot = y + height - bar + (bar - holeH) / 2
      const stride = width / holeCount
      ctx.fillStyle = '#FFFFFF'
      for (let i = 0; i < holeCount; i++) {
        const hx = x + stride * (i + 0.5) - holeW / 2
        ctx.fillRect(hx, yTop, holeW, holeH)
        ctx.fillRect(hx, yBot, holeW, holeH)
      }
      ctx.restore()
      return
    }
  }
}

// =============================================================================
// SLOT RENDERERS
// =============================================================================

/**
 * Render a photo slot
 */
async function renderPhotoSlot(
  ctx: CanvasRenderingContext2D,
  slot: LayoutSlot,
  content: SlotContent | undefined,
  bounds: { x: number; y: number; width: number; height: number },
  options: RenderOptions
): Promise<void> {
  const { x, y, width, height } = bounds

  if (!content?.value) {
    // Render empty slot placeholder
    if (options.showSlotBorders) {
      ctx.strokeStyle = options.emptySlotColor || '#e0e0e0'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(x, y, width, height)
      ctx.setLineDash([])
      
      // Draw placeholder icon
      ctx.fillStyle = '#d0d0d0'
      ctx.font = `${Math.min(width, height) * 0.3}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('📷', x + width / 2, y + height / 2)
    }
    return
  }

  try {
    const img = await loadImage(content.value)
    const objectFit = slot.style?.objectFit || 'cover'
    
    let sx = 0, sy = 0, sw = img.width, sh = img.height
    let dx = x, dy = y, dw = width, dh = height

    if (objectFit === 'cover') {
      // Calculate crop to cover the slot
      const imgRatio = img.width / img.height
      const slotRatio = width / height

            if (imgRatio > slotRatio) {
        // Image is wider - crop horizontally
        sw = img.height * slotRatio
        sx = (img.width - sw) / 2
      } else {
        // Image is taller - crop vertically
        sh = img.width / slotRatio
        sy = (img.height - sh) / 2
      }
    } else if (objectFit === 'contain') {
      // Calculate fit within slot
      const imgRatio = img.width / img.height
      const slotRatio = width / height

      if (imgRatio > slotRatio) {
        // Image is wider - fit to width
        dh = width / imgRatio
        dy = y + (height - dh) / 2
      } else {
        // Image is taller - fit to height
        dw = height * imgRatio
        dx = x + (width - dw) / 2
      }
    }

    // Apply border radius if specified
    const borderRadius = slot.style?.borderRadius 
      ? (slot.style.borderRadius / 100) * Math.min(width, height)
      : 0

    if (borderRadius > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(dx, dy, dw, dh, borderRadius)
      ctx.clip()
    }

    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)

    if (borderRadius > 0) {
      ctx.restore()
    }

    // Apply photo filter to the slot pixels (after photo draws, before border).
    if (content.filter && content.filter !== 'original') {
      applyFilter(ctx, x, y, width, height, content.filter)
    }

    // Apply brightness/contrast/saturation enhancements AFTER filter, BEFORE border.
    if (content.enhance) {
      applyEnhance(ctx, x, y, width, height, content.enhance)
    }

    // Draw photo border over the slot bounds (after filter, before text/qr/overlays).
    if (content.border && content.border.style !== 'none') {
      drawPhotoBorder(ctx, { x, y, width, height }, content.border)
    }
  } catch (error) {
    console.error('Failed to load image:', error)
    // Draw error placeholder
    ctx.fillStyle = '#ffebee'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = '#ef5350'
    ctx.font = '14px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⚠️ Image failed', x + width / 2, y + height / 2)
  }
}

/**
 * Render a text slot
 */
function renderTextSlot(
  ctx: CanvasRenderingContext2D,
  slot: LayoutSlot,
  content: SlotContent | undefined,
  bounds: { x: number; y: number; width: number; height: number },
  options: RenderOptions
): void {
  const { x, y, width, height } = bounds
  const padding = slot.style?.padding ? (slot.style.padding / 100) * width : 0
  
  const innerX = x + padding
  const innerY = y + padding
  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2

  // Get text content
  let text = content?.value
  if (!text && options.showPlaceholders) {
    text = slot.placeholder || ''
    ctx.globalAlpha = 0.5
  }

  if (!text) {
    if (options.showSlotBorders) {
      ctx.strokeStyle = options.emptySlotColor || '#e0e0e0'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.strokeRect(x, y, width, height)
      ctx.setLineDash([])
    }
    return
  }

  // Get styling from content (PageEditor stores styling in content.style)
  const contentStyle = content?.style as {
    fontFamily?: string
    fontSize?: string
    fontWeight?: 'normal' | 'bold'
    fontStyle?: 'normal' | 'italic'
    textAlign?: 'left' | 'center' | 'right'
    color?: string
  } | undefined
  
  // Font size - support both old size hints and new px-based values
  const sizeHint = contentStyle?.fontSize || slot.style?.fontSize
  const fontSize = getFontSize(innerHeight, sizeHint as 'sm' | 'md' | 'lg' | 'xl' | '2xl')
  
  // Font weight - from content style first, then slot style
  const fontWeight = contentStyle?.fontWeight === 'bold' 
    ? 'bold' 
    : slot.style?.fontWeight === 'bold' 
    ? 'bold' 
    : slot.style?.fontWeight === 'medium' 
    ? '500' 
    : 'normal'
  
  // Font style (italic)
  const fontStyle = contentStyle?.fontStyle === 'italic' ? 'italic' : 'normal'
  
  // Font family - from content style first, then slot style, then default
  const fontFamily = contentStyle?.fontFamily || 
                     content?.style?.fontFamily || 
                     'system-ui, -apple-system, sans-serif'
  
  // Build the complete font string
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
  
  // Text color
  ctx.fillStyle = contentStyle?.color || content?.style?.color || '#333333'
  
  // Text alignment - from content style first, then slot style
  const textAlign = contentStyle?.textAlign || slot.style?.textAlign || 'left'
  ctx.textAlign = textAlign
  ctx.textBaseline = 'top'

  // Wrap text
  const lines = wrapText(ctx, text, innerWidth)
  const lineHeight = fontSize * 1.5 // Slightly increased for better readability
  const totalTextHeight = lines.length * lineHeight

  // Vertical centering
  let textY = innerY + (innerHeight - totalTextHeight) / 2

  // Draw each line
  for (const line of lines) {
    let textX = innerX
    if (ctx.textAlign === 'center') {
      textX = innerX + innerWidth / 2
    } else if (ctx.textAlign === 'right') {
      textX = innerX + innerWidth
    }
    
    ctx.fillText(line, textX, textY)
    textY += lineHeight
  }

  ctx.globalAlpha = 1
}

/**
 * Render a QR code slot
 */
async function renderQRSlot(
  ctx: CanvasRenderingContext2D,
  slot: LayoutSlot,
  content: SlotContent | undefined,
  bounds: { x: number; y: number; width: number; height: number },
  options: RenderOptions
): Promise<void> {
  const { x, y, width, height } = bounds
  const size = Math.min(width, height)
  const centerX = x + (width - size) / 2
  const centerY = y + (height - size) / 2

  if (!content?.value) {
    // Draw placeholder
    if (options.showSlotBorders) {
      ctx.strokeStyle = options.emptySlotColor || '#e0e0e0'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(centerX, centerY, size, size)
      ctx.setLineDash([])
      
      ctx.fillStyle = '#d0d0d0'
      ctx.font = `${size * 0.2}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('QR', centerX + size / 2, centerY + size / 2)
    }
    return
  }

  // Generate QR locally using the `qrcode` package. Error Correction Level 'H'
  // (~30% redundancy) ensures prints stay scannable after fold/wear. We render
  // at the device pixel size of the slot so print DPI is preserved by the
  // surrounding renderExport pipeline (no external network call).
  try {
    const pixelSize = Math.max(64, Math.round(size))
    const qrDataUrl = await QRCode.toDataURL(content.value, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: pixelSize,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
    const img = await loadImage(qrDataUrl)
    ctx.drawImage(img, centerX, centerY, size, size)
  } catch (error) {
    console.error('Failed to generate QR code:', error)
    ctx.fillStyle = '#ffebee'
    ctx.fillRect(centerX, centerY, size, size)
    ctx.fillStyle = '#c35f33'
    ctx.font = '14px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('QR Error', centerX + size / 2, centerY + size / 2)
  }
}

// =============================================================================
// BACKGROUND + OVERLAY RENDERERS (page-level, outside the template)
// =============================================================================

type Bounds = { x: number; y: number; width: number; height: number }

/**
 * Parse a legacy CSS gradient string (`linear-gradient(<angle>deg, c1 N%, c2 N%)`).
 */
function parseCssLinearGradient(bg: string): { angle: number; from: string; to: string } | null {
  const match = bg.match(/linear-gradient\((\d+)deg,\s*(.+?)(?:\s+\d+%)?,\s*(.+?)(?:\s+\d+%)?\)/)
  if (!match) return null
  return { angle: parseInt(match[1], 10), from: match[2].trim(), to: match[3].trim() }
}

/**
 * Fill the given bounds with the page background. Accepts either the legacy
 * CSS string form or the structured PageBackground used by the new picker.
 */
export async function renderPageBackground(
  ctx: CanvasRenderingContext2D,
  background: string | PageBackground | null | undefined,
  bounds: Bounds
): Promise<void> {
  const { x, y, width, height } = bounds

  // Default fallback — plain white
  if (!background) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, y, width, height)
    return
  }

  // Legacy CSS string form
  if (typeof background === 'string') {
    if (background.startsWith('linear-gradient')) {
      const parsed = parseCssLinearGradient(background)
      if (parsed) {
        const rad = parsed.angle * (Math.PI / 180)
        const gradient = ctx.createLinearGradient(
          x + width / 2 - Math.cos(rad) * width,
          y + height / 2 - Math.sin(rad) * height,
          x + width / 2 + Math.cos(rad) * width,
          y + height / 2 + Math.sin(rad) * height
        )
        gradient.addColorStop(0, parsed.from)
        gradient.addColorStop(1, parsed.to)
        ctx.fillStyle = gradient
      } else {
        ctx.fillStyle = '#ffffff'
      }
    } else {
      ctx.fillStyle = background
    }
    ctx.fillRect(x, y, width, height)
    return
  }

  // Structured PageBackground
  if (background.type === 'solid') {
    ctx.fillStyle = background.color
    ctx.fillRect(x, y, width, height)
    return
  }

  if (background.type === 'gradient') {
    const rad = (background.angle ?? 135) * (Math.PI / 180)
    const gradient = ctx.createLinearGradient(
      x + width / 2 - Math.cos(rad) * width,
      y + height / 2 - Math.sin(rad) * height,
      x + width / 2 + Math.cos(rad) * width,
      y + height / 2 + Math.sin(rad) * height
    )
    gradient.addColorStop(0, background.from)
    gradient.addColorStop(1, background.to)
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, width, height)
    return
  }

  if (background.type === 'texture') {
    // Base cream wash under every texture so tiles blend on print
    ctx.fillStyle = '#faf9f6'
    ctx.fillRect(x, y, width, height)
    try {
      const img = await loadImage(`/photobook-backgrounds/${background.textureId}.png`)
      const pattern = ctx.createPattern(img, 'repeat')
      if (pattern) {
        ctx.save()
        ctx.globalAlpha = background.opacity ?? 0.15
        ctx.fillStyle = pattern
        ctx.fillRect(x, y, width, height)
        ctx.restore()
      }
    } catch {
      // Texture image missing — leave the cream wash.
    }
  }
}

/**
 * Render one text overlay onto the canvas.
 * Position values are percent-of-bounds (0-100).
 */
function renderTextOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: TextOverlay,
  bounds: Bounds
): void {
  const px = bounds.x + (overlay.x / 100) * bounds.width
  const py = bounds.y + (overlay.y / 100) * bounds.height
  const pw = (overlay.width / 100) * bounds.width
  const ph = (overlay.height / 100) * bounds.height

  // Overlay fontSize is in POINTS (pt). Convert to px relative to bounds height
  // using a 300-DPI print assumption (1pt ≈ 1/72 in, 300dpi ≈ 4.17px/pt on
  // print-sized canvases) while scaling down proportionally on preview canvases.
  // Reference height: a 6x8 page at 300dpi ≈ 2400px; preview ≈ 500px.
  const pxPerPoint = (bounds.height / 2400) * (300 / 72) + (bounds.height / 500) * (1 / 72) * 0 // bias toward print size
  const approx = Math.max(10, overlay.fontSize * Math.max(0.18, bounds.height / 2400))
  const fontPx = Math.max(10, Math.round(approx * (pxPerPoint > 0 ? 1 : 1)))

  ctx.save()
  ctx.translate(px + pw / 2, py + ph / 2)
  if (overlay.rotation) ctx.rotate((overlay.rotation * Math.PI) / 180)

  const italic = overlay.italic ? 'italic ' : ''
  const weight = overlay.weight === 'bold' ? 'bold ' : ''
  ctx.font = `${italic}${weight}${fontPx}px ${overlay.fontFamily}`
  ctx.fillStyle = overlay.color
  ctx.textBaseline = 'top'
  ctx.textAlign = overlay.align === 'center' ? 'center' : overlay.align === 'right' ? 'right' : 'left'

  const lines = wrapText(ctx, overlay.value, pw)
  const lineH = fontPx * 1.3
  let ty = -(lines.length * lineH) / 2
  const tx = overlay.align === 'center' ? 0 : overlay.align === 'right' ? pw / 2 : -pw / 2
  for (const line of lines) {
    ctx.fillText(line, tx, ty)
    ty += lineH
  }
  ctx.restore()
}

/**
 * Render one sticker overlay onto the canvas by loading its SVG.
 */
async function renderStickerOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: StickerOverlay,
  bounds: Bounds
): Promise<void> {
  const px = bounds.x + (overlay.x / 100) * bounds.width
  const py = bounds.y + (overlay.y / 100) * bounds.height
  const pw = (overlay.width / 100) * bounds.width
  const ph = (overlay.height / 100) * bounds.height

  try {
    const img = await loadImage(`/stickers/${overlay.stickerId}.svg`)
    ctx.save()
    ctx.globalAlpha = overlay.opacity ?? 1
    ctx.translate(px + pw / 2, py + ph / 2)
    if (overlay.rotation) ctx.rotate((overlay.rotation * Math.PI) / 180)
    ctx.drawImage(img, -pw / 2, -ph / 2, pw, ph)
    ctx.restore()
  } catch (err) {
    console.warn('Sticker failed to load:', overlay.stickerId, err)
  }
}

/**
 * Render all page overlays in array order (first = bottom, last = top).
 */
export async function renderOverlays(
  ctx: CanvasRenderingContext2D,
  overlays: readonly PageOverlay[],
  bounds: Bounds
): Promise<void> {
  for (const overlay of overlays) {
    if (overlay.type === 'text') {
      renderTextOverlay(ctx, overlay, bounds)
    } else if (overlay.type === 'sticker') {
      await renderStickerOverlay(ctx, overlay, bounds)
    }
  }
}

// =============================================================================
// MAIN RENDERER
// =============================================================================

/**
 * Render a photobook page to canvas
 */
export async function renderPage(
  template: LayoutTemplate,
  content: PageContent,
  options: RenderOptions
): Promise<RenderedPage> {
  const dpr = options.devicePixelRatio || 1
  const width = options.width
  const height = options.height
  const scaledWidth = width * dpr
  const scaledHeight = height * dpr

  // Create canvas
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(scaledWidth, scaledHeight)
    : document.createElement('canvas')
  
  if (canvas instanceof HTMLCanvasElement) {
    canvas.width = scaledWidth
    canvas.height = scaledHeight
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  if (!ctx) {
    throw new Error('Failed to get 2D context')
  }

  // Scale for DPR
  ctx.scale(dpr, dpr)

  // Draw background (z-order step 1)
  await renderPageBackground(
    ctx,
    content.background ?? template.background ?? '#ffffff',
    { x: 0, y: 0, width, height }
  )

  // Render each template slot (z-order step 2-3: photos, then text/qr)
  // The templates already define photos before text/qr in most layouts;
  // enforce the ordering explicitly so overlays always sit on top.
  const photoSlots = template.slots.filter((s) => s.type === 'photo')
  const otherSlots = template.slots.filter((s) => s.type !== 'photo')
  for (const slot of [...photoSlots, ...otherSlots]) {
    const bounds = percentToPixels(slot.position, width, height)
    const slotContent = content.slots[slot.id]

    switch (slot.type) {
      case 'photo':
        await renderPhotoSlot(ctx, slot, slotContent, bounds, options)
        break
      case 'text':
        renderTextSlot(ctx, slot, slotContent, bounds, options)
        break
      case 'qr':
        await renderQRSlot(ctx, slot, slotContent, bounds, options)
        break
    }
  }

  // Render page overlays (z-order step 4 — on top of everything)
  if (content.overlays && content.overlays.length > 0) {
    await renderOverlays(ctx, content.overlays, { x: 0, y: 0, width, height })
  }

  // Generate data URL
  let dataUrl: string
  if (canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } else {
    dataUrl = canvas.toDataURL('image/png')
  }

  return {
    canvas: canvas as HTMLCanvasElement | OffscreenCanvas,
    dataUrl,
    width,
    height,
  }
}

/**
 * Render a page thumbnail (smaller preview)
 */
export async function renderThumbnail(
  template: LayoutTemplate,
  content: PageContent,
  maxSize: number = 200
): Promise<RenderedPage> {
  // Assume 3:4 aspect ratio for book pages
  const aspectRatio = 3 / 4
  const width = maxSize * aspectRatio
  const height = maxSize

  return renderPage(template, content, {
    width,
    height,
    showSlotBorders: true,
    showPlaceholders: true,
    emptySlotColor: '#e0e0e0',
  })
}

/**
 * Render a high-quality export page for print
 * 
 * Prodigi Requirements:
 * - 300 DPI minimum
 * - 3mm bleed on all edges
 * - 6mm safe zone (keep important content inside)
 * - CMYK-safe colors (avoid bright RGB)
 * - Text as vector (canvas text is vector by default)
 */
export async function renderExport(
  template: LayoutTemplate,
  content: PageContent,
  options: {
    dpi?: number
    widthInches?: number
    heightInches?: number
    bleedMm?: number
    safeZoneMm?: number
  } = {}
): Promise<RenderedPage> {
  const {
    dpi = 300,
    widthInches = 8,
    heightInches = 10,
    bleedMm = 3, // Prodigi standard bleed
    safeZoneMm = 6, // Safe zone for text/important content
  } = options
  
  // Convert mm to inches (1 inch = 25.4mm)
  const bleedInches = bleedMm / 25.4
  const safeZoneInches = safeZoneMm / 25.4
  
  // Total page size including bleed
  const totalWidth = (widthInches + bleedInches * 2) * dpi
  const totalHeight = (heightInches + bleedInches * 2) * dpi
  
  return renderPage(template, content, {
    width: totalWidth,
    height: totalHeight,
    devicePixelRatio: 1,
    showSlotBorders: false,
    showPlaceholders: false,
  })
}

/**
 * Render a print-ready PDF page (returns data suitable for PDF generation)
 * 
 * For actual PDF generation, use a server-side library like pdf-lib or puppeteer
 * This function prepares the data in a format suitable for PDF generation.
 */
export interface PrintReadyData {
  imageDataUrl: string
  width: number
  height: number
  dpi: number
  bleedMm: number
  safeZoneMm: number
  /** Metadata for PDF generation */
  metadata: {
    colorSpace: 'RGB' // Canvas is RGB; convert to CMYK server-side if needed
    hasTransparency: boolean
  }
}

export async function renderForPrint(
  template: LayoutTemplate,
  content: PageContent,
  options: {
    dpi?: number
    widthInches?: number
    heightInches?: number
  } = {}
): Promise<PrintReadyData> {
  const dpi = options.dpi || 300
  const bleedMm = 3
  const safeZoneMm = 6
  
  const rendered = await renderExport(template, content, {
    ...options,
    bleedMm,
    safeZoneMm,
  })
  
  return {
    imageDataUrl: rendered.dataUrl,
    width: rendered.width,
    height: rendered.height,
    dpi,
    bleedMm,
    safeZoneMm,
    metadata: {
      colorSpace: 'RGB',
      hasTransparency: false,
    }
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create empty content for a template
 */
export function createEmptyContent(template: LayoutTemplate): PageContent {
  const slots: Record<string, SlotContent> = {}
  
  for (const slot of template.slots) {
    if (slot.placeholder && slot.type === 'text') {
      slots[slot.id] = {
        type: 'text',
        value: '',
      }
    }
  }

  return { slots }
}

/**
 * Validate that content meets template requirements
 */
export function validateContent(
  template: LayoutTemplate,
  content: PageContent
): { valid: boolean; missing: string[] } {
  const missing: string[] = []

  for (const slot of template.slots) {
    if (slot.required) {
      const slotContent = content.slots[slot.id]
      if (!slotContent?.value) {
        missing.push(slot.id)
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}
