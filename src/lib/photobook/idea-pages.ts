/**
 * Idea Pages — curated full-page presets.
 *
 * Each preset bundles a layout template + a structured page background + 1–3
 * page overlays (text and/or sticker). Applying a preset creates a new page
 * (or replaces the current page) with these primitives composed together.
 *
 * Overlays are stored WITHOUT ids (`Omit<PageOverlay, 'id'>`) — the picker
 * assigns fresh ids via `crypto.randomUUID()` (or fallback) at apply-time so
 * each instance is independently editable.
 *
 * Z-order at render time is unchanged: background → photos → template
 * text/qr → overlays.
 */

import type {
  PageBackground,
  PageOverlay,
  StickerOverlay,
  TextOverlay,
} from './overlays'
import { OVERLAY_FONTS } from './overlays'

/** Idea-page overlay seeds: full overlays minus the runtime id. */
export type IdeaPageOverlaySeed =
  | Omit<TextOverlay, 'id'>
  | Omit<StickerOverlay, 'id'>

export type IdeaPageCategory = 'milestone' | 'family' | 'memorial' | 'misc'

export interface IdeaPagePreset {
  id: string
  name: string
  description: string
  category: IdeaPageCategory
  /** Path to a static SVG thumbnail under /public. */
  thumbnail: string
  /** ID from `LAYOUT_TEMPLATES`. Photo slots stay empty until user fills. */
  layoutTemplateId: string
  /** Structured page background (or null to use the layout's default). */
  background: PageBackground | null
  /** 1-3 seeded overlays. Ids assigned at apply-time. */
  overlays: IdeaPageOverlaySeed[]
  /** Optional placeholder text shown in the picker card. */
  placeholderText?: string
}

// Font shortcuts (must match values in OVERLAY_FONTS so renderer + TextEditor agree).
const PLAYFAIR = OVERLAY_FONTS[0].value          // headline serif
const INTER = OVERLAY_FONTS[1].value             // UI sans
const CAVEAT = OVERLAY_FONTS[2].value            // handwritten

// Brand colors (mirrors src/lib/photobook/overlays.ts OVERLAY_TEXT_COLORS)
const YT_GREEN = '#406A56'
const YT_GREEN_DARK = '#2A4938'
const TERRA = '#C35F33'
const CREAM = '#F2F1E5'
const GREEN_LIGHT = '#D3E1DF'
const INK = '#2d2d2d'

// =============================================================================
// PRESETS
// =============================================================================

