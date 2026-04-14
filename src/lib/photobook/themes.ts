/**
 * Photobook Themed Templates
 *
 * Each theme is a curated sequence of layout template IDs plus a cover
 * preset, font pair, and accent color. Applying a theme replaces the
 * page sequence and populates cover_design defaults; photos already
 * assigned are preserved where slot indices still line up.
 */

export type FontPair = 'classic' | 'modern' | 'storybook' | 'editorial'

export interface CoverPreset {
  title: string
  subtitle: string
  backText: string
  spineText: string
  textColor: '#FFFFFF' | '#F2F1E5' | '#2A3E33' | '#C35F33'
  fontPair: FontPair
}

export interface PhotobookTheme {
  id: string
  name: string
  description: string
  accentColor: string
  fontPair: FontPair
  coverPreset: CoverPreset
  /** Ordered layout template IDs — applied left-to-right to pages. */
  pageSequence: string[]
}

export const PHOTOBOOK_THEMES: PhotobookTheme[] = [
  {
    id: 'wedding',
    name: 'Wedding',
    description: 'Elegant, romantic, soft-focus storytelling',
    accentColor: '#C35F33',
    fontPair: 'classic',
    coverPreset: {
      title: 'Our Wedding Day',
      subtitle: 'A love story, in photographs',
      backText: 'Forever begins here.',
      spineText: 'Our Wedding',
      textColor: '#F2F1E5',
      fontPair: 'classic',
    },
    pageSequence: [
      'title-page',
      'full-photo',
      'photo-with-caption',
      'two-horizontal',
      'feature-2-small',
      'wisdom-quote',
      'grid-4',
      'centered-photo',
      'two-vertical',
      'photo-with-caption',
      'dedication',
    ],
  },
  {
    id: 'childhood',
    name: 'Childhood',
    description: 'Playful, bright, full of firsts',
    accentColor: '#406A56',
    fontPair: 'storybook',
    coverPreset: {
      title: 'Little Moments',
      subtitle: 'The early years',
      backText: 'You grew up so fast.',
      spineText: 'Childhood',
      textColor: '#FFFFFF',
      fontPair: 'storybook',
    },
    pageSequence: [
      'title-page',
      'centered-photo',
      'grid-4',
      'photo-with-caption',
      'collage-3',
      'two-horizontal',
      'full-photo',
      'feature-2-small',
      'grid-4',
      'photo-with-caption',
    ],
  },
  {
    id: 'parent-tribute',
    name: 'Parent Tribute',
    description: 'Heartfelt portrait of the person who raised you',
    accentColor: '#2A3E33',
    fontPair: 'editorial',
    coverPreset: {
      title: 'For You, With Love',
      subtitle: 'A tribute to the one who shaped us',
      backText: 'Thank you for everything.',
      spineText: 'Tribute',
      textColor: '#F2F1E5',
      fontPair: 'editorial',
    },
    pageSequence: [
      'title-page',
      'dedication',
      'full-photo',
      'photo-with-caption',
      'wisdom-quote',
      'two-vertical',
      'centered-photo',
      'feature-2-small',
      'wisdom-quote',
      'photo-with-caption',
    ],
  },
  {
    id: 'travel-log',
    name: 'Travel Log',
    description: 'Journey through places, tickets, and sunsets',
    accentColor: '#C35F33',
    fontPair: 'modern',
    coverPreset: {
      title: 'Somewhere, Everywhere',
      subtitle: 'Our travels, in one volume',
      backText: 'The journey continues.',
      spineText: 'Travels',
      textColor: '#FFFFFF',
      fontPair: 'modern',
    },
    pageSequence: [
      'title-page',
      'full-photo',
      'two-horizontal',
      'collage-3',
      'grid-4',
      'photo-with-caption',
      'full-photo',
      'feature-2-small',
      'wisdom-quote',
      'two-vertical',
      'photo-with-caption',
    ],
  },
]

export function getThemeById(id: string): PhotobookTheme | undefined {
  return PHOTOBOOK_THEMES.find((t) => t.id === id)
}

/**
 * Font family stacks for each pair. UI uses these via CSS font-family.
 */
export const FONT_PAIR_STACKS: Record<FontPair, { heading: string; body: string }> = {
  classic: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Inter Tight', system-ui, sans-serif",
  },
  modern: {
    heading: "'Inter Tight', system-ui, sans-serif",
    body: "'Inter Tight', system-ui, sans-serif",
  },
  storybook: {
    heading: "'Caveat', 'Playfair Display', cursive",
    body: "'Inter Tight', system-ui, sans-serif",
  },
  editorial: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Playfair Display', Georgia, serif",
  },
}
