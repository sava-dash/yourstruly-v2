'use client'

/**
 * FlipBookPreview — CSS-3D flip-book modal overlay.
 *
 * Pure CSS perspective + rotateY. Pages are rendered as <img> thumbnails
 * (or caller-provided nodes) and the cover uses `coverDesign`. Keyboard:
 *   - Left/Right arrows flip
 *   - Esc closes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { FONT_PAIR_STACKS, FontPair } from '@/lib/photobook/themes'

export interface FlipPage {
  id: string
  /** Best-effort single image URL to summarise this page. Optional. */
  imageUrl?: string | null
  caption?: string | null
}

export interface FlipCover {
  title: string
  subtitle?: string
  backText?: string
  frontImageUrl?: string | null
  textColor: string
  fontPair: FontPair
}

interface Props {
  open: boolean
  pages: FlipPage[]
  cover: FlipCover
  onClose: () => void
}

const FLIP_MS = 600
// Paper texture as a subtle CSS gradient — no external asset needed.
const PAPER =
  'linear-gradient(135deg, #FBFAF4 0%, #F6F4EA 50%, #FBFAF4 100%)'

export default function FlipBookPreview({ open, pages, cover, onClose }: Props) {
  // "spread index": 0 = cover, 1..N = inner spreads, last = back cover.
  const spreads = useMemo(() => {
    const innerPairs: Array<[FlipPage, FlipPage | null]> = []
    for (let i = 0; i < pages.length; i += 2) {
      innerPairs.push([pages[i], pages[i + 1] ?? null])
    }
    return innerPairs
  }, [pages])

  const total = spreads.length + 2 // cover + spreads + back
  const [index, setIndex] = useState(0)
  const [flipping, setFlipping] = useState<'next' | 'prev' | null>(null)
  const stacks = FONT_PAIR_STACKS[cover.fontPair]

  const go = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => {
        const next = Math.max(0, Math.min(total - 1, i + dir))
        if (next === i) return i
        setFlipping(dir === 1 ? 'next' : 'prev')
        setTimeout(() => setFlipping(null), FLIP_MS)
        return next
      })
    },
    [total],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, go, onClose])

  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  if (!open) return null

  const isCover = index === 0
  const isBack = index === total - 1
  const currentSpread = !isCover && !isBack ? spreads[index - 1] : null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="Book preview"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute top-4 right-4 min-w-[52px] min-h-[52px] rounded-full bg-white text-[#2A3E33] flex items-center justify-center shadow-lg hover:bg-[#F2F1E5] z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <div
        className="relative"
        style={{
          perspective: '2000px',
          width: isCover || isBack ? 320 : 640,
          height: 440,
          maxWidth: '92vw',
        }}
      >
        <div
          className="absolute inset-0 transition-transform"
          style={{
            transformStyle: 'preserve-3d',
            transitionDuration: `${FLIP_MS}ms`,
            transform:
              flipping === 'next'
                ? 'rotateY(-12deg)'
                : flipping === 'prev'
                  ? 'rotateY(12deg)'
                  : 'rotateY(0deg)',
          }}
        >
          {isCover && <CoverPanel cover={cover} stacks={stacks} face="front" />}
          {isBack && <CoverPanel cover={cover} stacks={stacks} face="back" />}
          {currentSpread && (
            <div className="absolute inset-0 flex rounded-lg overflow-hidden shadow-2xl">
              <FlipPageFace page={currentSpread[0]} side="left" />
              <FlipPageFace page={currentSpread[1]} side="right" />
            </div>
          )}
        </div>
      </div>

      {/* Edge controls */}
      <button
        type="button"
        aria-label="Previous page"
        onClick={() => go(-1)}
        disabled={index === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 min-w-[52px] min-h-[52px] rounded-full bg-white/90 text-[#2A3E33] shadow-lg flex items-center justify-center disabled:opacity-30"
      >
        <ChevronLeft className="w-7 h-7" />
      </button>
      <button
        type="button"
        aria-label="Next page"
        onClick={() => go(1)}
        disabled={index === total - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 min-w-[52px] min-h-[52px] rounded-full bg-white/90 text-[#2A3E33] shadow-lg flex items-center justify-center disabled:opacity-30"
      >
        <ChevronRight className="w-7 h-7" />
      </button>

      <div className="mt-6 text-white/80 text-sm">
        {isCover ? 'Cover' : isBack ? 'Back cover' : `Pages ${(index - 1) * 2 + 1}–${(index - 1) * 2 + 2} of ${pages.length}`}
      </div>
    </div>
  )
}

function FlipPageFace({ page, side }: { page: FlipPage | null; side: 'left' | 'right' }) {
  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{
        background: PAPER,
        boxShadow:
          side === 'left'
            ? 'inset -8px 0 16px -8px rgba(0,0,0,0.25)'
            : 'inset 8px 0 16px -8px rgba(0,0,0,0.25)',
      }}
    >
      {page?.imageUrl ? (
        <Image
          src={page.imageUrl}
          alt={page.caption ?? ''}
          fill
          sizes="320px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[#94A09A] text-sm">
          {page?.caption ?? 'Blank page'}
        </div>
      )}
      {page?.caption && page.imageUrl && (
        <div className="absolute bottom-0 inset-x-0 p-3 text-xs text-white bg-gradient-to-t from-black/50 to-transparent">
          {page.caption}
        </div>
      )}
    </div>
  )
}

function CoverPanel({
  cover,
  stacks,
  face,
}: {
  cover: FlipCover
  stacks: { heading: string; body: string }
  face: 'front' | 'back'
}) {
  if (face === 'back') {
    return (
      <div
        className="absolute inset-0 rounded-lg shadow-2xl flex items-center justify-center p-8"
        style={{ backgroundColor: '#2A3E33' }}
      >
        <div
          className="text-center max-w-[240px]"
          style={{ color: cover.textColor, fontFamily: stacks.body, fontSize: 14, lineHeight: 1.5 }}
        >
          {cover.backText || 'Back cover.'}
        </div>
      </div>
    )
  }
  return (
    <div
      className="absolute inset-0 rounded-lg shadow-2xl overflow-hidden"
      style={{ backgroundColor: '#406A56' }}
    >
      {cover.frontImageUrl && (
        <Image src={cover.frontImageUrl} alt="" fill sizes="320px" className="object-cover" unoptimized />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-end p-8 text-center">
        <div
          className="font-bold leading-tight"
          style={{
            color: cover.textColor,
            fontFamily: stacks.heading,
            fontSize: 28,
            textShadow: '0 2px 6px rgba(0,0,0,0.45)',
          }}
        >
          {cover.title}
        </div>
        {cover.subtitle && (
          <div
            className="mt-2"
            style={{
              color: cover.textColor,
              fontFamily: stacks.body,
              fontSize: 13,
              textShadow: '0 1px 3px rgba(0,0,0,0.35)',
            }}
          >
            {cover.subtitle}
          </div>
        )}
      </div>
    </div>
  )
}