export const IDEA_PAGES: readonly IdeaPagePreset[] = [
  // ---------- MILESTONES -------------------------------------------------
  {
    id: 'birthday-celebration',
    name: 'Birthday Celebration',
    description: 'Big day headline with a cake sticker and a warm wash.',
    category: 'milestone',
    thumbnail: '/idea-pages/birthday-celebration.svg',
    layoutTemplateId: 'photo-with-caption',
    background: { type: 'gradient', from: '#FFE9C7', to: '#FBC9A0', angle: 135 },
    overlays: [
      { type: 'text', x: 10, y: 6, width: 80, height: 14, value: 'Happy Birthday', fontFamily: PLAYFAIR, fontSize: 36, color: TERRA, align: 'center', weight: 'bold', italic: false },
      { type: 'text', x: 20, y: 84, width: 60, height: 10, value: 'wishing you joy', fontFamily: CAVEAT, fontSize: 24, color: YT_GREEN_DARK, align: 'center', weight: 'normal', italic: false },
      { type: 'sticker', x: 78, y: 4, width: 16, height: 16, stickerId: 'milestones/cake', opacity: 1 },
    ],
    placeholderText: 'Add a favorite photo of the birthday star.',
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    description: 'Elegant headline with hearts on a soft cream backdrop.',
    category: 'milestone',
    thumbnail: '/idea-pages/anniversary.svg',
    layoutTemplateId: 'centered-photo',
    background: { type: 'solid', color: CREAM },
    overlays: [
      { type: 'text', x: 10, y: 4, width: 80, height: 12, value: 'Together, always.', fontFamily: PLAYFAIR, fontSize: 32, color: YT_GREEN_DARK, align: 'center', weight: 'normal', italic: true },
      { type: 'sticker', x: 6, y: 4, width: 12, height: 12, stickerId: 'love/heart-outline', opacity: 1 },
      { type: 'sticker', x: 82, y: 4, width: 12, height: 12, stickerId: 'love/heart-outline', opacity: 1 },
    ],
  },
  {
    id: 'new-baby',
    name: 'New Baby',
    description: 'Soft pastel page with a baby carriage and a name line.',
    category: 'milestone',
    thumbnail: '/idea-pages/new-baby.svg',
    layoutTemplateId: 'photo-with-caption',
    background: { type: 'gradient', from: '#EAF6F1', to: '#FBE7EE', angle: 160 },
    overlays: [
      { type: 'text', x: 10, y: 6, width: 80, height: 12, value: 'Welcome, little one', fontFamily: PLAYFAIR, fontSize: 28, color: YT_GREEN_DARK, align: 'center', weight: 'normal', italic: false },
      { type: 'text', x: 15, y: 86, width: 70, height: 8, value: 'born — — —', fontFamily: CAVEAT, fontSize: 22, color: TERRA, align: 'center', weight: 'normal', italic: false },
      { type: 'sticker', x: 80, y: 78, width: 14, height: 14, stickerId: 'milestones/baby-carriage', opacity: 1 },
    ],
  },
  {
    id: 'wedding-day',
    name: 'Wedding Day',
    description: 'Formal headline with rings, suited for portrait or candid.',
    category: 'milestone',
    thumbnail: '/idea-pages/wedding-day.svg',
    layoutTemplateId: 'centered-photo',
    background: { type: 'solid', color: '#FFFFFF' },
    overlays: [
      { type: 'text', x: 10, y: 4, width: 80, height: 12, value: 'Our Wedding Day', fontFamily: PLAYFAIR, fontSize: 32, color: INK, align: 'center', weight: 'normal', italic: false },
      { type: 'sticker', x: 44, y: 92, width: 12, height: 6, stickerId: 'milestones/wedding-rings', opacity: 1 },
    ],
  },
  {
    id: 'graduation',
    name: 'Graduation',
    description: 'Bold congratulations with a cap sticker. Great for a portrait.',
    category: 'milestone',
    thumbnail: '/idea-pages/graduation.svg',
    layoutTemplateId: 'photo-with-caption',
    background: { type: 'gradient', from: '#1F3A5F', to: '#406A8E', angle: 180 },
    overlays: [
      { type: 'text', x: 10, y: 6, width: 80, height: 12, value: 'Congratulations!', fontFamily: PLAYFAIR, fontSize: 32, color: '#FFFFFF', align: 'center', weight: 'bold', italic: false },
      { type: 'text', x: 10, y: 84, width: 80, height: 10, value: 'Class of — — —', fontFamily: CAVEAT, fontSize: 24, color: '#FFE9C7', align: 'center', weight: 'normal', italic: false },
      { type: 'sticker', x: 6, y: 4, width: 14, height: 14, stickerId: 'milestones/graduation-cap', opacity: 1 },
    ],
  },
  {
    id: 'retirement',
    name: 'Retirement',
    description: 'Warm send-off with a laurel wreath and grateful subtitle.',
    category: 'milestone',
    thumbnail: '/idea-pages/retirement.svg',
    layoutTemplateId: 'photo-with-caption',
    background: { type: 'solid', color: CREAM },
    overlays: [
      { type: 'text', x: 10, y: 6, width: 80, height: 12, value: 'A Life Well Worked', fontFamily: PLAYFAIR, fontSize: 30, color: YT_GREEN_DARK, align: 'center', weight: 'normal', italic: false },
      { type: 'text', x: 15, y: 84, width: 70, height: 10, value: 'Here\u2019s to what comes next.', fontFamily: CAVEAT, fontSize: 22, color: TERRA, align: 'center', weight: 'normal', italic: false },
      { type: 'sticker', x: 42, y: 18, width: 16, height: 12, stickerId: 'abstract/laurel-wreath', opacity: 0.9 },
    ],
  },

  // ---------- MEMORIAL --------------------------------------------------
  {
    id: 'in-memoriam',
    name: 'In Memoriam',
    description: 'Quiet tribute page with a soft frame and gentle subtitle.',
    category: 'memorial',
    thumbnail: '/idea-pages/in-memoriam.svg',
    layoutTemplateId: 'centered-photo',
    background: { type: 'solid', color: '#F4F1EA' },
    overlays: [
      { type: 'text', x: 10, y: 4, width: 80, height: 10, value: 'In Loving Memory', fontFamily: PLAYFAIR, fontSize: 28, color: YT_GREEN_DARK, align: 'center', weight: 'normal', italic: true },
      { type: 'text', x: 15, y: 90, width: 70, height: 8, value: '— — — \u2022 — — —', fontFamily: INTER, fontSize: 16, color: '#5A6660', align: 'center', weight: 'normal', italic: false },
      { type: 'sticker', x: 44, y: 14, width: 12, height: 8, stickerId: 'abstract/divider', opacity: 0.8 },
    ],
  },

  // ---------- FAMILY ----------------------------------------------------
  {
    id: 'first-home',
    name: 'First Home',
    description: 'Celebrate keys-in-hand with a house sticker and a warm note.',
    category: 'family',
    thumbnail: '/idea-pages/first-home.svg',
    layoutTemplateId: 'photo-with-caption',
    background: { type: 'gradient', from: '#FBF6EC', to: '#E8DCC2', angle: 140 },
    overlays: [
      { type: 'text', x: 10, y: 6, width: 80, height: 12, value: 'Home Sweet Home', fontFamily: PLAYFAIR, fontSize: 30, color: YT_GREEN_DARK, align: 'center', weight: 'normal', italic: false },
      { type: 'text', x: 20, y: 84, width: 60, height: 10, value: 'where it all began', fontFamily: CAVEAT, fontSize: 22, color: TERRA, align: 'center', weight: 'normal', italic: false },
      { type: 'sticker', x: 78, y: 78, width: 16, height: 16, stickerId: 'family/house', opacity: 1 },
    ],
  },
  {
    id: 'family-portrait',
    name: 'Family Portrait',
    description: 'Centered portrait layout with a simple Caveat caption.',
    category: 'family',
    thumbnail: '/idea-pages/family-portrait.svg',
    layoutTemplateId: 'centered-photo',
    background: { type: 'solid', color: GREEN_LIGHT },
    overlays: [
      { type: 'text', x: 10, y: 90, width: 80, height: 8, value: 'our family',  fontFamily: CAVEAT, fontSize: 28, color: YT_GREEN_DARK, align: 'center', weight: 'normal', italic: false },
    ],
  },

  // ---------- MISC ------------------------------------------------------
  {
    id: 'travel-memory',
    name: 'Travel Memory',
    description: 'Wanderlust headline with a compass and place-line subtitle.',
    category: 'misc',
    thumbnail: '/idea-pages/travel-memory.svg',
    layoutTemplateId: 'photo-with-caption',
    background: { type: 'gradient', from: '#E0EAF1', to: '#BFD2E0', angle: 160 },
    overlays: [
      { type: 'text', x: 10, y: 6, width: 80, height: 12, value: 'Wherever we wander', fontFamily: PLAYFAIR, fontSize: 28, color: YT_GREEN_DARK, align: 'center', weight: 'normal', italic: true },
      { type: 'text', x: 15, y: 84, width: 70, height: 10, value: '— Place \u2022 Date —', fontFamily: CAVEAT, fontSize: 22, color: TERRA, align: 'center', weight: 'normal', italic: false },
      { type: 'sticker', x: 6, y: 4, width: 14, height: 14, stickerId: 'travel/compass', opacity: 1 },
    ],
  },
  {
    id: 'holiday',
    name: 'Holiday',
    description: 'Festive headline with a snowflake — easy to retitle.',
    category: 'misc',
    thumbnail: '/idea-pages/holiday.svg',
    layoutTemplateId: 'photo-with-caption',
    background: { type: 'gradient', from: '#7A1F2B', to: '#3F1318', angle: 180 },
    overlays: [
      { type: 'text', x: 10, y: 6, width: 80, height: 12, value: 'Happy Holidays', fontFamily: PLAYFAIR, fontSize: 32, color: '#F8E6C7', align: 'center', weight: 'bold', italic: false },
      { type: 'text', x: 20, y: 84, width: 60, height: 10, value: 'with love, our family', fontFamily: CAVEAT, fontSize: 22, color: '#F8E6C7', align: 'center', weight: 'normal', italic: false },
      { type: 'sticker', x: 78, y: 4, width: 16, height: 16, stickerId: 'seasons/snowflake', opacity: 0.9 },
    ],
  },
  {
    id: 'quote-page',
    name: 'Quote Page',
    description: 'Text-only page for a meaningful quote or attribution.',
    category: 'misc',
    thumbnail: '/idea-pages/quote-page.svg',
    layoutTemplateId: 'wisdom-quote',
    background: { type: 'gradient', from: GREEN_LIGHT, to: CREAM, angle: 135 },
    overlays: [
      { type: 'text', x: 10, y: 30, width: 80, height: 30, value: '\u201CWrite the words you want remembered.\u201D', fontFamily: PLAYFAIR, fontSize: 30, color: YT_GREEN_DARK, align: 'center', weight: 'normal', italic: true },
      { type: 'text', x: 25, y: 66, width: 50, height: 8, value: '\u2014 you', fontFamily: CAVEAT, fontSize: 22, color: TERRA, align: 'center', weight: 'normal', italic: false },
    ],
  },
]

