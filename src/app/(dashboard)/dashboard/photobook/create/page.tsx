'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import GlassCard from '@/components/ui/GlassCard'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  BookOpen,
  Image as ImageIcon,
  Layout,
  Eye,
  CreditCard,
  Plus,
  Trash2,
  QrCode,
  Wand2,
  GripVertical,
  X,
  ArrowLeft,
  Loader2,
  Package,
  Sparkles,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Move,
  Printer,
  AlertTriangle,
  Copy,
  Square,
  CheckSquare,
  Monitor,
  Shield,
  Lightbulb,
  CheckCircle2,
  RotateCw,
  Type,
  Star,
  Palette,
  FileText,
  Frame,
  Filter as FilterIcon
} from 'lucide-react'
import { 
  LAYOUT_TEMPLATES, 
  TEMPLATES_BY_CATEGORY, 
  getTemplateById,
  LayoutTemplate 
} from '@/lib/photobook/templates'
import { PRODIGI_PHOTOBOOK_SKUS } from '@/components/photobook/types'
import { getEnabledProducts, getEnabledTemplates, DbProduct } from '@/lib/photobook/db'
import QRPreview from '@/components/photobook/QRPreview'
import CheckoutFlow from '@/components/photobook/CheckoutFlow'
import CoverDesigner, {
  CoverDesignState,
  DEFAULT_COVER_DESIGN,
  CoverPhotoOption,
} from '@/components/photobook/CoverDesigner'
import ThemePicker, { buildPagesFromTheme, ThemePage } from '@/components/photobook/ThemePicker'
import FlipBookPreview, { FlipPage, FlipCover } from '@/components/photobook/FlipBookPreview'
import {
  renderPagesForPreview,
  hashPage as hashPreviewPage,
  type PreviewPage,
} from '@/components/photobook/renderForPreview'
import CMYKWarnings from '@/components/photobook/CMYKWarnings'
import VersionHistoryPanel from '@/components/photobook/VersionHistoryPanel'
import { PhotobookTheme } from '@/lib/photobook/themes'
import { PhotoInput as CMYKPhotoInput } from '@/lib/photobook/cmyk-check'
import type { PageOverlay, PageBackground, TextOverlay } from '@/lib/photobook/overlays'
import { createTextOverlay, createStickerOverlay } from '@/lib/photobook/overlays'
import TextEditor, { TextOverlayToolbar } from '@/components/photobook/TextEditor'
import StickerPicker from '@/components/photobook/StickerPicker'
import AICaptionSuggester from '@/components/photobook/AICaptionSuggester'
import BackgroundPickerV2 from '@/components/photobook/BackgroundPicker'
import IdeaPagePicker, { type IdeaPageApplyMode } from '@/components/photobook/IdeaPagePicker'
import {
  instantiateIdeaPageOverlays,
  type IdeaPagePreset,
} from '@/lib/photobook/idea-pages'
import type { PhotoBorder, PhotoBorderStyle, PhotoFilter, PhotoEnhance } from '@/lib/photobook/renderer'
import {
  AddOnId,
  DEFAULT_PRODUCT_OPTIONS,
  ProductOptions,
  computePricing,
} from '@/lib/photobook/product-options'
import ProductOptionsBar from '@/components/photobook/ProductOptionsBar'
import AddOnsPanel from '@/components/photobook/AddOnsPanel'
import PricingRail from '@/components/photobook/PricingRail'
import PriceChip from '@/components/photobook/PriceChip'

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string
  name: string
  description: string
  size: string
  basePrice: number
  pricePerPage: number
  minPages: number
  maxPages: number
  binding: 'hardcover' | 'softcover' | 'layflat'
  icon: React.ReactNode
  features: string[]
  prodigiSku?: string
}

interface Memory {
  id: string
  title: string
  description?: string
  memory_date?: string
  created_at: string
  memory_media: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
}

interface TextStyle {
  fontFamily: string
  fontSize: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  color: string
}

interface CropData {
  scale: number
  x: number
  y: number
}

interface SlotData {
  slotId: string
  type: 'photo' | 'text' | 'qr'
  memoryId?: string
  mediaId?: string
  fileUrl?: string
  text?: string
  /** QR target: a memory (legacy field, preserved for back-compat) */
  qrMemoryId?: string
  /** QR target: a wisdom / knowledge entry (new, polymorphic addition) */
  qrWisdomId?: string
  textStyle?: TextStyle
  crop?: CropData
  cropZoom?: CropZoomData
  /** Photo border (renderer draws over the slot bounds). Defaults to none. */
  border?: PhotoBorder
  /** Photo filter (canvas pixel op applied on render + export). Defaults to original. */
  filter?: PhotoFilter
  /** Brightness/contrast/saturation (-100..+100, 0 = no change). */
  enhance?: PhotoEnhance
}

interface WisdomEntry {
  id: string
  prompt_text: string
  response_text: string | null
  category: string | null
  created_at: string
}

// Extended crop data for slot storage
interface CropZoomData {
  scale: number
  offsetX: number
  offsetY: number
}

interface PageData {
  id: string
  pageNumber: number
  layoutId: string
  slots: SlotData[]
  /**
   * CSS color or gradient (legacy, kept for back-compat with existing
   * template/theme code). Newer code prefers `backgroundV2` which is a
   * structured PageBackground object.
   */
  background?: string
  /** New structured background (solid / gradient / texture). */
  backgroundV2?: PageBackground | null
  /** Page-level text + sticker overlays (renders above template slots). */
  overlays?: PageOverlay[]
}

// History state for undo/redo
interface HistoryState {
  pages: PageData[]
  timestamp: number
}

/**
 * Convert a structured PageBackground into a CSS `background` value for the
 * editor preview. Returns `null` when no backgroundV2 is set so the caller
 * can fall back to legacy `background` / template defaults.
 */
function backgroundToCss(bg: PageBackground | null | undefined): string | null {
  if (!bg) return null
  if (bg.type === 'solid') return bg.color
  if (bg.type === 'gradient') return `linear-gradient(${bg.angle ?? 135}deg, ${bg.from}, ${bg.to})`
  // Texture — use the same CSS catalog used by BackgroundPicker previews.
  const TEXTURE_CSS: Record<string, string> = {
    paper: 'radial-gradient(circle at 20% 30%, rgba(0,0,0,0.06) 1px, transparent 1.5px), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.05) 1px, transparent 1.5px), #F2F1E5',
    linen: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 3px), #EDE4D3',
    dots: 'radial-gradient(circle, rgba(64,106,86,0.18) 1.5px, transparent 2px) 0 0/16px 16px, #F2F1E5',
    'diagonal-lines': 'repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 10px), #FFFFFF',
    grid: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 18px), repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 18px), #FFFFFF',
    noise: 'radial-gradient(circle at 10% 20%, rgba(0,0,0,0.04) 0.5px, transparent 1px) 0 0/5px 5px, #F8EFE3',
    waves: 'repeating-radial-gradient(circle at 50% 0, rgba(64,106,86,0.07) 0 12px, transparent 12px 24px), #F2F1E5',
    cross: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 8px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 8px), #EDE4D3',
  }
  return TEXTURE_CSS[bg.textureId] || '#F2F1E5'
}

/**
 * Lightweight draggable/resizable/rotatable wrapper for sticker overlays in
 * the editor. The SVG itself is rendered via `<img>` so it inherits no colors
 * but scales crisply at any zoom.
 */
