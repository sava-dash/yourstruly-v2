/**
 * Photobook Page Renderer
 * 
 * Renders photobook pages to canvas for preview and export.
 * Works in both browser (Canvas API) and server (node-canvas) environments.
 */

import QRCode from 'qrcode'
import type { LayoutTemplate, LayoutSlot, SlotPosition } from './templates'

// =============================================================================
// TYPES
// =============================================================================

export interface PageContent {
  /** Content for each slot, keyed by slot ID */
  slots: Record<string, SlotContent>
  /** Optional page-level background override */
  background?: string
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
}

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

  // Draw background
  const background = content.background || template.background || '#ffffff'
  
  if (background.startsWith('linear-gradient')) {
    // Parse gradient (simplified - assumes 2-stop linear gradient)
    const match = background.match(/linear-gradient\((\d+)deg,\s*(.+)\s+\d+%,\s*(.+)\s+\d+%\)/)
    if (match) {
      const angle = parseInt(match[1]) * (Math.PI / 180)
      const color1 = match[2]
      const color2 = match[3]
      
      const x1 = width / 2 - Math.cos(angle) * width
      const y1 = height / 2 - Math.sin(angle) * height
      const x2 = width / 2 + Math.cos(angle) * width
      const y2 = height / 2 + Math.sin(angle) * height
      
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
      gradient.addColorStop(0, color1)
      gradient.addColorStop(1, color2)
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = '#ffffff'
    }
  } else {
    ctx.fillStyle = background
  }
  
  ctx.fillRect(0, 0, width, height)

  // Render each slot
  for (const slot of template.slots) {
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