// =============================================================================
// CATEGORY METADATA + LOOKUPS
// =============================================================================

export const IDEA_PAGE_CATEGORIES: ReadonlyArray<{ id: IdeaPageCategory; label: string }> = [
  { id: 'milestone', label: 'Milestones' },
  { id: 'family', label: 'Family' },
  { id: 'memorial', label: 'Memorial' },
  { id: 'misc', label: 'Other' },
]

export function getIdeaPageById(id: string): IdeaPagePreset | undefined {
  return IDEA_PAGES.find((p) => p.id === id)
}

export function getIdeaPagesByCategory(category: IdeaPageCategory): IdeaPagePreset[] {
  return IDEA_PAGES.filter((p) => p.category === category)
}

/**
 * Generate a fresh overlay id. Prefers `crypto.randomUUID` when available,
 * falls back to a timestamp+random combo for older runtimes (SSR, jest).
 */
export function freshOverlayId(): string {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return `ov-${globalThis.crypto.randomUUID()}`
    }
  } catch {
    /* ignore — fallback below */
  }
  return `ov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Materialize a preset's overlays with fresh ids. Always returns a new array
 * — safe to mutate in calling code.
 */
export function instantiateIdeaPageOverlays(preset: IdeaPagePreset): PageOverlay[] {
  return preset.overlays.map((o) => {
    const id = freshOverlayId()
    if (o.type === 'text') return { ...o, id } as PageOverlay
    return { ...o, id } as PageOverlay
  })
}