function StickerOverlayView(props: {
  overlay: Extract<PageOverlay, { type: 'sticker' }>
  selected: boolean
  onSelect: () => void
  onChange: (next: PageOverlay) => void
  onCommit: () => void
  onDelete: () => void
  pageSize: { width: number; height: number }
}) {
  const { overlay, selected, onSelect, onChange, onCommit, onDelete, pageSize } = props
  const [drag, setDrag] = useState<{
    kind: 'move' | 'resize' | 'rotate'
    startX: number; startY: number
    origX: number; origY: number; origW: number; origH: number; origRot: number
    centerX?: number; centerY?: number; startAngle?: number
  } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!drag) return
    const onMove = (e: MouseEvent) => {
      const dxPct = ((e.clientX - drag.startX) / pageSize.width) * 100
      const dyPct = ((e.clientY - drag.startY) / pageSize.height) * 100
      if (drag.kind === 'move') {
        onChange({
          ...overlay,
          x: Math.max(0, Math.min(100 - overlay.width, drag.origX + dxPct)),
          y: Math.max(0, Math.min(100 - overlay.height, drag.origY + dyPct)),
        })
      } else if (drag.kind === 'resize') {
        const delta = Math.max(dxPct, dyPct)
        const w = Math.max(6, Math.min(100, drag.origW + delta))
        // Keep aspect ratio (proportional)
        const ratio = drag.origH / Math.max(drag.origW, 0.01)
        const h = Math.max(6, Math.min(100, w * ratio))
        onChange({ ...overlay, width: w, height: h })
      } else if (drag.kind === 'rotate' && drag.centerX !== undefined) {
        const angle = Math.atan2(e.clientY - drag.centerY!, e.clientX - drag.centerX) * (180 / Math.PI)
        onChange({ ...overlay, rotation: Math.round((drag.origRot + (angle - (drag.startAngle ?? 0))) % 360) })
      }
    }
    const onUp = () => { setDrag(null); onCommit() }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [drag, overlay, pageSize, onChange, onCommit])

  const startDrag = (kind: 'move' | 'resize' | 'rotate') => (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault()
    onSelect()
    const base = {
      startX: e.clientX, startY: e.clientY,
      origX: overlay.x, origY: overlay.y, origW: overlay.width, origH: overlay.height,
      origRot: overlay.rotation ?? 0,
    }
    if (kind === 'rotate') {
      const rect = wrapRef.current?.getBoundingClientRect()
      if (!rect) return
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      setDrag({
        kind, ...base, centerX: cx, centerY: cy,
        startAngle: Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI),
      })
    } else {
      setDrag({ kind, ...base })
    }
  }

  return (
    <div
      ref={wrapRef}
      className={selected ? 'ring-2 ring-[#406A56] ring-offset-2 absolute' : 'hover:ring-2 hover:ring-[#406A56]/50 absolute'}
      style={{
        left: `${overlay.x}%`, top: `${overlay.y}%`,
        width: `${overlay.width}%`, height: `${overlay.height}%`,
        transform: overlay.rotation ? `rotate(${overlay.rotation}deg)` : undefined,
        transformOrigin: 'center center',
        opacity: overlay.opacity ?? 1,
        cursor: selected ? 'move' : 'pointer',
      }}
      onMouseDown={startDrag('move')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/stickers/${overlay.stickerId}.svg`}
        alt=""
        className="w-full h-full pointer-events-none select-none"
        draggable={false}
        style={{ color: '#406A56' }}
      />

      {selected && (
        <>
          <div
            role="button" aria-label="Resize sticker"
            onMouseDown={startDrag('resize')}
            className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border-2 border-[#406A56] cursor-nwse-resize"
          />
          <button
            type="button" onMouseDown={startDrag('rotate')} aria-label="Rotate sticker"
            className="absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-[#406A56] flex items-center justify-center shadow-md"
          ><RotateCw className="w-4 h-4 text-[#406A56]" /></button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            aria-label="Delete sticker"
            className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-[#C35F33] text-white flex items-center justify-center shadow-md"
          ><Trash2 className="w-3.5 h-3.5" /></button>
          {/* Opacity slider */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-white border-2 border-[#DDE3DF] rounded-lg px-2 py-1 shadow-md flex items-center gap-2 text-xs">
            <span className="text-[#5A6660]">Opacity</span>
            <input
              type="range" min={0.25} max={1} step={0.05}
              value={overlay.opacity ?? 1}
              onChange={(e) => onChange({ ...overlay, opacity: Number(e.target.value) })}
              onMouseUp={onCommit} onTouchEnd={onCommit}
              aria-label="Sticker opacity"
              className="w-24"
            />
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// PHOTO BORDER + FILTER MENUS (PR 2 — small popover submenus)
// =============================================================================

const BORDER_OPTIONS: Array<{ id: PhotoBorderStyle; label: string }> = [
  { id: 'none',       label: 'None' },
  { id: 'thin',       label: 'Thin' },
  { id: 'thick',      label: 'Thick' },
  { id: 'polaroid',   label: 'Polaroid' },
  { id: 'rounded',    label: 'Rounded' },
  { id: 'film-strip', label: 'Film' },
]

function BorderMenu({
  current,
  onPick,
}: {
  current: PhotoBorderStyle
  onPick: (style: PhotoBorderStyle) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {BORDER_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onPick(opt.id)}
          aria-pressed={current === opt.id}
          className={`min-h-[44px] rounded text-[11px] font-medium px-1 py-2 flex flex-col items-center justify-center gap-1 border transition-colors ${
            current === opt.id
              ? 'bg-[#406A56] text-white border-[#406A56]'
              : 'bg-white text-[#2A3E33] border-[#DDE3DF] hover:border-[#406A56]'
          }`}
          title={opt.label}
        >
          <BorderSwatch style={opt.id} active={current === opt.id} />
          <span className="leading-none">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

/** Tiny visual representation of each border style for the menu buttons. */
function BorderSwatch({ style, active }: { style: PhotoBorderStyle; active: boolean }) {
  const fg = active ? '#FFFFFF' : '#406A56'
  const bg = active ? 'rgba(255,255,255,0.18)' : '#F2F1E5'
  const inner = (
    <rect x="6" y="6" width="20" height="14" fill={bg} />
  )
  switch (style) {
    case 'none':
      return <svg width="32" height="22" viewBox="0 0 32 26">{inner}</svg>
    case 'thin':
      return <svg width="32" height="22" viewBox="0 0 32 26">{inner}<rect x="6" y="6" width="20" height="14" fill="none" stroke={fg} strokeWidth="1.2"/></svg>
    case 'thick':
      return <svg width="32" height="22" viewBox="0 0 32 26">{inner}<rect x="6" y="6" width="20" height="14" fill="none" stroke={fg} strokeWidth="3"/></svg>
    case 'polaroid':
      return <svg width="32" height="22" viewBox="0 0 32 26"><rect x="4" y="4" width="24" height="20" fill="#fff" stroke={fg} strokeWidth="0.5"/><rect x="6" y="6" width="20" height="11" fill={bg}/></svg>
    case 'rounded':
      return <svg width="32" height="22" viewBox="0 0 32 26"><rect x="6" y="6" width="20" height="14" rx="4" fill={bg}/></svg>
    case 'film-strip':
      return (
        <svg width="32" height="22" viewBox="0 0 32 26">
          <rect x="4" y="4" width="24" height="18" fill={bg}/>
          <rect x="4" y="4" width="24" height="3" fill="#0E0E0E"/>
          <rect x="4" y="19" width="24" height="3" fill="#0E0E0E"/>
          {[7, 13, 19, 25].map((cx) => (
            <rect key={`t${cx}`} x={cx - 1.2} y="4.6" width="2.4" height="1.6" fill="#fff"/>
          ))}
          {[7, 13, 19, 25].map((cx) => (
            <rect key={`b${cx}`} x={cx - 1.2} y="19.6" width="2.4" height="1.6" fill="#fff"/>
          ))}
        </svg>
      )
  }
}

const FILTER_OPTIONS: Array<{ id: PhotoFilter; label: string }> = [
  { id: 'original', label: 'Original' },
  { id: 'bw',       label: 'B&W' },
  { id: 'sepia',    label: 'Sepia' },
  { id: 'warm',     label: 'Warm' },
  { id: 'cool',     label: 'Cool' },
  { id: 'faded',    label: 'Faded' },
]

/**
 * Map a PhotoFilter to a CSS filter() string for the live thumbnail preview.
 * The renderer applies the same effect via canvas pixel ops on export — these
 * CSS values are visually-close approximations for the picker UI only.
 */
function filterToCss(filter: PhotoFilter): string {
  switch (filter) {
    case 'original': return 'none'
    case 'bw':       return 'grayscale(1)'
    case 'sepia':    return 'sepia(0.85)'
    case 'warm':     return 'saturate(1.1) hue-rotate(-10deg) brightness(1.03)'
    case 'cool':     return 'saturate(1.05) hue-rotate(15deg) brightness(0.98)'
    case 'faded':    return 'contrast(0.85) brightness(1.12) saturate(0.85)'
  }
}

function FilterMenu({
  photoUrl,
  current,
  onPick,
}: {
  photoUrl: string | undefined
  current: PhotoFilter
  onPick: (f: PhotoFilter) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onPick(opt.id)}
          aria-pressed={current === opt.id}
          className={`min-h-[44px] rounded text-[11px] font-medium px-1 py-1 flex flex-col items-center gap-1 border transition-colors ${
            current === opt.id
              ? 'bg-[#406A56] text-white border-[#406A56]'
              : 'bg-white text-[#2A3E33] border-[#DDE3DF] hover:border-[#406A56]'
          }`}
          title={opt.label}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              width={36}
              height={24}
              className="w-9 h-6 rounded object-cover"
              style={{ filter: filterToCss(opt.id) }}
              draggable={false}
            />
          ) : (
            <div className="w-9 h-6 rounded bg-[#F2F1E5]" />
          )}
          <span className="leading-none">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * AdjustMenu — three labeled sliders for brightness/contrast/saturation.
 * Each value is -100..+100 and live-updates the editor preview via onChange.
 * Reset button zeroes all three in one click.
 */
function AdjustMenu({
  current,
  onChange,
}: {
  current: PhotoEnhance | undefined
  onChange: (e: PhotoEnhance) => void
}) {
  const vals: Required<PhotoEnhance> = {
    brightness: current?.brightness ?? 0,
    contrast: current?.contrast ?? 0,
    saturation: current?.saturation ?? 0,
  }
  const update = (key: keyof PhotoEnhance, v: number) => {
    onChange({ ...vals, [key]: v })
  }
  const reset = () => onChange({ brightness: 0, contrast: 0, saturation: 0 })
  const rows: { key: keyof PhotoEnhance; label: string }[] = [
    { key: 'brightness', label: 'Brightness' },
    { key: 'contrast', label: 'Contrast' },
    { key: 'saturation', label: 'Saturation' },
  ]
  return (
    <div className="space-y-2 py-1">
      {rows.map((r) => (
        <label key={r.key} className="block text-[11px] text-[#2A3E33]">
          <div className="flex items-center justify-between mb-0.5">
            <span>{r.label}</span>
            <span className="text-[10px] text-[#5A6660] tabular-nums">{vals[r.key]}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            step={1}
            value={vals[r.key]}
            onChange={(e) => update(r.key, Number(e.target.value))}
            className="w-full accent-[#406A56]"
            aria-label={`${r.label} adjustment`}
          />
        </label>
      ))}
      <button
        type="button"
        onClick={reset}
        className="w-full min-h-[32px] mt-1 rounded border border-[#DDE3DF] text-[11px] font-medium text-[#5A6660] hover:border-[#406A56] hover:text-[#406A56]"
      >
        Reset
      </button>
    </div>
  )
}

interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

// ============================================================================
// EDITOR CONSTANTS
// ============================================================================

const FONT_FAMILIES = [
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
  { value: 'var(--font-playfair), Georgia, serif', label: 'Playfair Display' },
  { value: 'var(--font-handwritten), cursive', label: 'Caveat' },
]

const FONT_SIZES = [
  { value: 'sm', label: '12pt', px: 12 },
  { value: 'md', label: '16pt', px: 16 },
  { value: 'lg', label: '20pt', px: 20 },
  { value: 'xl', label: '28pt', px: 28 },
  { value: '2xl', label: '36pt', px: 36 },
]

const TEXT_COLORS = [
  '#333333', '#000000', '#ffffff', '#666666',
  '#8b4513', '#2c3e50', '#c0392b', '#27ae60',
  '#8e44ad', '#d35400', '#2980b9', '#16a085'
]

const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Georgia, serif',
  fontSize: 'md',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'center',
  color: '#333333',
}

function getFontSizePx(size: string): number {
  return FONT_SIZES.find(f => f.value === size)?.px || 16
}

/** Parse a product size string like "8×8"" or "11×8.5"" into inches. */
function parsePrintInches(size: string): { width: number; height: number } {
  const m = size.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)/)
  if (!m) return { width: 8, height: 8 }
  return { width: parseFloat(m[1]), height: parseFloat(m[2]) }
}

// ============================================================================
// PRODUCTS
// ============================================================================

// Prodigi photobook specs: https://www.prodigi.com/blog/photo-books-technical-guide/
// Hardcover: 24-300 pages, Softcover: 20-300 pages, Layflat: 18-122 pages
// We limit max pages for MVP to keep it manageable
const PRODUCTS: Product[] = [
  {
    id: '8x8_hardcover',
    name: '8×8" Hardcover',
    description: 'Classic square format, perfect for family albums',
    size: '8×8"',
    basePrice: 29.99,
    pricePerPage: 0.40, // ~$0.40/page for additional pages
    minPages: 24,
    maxPages: 80, // Prodigi allows up to 300, we limit for MVP
    binding: 'hardcover',
    icon: <BookOpen className="w-8 h-8" />,
    features: ['PUR binding', 'Matte-laminated cover', 'Printable spine'],
    prodigiSku: 'BOOK-HARD-SQ-9X9' // 9x9" is closest Prodigi size
  },
  {
    id: '10x10_hardcover',
    name: '10×10" Hardcover',
    description: 'Large format for stunning photo displays',
    size: '10×10"',
    basePrice: 39.99,
    pricePerPage: 0.50,
    minPages: 24,
    maxPages: 80,
    binding: 'hardcover',
    icon: <BookOpen className="w-8 h-8" />,
    features: ['PUR binding', 'Matte-laminated cover', '200gsm gloss paper'],
    prodigiSku: 'BOOK-HARD-SQ-12X12'
  },
  {
    id: '11x8_landscape',
    name: '11×8" Landscape',
    description: 'Wide format ideal for panoramic shots',
    size: '11×8"',
    basePrice: 34.99,
    pricePerPage: 0.45,
    minPages: 24,
    maxPages: 80,
    binding: 'hardcover',
    icon: <BookOpen className="w-8 h-8" />,
    features: ['Landscape orientation', '200gsm gloss paper', 'PUR binding'],
    prodigiSku: 'BOOK-HARD-LS-11X9'
  },
  {
    id: '8x8_softcover',
    name: '8×8" Softcover',
    description: 'Affordable option with professional quality',
    size: '8×8"',
    basePrice: 19.99,
    pricePerPage: 0.30,
    minPages: 20,
    maxPages: 60,
    binding: 'softcover',
    icon: <Package className="w-8 h-8" />,
    features: ['Flexible matte cover', '150gsm gloss paper', 'Faster production'],
    prodigiSku: 'BOOK-SOFT-SQ-9X9'
  },
  {
    id: '12x12_layflat',
    name: '12×12" Layflat Premium',
    description: 'Our finest photobook with seamless spreads',
    size: '12×12"',
    basePrice: 59.99,
    pricePerPage: 1.00,
    minPages: 18,
    maxPages: 60, // Prodigi allows up to 122
    binding: 'layflat',
    icon: <Sparkles className="w-8 h-8" />,
    features: ['180° lay-flat binding', '190gsm lustre paper', 'Seamless panoramas'],
    prodigiSku: 'BOOK-LAYFLAT-SQ-12X12'
  },
  {
    id: 'calendar_wall',
    name: 'Wall Calendar',
    description: '12-month custom photo calendar',
    size: '11×8.5"',
    basePrice: 24.99,
    pricePerPage: 0,
    minPages: 13,
    maxPages: 13,
    binding: 'softcover',
    icon: <Layout className="w-8 h-8" />,
    features: ['Wire-O binding', 'Hanging hook', 'US holidays included'],
    prodigiSku: 'CALENDAR-WALL-A3'
  }
]

// ============================================================================
// STEP COMPONENTS
// ============================================================================

// Step 1: Choose Product
function ProductStep({ 
  selectedProduct, 
  onSelect,
  products,
  isLoading
}: { 
  selectedProduct: Product | null
  onSelect: (product: Product) => void
  products: Product[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto text-center py-16">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#406A56]" />
        <p className="text-[#5A6660] mt-4">Loading products...</p>
      </div>
    )
  }
  
  if (products.length === 0) {
    return (
      <div className="max-w-6xl mx-auto text-center py-16">
        <Package className="w-16 h-16 mx-auto text-[#94A09A]" />
        <h3 className="text-lg font-medium text-[#406A56] mt-4">No Products Available</h3>
        <p className="text-[#5A6660] mt-2">Please check back later or contact support.</p>
      </div>
    )
  }
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#1A1F1C] mb-2" style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}>Choose Your Product</h2>
        <p className="text-[#5A6660]">Select the perfect format for your memories</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const isSelected = selectedProduct?.id === product.id
          const displayPrice = (product.basePrice * 1.3).toFixed(2) // 30% markup
          
          return (
            <motion.div
              key={product.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <GlassCard
                variant="warm"
                padding="none"
                hover
                onClick={() => onSelect(product)}
                className={`cursor-pointer overflow-hidden transition-all ${
                  isSelected 
                    ? 'ring-2 ring-[#406A56] ring-offset-2 ring-offset-[#FAFAF7]' 
                    : ''
                }`}
              >
                {/* Product Icon Header */}
                <div className={`p-6 ${
                  isSelected 
                    ? 'bg-gradient-to-br from-[#406A56] to-[#345548]' 
                    : 'bg-gradient-to-br from-[#406A56]/10 to-[#406A56]/5'
                }`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#406A56]'
                  }`}>
                    {product.icon}
                  </div>
                </div>
                
                {/* Product Details */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-[#406A56]">{product.name}</h3>
                      <p className="text-sm text-[#5A6660]">{product.size}</p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#406A56] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-[#5A6660] mb-4">{product.description}</p>
                  
                  {/* Features */}
                  <ul className="space-y-1 mb-4">
                    {product.features.map((feature, i) => (
                      <li key={i} className="text-xs text-[#5A6660] flex items-center gap-2">
                        <Check className="w-3 h-3 text-[#94A09A]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {/* Price */}
                  <div className="pt-4 border-t border-[#DDE3DF]">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-[#406A56]">${displayPrice}</span>
                      <span className="text-xs text-[#94A09A]">
                        {product.minPages}-{product.maxPages} pages
                      </span>
                    </div>
                    {product.pricePerPage > 0 && (
                      <p className="text-xs text-[#94A09A] mt-1">
                        +${(product.pricePerPage * 1.3).toFixed(2)}/additional page
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// Step 2: Select Content (Memory Selector)
function ContentStep({
  memories,
  selectedMemoryIds,
  onToggle,
  minPages,
  maxPages,
  isLoading
}: {
  memories: Memory[]
  selectedMemoryIds: Set<string>
  onToggle: (memoryId: string) => void
  minPages: number
  maxPages: number
  isLoading: boolean
}) {
  const selectedCount = selectedMemoryIds.size
  const minRequired = Math.ceil(minPages / 2) // Rough estimate: 2 photos per page
  const maxAllowed = maxPages * 4 // Max 4 photos per page
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#1A1F1C] mb-2" style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}>Select Your Memories</h2>
        <p className="text-[#5A6660]">Choose the photos and memories to include in your book</p>
      </div>
      
      {/* Selection Status Bar */}
      <GlassCard variant="warm" padding="md" className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xl font-medium ${
              selectedCount >= minRequired
                ? 'bg-[#406A56]/10 text-[#406A56]'
                : 'bg-[#C4A235]/10 text-[#C4A235]'
            }`}>
              {selectedCount} selected
            </div>
            <div className="text-sm text-[#5A6660]">
              {selectedCount < minRequired ? (
                <span>Select at least <strong>{minRequired - selectedCount}</strong> more</span>
              ) : selectedCount > maxAllowed ? (
                <span className="text-[#B8562E]">Too many selected (max {maxAllowed})</span>
              ) : (
                <span className="text-[#406A56]">Ready to continue</span>
              )}
            </div>
          </div>
          <div className="text-sm text-[#94A09A]">
            Recommended: {minRequired}–{Math.ceil(maxPages / 2)} memories
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4 h-2 bg-[#406A56]/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              selectedCount >= minRequired ? 'bg-[#406A56]' : 'bg-[#C4A235]'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((selectedCount / minRequired) * 100, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </GlassCard>
      
      {/* Memory Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#406A56]" />
        </div>
      ) : memories.length === 0 ? (
        <GlassCard variant="warm" padding="lg" className="text-center">
          <ImageIcon className="w-16 h-16 mx-auto text-[#94A09A] mb-4" />
          <h3 className="text-lg font-semibold text-[#406A56] mb-2">No Memories Yet</h3>
          <p className="text-[#5A6660] mb-4">Create some memories first to build your photobook</p>
          <button
            onClick={() => window.location.href = '/dashboard/memories'}
            className="px-4 py-2 bg-[#406A56] text-white rounded-xl hover:bg-[#345548] transition-colors"
          >
            Go to Memories
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {memories.map((memory) => {
            const isSelected = selectedMemoryIds.has(memory.id)
            const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
            
            return (
              <motion.div
                key={memory.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onToggle(memory.id)}
                className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer ring-2 transition-all ${
                  isSelected 
                    ? 'ring-[#406A56] ring-offset-2' 
                    : 'ring-transparent hover:ring-[#406A56]/30'
                }`}
              >
                {coverMedia?.file_url ? (
                  <img
                    src={coverMedia.file_url}
                    alt={memory.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#406A56]/10 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-[#94A09A]" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className={`absolute inset-0 transition-all ${
                  isSelected 
                    ? 'bg-[#406A56]/40' 
                    : 'bg-black/0 hover:bg-black/20'
                }`} />
                
                {/* Selection indicator */}
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isSelected 
                    ? 'bg-[#406A56] text-white' 
                    : 'bg-white/80 text-transparent'
                }`}>
                  <Check className="w-4 h-4" />
                </div>
                
                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white text-xs font-medium truncate">{memory.title}</p>
                  {memory.memory_date && (
                    <p className="text-white/70 text-xs">
                      {new Date(memory.memory_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                {/* Photo count badge */}
                {memory.memory_media && memory.memory_media.length > 1 && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 rounded text-white text-xs">
                    {memory.memory_media.length} photos
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Step 3: Arrange Pages
function ArrangeStep({
  pages,
  setPages,
  selectedMemories,
  wisdomEntries,
  mediaFaces,
  selectedProduct,
  onAutoArrange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveHistory,
  shareTokenMap,
  selectedPageId,
  setSelectedPageId,
  selectedOverlayId,
  setSelectedOverlayId,
  showStickerPicker,
  setShowStickerPicker,
  showBackgroundPickerV2,
  setShowBackgroundPickerV2,
  onOpenThemes,
  onOpenCover,
  onOpenPreview,
  onOpenCmyk,
  onOpenVersions,
  projectId,
}: {
  pages: PageData[]
  setPages: (pages: PageData[]) => void
  selectedMemories: Memory[]
  wisdomEntries: WisdomEntry[]
  /** Map of mediaId → primary face bounding box (0-1 normalized) */
  mediaFaces: Map<string, { x: number; y: number; width: number; height: number }>
  selectedProduct: Product | null
  onAutoArrange: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  saveHistory: (pages: PageData[]) => void
  shareTokenMap: Record<string, string>
  selectedPageId: string | null
  setSelectedPageId: (id: string | null) => void
  selectedOverlayId: string | null
  setSelectedOverlayId: (id: string | null) => void
  showStickerPicker: boolean
  setShowStickerPicker: (open: boolean) => void
  showBackgroundPickerV2: boolean
  setShowBackgroundPickerV2: (open: boolean) => void
  onOpenThemes: () => void
  onOpenCover: () => void
  onOpenPreview: () => void
  onOpenCmyk: () => void
  onOpenVersions: () => void
  projectId: string | null
}) {
  const [showLayoutPicker, setShowLayoutPicker] = useState(false)
  const [layoutPickerMode, setLayoutPickerMode] = useState<'add' | 'change'>('add')
  const [showQRPicker, setShowQRPicker] = useState(false)
  const [qrPickerTab, setQrPickerTab] = useState<'memories' | 'wisdom'>('memories')
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)
  const [activeTextSlotId, setActiveTextSlotId] = useState<string | null>(null)
  // Idea pages picker (PR 2)
  const [showIdeaPagePicker, setShowIdeaPagePicker] = useState(false)
  // Per-photo-slot popover for Border + Filter (PR 2). Tracks which slot's
  // popover is open and which submenu ('border' | 'filter' | null) is showing.
  const [photoToolsSlotId, setPhotoToolsSlotId] = useState<string | null>(null)
  const [photoToolsMenu, setPhotoToolsMenu] = useState<'border' | 'filter' | 'adjust' | null>(null)
  // Print-safe-zone overlay toggle (persisted via localStorage)
  const [showSafetyLines, setShowSafetyLines] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem('photobook:showSafetyLines') === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('photobook:showSafetyLines', showSafetyLines ? '1' : '0')
    } catch {
      /* ignore storage errors (private mode etc.) */
    }
  }, [showSafetyLines])

  // Bulk page selection state
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)

  // Creative tools refs (state for selectedOverlayId / pickers is lifted to root)
  const pageCanvasRef = useRef<HTMLDivElement>(null)
  const [pageCanvasSize, setPageCanvasSize] = useState({ width: 500, height: 500 })

  // Keyboard: Delete removes selected overlay, Escape deselects.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const isEditing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if (isEditing) return
      if (e.key === 'Escape') setSelectedOverlayId(null)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedOverlayId && selectedPageId) {
        e.preventDefault()
        deleteOverlay(selectedPageId, selectedOverlayId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOverlayId, selectedPageId, pages])

  // Track canvas size so TextEditor can convert px → percent while dragging.
  useEffect(() => {
    const el = pageCanvasRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0) setPageCanvasSize({ width: rect.width, height: rect.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [selectedPageId])

  // Default-select the first page when none selected and pages exist.
  // (selectedPageId is lifted to root, so we sync here.)
  useEffect(() => {
    if (!selectedPageId && pages.length > 0) {
      setSelectedPageId(pages[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, selectedPageId])

  // Crop/Zoom UI state
  const [cropZoomSlotId, setCropZoomSlotId] = useState<string | null>(null)
  const [cropZoomValues, setCropZoomValues] = useState<{ scale: number; offsetX: number; offsetY: number }>({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [cropZoomSlotStart, setCropZoomSlotStart] = useState({ offsetX: 0, offsetY: 0 })
  
  // Track the last used text style to persist font selection across pages
  const [lastTextStyle, setLastTextStyle] = useState<TextStyle>(DEFAULT_TEXT_STYLE)
  
  // Get current text style for active slot - uses slot data from pages, falling back to last used style
  const getTextStyle = (pageId: string, slotId: string): TextStyle => {
    const page = pages.find(p => p.id === pageId)
    const slot = page?.slots.find(s => s.slotId === slotId)
    return slot?.textStyle || lastTextStyle
  }
  
  // Update text style - updates both the page data and the last used style
  const updateTextStyle = (pageId: string, slotId: string, updates: Partial<TextStyle>) => {
    const currentStyle = getTextStyle(pageId, slotId)
    const newStyle = { ...currentStyle, ...updates }
    
    // Update last used style so new text slots inherit this
    setLastTextStyle(newStyle)
    
    // Sync to page slot data
    setPages(pages.map(p => {
      if (p.id !== pageId) return p
      const existingSlot = p.slots.find(s => s.slotId === slotId)
      if (existingSlot) {
        return {
          ...p,
          slots: p.slots.map(s => s.slotId === slotId ? { ...s, textStyle: newStyle } : s)
        }
      } else {
        // Create new text slot with style
        return {
          ...p,
          slots: [...p.slots, { slotId, type: 'text' as const, textStyle: newStyle }]
        }
      }
    }))
  }
  
  // Get/set text content - stored directly in page slots
  const getTextContent = (pageId: string, slotId: string): string => {
    const page = pages.find(p => p.id === pageId)
    const slot = page?.slots.find(s => s.slotId === slotId)
    return slot?.text || ''
  }

  const setTextContent = (pageId: string, slotId: string, content: string) => {
    setPages(pages.map(p => {
      if (p.id !== pageId) return p
      const existingSlot = p.slots.find(s => s.slotId === slotId)
      if (existingSlot) {
        return {
          ...p,
          slots: p.slots.map(s => s.slotId === slotId ? { ...s, text: content } : s)
        }
      } else {
        // Create new text slot with last used style for consistency
        return {
          ...p,
          slots: [...p.slots, { slotId, type: 'text' as const, text: content, textStyle: { ...lastTextStyle } }]
        }
      }
    }))
  }

  // Bulk page selection handlers
  const handlePageSelect = (pageId: string, index: number, isCtrlClick: boolean, isShiftClick: boolean) => {
    if (isShiftClick && lastSelectedIndex !== null) {
      // Range select
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      const newSelection = new Set(selectedPageIds)
      for (let i = start; i <= end; i++) {
        newSelection.add(pages[i].id)
      }
      setSelectedPageIds(newSelection)
    } else if (isCtrlClick) {
      // Toggle selection
      const newSelection = new Set(selectedPageIds)
      if (newSelection.has(pageId)) {
        newSelection.delete(pageId)
      } else {
        newSelection.add(pageId)
      }
      setSelectedPageIds(newSelection)
      setLastSelectedIndex(index)
    } else {
      // Single select
      setSelectedPageIds(new Set([pageId]))
      setLastSelectedIndex(index)
      setSelectedPageId(pageId)
    }
  }

  const selectAllPages = () => {
    setSelectedPageIds(new Set(pages.map(p => p.id)))
  }

  const deselectAllPages = () => {
    setSelectedPageIds(new Set())
  }

  const deleteSelectedPages = () => {
    if (selectedPageIds.size === 0) return
    const newPages = pages.filter(p => !selectedPageIds.has(p.id))
    // Renumber pages
    newPages.forEach((p, i) => p.pageNumber = i + 1)
    setPages(newPages)
    saveHistory(newPages)
    setSelectedPageIds(new Set())
    if (selectedPageId && selectedPageIds.has(selectedPageId)) {
      setSelectedPageId(newPages[0]?.id || null)
    }
  }

  const duplicateSelectedPages = () => {
    if (selectedPageIds.size === 0) return
    const pagesToDuplicate = pages.filter(p => selectedPageIds.has(p.id))
    const duplicatedPages = pagesToDuplicate.map(p => ({
      ...p,
      id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pageNumber: 0 // Will be set below
    }))
    const newPages = [...pages, ...duplicatedPages]
    newPages.forEach((p, i) => p.pageNumber = i + 1)
    setPages(newPages)
    saveHistory(newPages)
    setSelectedPageIds(new Set())
  }

  // Crop/Zoom handlers
  const getCropZoom = (pageId: string, slotId: string): CropZoomData => {
    const page = pages.find(p => p.id === pageId)
    const slot = page?.slots.find(s => s.slotId === slotId)
    return slot?.cropZoom || { scale: 1, offsetX: 0, offsetY: 0 }
  }

  const updateCropZoom = (pageId: string, slotId: string, updates: Partial<CropZoomData>) => {
    const currentZoom = getCropZoom(pageId, slotId)
    const newZoom = { ...currentZoom, ...updates }

    setPages(pages.map(p => {
      if (p.id !== pageId) return p
      return {
        ...p,
        slots: p.slots.map(s =>
          s.slotId === slotId ? { ...s, cropZoom: newZoom } : s
        )
      }
    }))
    setCropZoomValues(newZoom)
  }

  const startCropZoom = (pageId: string, slotId: string) => {
    const currentZoom = getCropZoom(pageId, slotId)
    setCropZoomSlotId(slotId)
    setCropZoomValues(currentZoom)
  }

  const closeCropZoom = () => {
    if (cropZoomSlotId) {
      saveHistory(pages)
    }
    setCropZoomSlotId(null)
    setIsDragging(false)
  }

  const handleDragStart = (e: React.MouseEvent) => {
    if (!cropZoomSlotId) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setCropZoomSlotStart({ offsetX: cropZoomValues.offsetX, offsetY: cropZoomValues.offsetY })
  }

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedPageId || !cropZoomSlotId) return

    const deltaX = ((e.clientX - dragStart.x) / 300) * 100 // Convert to percentage
    const deltaY = ((e.clientY - dragStart.y) / 300) * 100

    updateCropZoom(selectedPageId, cropZoomSlotId, {
      offsetX: Math.max(-50, Math.min(50, cropZoomSlotStart.offsetX + deltaX)),
      offsetY: Math.max(-50, Math.min(50, cropZoomSlotStart.offsetY + deltaY))
    })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }
  
  // Current style for active text slot
  const activeStyle = selectedPageId && activeTextSlotId 
    ? getTextStyle(selectedPageId, activeTextSlotId) 
    : null
  
  const selectedPage = pages.find(p => p.id === selectedPageId)
  const selectedTemplate = selectedPage ? getTemplateById(selectedPage.layoutId) : null
  
  // Get all available photos from selected memories
  const availablePhotos = useMemo(() => {
    const photos: { memoryId: string; mediaId: string; fileUrl: string; memoryTitle: string }[] = []
    selectedMemories.forEach(memory => {
      memory.memory_media?.forEach(media => {
        if (media.file_type?.startsWith('image')) {
          photos.push({
            memoryId: memory.id,
            mediaId: media.id,
            fileUrl: media.file_url,
            memoryTitle: memory.title
          })
        }
      })
    })
    return photos
  }, [selectedMemories])
  
  // Get photos already used on pages
  const usedMediaIds = useMemo(() => {
    const used = new Set<string>()
    pages.forEach(page => {
      page.slots.forEach(slot => {
        if (slot.mediaId) used.add(slot.mediaId)
      })
    })
    return used
  }, [pages])
  
  // Get memory IDs used on pages (for saving project)
  const usedMemoryIds = useMemo(() => {
    const used = new Set<string>()
    pages.forEach(page => {
      page.slots.forEach(slot => {
        if (slot.memoryId) used.add(slot.memoryId)
        if (slot.qrMemoryId) used.add(slot.qrMemoryId)
        // qrWisdomId intentionally not added to memory-ids set
      })
    })
    return used
  }, [pages])

  const addPage = (layoutId: string = 'full-photo') => {
    const template = getTemplateById(layoutId)
    // Initialize text slots with the last used text style for consistency
    const initialSlots: SlotData[] = []
    if (template) {
      template.slots.forEach(slot => {
        if (slot.type === 'text') {
          initialSlots.push({
            slotId: slot.id,
            type: 'text',
            textStyle: { ...lastTextStyle },
            text: ''
          })
        }
      })
    }
    
    const newPage: PageData = {
      id: `page-${Date.now()}`,
      pageNumber: pages.length + 1,
      layoutId,
      slots: initialSlots
    }
    const newPages = [...pages, newPage]
    setPages(newPages)
    saveHistory(newPages)
    setSelectedPageId(newPage.id)
    setShowLayoutPicker(false)
  }
  
  const removePage = (pageId: string) => {
    const newPages = pages.filter(p => p.id !== pageId)
    // Renumber pages
    newPages.forEach((p, i) => p.pageNumber = i + 1)
    setPages(newPages)
    saveHistory(newPages)
    if (selectedPageId === pageId) {
      setSelectedPageId(newPages[0]?.id || null)
    }
  }
  
  const updatePageLayout = (pageId: string, layoutId: string) => {
    const newTemplate = getTemplateById(layoutId)
    
    const newPages = pages.map(p => {
      if (p.id !== pageId) return p
      
      // Get existing photo slots to preserve content
      const existingPhotoSlots = p.slots.filter(s => s.type === 'photo' && s.fileUrl)
      const existingTextSlots = p.slots.filter(s => s.type === 'text')
      const existingQrSlots = p.slots.filter(s => s.type === 'qr')
      
      // Get new template's slots
      const newPhotoSlots = newTemplate?.slots.filter(s => s.type === 'photo') || []
      const newTextSlots = newTemplate?.slots.filter(s => s.type === 'text') || []
      const newQrSlots = newTemplate?.slots.filter(s => s.type === 'qr') || []
      
      // Map existing content to new slots
      const mappedSlots: SlotData[] = []
      
      // Map photos to new slots (preserve as many as possible)
      newPhotoSlots.forEach((newSlot, i) => {
        if (existingPhotoSlots[i]) {
          mappedSlots.push({
            ...existingPhotoSlots[i],
            slotId: newSlot.id,
          })
        }
      })
      
      // Map text to new slots - preserve both content AND style
      newTextSlots.forEach((newSlot, i) => {
        if (existingTextSlots[i]) {
          mappedSlots.push({
            ...existingTextSlots[i],
            slotId: newSlot.id,
          })
        }
      })
      
      // Map QR to new slots
      newQrSlots.forEach((newSlot, i) => {
        if (existingQrSlots[i]) {
          mappedSlots.push({
            ...existingQrSlots[i],
            slotId: newSlot.id,
          })
        }
      })
      
      return { ...p, layoutId, slots: mappedSlots }
    })
    
    setPages(newPages)
    saveHistory(newPages)
  }

  // --- Overlay (text/sticker) + structured background helpers ---------------
  const mutatePageOverlays = (
    pageId: string,
    fn: (overlays: PageOverlay[]) => PageOverlay[],
    commitHistory: boolean
  ) => {
    const newPages = pages.map(p =>
      p.id === pageId ? { ...p, overlays: fn(p.overlays ?? []) } : p
    )
    setPages(newPages)
    if (commitHistory) saveHistory(newPages)
  }

  const addTextOverlay = () => {
    if (!selectedPageId) return
    const overlay = createTextOverlay()
    mutatePageOverlays(selectedPageId, (o) => [...o, overlay], true)
    setSelectedOverlayId(overlay.id)
  }

  const addStickerOverlay = (stickerId: string) => {
    if (!selectedPageId) return
    const overlay = createStickerOverlay(stickerId)
    mutatePageOverlays(selectedPageId, (o) => [...o, overlay], true)
    setSelectedOverlayId(overlay.id)
    setShowStickerPicker(false)
  }

  const updateOverlay = (pageId: string, overlay: PageOverlay, commit: boolean) => {
    mutatePageOverlays(pageId, (list) => list.map(o => o.id === overlay.id ? overlay : o), commit)
  }

  const deleteOverlay = (pageId: string, overlayId: string) => {
    mutatePageOverlays(pageId, (list) => list.filter(o => o.id !== overlayId), true)
    setSelectedOverlayId(null)
  }

  const applyBackgroundV2 = (bg: PageBackground | null, scope: 'page' | 'all') => {
    if (scope === 'all') {
      const newPages = pages.map(p => ({ ...p, backgroundV2: bg }))
      setPages(newPages)
      saveHistory(newPages)
    } else if (selectedPageId) {
      const newPages = pages.map(p => p.id === selectedPageId ? { ...p, backgroundV2: bg } : p)
      setPages(newPages)
      saveHistory(newPages)
    }
  }

  // --- Idea Pages (PR 2) ----------------------------------------------------
  /**
   * Apply a curated Idea Page preset. `mode === 'append'` adds it as a new
   * page at the END of the list; `mode === 'replace'` swaps the currently
   * selected page's layout + background + overlays (photo slots clear).
   * Overlay ids are freshly generated so each instance edits independently.
   */
  const applyIdeaPage = (preset: IdeaPagePreset, mode: IdeaPageApplyMode) => {
    const template = getTemplateById(preset.layoutTemplateId)
    // Seed text slots with last text style (matches addPage behavior).
    const seedSlots: SlotData[] = []
    if (template) {
      template.slots.forEach(slot => {
        if (slot.type === 'text') {
          seedSlots.push({
            slotId: slot.id,
            type: 'text',
            textStyle: { ...lastTextStyle },
            text: '',
          })
        }
      })
    }
    const overlays = instantiateIdeaPageOverlays(preset)

    if (mode === 'append') {
      const newPage: PageData = {
        id: `page-${Date.now()}`,
        pageNumber: pages.length + 1,
        layoutId: preset.layoutTemplateId,
        slots: seedSlots,
        backgroundV2: preset.background,
        overlays,
      }
      const newPages = [...pages, newPage]
      setPages(newPages)
      saveHistory(newPages)
      setSelectedPageId(newPage.id)
      return
    }

    // Replace current page (caller already showed the confirm dialog).
    if (!selectedPageId) return
    const newPages = pages.map(p => p.id === selectedPageId
      ? {
          ...p,
          layoutId: preset.layoutTemplateId,
          slots: seedSlots,
          backgroundV2: preset.background,
          overlays,
        }
      : p
    )
    setPages(newPages)
    saveHistory(newPages)
  }

  // --- Photo border + filter (PR 2) ----------------------------------------
  const updatePhotoSlotField = (
    pageId: string,
    slotId: string,
    patch: Partial<Pick<SlotData, 'border' | 'filter' | 'enhance'>>
  ) => {
    const newPages = pages.map(p => {
      if (p.id !== pageId) return p
      const idx = p.slots.findIndex(s => s.slotId === slotId)
      if (idx === -1) {
        // No SlotData yet for this slot — create one with the patch.
        return {
          ...p,
          slots: [...p.slots, { slotId, type: 'photo' as const, ...patch }],
        }
      }
      const updated = { ...p.slots[idx], ...patch }
      const slots = [...p.slots]
      slots[idx] = updated
      return { ...p, slots }
    })
    setPages(newPages)
    saveHistory(newPages)
  }

  const setSlotBorder = (slotId: string, style: PhotoBorderStyle) => {
    if (!selectedPageId) return
    const border: PhotoBorder = { style }
    updatePhotoSlotField(selectedPageId, slotId, { border })
  }

  const setSlotFilter = (slotId: string, filter: PhotoFilter) => {
    if (!selectedPageId) return
    updatePhotoSlotField(selectedPageId, slotId, { filter })
  }

  const setSlotEnhance = (slotId: string, enhance: PhotoEnhance) => {
    if (!selectedPageId) return
    updatePhotoSlotField(selectedPageId, slotId, { enhance })
  }
  
  const assignPhotoToSlot = (pageId: string, slotId: string, photo: typeof availablePhotos[0] | null) => {
    const newPages = pages.map(p => {
      if (p.id !== pageId) return p

      const existingSlotIndex = p.slots.findIndex(s => s.slotId === slotId)

      // Face-centered smart cropping: if we have a detected face for this
      // media, bias the initial offset so the face sits near the slot center.
      // Face bbox is normalized 0-1 (left/top/width/height). We compute the
      // face midpoint, then translate the percent-offset the existing
      // transform expects (range ~ -50..50, where 0 = centered). Falls back
      // to center-crop (0,0) when no face data is present.
      let initialOffsetX = 0
      let initialOffsetY = 0
      if (photo) {
        const face = mediaFaces.get(photo.mediaId)
        if (face && face.width > 0 && face.height > 0) {
          const faceCenterX = face.x + face.width / 2 // 0..1
          const faceCenterY = face.y + face.height / 2 // 0..1
          // Convert "where in the image the face is" to a translate that
          // moves that point toward the slot center. Deltas from 0.5 are
          // scaled into the same -50..50 space used by drag handlers, but
          // clamped to -25..25 to avoid extreme crops.
          initialOffsetX = Math.max(-25, Math.min(25, (0.5 - faceCenterX) * 100))
          initialOffsetY = Math.max(-25, Math.min(25, (0.5 - faceCenterY) * 100))
        }
      }

      const newSlot = photo ? {
        slotId,
        type: 'photo' as const,
        memoryId: photo.memoryId,
        mediaId: photo.mediaId,
        fileUrl: photo.fileUrl,
        cropZoom: { scale: 1, offsetX: initialOffsetX, offsetY: initialOffsetY }
      } : null

      if (existingSlotIndex >= 0) {
        if (newSlot) {
          const newSlots = [...p.slots]
          newSlots[existingSlotIndex] = newSlot
          return { ...p, slots: newSlots }
        } else {
          return { ...p, slots: p.slots.filter((_, i) => i !== existingSlotIndex) }
        }
      } else if (newSlot) {
        return { ...p, slots: [...p.slots, newSlot] }
      }
      return p
    })
    setPages(newPages)
    saveHistory(newPages)
  }
  
  const addQRToPage = (
    pageId: string,
    target: { memoryId?: string; wisdomId?: string }
  ) => {
    setPages(pages.map(p => {
      if (p.id !== pageId) return p
      return {
        ...p,
        slots: [...p.slots.filter(s => s.type !== 'qr'), {
          slotId: 'qr-code',
          type: 'qr' as const,
          qrMemoryId: target.memoryId,
          qrWisdomId: target.wisdomId,
        }]
      }
    }))
    setShowQRPicker(false)
  }
  
  return (
    <>
    {/* Mobile simplified view */}
    <div className="block md:hidden">
      <div className="rounded-2xl bg-[#F5F0EA] border border-[#DDE3DF] p-6 text-center">
        <Monitor className="w-12 h-12 mx-auto text-[#406A56] mb-4" />
        <h3 className="text-lg font-semibold text-[#1A1F1C] mb-2">Desktop Recommended</h3>
        <p className="text-[#5A6660] text-sm mb-6">
          For the best book-making experience, use a tablet or desktop. You can still select photos and layouts on mobile.
        </p>

        {/* Simplified mobile controls */}
        <div className="space-y-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#1A1F1C]">Pages</span>
            <span className="text-sm text-[#94A09A]">{pages.length} total</span>
          </div>

          {/* Auto-arrange button for mobile */}
          <button
            onClick={onAutoArrange}
            className="w-full py-3 bg-[#406A56] text-white rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            Auto-Arrange Photos
          </button>

          {/* Simple page list */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {pages.map((page) => {
              const template = getTemplateById(page.layoutId)
              const firstPhoto = page.slots.find(s => s.type === 'photo')
              return (
                <div
                  key={page.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#DDE3DF]"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#F0F0EC] flex-shrink-0">
                    {firstPhoto?.fileUrl ? (
                      <img src={firstPhoto.fileUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#94A09A] text-sm font-bold">
                        {page.pageNumber}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F1C]">Page {page.pageNumber}</p>
                    <p className="text-xs text-[#94A09A] truncate">{template?.name || 'Empty'}</p>
                  </div>
                  <button
                    onClick={() => removePage(page.id)}
                    className="p-2 text-[#B8562E] hover:bg-[#B8562E]/10 rounded-lg flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Add page on mobile */}
          <button
            onClick={() => addPage('full-photo')}
            className="w-full py-3 border border-[#406A56] text-[#406A56] rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Page
          </button>

          {/* Undo / Redo row */}
          <div className="flex gap-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="flex-1 py-2 border border-[#DDE3DF] rounded-xl text-[#406A56] text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-30"
            >
              <Undo2 className="w-4 h-4" /> Undo
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="flex-1 py-2 border border-[#DDE3DF] rounded-xl text-[#406A56] text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-30"
            >
              <Redo2 className="w-4 h-4" /> Redo
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Desktop editor */}
    <div className="hidden md:flex gap-6 h-[calc(100vh-280px)] min-h-[600px]">
      {/* Left Sidebar - Page Thumbnails */}
      <div className="w-48 flex-shrink-0 bg-[#F5F0EA]/50 rounded-2xl p-4 overflow-y-auto">
        {/* Header with select all/none */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-[#406A56] text-sm">Pages</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllPages}
              className="text-xs text-[#5A6660] hover:text-[#406A56]"
              title="Select All"
            >
              All
            </button>
            <span className="text-[#94A09A]">|</span>
            <button
              onClick={deselectAllPages}
              className="text-xs text-[#5A6660] hover:text-[#406A56]"
              title="Deselect All"
            >
              None
            </button>
            <span className="text-xs text-[#94A09A] ml-1">{pages.length}</span>
          </div>
        </div>

        {/* Bulk action buttons */}
        {selectedPageIds.size > 0 && (
          <div className="flex gap-1 mb-3">
            <button
              onClick={duplicateSelectedPages}
              className="flex-1 py-1.5 px-2 bg-[#406A56]/10 hover:bg-[#406A56]/20 rounded-lg text-[#406A56] text-xs font-medium flex items-center justify-center gap-1 transition-colors"
              title="Duplicate Selected"
            >
              <Copy className="w-3 h-3" />
              Dup
            </button>
            <button
              onClick={deleteSelectedPages}
              className="flex-1 py-1.5 px-2 bg-[#B8562E]/10 hover:bg-[#B8562E]/20 rounded-lg text-[#B8562E] text-xs font-medium flex items-center justify-center gap-1 transition-colors"
              title="Delete Selected"
            >
              <Trash2 className="w-3 h-3" />
              Del
            </button>
          </div>
        )}

        <Reorder.Group
          axis="y"
          values={pages}
          onReorder={(newPages) => {
            newPages.forEach((p, i) => p.pageNumber = i + 1)
            setPages(newPages)
            saveHistory(newPages)
          }}
          className="space-y-3"
        >
          {pages.map((page, index) => {
            const template = getTemplateById(page.layoutId)
            const firstPhoto = page.slots.find(s => s.type === 'photo')
            const isSelected = selectedPageIds.has(page.id)

            return (
              <Reorder.Item
                key={page.id}
                value={page}
                className={`group relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  selectedPageId === page.id && !isSelected
                    ? 'border-[#406A56] ring-1 ring-[#406A56]/20'
                    : isSelected
                    ? 'border-[#406A56] ring-2 ring-[#406A56]/30'
                    : 'border-[#DDE3DF] hover:border-[#DDE3DF]'
                }`}
                onClick={(e) => {
                  const isCtrlClick = e.ctrlKey || e.metaKey
                  const isShiftClick = e.shiftKey
                  handlePageSelect(page.id, index, isCtrlClick, isShiftClick)
                }}
              >
                {/* Checkbox overlay */}
                <div className="absolute top-1 left-1 z-10">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#406A56] border-[#406A56]'
                        : 'bg-white/90 border-[#DDE3DF] opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>

                <div 
                  className="aspect-square"
                  style={{ background: page.background || template?.background || '#ffffff' }}
                >
                  {firstPhoto?.fileUrl ? (
                    <img
                      src={firstPhoto.fileUrl}
                      alt={`Page ${page.pageNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#94A09A]">
                      <span className="text-2xl font-bold">{page.pageNumber}</span>
                      <span className="text-xs">{template?.name || 'Empty'}</span>
                    </div>
                  )}
                </div>

                {/* Drag handle */}
                <div className="absolute top-1 left-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4 text-white drop-shadow-lg" />
                </div>

                {/* Page number */}
                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/50 rounded text-white text-xs">
                  {page.pageNumber}
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removePage(page.id) }}
                  className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-[#B8562E] rounded text-white hover:bg-[#B8562E]/90"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* QR indicator */}
                {page.slots.some(s => s.type === 'qr') && (
                  <div className="absolute bottom-1 left-1 p-1 bg-[#406A56] rounded">
                    <QrCode className="w-3 h-3 text-white" />
                  </div>
                )}
              </Reorder.Item>
            )
          })}
        </Reorder.Group>

        {/* Add Page Button */}
        <button
          onClick={() => {
            setLayoutPickerMode('add')
            setShowLayoutPicker(true)
          }}
          className="w-full mt-4 aspect-square rounded-lg border-2 border-dashed border-[#DDE3DF] hover:border-[#406A56]/50 hover:bg-[#406A56]/5 flex flex-col items-center justify-center text-[#94A09A] hover:text-[#406A56] transition-all"
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs mt-1">Add Page</span>
        </button>

        {/* Auto-Arrange Button */}
        <button
          onClick={onAutoArrange}
          className="w-full mt-3 py-2 rounded-lg bg-[#406A56]/10 hover:bg-[#406A56]/20 text-[#406A56] text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Wand2 className="w-4 h-4" />
          Auto-Arrange
        </button>
      </div>
      
      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Unified Editor Toolbar — calm, grouped, single row when it fits.
            Groups (with subtle dividers): [Layout/QR] | [Text/Sticker/Background]
            | [Safety lines] | [Themes/Cover] | [Preview/Check colors/Versions]
            | [Undo/Redo]. */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-y-2">
          <div className="flex items-center flex-wrap gap-2">
            {/* Group 1 — Page actions */}
            <button
              onClick={() => {
                setLayoutPickerMode('change')
                setShowLayoutPicker(true)
              }}
              className="min-h-[44px] px-3 rounded-lg bg-[#406A56]/10 hover:bg-[#406A56]/20 text-[#406A56] text-sm font-medium flex items-center gap-2"
            >
              <Layout className="w-4 h-4" />
              Change Layout
            </button>
            <button
              onClick={() => setShowQRPicker(true)}
              className="min-h-[44px] px-3 rounded-lg bg-[#406A56]/10 hover:bg-[#406A56]/20 text-[#406A56] text-sm font-medium flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Add QR Code
            </button>

            <div className="w-px h-6 bg-[#DDE3DF] mx-1" aria-hidden="true" />

            {/* Group 2 — Design tools */}
            <button
              type="button"
              onClick={addTextOverlay}
              disabled={!selectedPage}
              className="min-h-[44px] px-3 rounded-lg bg-[#406A56]/10 hover:bg-[#406A56]/20 text-[#406A56] text-sm font-medium flex items-center gap-2 disabled:opacity-40"
              aria-label="Add text"
            >
              <Type className="w-4 h-4" />
              Add text
            </button>
            <button
              type="button"
              onClick={() => setShowStickerPicker(true)}
              disabled={!selectedPage}
              className="min-h-[44px] px-3 rounded-lg bg-[#406A56]/10 hover:bg-[#406A56]/20 text-[#406A56] text-sm font-medium flex items-center gap-2 disabled:opacity-40"
              aria-label="Add sticker"
            >
              <Star className="w-4 h-4" />
              Add sticker
            </button>
            <button
              type="button"
              onClick={() => setShowBackgroundPickerV2(true)}
              disabled={!selectedPage}
              className="min-h-[44px] px-3 rounded-lg bg-[#406A56]/10 hover:bg-[#406A56]/20 text-[#406A56] text-sm font-medium flex items-center gap-2 disabled:opacity-40"
              aria-label="Open background picker"
            >
              <Palette className="w-4 h-4" />
              Background
            </button>
            <button
              type="button"
              onClick={() => setShowIdeaPagePicker(true)}
              className="min-h-[44px] px-3 rounded-lg bg-[#406A56]/10 hover:bg-[#406A56]/20 text-[#406A56] text-sm font-medium flex items-center gap-2"
              aria-label="Open idea pages"
              title="Browse curated full-page designs"
            >
              <FileText className="w-4 h-4" />
              Idea pages
            </button>

            <div className="w-px h-6 bg-[#DDE3DF] mx-1" aria-hidden="true" />

            {/* Group 3 — Safety lines */}
            <button
              onClick={() => setShowSafetyLines(v => !v)}
              aria-pressed={showSafetyLines}
              title="Show safety lines — bleed and safe zone guides for print"
              className={`min-h-[44px] px-3 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                showSafetyLines
                  ? 'bg-[#406A56] text-white'
                  : 'bg-[#406A56]/10 hover:bg-[#406A56]/20 text-[#406A56]'
              }`}
            >
              <Shield className="w-4 h-4" />
              {showSafetyLines ? 'Hide safety lines' : 'Show safety lines'}
            </button>

            <div className="w-px h-6 bg-[#DDE3DF] mx-1" aria-hidden="true" />

            {/* Group 4 — Themes / Cover */}
            <button
              type="button"
              onClick={onOpenThemes}
              className="min-h-[44px] px-3 rounded-lg bg-white border border-[#DDE3DF] hover:border-[#406A56] text-[#2A3E33] text-sm font-medium flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#C35F33]" /> Themes
            </button>
            <button
              type="button"
              onClick={onOpenCover}
              className="min-h-[44px] px-3 rounded-lg bg-white border border-[#DDE3DF] hover:border-[#406A56] text-[#2A3E33] text-sm font-medium flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-[#406A56]" /> Cover
            </button>

            <div className="w-px h-6 bg-[#DDE3DF] mx-1" aria-hidden="true" />

            {/* Group 5 — Preview / Check colors / Versions */}
            <button
              type="button"
              onClick={onOpenPreview}
              className="min-h-[44px] px-3 rounded-lg bg-white border border-[#DDE3DF] hover:border-[#406A56] text-[#2A3E33] text-sm font-medium flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-[#406A56]" /> Preview as book
            </button>
            <button
              type="button"
              onClick={onOpenCmyk}
              className="min-h-[44px] px-3 rounded-lg bg-white border border-[#DDE3DF] hover:border-[#406A56] text-[#2A3E33] text-sm font-medium flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-[#C35F33]" /> Check colors
            </button>
            <button
              type="button"
              onClick={onOpenVersions}
              className="min-h-[44px] px-3 rounded-lg bg-white border border-[#DDE3DF] hover:border-[#406A56] text-[#2A3E33] text-sm font-medium flex items-center gap-2"
            >
              <Undo2 className="w-4 h-4 text-[#406A56]" /> Versions
            </button>

            <div className="w-px h-6 bg-[#DDE3DF] mx-1" aria-hidden="true" />

            {/* Group 6 — Undo/Redo */}
            <div className="flex items-center gap-1">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="min-h-[44px] px-2 rounded-lg text-[#406A56] hover:bg-[#406A56]/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
                <span className="text-xs">Undo</span>
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="min-h-[44px] px-2 rounded-lg text-[#406A56] hover:bg-[#406A56]/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
                <span className="text-xs">Redo</span>
              </button>
            </div>
          </div>
          <div className="text-sm text-[#5A6660]">
            {availablePhotos.length - usedMediaIds.size} photos available
          </div>
        </div>

        {/* Text overlay format toolbar — anchored slot ABOVE the page canvas
            so it never obscures content. Animates in/out smoothly when a text
            overlay is selected. */}
        <AnimatePresence initial={false}>
          {(() => {
            if (!selectedPage || !selectedOverlayId) return null
            const ov = (selectedPage.overlays ?? []).find(o => o.id === selectedOverlayId)
            if (!ov || ov.type !== 'text') return null
            return (
              <motion.div
                key="text-overlay-toolbar-slot"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="overflow-hidden flex justify-center -mb-px"
              >
                <TextOverlayToolbar
                  overlay={ov}
                  onChange={(next) => updateOverlay(selectedPage.id, next, false)}
                  onCommit={() => saveHistory(pages)}
                  onDelete={() => deleteOverlay(selectedPage.id, ov.id)}
                />
              </motion.div>
            )
          })()}
        </AnimatePresence>
        
        {/* Text Formatting Toolbar */}
        {activeTextSlotId && selectedPageId && activeStyle && (
          <div 
            className="text-toolbar flex items-center gap-2 mb-4 p-3 bg-white rounded-xl shadow-sm border border-[#DDE3DF] flex-wrap"
          >
            {/* Font Family */}
            <select
              value={activeStyle.fontFamily}
              onChange={(e) => updateTextStyle(selectedPageId!, activeTextSlotId!, { fontFamily: e.target.value })}
              className="px-2 py-1.5 bg-[#F5F0EA] border border-[#DDE3DF] rounded-lg text-sm text-[#406A56] focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 cursor-pointer"
            >
              {FONT_FAMILIES.map(f => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
              ))}
            </select>
            
            {/* Font Size */}
            <select
              value={activeStyle.fontSize}
              onChange={(e) => updateTextStyle(selectedPageId!, activeTextSlotId!, { fontSize: e.target.value })}
              className="px-2 py-1.5 bg-[#F5F0EA] border border-[#DDE3DF] rounded-lg text-sm text-[#406A56] focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 cursor-pointer"
            >
              {FONT_SIZES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#406A56]/20" />
            
            {/* Bold */}
            <button
              onClick={() => updateTextStyle(selectedPageId, activeTextSlotId, { 
                fontWeight: activeStyle.fontWeight === 'bold' ? 'normal' : 'bold' 
              })}
              className={`p-1.5 rounded-lg transition-colors ${
                activeStyle.fontWeight === 'bold' 
                  ? 'bg-[#406A56] text-white' 
                  : 'bg-[#F5F0EA] text-[#406A56] hover:bg-[#406A56]/10'
              }`}
              title="Bold"
            >
              <span className="font-bold text-sm w-5 h-5 flex items-center justify-center">B</span>
            </button>
            
            {/* Italic */}
            <button
              onClick={() => updateTextStyle(selectedPageId, activeTextSlotId, { 
                fontStyle: activeStyle.fontStyle === 'italic' ? 'normal' : 'italic' 
              })}
              className={`p-1.5 rounded-lg transition-colors ${
                activeStyle.fontStyle === 'italic' 
                  ? 'bg-[#406A56] text-white' 
                  : 'bg-[#F5F0EA] text-[#406A56] hover:bg-[#406A56]/10'
              }`}
              title="Italic"
            >
              <span className="italic text-sm w-5 h-5 flex items-center justify-center">I</span>
            </button>
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#406A56]/20" />
            
            {/* Alignment */}
            <div className="flex bg-[#F5F0EA] rounded-lg p-0.5">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => updateTextStyle(selectedPageId, activeTextSlotId, { textAlign: align })}
                  className={`p-1.5 rounded transition-colors ${
                    activeStyle.textAlign === align 
                      ? 'bg-[#406A56] text-white' 
                      : 'text-[#406A56] hover:bg-[#406A56]/10'
                  }`}
                  title={`Align ${align}`}
                >
                  <span className="text-xs w-5 h-5 flex items-center justify-center">
                    {align === 'left' ? '⫷' : align === 'center' ? '☰' : '⫸'}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#406A56]/20" />
            
            {/* Text Color */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#5A6660]">Color:</span>
              <div className="flex gap-1">
                {TEXT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateTextStyle(selectedPageId, activeTextSlotId, { color })}
                    className={`w-5 h-5 rounded border-2 transition-all ${
                      activeStyle.color === color
                        ? 'border-[#406A56] scale-110'
                        : 'border-transparent hover:border-[#DDE3DF]'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* F2: AI caption suggester — only shown when this page has at
                least one photo with a real mediaId (no metadata otherwise). */}
            {(() => {
              if (!projectId) return null
              const page = pages.find((p) => p.id === selectedPageId)
              const photoSlot = page?.slots.find((s) => s.type === 'photo' && s.mediaId && s.fileUrl)
              if (!photoSlot?.mediaId) return null
              return (
                <>
                  <div className="w-px h-6 bg-[#406A56]/20" />
                  <AICaptionSuggester
                    projectId={projectId}
                    mediaId={photoSlot.mediaId}
                    onApply={(text) => setTextContent(selectedPageId!, activeTextSlotId!, text)}
                  />
                </>
              )
            })()}
          </div>
        )}
        
        {/* Page Canvas */}
        <div className="flex-1 bg-[#406A56]/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-3">
          {selectedPage && selectedTemplate ? (
            <div 
              className="relative shadow-2xl"
              style={{ 
                width: '100%',
                maxWidth: 500,
                aspectRatio: '1/1',
                background: backgroundToCss(selectedPage.backgroundV2) || selectedPage.background || selectedTemplate.background || '#ffffff',
              }}
              ref={pageCanvasRef}
              onClick={(e) => {
                // Clicking on empty canvas deselects any overlay
                if (e.target === e.currentTarget) setSelectedOverlayId(null)
              }}
            >
              {/* Render slots */}
              {selectedTemplate.slots.map((slot) => {
                const pageSlot = selectedPage.slots.find(s => s.slotId === slot.id)
                const style: React.CSSProperties = {
                  position: 'absolute',
                  left: `${slot.position.x}%`,
                  top: `${slot.position.y}%`,
                  width: `${slot.position.width}%`,
                  height: `${slot.position.height}%`,
                }
                
                if (slot.type === 'photo') {
                  const cropZoom = pageSlot?.cropZoom || { scale: 1, offsetX: 0, offsetY: 0 }
                  const isCropZoomActive = cropZoomSlotId === slot.id

                  return (
                    <div
                      key={slot.id}
                      style={style}
                      className={`bg-[#F0F0EC] cursor-pointer hover:ring-2 hover:ring-[#406A56] transition-all overflow-hidden group relative ${
                        isCropZoomActive ? 'ring-2 ring-[#406A56]' : ''
                      }`}
                      onClick={() => {
                        if (!pageSlot?.fileUrl) {
                          // Open photo picker for this slot
                          setActiveSlotId(slot.id)
                          setShowPhotoPicker(true)
                        }
                      }}
                    >
                      {pageSlot?.fileUrl ? (
                        <>
                          {/* Photo with crop/zoom transforms */}
                          <div
                            className="w-full h-full relative"
                            onMouseDown={(e) => {
                              if (cropZoomSlotId === slot.id) {
                                handleDragStart(e)
                              }
                            }}
                            onMouseMove={handleDragMove}
                            onMouseUp={handleDragEnd}
                            onMouseLeave={handleDragEnd}
                          >
                            <img
                              src={pageSlot.fileUrl}
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-100"
                              style={{
                                transform: `scale(${cropZoom.scale}) translate(${cropZoom.offsetX}%, ${cropZoom.offsetY}%)`,
                                transformOrigin: 'center center',
                                cursor: cropZoomSlotId === slot.id ? (isDragging ? 'grabbing' : 'grab') : 'pointer'
                              }}
                              draggable={false}
                            />
                          </div>

                          {/* Auto QR Code - bottom right corner */}
                          {pageSlot.memoryId && (
                            <div className="absolute bottom-2 right-2 bg-white p-1 rounded shadow-lg">
                              <QrCode className="w-8 h-8 text-[#406A56]" />
                            </div>
                          )}

                          {/* Photo controls overlay */}
                          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Crop/Zoom button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (cropZoomSlotId === slot.id) {
                                  closeCropZoom()
                                } else {
                                  startCropZoom(selectedPage.id, slot.id)
                                }
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                cropZoomSlotId === slot.id
                                  ? 'bg-[#406A56] text-white'
                                  : 'bg-white/90 text-[#406A56] hover:bg-white'
                              }`}
                              title="Crop & Zoom"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>

                            {/* Effects button (Border + Filter popover) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (photoToolsSlotId === slot.id) {
                                  setPhotoToolsSlotId(null)
                                  setPhotoToolsMenu(null)
                                } else {
                                  setPhotoToolsSlotId(slot.id)
                                  setPhotoToolsMenu(null)
                                }
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                photoToolsSlotId === slot.id
                                  ? 'bg-[#406A56] text-white'
                                  : 'bg-white/90 text-[#406A56] hover:bg-white'
                              }`}
                              title="Border & Filter"
                              aria-label="Border and filter effects"
                            >
                              <Frame className="w-4 h-4" />
                            </button>

                            {/* Remove photo button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                assignPhotoToSlot(selectedPage.id, slot.id, null)
                                if (cropZoomSlotId === slot.id) {
                                  setCropZoomSlotId(null)
                                }
                              }}
                              className="p-1.5 bg-white/90 rounded text-[#B8562E] hover:bg-white hover:text-[#B8562E]/90 transition-colors"
                              title="Remove Photo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Crop/Zoom Controls Panel */}
                          {isCropZoomActive && (
                            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-3 border-t border-[#DDE3DF]">
                              <div className="space-y-2">
                                {/* Zoom slider */}
                                <div className="flex items-center gap-2">
                                  <ZoomOut className="w-3 h-3 text-[#406A56]" />
                                  <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.05"
                                    value={cropZoomValues.scale}
                                    onChange={(e) => {
                                      const newScale = parseFloat(e.target.value)
                                      updateCropZoom(selectedPage.id, slot.id, { scale: newScale })
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 h-1.5 bg-[#406A56]/20 rounded-lg appearance-none cursor-pointer accent-[#406A56]"
                                  />
                                  <ZoomIn className="w-3 h-3 text-[#406A56]" />
                                  <span className="text-xs text-[#406A56] w-10 text-right">
                                    {cropZoomValues.scale.toFixed(1)}x
                                  </span>
                                </div>

                                {/* Position info */}
                                <div className="flex items-center justify-between text-xs text-[#5A6660]">
                                  <span className="flex items-center gap-1">
                                    <Move className="w-3 h-3" />
                                    Drag to reposition
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      updateCropZoom(selectedPage.id, slot.id, { scale: 1, offsetX: 0, offsetY: 0 })
                                    }}
                                    className="text-[#406A56] hover:underline"
                                  >
                                    Reset
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Border + Filter popover (PR 2). Anchored top-right
                              under the controls; small (≤200px wide) so it
                              doesn't dominate the slot. */}
                          {photoToolsSlotId === slot.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-2 right-12 z-20 bg-white shadow-xl border border-[#DDE3DF] rounded-lg p-2 w-[220px]"
                            >
                              <div className="flex gap-1 mb-2">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setPhotoToolsMenu('border') }}
                                  aria-pressed={photoToolsMenu === 'border'}
                                  className={`flex-1 min-h-[36px] px-1.5 rounded text-[11px] font-medium flex items-center justify-center gap-1 ${
                                    photoToolsMenu === 'border'
                                      ? 'bg-[#406A56] text-white'
                                      : 'bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20'
                                  }`}
                                >
                                  <Frame className="w-3.5 h-3.5" /> Border
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setPhotoToolsMenu('filter') }}
                                  aria-pressed={photoToolsMenu === 'filter'}
                                  className={`flex-1 min-h-[36px] px-1.5 rounded text-[11px] font-medium flex items-center justify-center gap-1 ${
                                    photoToolsMenu === 'filter'
                                      ? 'bg-[#406A56] text-white'
                                      : 'bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20'
                                  }`}
                                >
                                  <FilterIcon className="w-3.5 h-3.5" /> Filter
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setPhotoToolsMenu('adjust') }}
                                  aria-pressed={photoToolsMenu === 'adjust'}
                                  className={`flex-1 min-h-[36px] px-1.5 rounded text-[11px] font-medium flex items-center justify-center gap-1 ${
                                    photoToolsMenu === 'adjust'
                                      ? 'bg-[#406A56] text-white'
                                      : 'bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20'
                                  }`}
                                >
                                  Adjust
                                </button>
                              </div>

                              {photoToolsMenu === 'border' && (
                                <BorderMenu
                                  current={pageSlot?.border?.style ?? 'none'}
                                  onPick={(style) => setSlotBorder(slot.id, style)}
                                />
                              )}
                              {photoToolsMenu === 'filter' && (
                                <FilterMenu
                                  photoUrl={pageSlot.fileUrl}
                                  current={pageSlot?.filter ?? 'original'}
                                  onPick={(f) => setSlotFilter(slot.id, f)}
                                />
                              )}
                              {photoToolsMenu === 'adjust' && (
                                <AdjustMenu
                                  current={pageSlot?.enhance}
                                  onChange={(enhance) => setSlotEnhance(slot.id, enhance)}
                                />
                              )}
                              {photoToolsMenu === null && (
                                <p className="text-[11px] text-[#5A6660] px-1 py-2">
                                  Pick Border, Filter, or Adjust above.
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#94A09A]">
                          <Plus className="w-8 h-8" />
                          <span className="text-xs mt-1">Click to add</span>
                        </div>
                      )}
                    </div>
                  )
                }

                if (slot.type === 'text') {
                  const textStyle = getTextStyle(selectedPage.id, slot.id)
                  const isActive = activeTextSlotId === slot.id
                  
                  return (
                    <div
                      key={slot.id}
                      style={style}
                      className={`flex items-center justify-center p-2 transition-all ${
                        isActive ? 'ring-2 ring-[#406A56] ring-offset-2 bg-white/50' : ''
                      }`}
                    >
                      <textarea
                        value={getTextContent(selectedPage.id, slot.id)}
                        onChange={(e) => setTextContent(selectedPage.id, slot.id, e.target.value)}
                        onFocus={() => setActiveTextSlotId(slot.id)}
                        onBlur={(e) => {
                          // Check if focus moved to toolbar element - if so, don't close
                          const relatedTarget = e.relatedTarget as HTMLElement
                          const isToolbarClick = relatedTarget?.closest('.text-toolbar')
                          
                          if (!isToolbarClick) {
                            // Keep toolbar visible longer to allow dropdown interaction
                            setTimeout(() => {
                              setActiveTextSlotId(prev => prev === slot.id ? null : prev)
                            }, 500)
                          }
                        }}
                        placeholder={slot.placeholder || 'Click to add text...'}
                        className="w-full h-full resize-none bg-transparent focus:outline-none cursor-text"
                        style={{
                          fontFamily: textStyle.fontFamily,
                          fontSize: `${getFontSizePx(textStyle.fontSize)}px`,
                          fontWeight: textStyle.fontWeight,
                          fontStyle: textStyle.fontStyle,
                          textAlign: textStyle.textAlign,
                          color: textStyle.color,
                          lineHeight: 1.4,
                        }}
                      />
                    </div>
                  )
                }
                
                if (slot.type === 'qr') {
                  const qrSlot = selectedPage.slots.find(s => s.type === 'qr')
                  const qrUrl = qrSlot?.qrWisdomId
                    ? buildQRTargetUrl({ wisdomId: qrSlot.qrWisdomId }, shareTokenMap)
                    : qrSlot?.qrMemoryId
                      ? buildQRTargetUrl({ memoryId: qrSlot.qrMemoryId }, shareTokenMap)
                      : null
                  return (
                    <div
                      key={slot.id}
                      style={style}
                      className="flex items-center justify-center bg-[#F0F0EC]"
                    >
                      {qrUrl ? (
                        <div className="text-center">
                          <QRPreview value={qrUrl} size={96} alt="QR code preview" />
                          <span className="text-xs text-[#5A6660] mt-2 block">
                            {qrSlot?.qrWisdomId ? 'Wisdom QR' : 'Memory QR'}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowQRPicker(true)}
                          className="text-[#94A09A] hover:text-[#406A56] flex flex-col items-center gap-1"
                        >
                          <QrCode className="w-12 h-12" />
                          <span className="text-xs font-medium">Add QR code</span>
                        </button>
                      )}
                    </div>
                  )
                }

                return null
              })}

              {/* Print-safe-zone overlay (toggle in toolbar). Uses the same
                  3mm bleed / 6mm safe-zone constants as renderExport. Bleed
                  is drawn in Terra Cotta; the safe zone in YT Green. */}
              {showSafetyLines && selectedProduct && (() => {
                const dims = parsePrintInches(selectedProduct.size)
                const bleedMm = 3
                const safeMm = 6
                const bleedPctX = (bleedMm / 25.4) / dims.width * 100
                const bleedPctY = (bleedMm / 25.4) / dims.height * 100
                const safePctX = (safeMm / 25.4) / dims.width * 100
                const safePctY = (safeMm / 25.4) / dims.height * 100
                return (
                  <>
                    <div
                      aria-hidden
                      className="pointer-events-none absolute"
                      style={{
                        left: `${bleedPctX}%`,
                        top: `${bleedPctY}%`,
                        right: `${bleedPctX}%`,
                        bottom: `${bleedPctY}%`,
                        border: '2px dashed #C35F33',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute"
                      style={{
                        left: `${safePctX}%`,
                        top: `${safePctY}%`,
                        right: `${safePctX}%`,
                        bottom: `${safePctY}%`,
                        border: '2px dashed #406A56',
                        boxSizing: 'border-box',
                      }}
                    />
                  </>
                )
              })()}

              {/* Page overlays (text + stickers) — rendered above template slots. */}
              {(selectedPage.overlays ?? []).map((overlay) => {
                if (overlay.type === 'text') {
                  return (
                    <TextEditor
                      key={overlay.id}
                      overlay={overlay}
                      selected={selectedOverlayId === overlay.id}
                      onSelect={() => setSelectedOverlayId(overlay.id)}
                      onChange={(next) => updateOverlay(selectedPage.id, next, false)}
                      onCommit={() => saveHistory(pages)}
                      onDelete={() => deleteOverlay(selectedPage.id, overlay.id)}
                      pageSize={pageCanvasSize}
                    />
                  )
                }
                // Sticker overlay (rendered with a small inline handler)
                return (
                  <StickerOverlayView
                    key={overlay.id}
                    overlay={overlay}
                    selected={selectedOverlayId === overlay.id}
                    onSelect={() => setSelectedOverlayId(overlay.id)}
                    onChange={(next) => updateOverlay(selectedPage.id, next, false)}
                    onCommit={() => saveHistory(pages)}
                    onDelete={() => deleteOverlay(selectedPage.id, overlay.id)}
                    pageSize={pageCanvasSize}
                  />
                )
              })}
            </div>
          ) : (
            <div className="text-center text-[#94A09A]">
              <Layout className="w-16 h-16 mx-auto mb-4" />
              <p>Select a page to edit</p>
            </div>
          )}

          {/* Safety-line legend — sits BELOW the page so it never covers the
              composition. Only shown when the safety-line toggle is on. */}
          <AnimatePresence>
            {showSafetyLines && selectedPage && selectedTemplate && (
              <motion.div
                key="safety-legend"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-3 bg-white border border-[#DDE3DF] rounded-full px-4 py-2 text-xs shadow-sm"
                style={{ fontFamily: 'var(--font-inter-tight), Inter, sans-serif' }}
                aria-label="Print safety lines legend"
              >
                <span className="flex items-center gap-1.5 text-[#C35F33]">
                  <span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-[#C35F33]" />
                  Bleed (3mm)
                </span>
                <span aria-hidden className="text-[#94A09A]">·</span>
                <span className="flex items-center gap-1.5 text-[#406A56]">
                  <span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-[#406A56]" />
                  Safe zone (6mm)
                </span>
                <span aria-hidden className="text-[#94A09A]">·</span>
                <span className="text-[#5A6660]">Keep important content inside the green line</span>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Sticker + Background V2 panels */}
        <StickerPicker
          open={showStickerPicker}
          onClose={() => setShowStickerPicker(false)}
          onPick={addStickerOverlay}
        />
        <BackgroundPickerV2
          open={showBackgroundPickerV2}
          onClose={() => setShowBackgroundPickerV2(false)}
          current={selectedPage?.backgroundV2 ?? null}
          onApply={applyBackgroundV2}
        />
        <IdeaPagePicker
          open={showIdeaPagePicker}
          onClose={() => setShowIdeaPagePicker(false)}
          hasSelectedPage={!!selectedPage}
          onApply={applyIdeaPage}
        />
      </div>
      
      {/* Right Sidebar - Photo Library */}
      <div className="w-56 flex-shrink-0 bg-[#F5F0EA]/50 rounded-2xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#406A56] text-sm">Photos</h3>
          <span className="text-xs text-[#5A6660]">
            {availablePhotos.filter(p => !usedMediaIds.has(p.mediaId)).length} available
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {availablePhotos.map((photo) => {
            const isUsed = usedMediaIds.has(photo.mediaId)
            return (
              <div
                key={photo.mediaId}
                onClick={() => {
                  if (!isUsed && selectedPage) {
                    // Find first empty photo slot
                    const template = getTemplateById(selectedPage.layoutId)
                    const photoSlots = template?.slots.filter(s => s.type === 'photo') || []
                    const emptySlot = photoSlots.find(slot => 
                      !selectedPage.slots.find(s => s.slotId === slot.id && s.fileUrl)
                    )
                    if (emptySlot) {
                      assignPhotoToSlot(selectedPage.id, emptySlot.id, photo)
                    } else {
                      setActiveSlotId(photoSlots[0]?.id || null)
                      setShowPhotoPicker(true)
                    }
                  }
                }}
                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                  isUsed 
                    ? 'opacity-40 ring-2 ring-[#406A56]/30' 
                    : 'hover:ring-2 hover:ring-[#406A56]'
                }`}
                title={photo.memoryTitle}
              >
                <img
                  src={photo.fileUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {isUsed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {availablePhotos.length === 0 && (
          <div className="text-center py-8 text-[#94A09A]">
            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-xs">No photos yet</p>
          </div>
        )}
      </div>
      
      {/* Layout Picker Modal */}
      <AnimatePresence>
        {showLayoutPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowLayoutPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F5F0EA] rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#406A56]">Choose Layout</h3>
                <button
                  onClick={() => setShowLayoutPicker(false)}
                  className="p-2 hover:bg-[#406A56]/10 rounded-lg"
                >
                  <X className="w-5 h-5 text-[#406A56]" />
                </button>
              </div>
              
              {Object.entries(TEMPLATES_BY_CATEGORY).map(([category, templates]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-sm font-semibold text-[#5A6660] uppercase tracking-wide mb-3">
                    {category === 'single' ? 'Single Photo' : 
                     category === 'multi' ? 'Multiple Photos' : 'Special'}
                  </h4>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          if (layoutPickerMode === 'change' && selectedPage) {
                            updatePageLayout(selectedPage.id, template.id)
                          } else {
                            addPage(template.id)
                          }
                          setShowLayoutPicker(false)
                        }}
                        className="aspect-square bg-white rounded-xl p-3 hover:ring-2 hover:ring-[#406A56] transition-all group"
                      >
                        {/* Mini layout preview */}
                        <div className="w-full h-full relative bg-[#F0F0EC] rounded">
                          {template.slots.filter(s => s.type === 'photo').slice(0, 4).map((slot, i) => (
                            <div
                              key={i}
                              className="absolute bg-[#406A56]/20 rounded-sm"
                              style={{
                                left: `${slot.position.x}%`,
                                top: `${slot.position.y}%`,
                                width: `${slot.position.width}%`,
                                height: `${slot.position.height}%`,
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-[#406A56] mt-2 text-center group-hover:font-medium">
                          {template.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* QR Memory Picker Modal */}
      <AnimatePresence>
        {showQRPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowQRPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F5F0EA] rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#406A56]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>Add a QR Code</h3>
                  <p className="text-sm text-[#5A6660]">
                    Link this page to a memory or a wisdom entry. When scanned, the QR opens the digital version.
                  </p>
                </div>
                <button
                  onClick={() => setShowQRPicker(false)}
                  aria-label="Close QR picker"
                  className="p-2 hover:bg-[#406A56]/10 rounded-lg"
                >
                  <X className="w-5 h-5 text-[#406A56]" />
                </button>
              </div>

              {/* Tab selector: Memories | Wisdom & Advice */}
              <div className="flex gap-2 mb-4 bg-white/60 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setQrPickerTab('memories')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] flex items-center gap-2 transition-colors ${
                    qrPickerTab === 'memories'
                      ? 'bg-[#406A56] text-white'
                      : 'text-[#406A56] hover:bg-[#406A56]/10'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Memories ({selectedMemories.length})
                </button>
                <button
                  onClick={() => setQrPickerTab('wisdom')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] flex items-center gap-2 transition-colors ${
                    qrPickerTab === 'wisdom'
                      ? 'bg-[#406A56] text-white'
                      : 'text-[#406A56] hover:bg-[#406A56]/10'
                  }`}
                >
                  <Lightbulb className="w-4 h-4" />
                  Wisdom & Advice ({wisdomEntries.length})
                </button>
              </div>

              {/* Scan-size hint (geometry-based) */}
              {selectedProduct && (() => {
                // Find the QR slot percentage for the selected page, or use a
                // sensible default (25% of the smaller page dimension).
                const qrSlot = selectedTemplate?.slots.find(s => s.type === 'qr')
                const dims = parsePrintInches(selectedProduct.size)
                const qrPct = qrSlot
                  ? Math.min(qrSlot.position.width, qrSlot.position.height) / 100
                  : 0.25
                const printSizeIn = Math.min(dims.width, dims.height) * qrPct
                const ok = printSizeIn >= 0.75
                return (
                  <div
                    className={`mb-4 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                      ok ? 'bg-[#D3E1DF]/60 text-[#406A56]' : 'bg-[#F9E4D8] text-[#C35F33]'
                    }`}
                  >
                    {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span>
                      Prints at about {printSizeIn.toFixed(2)}". {ok
                        ? 'This QR will scan reliably at this size.'
                        : 'Too small — readers may struggle to scan. Consider a larger QR slot.'}
                    </span>
                  </div>
                )
              })()}

              {qrPickerTab === 'memories' && (
                selectedMemories.length === 0 ? (
                  <p className="text-sm text-[#5A6660] py-8 text-center">
                    No memories selected yet. Go back to Step 2 to pick some.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedMemories.map((memory) => {
                      const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
                      return (
                        <button
                          key={memory.id}
                          onClick={() => selectedPage && addQRToPage(selectedPage.id, { memoryId: memory.id })}
                          className="text-left bg-white rounded-xl overflow-hidden hover:ring-2 hover:ring-[#406A56] transition-all"
                        >
                          <div className="aspect-video bg-[#406A56]/10 relative">
                            {coverMedia?.file_url ? (
                              <img
                                src={coverMedia.file_url}
                                alt={memory.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-[#94A09A]" />
                              </div>
                            )}
                            <div className="absolute bottom-1 right-1 bg-white p-1 rounded shadow-sm">
                              <QRPreview
                                value={buildQRTargetUrl({ memoryId: memory.id }, shareTokenMap)}
                                size={32}
                                alt={`QR preview for ${memory.title}`}
                              />
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="font-medium text-[#406A56] text-sm truncate">{memory.title}</p>
                            <p className="text-xs text-[#94A09A]">
                              {memory.memory_media?.length || 0} photos
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              )}

              {qrPickerTab === 'wisdom' && (
                wisdomEntries.length === 0 ? (
                  <p className="text-sm text-[#5A6660] py-8 text-center">
                    No wisdom entries yet. Add some from the dashboard first.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {wisdomEntries.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => selectedPage && addQRToPage(selectedPage.id, { wisdomId: w.id })}
                        className="text-left bg-white rounded-xl p-3 hover:ring-2 hover:ring-[#406A56] transition-all flex gap-3"
                      >
                        <div className="flex-shrink-0 bg-[#F2F1E5] p-2 rounded-lg self-start">
                          <QRPreview
                            value={buildQRTargetUrl({ wisdomId: w.id }, shareTokenMap)}
                            size={48}
                            alt={`QR preview for wisdom ${w.prompt_text}`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#406A56] text-sm line-clamp-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                            {w.prompt_text}
                          </p>
                          {w.response_text && (
                            <p className="text-xs text-[#5A6660] line-clamp-2 mt-1">{w.response_text}</p>
                          )}
                          {w.category && (
                            <span className="inline-block mt-1 text-[11px] text-[#94A09A] uppercase tracking-wide">
                              {w.category}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Photo Picker Modal */}
      <AnimatePresence>
        {showPhotoPicker && activeSlotId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setShowPhotoPicker(false); setActiveSlotId(null) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F5F0EA] rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#406A56]">Select Photo</h3>
                  <p className="text-sm text-[#5A6660]">Choose a photo for this slot</p>
                </div>
                <button
                  onClick={() => { setShowPhotoPicker(false); setActiveSlotId(null) }}
                  className="p-2 hover:bg-[#406A56]/10 rounded-lg"
                >
                  <X className="w-5 h-5 text-[#406A56]" />
                </button>
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {availablePhotos.map((photo) => {
                  const isUsed = usedMediaIds.has(photo.mediaId)
                  
                  return (
                    <button
                      key={photo.mediaId}
                      onClick={() => {
                        if (selectedPage && activeSlotId) {
                          assignPhotoToSlot(selectedPage.id, activeSlotId, photo)
                          setShowPhotoPicker(false)
                          setActiveSlotId(null)
                        }
                      }}
                      disabled={isUsed}
                      className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                        isUsed 
                          ? 'opacity-40 cursor-not-allowed' 
                          : 'hover:ring-2 hover:ring-[#406A56] cursor-pointer'
                      }`}
                    >
                      <img
                        src={photo.fileUrl}
                        alt={photo.memoryTitle}
                        className="w-full h-full object-cover"
                      />
                      {isUsed && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Check className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-white text-xs truncate">{photo.memoryTitle}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              
              {availablePhotos.length === 0 && (
                <div className="text-center py-12 text-[#94A09A]">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No photos available</p>
                  <p className="text-sm">Select memories with photos in Step 2</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  )
}

// Step 4: Preview
function PreviewStep({
  pages,
  selectedMemories,
  product,
  shareTokenMap,
}: {
  pages: PageData[]
  selectedMemories: Memory[]
  product: Product
  shareTokenMap: Record<string, string>
}) {
  const [currentSpread, setCurrentSpread] = useState(0)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [lowResWarnings, setLowResWarnings] = useState<{ pageNum: number; slotId: string; recommended: number; actual?: number }[]>([])
  const totalSpreads = Math.ceil(pages.length / 2)

  // Calculate print dimensions at 300 DPI
  const getPrintDimensions = () => {
    // Parse size like "8x8" or "11x8"
    const sizeMatch = product.size.match(/(\d+)\s*×\s*(\d+)/)
    if (!sizeMatch) return { width: 8, height: 8, pixelWidth: 2400, pixelHeight: 2400 }

    const widthIn = parseInt(sizeMatch[1])
    const heightIn = parseInt(sizeMatch[2])
    return {
      width: widthIn,
      height: heightIn,
      pixelWidth: widthIn * 300,
      pixelHeight: heightIn * 300
    }
  }

  // Check for low resolution images
  useEffect(() => {
    const warnings: typeof lowResWarnings = []
    const dims = getPrintDimensions()

    pages.forEach(page => {
      page.slots.forEach(slot => {
        if (slot.type === 'photo' && slot.fileUrl) {
          // Estimate minimum recommended size (at 300 DPI)
          const template = getTemplateById(page.layoutId)
          const slotTemplate = template?.slots.find(s => s.id === slot.slotId)
          if (slotTemplate) {
            const slotWidthPx = Math.round((slotTemplate.position.width / 100) * dims.pixelWidth)
            const slotHeightPx = Math.round((slotTemplate.position.height / 100) * dims.pixelHeight)
            const recommendedPx = Math.max(slotWidthPx, slotHeightPx)

            warnings.push({
              pageNum: page.pageNumber,
              slotId: slot.slotId,
              recommended: recommendedPx
            })
          }
        }
      })
    })

    setLowResWarnings(warnings)
  }, [pages])
  
  const leftPage = pages[currentSpread * 2]
  const rightPage = pages[currentSpread * 2 + 1]
  
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#1A1F1C] mb-2" style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}>Preview Your Book</h2>
        <p className="text-[#5A6660]">
          Spread {currentSpread + 1} of {totalSpreads}
        </p>
      </div>
      
      {/* Book Preview */}
      <div className="relative">
        {/* Navigation */}
        <button
          onClick={() => setCurrentSpread(Math.max(0, currentSpread - 1))}
          disabled={currentSpread === 0}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 p-3 bg-[#406A56] text-white rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#345548] transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <button
          onClick={() => setCurrentSpread(Math.min(totalSpreads - 1, currentSpread + 1))}
          disabled={currentSpread === totalSpreads - 1}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 p-3 bg-[#406A56] text-white rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#345548] transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        
        {/* Book Spread */}
        <div className="flex justify-center gap-1 perspective-1000">
          {/* Left Page */}
          <motion.div
            key={`left-${currentSpread}`}
            initial={{ rotateY: -30, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            className="w-[300px] aspect-square bg-white shadow-xl rounded-l-sm"
          >
            {leftPage ? (
              <PagePreview page={leftPage} shareTokenMap={shareTokenMap} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#94A09A]">
                <BookOpen className="w-12 h-12" />
              </div>
            )}
          </motion.div>
          
          {/* Spine */}
          <div className="w-2 bg-gradient-to-r from-[#406A56]/20 to-[#406A56]/10" />
          
          {/* Right Page */}
          <motion.div
            key={`right-${currentSpread}`}
            initial={{ rotateY: 30, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            className="w-[300px] aspect-square bg-white shadow-xl rounded-r-sm"
          >
            {rightPage ? (
              <PagePreview page={rightPage} shareTokenMap={shareTokenMap} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#94A09A]">
                {pages.length % 2 === 1 ? (
                  <span className="text-sm">Back Cover</span>
                ) : (
                  <BookOpen className="w-12 h-12" />
                )}
              </div>
            )}
          </motion.div>
        </div>
        
        {/* Page indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalSpreads }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSpread(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSpread 
                  ? 'w-6 bg-[#406A56]' 
                  : 'bg-[#406A56]/30 hover:bg-[#406A56]/50'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Print Preview Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setShowPrintPreview(true)}
          className="px-6 py-3 bg-[#406A56] text-white rounded-xl hover:bg-[#345548] flex items-center gap-2 shadow-lg"
        >
          <Printer className="w-5 h-5" />
          Print Preview (300 DPI)
        </button>
      </div>

      {/* Stats Row - Compact horizontal layout */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
        {/* Page count */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-xl border border-[#DDE3DF]">
          <BookOpen className="w-5 h-5 text-[#406A56]" />
          <span className="text-sm font-medium text-[#406A56]">{pages.length} pages</span>
          <span className="text-xs text-[#5A6660]">• {selectedMemories.length} memories</span>
        </div>
        
        {/* Low res warning (compact) */}
        {lowResWarnings.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#C4A235]/10 rounded-xl border border-[#C4A235]/30">
            <AlertTriangle className="w-4 h-4 text-[#C4A235]" />
            <span className="text-sm text-[#C4A235]">{lowResWarnings.length} low-res image(s)</span>
          </div>
        )}
      </div>

      {/* Print Preview Modal */}
      <AnimatePresence>
        {showPrintPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPrintPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F5F0EA] rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#406A56]">Print Preview</h3>
                  <p className="text-sm text-[#5A6660]">
                    Actual print size: {getPrintDimensions().width}×{getPrintDimensions().height}" at 300 DPI
                    ({getPrintDimensions().pixelWidth}×{getPrintDimensions().pixelHeight}px)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-[#406A56] text-white rounded-lg hover:bg-[#345548] flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setShowPrintPreview(false)}
                    className="p-2 hover:bg-[#406A56]/10 rounded-lg"
                  >
                    <X className="w-5 h-5 text-[#406A56]" />
                  </button>
                </div>
              </div>

              {/* All Pages Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className="bg-white rounded-lg overflow-hidden shadow-md"
                  >
                    <div className="aspect-square relative">
                      <PagePreview page={page} printSize={getPrintDimensions().pixelWidth} shareTokenMap={shareTokenMap} />
                    </div>
                    <div className="p-2 bg-[#406A56]/5 text-center">
                      <span className="text-xs font-medium text-[#406A56]">Page {page.pageNumber}</span>
                    </div>
                  </div>
                ))}
              </div>

              {lowResWarnings.length > 0 && (
                <div className="mt-6 p-4 bg-[#C4A235]/10 border border-[#C4A235]/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#C4A235] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-[#C4A235]">Quality Notice</h4>
                      <p className="text-sm text-[#C4A235] mt-1">
                        Some images may not meet 300 DPI print quality standards.
                        For professional printing, ensure all images are high-resolution.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

// Build the public URL a QR code should encode.
//
// Preferred path: a share token was minted via
// /api/photobook/projects/[id]/share-tokens and lives in `tokenMap` keyed by
// `memory:<id>` or `wisdom:<id>`. The URL resolves to /view/{token}, which the
// /api/qr/[token] resolver can validate and revoke.
//
// Legacy/pre-mint fallback: we emit `/view/{id}` (memories) or
// `/view/wisdom/{id}` (wisdom). The QR resolver has a backwards-compat path
// that still resolves raw UUIDs so old printed books keep working. These
// URLs also cover the instant during the editor session before the token
// mint POST completes.
const buildQRTargetUrl = (
  opts: { memoryId?: string; wisdomId?: string },
  tokenMap?: Record<string, string>
): string => {
  const baseUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love'
  const key = opts.memoryId
    ? `memory:${opts.memoryId}`
    : opts.wisdomId
      ? `wisdom:${opts.wisdomId}`
      : null
  const minted = key && tokenMap ? tokenMap[key] : undefined
  if (minted) return `${baseUrl}/view/${minted}`
  if (opts.wisdomId) return `${baseUrl}/view/wisdom/${opts.wisdomId}`
  if (opts.memoryId) return `${baseUrl}/view/${opts.memoryId}`
  return baseUrl
}

// Page Preview Component
function PagePreview({
  page,
  printSize,
  shareTokenMap,
}: {
  page: PageData
  printSize?: number
  shareTokenMap?: Record<string, string>
}) {
  const template = getTemplateById(page.layoutId)

  if (!template) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#94A09A]">
        <span className="text-sm">Unknown layout</span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" style={{ background: page.background || template.background || '#ffffff' }}>
      {template.slots.map((slot) => {
        const pageSlot = page.slots.find(s => s.slotId === slot.id)
        const style: React.CSSProperties = {
          position: 'absolute',
          left: `${slot.position.x}%`,
          top: `${slot.position.y}%`,
          width: `${slot.position.width}%`,
          height: `${slot.position.height}%`,
        }

        if (slot.type === 'photo') {
          const cropZoom = pageSlot?.cropZoom || { scale: 1, offsetX: 0, offsetY: 0 }
          return (
            <div key={slot.id} style={style} className="overflow-hidden relative">
              {pageSlot?.fileUrl ? (
                <>
                  <img
                    src={pageSlot.fileUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{
                      transform: `scale(${cropZoom.scale}) translate(${cropZoom.offsetX}%, ${cropZoom.offsetY}%)`,
                      transformOrigin: 'center center'
                    }}
                  />
                  {/* Auto QR Code - bottom right corner of each photo */}
                  {pageSlot.memoryId && (
                    <div className="absolute bottom-1 right-1 bg-white p-0.5 rounded shadow-sm">
                      <QRPreview
                        value={buildQRTargetUrl({ memoryId: pageSlot.memoryId }, shareTokenMap)}
                        size={24}
                        alt="Memory QR"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-[#F0F0EC]" />
              )}
            </div>
          )
        }

        if (slot.type === 'text') {
          const textContent = pageSlot?.text || ''
          const textStyle = pageSlot?.textStyle || DEFAULT_TEXT_STYLE
          return (
            <div
              key={slot.id}
              style={{
                ...style,
                display: 'flex',
                alignItems: 'center',
                justifyContent: textStyle.textAlign === 'center' ? 'center' : textStyle.textAlign === 'right' ? 'flex-end' : 'flex-start',
              }}
            >
              <p
                style={{
                  fontFamily: textStyle.fontFamily,
                  fontSize: `${getFontSizePx(textStyle.fontSize)}px`,
                  fontWeight: textStyle.fontWeight,
                  fontStyle: textStyle.fontStyle,
                  textAlign: textStyle.textAlign,
                  color: textStyle.color,
                  margin: 0,
                  padding: '8px',
                  wordBreak: 'break-word',
                  overflow: 'hidden'
                }}
              >
                {textContent}
              </p>
            </div>
          )
        }

        if (slot.type === 'qr') {
          const qrSlot = page.slots.find(s => s.type === 'qr')
          const qrUrl = qrSlot?.qrWisdomId
            ? buildQRTargetUrl({ wisdomId: qrSlot.qrWisdomId }, shareTokenMap)
            : qrSlot?.qrMemoryId
              ? buildQRTargetUrl({ memoryId: qrSlot.qrMemoryId }, shareTokenMap)
              : null
          return (
            <div key={slot.id} style={style} className="flex items-center justify-center">
              {qrUrl ? (
                <QRPreview value={qrUrl} size={64} alt="QR Code" />
              ) : (
                <QrCode className="w-12 h-12 text-[#94A09A]" />
              )}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

// Step 5: Checkout
function CheckoutStep({
  product,
  pages,
  address,
  setAddress,
  onSubmit,
  isSubmitting
}: {
  product: Product
  pages: PageData[]
  address: ShippingAddress
  setAddress: (address: ShippingAddress) => void
  onSubmit: () => void
  isSubmitting: boolean
}) {
  // Calculate price with 30% markup
  const pageCount = pages.length
  const basePrice = product.basePrice
  const additionalPages = Math.max(0, pageCount - product.minPages)
  const additionalCost = additionalPages * product.pricePerPage
  const subtotal = basePrice + additionalCost
  const markup = subtotal * 0.3
  const total = subtotal + markup
  const shipping = 5.99
  const finalTotal = total + shipping
  
  const isAddressComplete = address.name && address.line1 && address.city && address.postalCode && address.country
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#1A1F1C] mb-2" style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}>Complete Your Order</h2>
        <p className="text-[#5A6660]">Enter your shipping details to receive your photobook</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Shipping Form */}
        <div className="lg:col-span-3">
          <GlassCard variant="warm" padding="lg">
            <h3 className="text-lg font-semibold text-[#406A56] mb-6">Shipping Address</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5A6660] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-[#DDE3DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#5A6660] mb-1">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-[#DDE3DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                  placeholder="123 Main Street"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#5A6660] mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={address.line2 || ''}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-[#DDE3DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                  placeholder="Apt 4B (optional)"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#5A6660] mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-[#DDE3DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A6660] mb-1">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-[#DDE3DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                    placeholder="NY"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#5A6660] mb-1">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={address.postalCode}
                    onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-[#DDE3DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                    placeholder="10001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A6660] mb-1">
                    Country *
                  </label>
                  <select
                    value={address.country}
                    onChange={(e) => setAddress({ ...address, country: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-[#DDE3DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                  >
                    <option value="">Select country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </select>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-2">
          <GlassCard variant="warm" padding="lg" className="sticky top-24">
            <h3 className="text-lg font-semibold text-[#406A56] mb-6">Order Summary</h3>
            
            <div className="space-y-4">
              {/* Product */}
              <div className="flex items-center gap-4 pb-4 border-b border-[#DDE3DF]">
                <div className="w-16 h-16 rounded-xl bg-[#406A56]/10 flex items-center justify-center text-[#406A56]">
                  {product.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#406A56]">{product.name}</p>
                  <p className="text-sm text-[#5A6660]">{pageCount} pages</p>
                </div>
              </div>
              
              {/* Price breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#5A6660]">
                  <span>Base price ({product.minPages} pages)</span>
                  <span>${(basePrice * 1.3).toFixed(2)}</span>
                </div>
                {additionalPages > 0 && (
                  <div className="flex justify-between text-[#5A6660]">
                    <span>Additional pages ({additionalPages})</span>
                    <span>${(additionalCost * 1.3).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#5A6660]">
                  <span>Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-[#DDE3DF] text-lg font-bold text-[#406A56]">
                  <span>Total</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Pay Button */}
              <button
                onClick={onSubmit}
                disabled={!isAddressComplete || isSubmitting}
                className="w-full py-4 bg-[#406A56] text-white font-semibold rounded-xl hover:bg-[#345548] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 min-h-[44px] touch-manipulation active:scale-[0.98] transition-transform"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay ${finalTotal.toFixed(2)}
                  </>
                )}
              </button>
              
              <p className="text-xs text-center text-[#94A09A] mt-4">
                Secure payment powered by Stripe
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

const STEPS = [
  { id: 'product', label: 'Choose Product', icon: BookOpen },
  { id: 'design', label: 'Design Pages', icon: Layout },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'checkout', label: 'Checkout', icon: CreditCard },
]

export default function CreatePhotobookPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Step state
  const [currentStep, setCurrentStep] = useState(0)
  
  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<Set<string>>(new Set())
  const [wisdomEntries, setWisdomEntries] = useState<WisdomEntry[]>([])
  const [mediaFaces, setMediaFaces] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(new Map())
  const [pages, setPages] = useState<PageData[]>([])
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US'
  })

  // History state for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const MAX_HISTORY = 50
  
  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutProjectId, setCheckoutProjectId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  // Share tokens minted for this project's memories/wisdom. Keyed by
  // `memory:<id>` / `wisdom:<id>` -> token string. Consumed by buildQRTargetUrl
  // so the printed QR encodes /view/{token} (revocable) instead of raw UUIDs.
  const [shareTokenMap, setShareTokenMap] = useState<Record<string, string>>({})

  // --- Cover / theme / preview / cmyk / versions ---------------------
  const [coverDesign, setCoverDesign] = useState<CoverDesignState>(DEFAULT_COVER_DESIGN)
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showCoverDesigner, setShowCoverDesigner] = useState(false)
  const [showFlipPreview, setShowFlipPreview] = useState(false)
  // Cache of rendered preview pages keyed by page-content hash. Reopening
  // the modal without edits is instant; only changed pages re-render.
  const previewCacheRef = useRef<Map<string, string>>(new Map())
  const [previewPages, setPreviewPages] = useState<FlipPage[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showCmyk, setShowCmyk] = useState(false)
  const [showVersions, setShowVersions] = useState(false)

  // Lazily render real composed pages for the flip-book preview the moment
  // the modal opens. Pages are hashed by render-affecting content so reopens
  // hit the in-memory cache instantly; only edited pages re-render.
  useEffect(() => {
    if (!showFlipPreview) return
    let cancelled = false
    const run = async () => {
      const previewInputs: PreviewPage[] = pages.map((p) => ({
        id: p.id,
        layoutId: p.layoutId,
        background: p.background,
        backgroundV2: p.backgroundV2,
        overlays: p.overlays,
        slots: p.slots.map((s) => ({
          slotId: s.slotId,
          type: s.type,
          fileUrl: s.fileUrl,
          text: s.text,
          qrMemoryId: s.qrMemoryId,
          qrWisdomId: s.qrWisdomId,
          border: s.border,
          filter: s.filter,
        })),
      }))

      // Compute hash per page; collect pages that need rendering.
      const hashes = previewInputs.map((p) => `${p.id}::${hashPreviewPage(p)}`)
      const cache = previewCacheRef.current
      const missingIdx: number[] = []
      hashes.forEach((h, i) => {
        if (!cache.has(h)) missingIdx.push(i)
      })

      if (missingIdx.length > 0) {
        setPreviewLoading(true)
        try {
          const rendered = await renderPagesForPreview(
            missingIdx.map((i) => previewInputs[i])
          )
          rendered.forEach((r, k) => {
            const idx = missingIdx[k]
            if (r.imageUrl) cache.set(hashes[idx], r.imageUrl)
          })
        } finally {
          if (!cancelled) setPreviewLoading(false)
        }
      }

      if (cancelled) return
      const flipPages: FlipPage[] = previewInputs.map((p, i) => {
        const textSlot = p.slots.find((s) => s.type === 'text' && s.text)
        return {
          id: p.id,
          imageUrl: cache.get(hashes[i]) ?? null,
          caption: textSlot?.text ?? null,
        }
      })
      setPreviewPages(flipPages)
    }
    run()
    return () => { cancelled = true }
  }, [showFlipPreview, pages])

  // Lifted from ArrangeStep so the unified toolbar can act on the active page
  // and the text-overlay format toolbar can live in a fixed slot above the
  // canvas rather than floating over it.
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showBackgroundPickerV2, setShowBackgroundPickerV2] = useState(false)

  // PR 3: cover/finish/binding picker + add-on upsells. Persisted to
  // photobook_projects.{product_options, add_ons}.
  const [productOptions, setProductOptions] = useState<ProductOptions>(DEFAULT_PRODUCT_OPTIONS)
  const [addOns, setAddOns] = useState<AddOnId[]>([])

  // Draft hydration: when the user arrives with ?projectId= from the drafts
  // landing page we load the existing project so the editor skips the product
  // picker. ?fresh=1 bypasses this and starts a new book.
  const searchParams = useSearchParams()
  const draftProjectId = searchParams?.get('projectId') ?? null
  const isFresh = searchParams?.get('fresh') === '1'
  const [draftLoading, setDraftLoading] = useState<boolean>(!!draftProjectId && !isFresh)
  const draftHydratedRef = useRef(false)

  // Load user, memories, and products
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      // Load memories with media
      const { data: memoriesData } = await supabase
        .from('memories')
        .select(`
          id,
          title,
          description,
          memory_date,
          created_at,
          memory_media (
            id,
            file_url,
            file_type,
            is_cover
          )
        `)
        .eq('user_id', user.id)
        .order('memory_date', { ascending: false })

      setMemories(memoriesData || [])

      // Load wisdom (knowledge_entries) for the QR picker "Wisdom & Advice" tab.
      try {
        const { data: wisdomData } = await supabase
          .from('knowledge_entries')
          .select('id, prompt_text, response_text, category, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        setWisdomEntries((wisdomData as WisdomEntry[] | null) || [])
      } catch (err) {
        console.warn('Failed to load wisdom entries:', err)
        setWisdomEntries([])
      }

      // Load face bounding boxes for the user's media (for face-centered
      // smart cropping). We pull the highest-confidence face per media and
      // keep only x/y/w/h (normalized 0-1) to keep the map small.
      try {
        const mediaIds = (memoriesData || [])
          .flatMap(m => m.memory_media || [])
          .map(mm => mm.id)
        if (mediaIds.length > 0) {
          const { data: faceRows } = await supabase
            .from('memory_face_tags')
            .select('media_id, box_left, box_top, box_width, box_height, confidence')
            .in('media_id', mediaIds)
            .order('confidence', { ascending: false })
          if (faceRows) {
            // Aggregate: if multiple faces, use midpoint of all face centers
            // (weighted equally) so we don't bias to just one face.
            const grouped = new Map<string, { sumX: number; sumY: number; sumW: number; sumH: number; n: number }>()
            for (const row of faceRows as Array<{ media_id: string; box_left: number | null; box_top: number | null; box_width: number | null; box_height: number | null }>) {
              const x = Number(row.box_left) || 0
              const y = Number(row.box_top) || 0
              const w = Number(row.box_width) || 0
              const h = Number(row.box_height) || 0
              if (!w || !h) continue
              const g = grouped.get(row.media_id) || { sumX: 0, sumY: 0, sumW: 0, sumH: 0, n: 0 }
              g.sumX += x; g.sumY += y; g.sumW += w; g.sumH += h; g.n += 1
              grouped.set(row.media_id, g)
            }
            const map = new Map<string, { x: number; y: number; width: number; height: number }>()
            grouped.forEach((g, mediaId) => {
              map.set(mediaId, {
                x: g.sumX / g.n,
                y: g.sumY / g.n,
                width: g.sumW / g.n,
                height: g.sumH / g.n,
              })
            })
            setMediaFaces(map)
          }
        }
      } catch (err) {
        // Face data is optional — fall back to center-crop silently.
        console.warn('Failed to load face bounding boxes:', err)
      }

      setIsLoading(false)
      
      // Load products from database (falls back to hardcoded if table doesn't exist)
      try {
        const dbProducts = await getEnabledProducts()
        if (dbProducts.length > 0) {
          // Convert DB products to Product interface
          const convertedProducts: Product[] = dbProducts.map((p: DbProduct) => ({
            id: p.slug,
            name: p.name,
            description: p.description || '',
            size: p.size,
            basePrice: Number(p.base_price),
            pricePerPage: Number(p.price_per_page),
            minPages: p.min_pages,
            maxPages: p.max_pages,
            binding: p.binding,
            icon: p.binding === 'layflat' ? <Sparkles className="w-8 h-8" /> : <BookOpen className="w-8 h-8" />,
            features: p.features || [],
            prodigiSku: p.prodigi_sku || undefined,
          }))
          setProducts(convertedProducts)
        } else {
          // Fallback to hardcoded PRODUCTS
          setProducts(PRODUCTS)
        }
      } catch (error) {
        console.warn('Using hardcoded products:', error)
        setProducts(PRODUCTS)
      }
      setProductsLoading(false)
    }

    loadData()
  }, [])

  // Hydrate an existing draft when ?projectId= is present. Runs once products
  // have loaded (needed to match selectedProduct) and user is known. Skipped
  // when ?fresh=1 or no id in the URL.
  useEffect(() => {
    if (!draftProjectId || isFresh) return
    if (draftHydratedRef.current) return
    if (productsLoading) return
    if (!userId) return

    draftHydratedRef.current = true

    const hydrate = async () => {
      try {
        const { data: project, error: projectErr } = await supabase
          .from('photobook_projects')
          .select('*')
          .eq('id', draftProjectId)
          .eq('user_id', userId)
          .single()

        if (projectErr || !project) {
          router.replace('/dashboard/photobook?error=draft-not-found')
          return
        }

        // Match product: prefer product_sku (Prodigi SKU) when present,
        // otherwise fall back to print_config.size + binding. Falls back to
        // the first product if nothing matches so we never strand the user.
        const printConfig = (project.print_config ?? {}) as {
          size?: string
          binding?: string
        }
        const projectSku = (project as { product_sku?: string | null }).product_sku ?? null
        const matched =
          (projectSku
            ? products.find((p) => p.prodigiSku === projectSku)
            : undefined) ??
          products.find(
            (p) =>
              (!printConfig.size || p.size === printConfig.size) &&
              (!printConfig.binding || p.binding === printConfig.binding)
          ) ??
          products[0] ??
          null

        if (matched) setSelectedProduct(matched)

        // Cover design (JSONB) — only apply when persisted.
        if (project.cover_design) {
          setCoverDesign({ ...DEFAULT_COVER_DESIGN, ...(project.cover_design as Partial<CoverDesignState>) })
        }

        // Product options + add-ons.
        if (project.product_options && typeof project.product_options === 'object') {
          setProductOptions({ ...DEFAULT_PRODUCT_OPTIONS, ...(project.product_options as Partial<ProductOptions>) })
        }
        if (Array.isArray(project.add_ons)) {
          setAddOns(project.add_ons as AddOnId[])
        }

        // Load pages for this project.
        const { data: pageRows } = await supabase
          .from('photobook_pages')
          .select('id, page_number, page_type, layout_type, content_json')
          .eq('project_id', draftProjectId)
          .order('page_number', { ascending: true })

        const loadedPages: PageData[] = (pageRows ?? []).map((row: {
          id: string
          page_number: number
          page_type: string
          layout_type: string
          content_json: {
            photos?: Array<{
              memory_id?: string
              media_id?: string
              file_url?: string
              slot_id?: string
              border?: PhotoBorder | null
              filter?: PhotoFilter | null
            }>
            qr_code?: { memory_id?: string; wisdom_id?: string }
            background?: PageBackground | null
            overlays?: PageOverlay[]
          }
        }) => {
          const content = row.content_json ?? {}
          const slots: SlotData[] = []
          ;(content.photos ?? []).forEach((ph, i) => {
            slots.push({
              slotId: ph.slot_id ?? `photo-${i + 1}`,
              type: 'photo',
              memoryId: ph.memory_id,
              mediaId: ph.media_id,
              fileUrl: ph.file_url,
              border: ph.border ?? undefined,
              filter: ph.filter ?? undefined,
            })
          })
          if (content.qr_code?.memory_id || content.qr_code?.wisdom_id) {
            slots.push({
              slotId: 'qr-code',
              type: 'qr',
              qrMemoryId: content.qr_code.memory_id,
              qrWisdomId: content.qr_code.wisdom_id,
            })
          }
          return {
            id: row.id,
            pageNumber: row.page_number,
            layoutId: row.layout_type || 'single',
            slots,
            backgroundV2: content.background ?? null,
            overlays: content.overlays ?? [],
          }
        })

        setProjectId(draftProjectId)
        setPages(loadedPages)
        // Skip the product picker — land on the design step (1). If pages
        // exist the user edits them; if not, they still get the editor and
        // can add pages without re-picking the product.
        setCurrentStep(1)
      } catch (err) {
        console.error('Failed to hydrate photobook draft:', err)
        router.replace('/dashboard/photobook?error=draft-not-found')
        return
      } finally {
        setDraftLoading(false)
      }
    }

    hydrate()
  }, [draftProjectId, isFresh, productsLoading, userId, products, router, supabase])

  // Initialize history when pages are first set
  useEffect(() => {
    if (pages.length > 0 && history.length === 0) {
      const initialHistory: HistoryState = {
        pages: JSON.parse(JSON.stringify(pages)),
        timestamp: Date.now()
      }
      setHistory([initialHistory])
      setHistoryIndex(0)
    }
  }, [pages, history.length])

  // Mint share tokens for every memory/wisdom referenced on any page, so the
  // printed QR encodes /view/{token} instead of a raw UUID. Idempotent on the
  // server — repeat calls return the existing token.
  useEffect(() => {
    if (!projectId) return
    const targets: Array<{ type: 'memory' | 'wisdom'; id: string }> = []
    const seen = new Set<string>()
    for (const page of pages) {
      for (const slot of page.slots) {
        const candidates: Array<{ type: 'memory' | 'wisdom'; id: string }> = []
        if (slot.memoryId) candidates.push({ type: 'memory', id: slot.memoryId })
        if (slot.qrMemoryId) candidates.push({ type: 'memory', id: slot.qrMemoryId })
        if (slot.qrWisdomId) candidates.push({ type: 'wisdom', id: slot.qrWisdomId })
        for (const c of candidates) {
          const key = `${c.type}:${c.id}`
          if (!seen.has(key) && !shareTokenMap[key]) {
            seen.add(key)
            targets.push(c)
          }
        }
      }
    }
    if (targets.length === 0) return

    let cancelled = false
    ;(async () => {
      const mintOne = async (target: { type: 'memory' | 'wisdom'; id: string }) => {
        try {
          const res = await fetch(`/api/photobook/projects/${projectId}/share-tokens`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ target }),
          })
          if (!res.ok) return null
          const json = (await res.json()) as { token?: string }
          if (!json.token) return null
          return { key: `${target.type}:${target.id}`, token: json.token }
        } catch {
          return null
        }
      }
      const minted = await Promise.all(targets.map(mintOne))
      if (cancelled) return
      const next: Record<string, string> = {}
      for (const m of minted) {
        if (m) next[m.key] = m.token
      }
      if (Object.keys(next).length > 0) {
        setShareTokenMap(prev => ({ ...prev, ...next }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, pages, shareTokenMap])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when on design step
      if (currentStep !== 1) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep, historyIndex, history])

  // History management functions
  const saveHistory = useCallback((newPages: PageData[]) => {
    setHistory(prev => {
      // Remove any future history after current index
      const newHistory = prev.slice(0, historyIndex + 1)

      // Add new state
      const newState: HistoryState = {
        pages: JSON.parse(JSON.stringify(newPages)),
        timestamp: Date.now()
      }

      newHistory.push(newState)

      // Limit to MAX_HISTORY states
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
      }

      // Update index to point to new state
      setHistoryIndex(newHistory.length - 1)

      return newHistory
    })
  }, [historyIndex])

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setPages(JSON.parse(JSON.stringify(history[newIndex].pages)))
    }
  }, [historyIndex, history])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setPages(JSON.parse(JSON.stringify(history[newIndex].pages)))
    }
  }, [historyIndex, history])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1
  
  // Get selected memories
  const selectedMemories = useMemo(() => 
    memories.filter(m => selectedMemoryIds.has(m.id)),
    [memories, selectedMemoryIds]
  )
  
  // Get memory IDs used on pages (for saving project)
  const usedMemoryIds = useMemo(() => {
    const used = new Set<string>()
    pages.forEach(page => {
      page.slots.forEach(slot => {
        if (slot.memoryId) used.add(slot.memoryId)
        if (slot.qrMemoryId) used.add(slot.qrMemoryId)
      })
    })
    return used
  }, [pages])
  
  // Toggle memory selection
  const toggleMemory = useCallback((memoryId: string) => {
    setSelectedMemoryIds(prev => {
      const next = new Set(prev)
      if (next.has(memoryId)) {
        next.delete(memoryId)
      } else {
        next.add(memoryId)
      }
      return next
    })
  }, [])
  
  // Auto-arrange pages
  const autoArrange = useCallback(() => {
    if (!selectedProduct) return
    
    // Get all photos from selected memories
    const allPhotos: { memoryId: string; mediaId: string; fileUrl: string }[] = []
    selectedMemories.forEach(memory => {
      memory.memory_media?.forEach(media => {
        if (media.file_type?.startsWith('image')) {
          allPhotos.push({
            memoryId: memory.id,
            mediaId: media.id,
            fileUrl: media.file_url
          })
        }
      })
    })
    
    // Create pages with photos
    const newPages: PageData[] = []
    let photoIndex = 0
    
    // Title page
    newPages.push({
      id: `page-${Date.now()}-0`,
      pageNumber: 1,
      layoutId: 'title-page',
      slots: allPhotos[0] ? [{
        slotId: 'photo-1',
        type: 'photo',
        memoryId: allPhotos[0].memoryId,
        mediaId: allPhotos[0].mediaId,
        fileUrl: allPhotos[0].fileUrl
      }] : []
    })
    photoIndex++
    
    // Content pages
    while (photoIndex < allPhotos.length && newPages.length < selectedProduct.maxPages) {
      const remainingPhotos = allPhotos.length - photoIndex
      
      let layoutId = 'full-photo'
      let photosForPage = 1
      
      if (remainingPhotos >= 4 && Math.random() > 0.7) {
        layoutId = 'grid-4'
        photosForPage = 4
      } else if (remainingPhotos >= 3 && Math.random() > 0.6) {
        layoutId = 'feature-2-small'
        photosForPage = 3
      } else if (remainingPhotos >= 2 && Math.random() > 0.5) {
        layoutId = 'two-horizontal'
        photosForPage = 2
      }
      
      const pageSlots: PageData['slots'] = []
      for (let i = 0; i < photosForPage && photoIndex < allPhotos.length; i++) {
        pageSlots.push({
          slotId: `photo-${i + 1}`,
          type: 'photo',
          memoryId: allPhotos[photoIndex].memoryId,
          mediaId: allPhotos[photoIndex].mediaId,
          fileUrl: allPhotos[photoIndex].fileUrl
        })
        photoIndex++
      }
      
      newPages.push({
        id: `page-${Date.now()}-${newPages.length}`,
        pageNumber: newPages.length + 1,
        layoutId,
        slots: pageSlots
      })
    }
    
    // Add QR page at the end if we have memories
    if (selectedMemories.length > 0) {
      newPages.push({
        id: `page-${Date.now()}-qr`,
        pageNumber: newPages.length + 1,
        layoutId: 'qr-page',
        slots: [{
          slotId: 'qr-code',
          type: 'qr',
          qrMemoryId: selectedMemories[0].id
        }]
      })
    }
    
    setPages(newPages)
    saveHistory(newPages)
  }, [selectedProduct, selectedMemories, saveHistory])
  
  // Save project to database
  const saveProject = useCallback(async () => {
    if (!userId || !selectedProduct) return null
    
    try {
      // Create or update project
      const projectData = {
        user_id: userId,
        title: `${selectedProduct.name} - ${new Date().toLocaleDateString()}`,
        status: 'draft',
        page_count: pages.length,
        print_config: {
          size: selectedProduct.size,
          binding: selectedProduct.binding,
          copies: 1
        },
        delivery_address: shippingAddress,
        estimated_price: calculateTotal(),
        // PR 3: persist editor selections so they round-trip and reach
        // the order endpoint for Prodigi attribute pass-through.
        product_options: productOptions,
        add_ons: addOns,
      }
      
      let project
      if (projectId) {
        const { data, error } = await supabase
          .from('photobook_projects')
          .update(projectData)
          .eq('id', projectId)
          .select()
          .single()
        if (error) throw error
        project = data
      } else {
        const { data, error } = await supabase
          .from('photobook_projects')
          .insert(projectData)
          .select()
          .single()
        if (error) throw error
        project = data
        setProjectId(project.id)
      }
      
      // Save pages
      if (project) {
        // Delete existing pages
        await supabase
          .from('photobook_pages')
          .delete()
          .eq('project_id', project.id)
        
        // Insert new pages
        const pageInserts = pages.map((page, i) => ({
          project_id: project.id,
          page_number: i + 1,
          page_type: i === 0 ? 'cover' : 'content',
          layout_type: page.layoutId.split('-')[0] || 'single',
          content_json: {
            photos: page.slots.filter(s => s.type === 'photo').map(s => ({
              memory_id: s.memoryId,
              media_id: s.mediaId,
              file_url: s.fileUrl,
              // PR 2: per-slot border + filter (additive — round-trips without
              // a schema migration; absent fields keep the original render).
              slot_id: s.slotId,
              border: s.border ?? null,
              filter: s.filter ?? null,
            })),
            qr_code: page.slots.find(s => s.type === 'qr') ? {
              memory_id: page.slots.find(s => s.type === 'qr')?.qrMemoryId
            } : undefined,
            // Extended creative-tools fields (backgrounds + overlays).
            // Renderer reads these via the PageContent shape; absent fields
            // keep the original render path unchanged.
            background: page.backgroundV2 ?? null,
            overlays: page.overlays ?? [],
          }
        }))
        
        if (pageInserts.length > 0) {
          await supabase.from('photobook_pages').insert(pageInserts)
        }
        
        // Save memory selections (based on what's actually used)
        await supabase
          .from('photobook_memory_selections')
          .delete()
          .eq('project_id', project.id)
        
        const selectionInserts = Array.from(usedMemoryIds).map((memoryId, i) => ({
          project_id: project.id,
          memory_id: memoryId,
          sort_order: i
        }))
        
        if (selectionInserts.length > 0) {
          await supabase.from('photobook_memory_selections').insert(selectionInserts)
        }
      }
      
      return project
    } catch (error) {
      console.error('Error saving project:', error)
      return null
    }
  }, [userId, selectedProduct, pages, shippingAddress, projectId, usedMemoryIds, productOptions, addOns])
  
  // PR 3: single source of truth for money math. computePricing() lives in
  // src/lib/photobook/product-options.ts so the editor + checkout + order
  // endpoint never duplicate formulas.
  const pricingBreakdown = useMemo(() => {
    if (!selectedProduct) return null
    return computePricing({
      basePrice: selectedProduct.basePrice,
      pricePerPage: selectedProduct.pricePerPage,
      minPages: selectedProduct.minPages,
      pageCount: pages.length,
      options: productOptions,
      addOns,
    })
  }, [selectedProduct, pages.length, productOptions, addOns])

  const calculateTotal = () => pricingBreakdown?.total ?? 0
  
  // Handle checkout: save the project, then hand off to the CheckoutFlow
  // overlay which renders+uploads each page, creates a PaymentIntent,
  // collects payment via Stripe Elements, and submits to Prodigi.
  const handleCheckout = async () => {
    setIsSubmitting(true)
    try {
      const project = await saveProject()
      if (!project) throw new Error('We couldn\'t save your book. Please try again.')
      setCheckoutProjectId(project.id)
      setCheckoutOpen(true)
    } catch (error) {
      console.error('Checkout error:', error)
      alert(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Step validation (updated for 4 steps)
  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedProduct !== null
      case 1: {
        // Design Pages: Need at least 1 page created
        return pages.length >= 1
      }
      case 2: return true // Preview
      case 3: return shippingAddress.name && shippingAddress.line1 && shippingAddress.city && shippingAddress.postalCode && shippingAddress.country
      default: return false
    }
  }
  
  // Navigate steps
  const goToStep = (step: number) => {
    if (step < currentStep || canProceed()) {
      // Auto-save when leaving design step
      if (currentStep === 1 && step > currentStep) {
        saveProject()
      }
      // Auto-arrange when entering design step for first time with no pages
      if (step === 1 && pages.length === 0 && memories.length > 0) {
        setTimeout(autoArrange, 100)
      }
      setCurrentStep(step)
    }
  }
  
  if (draftLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#406A56]" />
          <p className="text-[#5A6660] mt-4">Loading your draft…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 pt-14">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-[#FAFAF7]/95 backdrop-blur-sm border-b border-[#DDE3DF]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-[#5A6660] hover:text-[#406A56]"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-xl font-bold text-[#1A1F1C]" style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}>Create Photobook</h1>
            <div className="w-32" /> {/* Spacer */}
          </div>
          
          {/* PR 3: cover/finish/binding chips. Visible once a product is
              selected and we're past Step 0. Sits between back/title and the
              step progress so it's always one tap away. */}
          {selectedProduct && currentStep >= 1 && (
            <div className="relative mb-3">
              <ProductOptionsBar value={productOptions} onChange={setProductOptions} />
            </div>
          )}

          {/* Step Progress (4 steps now) */}
          <div className="flex items-center justify-between overflow-x-auto gap-1 sm:gap-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isComplete = index < currentStep
              const isClickable = index < currentStep || (index === currentStep + 1 && canProceed())

              return (
                <button
                  key={step.id}
                  onClick={() => isClickable && goToStep(index)}
                  disabled={!isClickable && index > currentStep}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl transition-all min-h-[44px] touch-manipulation ${
                    isActive
                      ? 'bg-[#406A56] text-white'
                      : isComplete
                        ? 'bg-[#406A56]/10 text-[#406A56]'
                        : 'text-[#94A09A]'
                  } ${isClickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-not-allowed'}`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isComplete ? 'bg-[#406A56] text-white' : ''
                  }`}>
                    {isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="hidden md:inline font-medium text-sm">{step.label}</span>
                  <span className="md:hidden text-xs font-medium">{index + 1}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Editor toolbar — Preview step only. The Design step (ArrangeStep)
          renders its own unified toolbar that includes these same actions. */}
      {currentStep === 2 && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowThemePicker(true)}
              className="min-h-[44px] px-4 rounded-xl bg-white border-2 border-[#DDE3DF] hover:border-[#406A56] text-sm font-medium text-[#2A3E33] flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#C35F33]" /> Themes
            </button>
            <button
              type="button"
              onClick={() => setShowCoverDesigner(true)}
              className="min-h-[44px] px-4 rounded-xl bg-white border-2 border-[#DDE3DF] hover:border-[#406A56] text-sm font-medium text-[#2A3E33] flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-[#406A56]" /> Cover
            </button>
            <button
              type="button"
              onClick={() => setShowFlipPreview(true)}
              className="min-h-[44px] px-4 rounded-xl bg-white border-2 border-[#DDE3DF] hover:border-[#406A56] text-sm font-medium text-[#2A3E33] flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-[#406A56]" /> Preview as book
            </button>
            <button
              type="button"
              onClick={() => setShowCmyk(true)}
              className="min-h-[44px] px-4 rounded-xl bg-white border-2 border-[#DDE3DF] hover:border-[#406A56] text-sm font-medium text-[#2A3E33] flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-[#C35F33]" /> Check colors
            </button>
            <button
              type="button"
              onClick={() => setShowVersions(true)}
              className="min-h-[44px] px-4 rounded-xl bg-white border-2 border-[#DDE3DF] hover:border-[#406A56] text-sm font-medium text-[#2A3E33] flex items-center gap-2"
            >
              <Undo2 className="w-4 h-4 text-[#406A56]" /> Versions
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 relative">
        {/* Live pricing rail. Shown only during Preview + Checkout so the
            Design step can use the full editor width. Design step uses the
            floating PriceChip (rendered below) for peek-able pricing. */}
        {selectedProduct && pricingBreakdown && (currentStep === 2 || currentStep === 3) && (
          <div className="mb-6 xl:mb-0">
            <PricingRail
              breakdown={pricingBreakdown}
              productName={selectedProduct.name}
              productSize={selectedProduct.size}
            />
          </div>
        )}

        {/* Floating price chip + slide-out — Design step only. Keeps canvas
            full-width while giving the user on-demand access to the breakdown. */}
        {selectedProduct && pricingBreakdown && currentStep === 1 && (
          <PriceChip
            breakdown={pricingBreakdown}
            productName={selectedProduct.name}
            productSize={selectedProduct.size}
          />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 0 && (
              <ProductStep
                selectedProduct={selectedProduct}
                onSelect={setSelectedProduct}
                products={products}
                isLoading={productsLoading}
              />
            )}
            
            {currentStep === 1 && (
              <div>
              <ArrangeStep
                pages={pages}
                setPages={setPages}
                selectedMemories={memories}
                wisdomEntries={wisdomEntries}
                mediaFaces={mediaFaces}
                selectedProduct={selectedProduct}
                onAutoArrange={autoArrange}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                saveHistory={saveHistory}
                shareTokenMap={shareTokenMap}
                selectedPageId={selectedPageId}
                setSelectedPageId={setSelectedPageId}
                selectedOverlayId={selectedOverlayId}
                setSelectedOverlayId={setSelectedOverlayId}
                showStickerPicker={showStickerPicker}
                setShowStickerPicker={setShowStickerPicker}
                showBackgroundPickerV2={showBackgroundPickerV2}
                setShowBackgroundPickerV2={setShowBackgroundPickerV2}
                onOpenThemes={() => setShowThemePicker(true)}
                onOpenCover={() => setShowCoverDesigner(true)}
                onOpenPreview={() => setShowFlipPreview(true)}
                onOpenCmyk={() => setShowCmyk(true)}
                onOpenVersions={() => setShowVersions(true)}
                projectId={projectId}
              />
              </div>
            )}

            {currentStep === 2 && selectedProduct && (
              <div className="xl:pr-96">
                <PreviewStep
                  pages={pages}
                  selectedMemories={memories}
                  product={selectedProduct}
                  shareTokenMap={shareTokenMap}
                />
                {/* PR 3: add-on upsells live in the Preview step, right where
                    users are deciding what to buy. */}
                <div className="max-w-5xl mx-auto mt-10">
                  <AddOnsPanel selected={addOns} onChange={setAddOns} />
                </div>
              </div>
            )}
            
            {currentStep === 3 && selectedProduct && (
              <CheckoutStep
                product={selectedProduct}
                pages={pages}
                address={shippingAddress}
                setAddress={setShippingAddress}
                onSubmit={handleCheckout}
                isSubmitting={isSubmitting}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Bottom Navigation */}
      {currentStep < 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#FAFAF7]/95 backdrop-blur-sm border-t border-[#DDE3DF] p-3 sm:p-4 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep === 0}
              className="px-4 sm:px-6 py-3 text-[#406A56] hover:bg-[#406A56]/10 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px] touch-manipulation active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>

            <button
              onClick={() => goToStep(currentStep + 1)}
              disabled={!canProceed()}
              className="px-6 sm:px-8 py-3 bg-[#406A56] text-white font-semibold rounded-xl hover:bg-[#345548] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px] touch-manipulation active:scale-95 transition-transform"
            >
              {currentStep === 2 ? 'Proceed to Checkout' : 'Continue'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Theme picker modal */}
      {showThemePicker && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#DDE3DF]">
              <h3 className="font-semibold text-[#2A3E33]">Themed templates</h3>
              <button type="button" onClick={() => setShowThemePicker(false)} aria-label="Close themes" className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[#F2F1E5] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <ThemePicker
                selectedThemeId={activeThemeId}
                currentPages={pages as unknown as ThemePage[]}
                onApply={({ theme, pages: themePages }: { theme: PhotobookTheme; pages: ThemePage[] }) => {
                  saveHistory(pages)
                  const next = themePages as unknown as PageData[]
                  setPages(next)
                  setActiveThemeId(theme.id)
                  setCoverDesign((c) => ({
                    ...c,
                    title: c.title || theme.coverPreset.title,
                    subtitle: c.subtitle || theme.coverPreset.subtitle,
                    backText: c.backText || theme.coverPreset.backText,
                    spineText: c.spineText || theme.coverPreset.spineText,
                    textColor: theme.coverPreset.textColor,
                    fontPair: theme.coverPreset.fontPair,
                  }))
                  setShowThemePicker(false)
                  // Also rebuild pages in place without dependency on the helper
                  void buildPagesFromTheme
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cover designer modal */}
      {showCoverDesigner && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#DDE3DF]">
              <h3 className="font-semibold text-[#2A3E33]">Design your cover</h3>
              <button type="button" onClick={() => setShowCoverDesigner(false)} aria-label="Close cover designer" className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[#F2F1E5] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <CoverDesigner
                projectId={projectId}
                initial={coverDesign}
                photoOptions={memories.flatMap((m): CoverPhotoOption[] =>
                  (m.memory_media || [])
                    .filter((mm) => mm.file_type === 'image' || !mm.file_type?.startsWith('video'))
                    .map((mm) => ({ mediaId: mm.id, fileUrl: mm.file_url, memoryTitle: m.title }))
                ).slice(0, 60)}
                onSaved={(c) => {
                  setCoverDesign(c)
                  setShowCoverDesigner(false)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3D flip-book preview */}
      <FlipBookPreview
        open={showFlipPreview}
        onClose={() => setShowFlipPreview(false)}
        loading={previewLoading}
        cover={{
          title: coverDesign.title,
          subtitle: coverDesign.subtitle,
          backText: coverDesign.backText,
          frontImageUrl: coverDesign.frontImageUrl,
          textColor: coverDesign.textColor,
          fontPair: coverDesign.fontPair,
        } as FlipCover}
        pages={previewPages}
      />

      {/* CMYK warnings */}
      <CMYKWarnings
        open={showCmyk}
        onClose={() => setShowCmyk(false)}
        photos={pages.flatMap((p, pi): CMYKPhotoInput[] =>
          p.slots
            .filter((s) => s.type === 'photo' && s.fileUrl && s.mediaId)
            .map((s) => ({
              mediaId: s.mediaId as string,
              thumbnailUrl: s.fileUrl as string,
              pageNumber: pi + 1,
            }))
        )}
      />

      {/* Version history */}
      <VersionHistoryPanel
        open={showVersions}
        onClose={() => setShowVersions(false)}
        projectId={projectId}
        onRestored={() => {
          // Simplest recovery: reload to pick up the restored pages.
          if (typeof window !== 'undefined') window.location.reload()
        }}
      />

      {checkoutOpen && checkoutProjectId && (
        <CheckoutFlow
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          projectId={checkoutProjectId}
          pages={pages.map(p => ({
            id: p.id,
            pageNumber: p.pageNumber,
            layoutId: p.layoutId,
            slots: p.slots.map(s => ({
              slotId: s.slotId,
              type: s.type,
              fileUrl: s.fileUrl,
              text: s.text,
              qrMemoryId: s.qrMemoryId,
              qrWisdomId: s.qrWisdomId,
            })),
            background: p.background,
          }))}
          shippingAddress={shippingAddress}
          totalDisplay={calculateTotal()}
        />
      )}
    </div>
  )
}
