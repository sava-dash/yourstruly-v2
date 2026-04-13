/**
 * PostScript Stationery Themes
 *
 * Each theme defines the visual treatment for both the creation preview
 * and the recipient's reading experience.
 */

export interface PostScriptTheme {
  id: string
  name: string
  /** Short description for the picker */
  description: string
  /** CSS classes for the letter card background */
  letterBg: string
  /** CSS classes for the envelope background */
  envelopeBg: string
  /** Font family for the title */
  titleFont: string
  /** Font family for body text */
  bodyFont: string
  /** Text color for body */
  textColor: string
  /** Accent color (borders, decorations) */
  accent: string
  /** Preview swatch color */
  swatch: string
}

export const THEMES: PostScriptTheme[] = [
  {
    id: 'classic',
    name: 'Classic Cream',
    description: 'Timeless and warm',
    letterBg: 'bg-[#FDF8F0]',
    envelopeBg: 'from-[#8B7355] to-[#6B5B3D]',
    titleFont: 'var(--font-dm-serif, DM Serif Display, serif)',
    bodyFont: 'var(--font-inter-tight, Inter, sans-serif)',
    textColor: '#3D3428',
    accent: '#C4A235',
    swatch: '#FDF8F0',
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Elegant and deep',
    letterBg: 'bg-[#1A1F2E]',
    envelopeBg: 'from-[#1a1a2e] to-[#0f3460]',
    titleFont: 'var(--font-dm-serif, DM Serif Display, serif)',
    bodyFont: 'var(--font-inter-tight, Inter, sans-serif)',
    textColor: '#E0DDD5',
    accent: '#7B8CDE',
    swatch: '#1A1F2E',
  },
  {
    id: 'garden',
    name: 'Garden',
    description: 'Fresh and natural',
    letterBg: 'bg-[#F5FAF7]',
    envelopeBg: 'from-[#2D5A3D] to-[#1A3A28]',
    titleFont: 'var(--font-dm-serif, DM Serif Display, serif)',
    bodyFont: 'var(--font-inter-tight, Inter, sans-serif)',
    textColor: '#1A2E1F',
    accent: '#2D5A3D',
    swatch: '#F5FAF7',
  },
  {
    id: 'typewriter',
    name: 'Typewriter',
    description: 'Vintage and raw',
    letterBg: 'bg-[#F4F1EB]',
    envelopeBg: 'from-[#5C5345] to-[#3D372E]',
    titleFont: '"Courier New", Courier, monospace',
    bodyFont: '"Courier New", Courier, monospace',
    textColor: '#2A2520',
    accent: '#8B7355',
    swatch: '#F4F1EB',
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Soft and artistic',
    letterBg: 'bg-gradient-to-br from-[#FDF2F8] via-[#FAF5FF] to-[#F0F9FF]',
    envelopeBg: 'from-[#9B59B6] to-[#6C5B7B]',
    titleFont: 'var(--font-dm-serif, DM Serif Display, serif)',
    bodyFont: 'var(--font-inter-tight, Inter, sans-serif)',
    textColor: '#3B2F4A',
    accent: '#9B59B6',
    swatch: 'linear-gradient(135deg, #FDF2F8, #FAF5FF, #F0F9FF)',
  },
  {
    id: 'handwritten',
    name: 'Handwritten',
    description: 'Personal and intimate',
    letterBg: 'bg-[#FFFEF5]',
    envelopeBg: 'from-[#B8562E] to-[#8B3A1A]',
    titleFont: 'var(--font-dm-serif, DM Serif Display, serif)',
    bodyFont: '"Georgia", serif',
    textColor: '#2C1810',
    accent: '#B8562E',
    swatch: '#FFFEF5',
  },
]

export function getTheme(id: string): PostScriptTheme {
  return THEMES.find(t => t.id === id) || THEMES[0]
}
