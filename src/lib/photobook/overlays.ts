/**
 * Page-level overlays & background data model.
 *
 * Overlays sit ON TOP of the template's photo/text/qr slots (z-order: background
 * -> template photo slots -> template text/qr slots -> overlays). Positions are
 * stored as percent-of-page (0-100) so they remain resolution-independent —
 * this matches the existing template slot convention.
 *
 * Persisted inside `photobook_pages.content_json.overlays` and
 * `photobook_pages.content_json.background` (JSONB, no schema migration).
 */

/** Font family values used for text overlays. Must match renderer + TextEditor. */
export const OVERLAY_FONTS = [
  { value: "var(--font-playfair), Georgia, serif", label: "Playfair Display" },
  { value: "var(--font-inter-tight), 'Inter Tight', sans-serif", label: "Inter Tight" },
  { value: "var(--font-handwritten), 'Caveat', cursive", label: "Caveat" },
  { value: "'Patrick Hand', cursive", label: "Patrick Hand" },
  { value: "Georgia, serif", label: "Georgia" },
] as const

/** 12-swatch brand palette for text overlays. */
export const OVERLAY_TEXT_COLORS: readonly string[] = [
  "#406A56", // YT Green
  "#2A4938", // YT Green Dark
  "#C35F33", // Terra Cotta
  "#F2F1E5", // Cream
  "#FFFFFF",
  "#000000",
  "#2d2d2d",
  "#666666",
  "#D3E1DF", // Green Light
  "#E8B55F", // Warm glow
  "#3B7CA1", // Blue accent
  "#8A5FB8", // Purple accent
]

export type TextOverlay = {
  id: string
  type: "text"
  /** percent-of-page 0-100 */
  x: number
  y: number
  width: number
  height: number
  value: string
  fontFamily: string
  /** points */
  fontSize: number
  color: string
  align: "left" | "center" | "right"
  weight: "normal" | "bold"
  italic: boolean
  /** degrees */
  rotation?: number
}

export type StickerOverlay = {
  id: string
  type: "sticker"
  x: number
  y: number
  width: number
  height: number
  /** Matches an entry in `STICKERS` registry. */
  stickerId: string
  rotation?: number
  /** 0-1 */
  opacity?: number
}

export type PageOverlay = TextOverlay | StickerOverlay

export type PageBackground =
  | { type: "solid"; color: string }
  | { type: "texture"; textureId: string; opacity?: number }
  | { type: "gradient"; from: string; to: string; angle?: number }

/** Stable ID helper. Not cryptographically secure — just unique per session. */
export function newOverlayId(): string {
  return `ov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Factory: create a text overlay centered on the page with sensible defaults. */
export function createTextOverlay(partial: Partial<TextOverlay> = {}): TextOverlay {
  return {
    id: partial.id ?? newOverlayId(),
    type: "text",
    x: partial.x ?? 25,
    y: partial.y ?? 42,
    width: partial.width ?? 50,
    height: partial.height ?? 16,
    value: partial.value ?? "Click to edit",
    fontFamily: partial.fontFamily ?? OVERLAY_FONTS[0].value,
    fontSize: partial.fontSize ?? 24,
    color: partial.color ?? "#000000",
    align: partial.align ?? "center",
    weight: partial.weight ?? "normal",
    italic: partial.italic ?? false,
    rotation: partial.rotation,
  }
}

/** Factory: create a sticker overlay centered on the page. */
export function createStickerOverlay(
  stickerId: string,
  partial: Partial<StickerOverlay> = {}
): StickerOverlay {
  return {
    id: partial.id ?? newOverlayId(),
    type: "sticker",
    x: partial.x ?? 40,
    y: partial.y ?? 40,
    width: partial.width ?? 20,
    height: partial.height ?? 20,
    stickerId,
    rotation: partial.rotation,
    opacity: partial.opacity ?? 1,
  }
}
