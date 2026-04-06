'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { type StoryItem } from './StoryCard'

interface StoryThreadProps {
  items: StoryItem[]
  onSelect?: (item: StoryItem) => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getYear(dateStr: string): number {
  return new Date(dateStr).getFullYear()
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'long' })
}

function getDayKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / msPerDay
  )
}

function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural || singular + 's'}`
}

function timeGapText(days: number): string | null {
  if (days > 365) {
    const years = Math.round(days / 365)
    return years === 1 ? 'A year passed...' : `${years} years passed...`
  }
  if (days > 180) {
    const months = Math.round(days / 30)
    return `${months} months passed...`
  }
  return null
}

/* ------------------------------------------------------------------ */
/*  Types for grouped structure                                        */
/* ------------------------------------------------------------------ */

interface ConnectorNode {
  kind: 'connector'
  text: string
}

interface YearHeader {
  kind: 'year-header'
  year: number
  counts: { memories: number; wisdom: number; photos: number }
}

interface MonthHeader {
  kind: 'month-header'
  label: string
}

interface EntryNode {
  kind: 'entry'
  item: StoryItem
}

interface PhotoGalleryNode {
  kind: 'photo-gallery'
  items: StoryItem[]
}

type ThreadNode =
  | ConnectorNode
  | YearHeader
  | MonthHeader
  | EntryNode
  | PhotoGalleryNode

/* ------------------------------------------------------------------ */
/*  Build the thread                                                   */
/* ------------------------------------------------------------------ */

function buildThread(items: StoryItem[]): ThreadNode[] {
  if (items.length === 0) return []

  // Sort oldest first so the narrative reads chronologically
  const sorted = [...items].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const nodes: ThreadNode[] = []
  let currentYear: number | null = null
  let currentMonth: string | null = null
  let prevDate: string | null = null

  // Collect year-level counts for chapter headers
  const yearCounts = new Map<number, { memories: number; wisdom: number; photos: number }>()
  for (const item of sorted) {
    const y = getYear(item.date)
    if (!yearCounts.has(y)) yearCounts.set(y, { memories: 0, wisdom: 0, photos: 0 })
    const c = yearCounts.get(y)!
    if (item.type === 'memory') c.memories++
    else if (item.type === 'wisdom') c.wisdom++
    else c.photos++
  }

  let i = 0
  while (i < sorted.length) {
    const item = sorted[i]
    const year = getYear(item.date)
    const month = getMonthKey(item.date)

    // Year change => chapter divider
    if (year !== currentYear) {
      // If there was a previous year, add a gap connector if needed
      if (prevDate) {
        const gap = daysBetween(prevDate, item.date)
        const gapText = timeGapText(gap)
        if (gapText) {
          nodes.push({ kind: 'connector', text: gapText })
        }
      }
      currentYear = year
      currentMonth = null
      nodes.push({
        kind: 'year-header',
        year,
        counts: yearCounts.get(year) || { memories: 0, wisdom: 0, photos: 0 },
      })
    } else if (prevDate) {
      // Same year — check for time gap connector
      const gap = daysBetween(prevDate, item.date)
      const gapText = timeGapText(gap)
      if (gapText) {
        nodes.push({ kind: 'connector', text: gapText })
      }
    }

    // Month header
    if (month !== currentMonth) {
      currentMonth = month
      nodes.push({ kind: 'month-header', label: getMonthLabel(item.date) })
    }

    // Same-day grouping connector
    if (prevDate && getDayKey(prevDate) === getDayKey(item.date) && nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1]
      if (lastNode.kind !== 'month-header' && lastNode.kind !== 'year-header') {
        nodes.push({ kind: 'connector', text: 'Later that day...' })
      }
    }

    // Batch consecutive photos into a gallery
    if (item.type === 'photo') {
      const photoGroup: StoryItem[] = [item]
      let j = i + 1
      while (
        j < sorted.length &&
        sorted[j].type === 'photo' &&
        getDayKey(sorted[j].date) === getDayKey(item.date)
      ) {
        photoGroup.push(sorted[j])
        j++
      }
      if (photoGroup.length >= 2) {
        nodes.push({ kind: 'photo-gallery', items: photoGroup })
        prevDate = photoGroup[photoGroup.length - 1].date
        i = j
        continue
      }
    }

    nodes.push({ kind: 'entry', item })
    prevDate = item.date
    i++
  }

  return nodes
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ChapterDivider({ year, counts }: { year: number; counts: YearHeader['counts'] }) {
  const parts: string[] = []
  if (counts.memories > 0) parts.push(pluralize(counts.memories, 'memory', 'memories'))
  if (counts.wisdom > 0) parts.push(pluralize(counts.wisdom, 'wisdom'))
  if (counts.photos > 0) parts.push(pluralize(counts.photos, 'photo'))

  return (
    <div className="thread-fade-in flex flex-col items-center py-10">
      <div className="flex items-center gap-4 w-full">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C4A235]/40 to-[#C4A235]/40" />
        <h2
          className="text-4xl text-[#2D5A3D] tracking-tight"
          style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
        >
          {year}
        </h2>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#C4A235]/40 to-[#C4A235]/40" />
      </div>
      {parts.length > 0 && (
        <p className="text-xs text-[#94A09A] mt-2 tracking-wide">
          {parts.join(' \u00b7 ')}
        </p>
      )}
    </div>
  )
}

function MonthMarker({ label }: { label: string }) {
  return (
    <div className="thread-fade-in flex items-center gap-3 pt-6 pb-2">
      <div className="w-2 h-2 rounded-full bg-[#C4A235]/50" />
      <h3
        className="text-lg text-[#5A6660] tracking-wide"
        style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
      >
        {label}
      </h3>
      <div className="flex-1 h-px bg-[#DDE3DF]" />
    </div>
  )
}

function Connector({ text }: { text: string }) {
  return (
    <div className="thread-fade-in flex flex-col items-center py-6">
      <div className="flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-[#94A09A]/50" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#94A09A]/40" />
        <span className="w-1 h-1 rounded-full bg-[#94A09A]/50" />
      </div>
      <p
        className="text-sm text-[#94A09A] italic mt-2"
        style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
      >
        {text}
      </p>
    </div>
  )
}

function MemoryEntry({
  item,
  onSelect,
}: {
  item: StoryItem
  onSelect?: (item: StoryItem) => void
}) {
  return (
    <button
      onClick={() => onSelect?.(item)}
      className="thread-fade-in block w-full text-left group"
    >
      <div className="bg-white/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
        {/* Hero image */}
        {item.imageUrl && (
          <div className="relative w-full aspect-[16/9] bg-[#F0F0EC]">
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              unoptimized
              className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
              sizes="(max-width: 672px) 100vw, 672px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <h4
              className="absolute bottom-4 left-5 right-5 text-xl text-white drop-shadow-lg leading-snug"
              style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
            >
              {item.title}
            </h4>
          </div>
        )}
        <div className="px-5 py-4">
          {/* Title when no image */}
          {!item.imageUrl && (
            <h4
              className="text-xl text-[#1A1F1C] mb-2 leading-snug"
              style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
            >
              {item.title}
            </h4>
          )}
          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs text-[#94A09A] mb-2">
            <span>{formatShortDate(item.date)}</span>
            {item.locationName && (
              <>
                <span className="w-1 h-1 rounded-full bg-[#94A09A]/50" />
                <span>{item.locationName}</span>
              </>
            )}
          </div>
          {/* Description preview */}
          {item.subtitle && (
            <p
              className="text-[15px] text-[#5A6660] leading-relaxed line-clamp-3 italic"
              style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
            >
              {item.subtitle}
            </p>
          )}
          {/* Mood badge */}
          {item.mood && (
            <span className="inline-block mt-3 text-xs px-2.5 py-1 rounded-full bg-[#2D5A3D]/8 text-[#2D5A3D] font-medium">
              {item.mood}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function WisdomEntry({
  item,
  onSelect,
}: {
  item: StoryItem
  onSelect?: (item: StoryItem) => void
}) {
  return (
    <button
      onClick={() => onSelect?.(item)}
      className="thread-fade-in block w-full text-left group"
    >
      <div className="bg-[#FDFCF8] rounded-2xl px-6 py-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 border border-[#C4A235]/15">
        {/* Decorative quote mark */}
        <span
          className="block text-5xl leading-none text-[#C4A235] -mb-2"
          style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
          aria-hidden="true"
        >
          &ldquo;
        </span>
        {/* Prompt / question */}
        <h4 className="text-[15px] font-semibold text-[#1A1F1C] leading-snug mb-3">
          {item.title}
        </h4>
        {/* Response preview */}
        {item.subtitle && (
          <p
            className="text-[15px] text-[#5A6660] leading-relaxed line-clamp-3 italic"
            style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
          >
            {item.subtitle}
          </p>
        )}
        {/* Category badge + date */}
        <div className="flex items-center gap-2 mt-4">
          {item.category && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#C4A235]/10 text-[#C4A235] font-medium">
              {item.category}
            </span>
          )}
          <span className="text-xs text-[#94A09A] ml-auto">{formatShortDate(item.date)}</span>
        </div>
      </div>
    </button>
  )
}

function PhotoEntry({
  item,
  onSelect,
}: {
  item: StoryItem
  onSelect?: (item: StoryItem) => void
}) {
  return (
    <button
      onClick={() => onSelect?.(item)}
      className="thread-fade-in block w-full text-left group"
    >
      <div className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
        {item.imageUrl && (
          <div className="relative w-full aspect-[4/3] bg-[#F0F0EC]">
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              unoptimized
              className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
              sizes="(max-width: 672px) 100vw, 672px"
            />
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-[#94A09A] mt-2 px-1">
          {item.locationName && <span>{item.locationName}</span>}
          {item.locationName && <span className="w-1 h-1 rounded-full bg-[#94A09A]/50" />}
          <span>{formatShortDate(item.date)}</span>
        </div>
      </div>
    </button>
  )
}

function PhotoGallery({
  items,
  onSelect,
}: {
  items: StoryItem[]
  onSelect?: (item: StoryItem) => void
}) {
  return (
    <div className="thread-fade-in">
      <div
        className={`grid gap-3 ${
          items.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
        }`}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect?.(item)}
            className="block group text-left"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-[#F0F0EC] shadow-sm hover:shadow-md transition-all duration-300">
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 672px) 50vw, 224px"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
              <span className="absolute bottom-1.5 left-2 text-white/80 text-[10px] drop-shadow-sm">
                {formatShortDate(item.date)}
              </span>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-[#94A09A] mt-2 text-center">
        {items[0].locationName || formatDate(items[0].date)}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function StoryThread({ items, onSelect }: StoryThreadProps) {
  const nodes = useMemo(() => buildThread(items), [items])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        {/* Warm journal icon */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-6 text-[#C4A235]/60"
          aria-hidden="true"
        >
          <rect x="12" y="8" width="40" height="48" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M12 16H52" stroke="currentColor" strokeWidth="1.5" />
          <path d="M20 26H44" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <path d="M20 32H40" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <path d="M20 38H42" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <path d="M20 44H36" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <circle cx="16" cy="12" r="1.5" fill="currentColor" opacity="0.6" />
        </svg>
        <p
          className="text-lg text-[#5A6660] leading-relaxed"
          style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
        >
          Your story begins here. Record your first memory to start the thread.
        </p>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @keyframes threadFadeIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .thread-fade-in {
          animation: threadFadeIn 0.5s ease-out both;
        }
      `}</style>

      <div className="max-w-2xl mx-auto pb-12">
        {nodes.map((node, idx) => {
          const key = `thread-${idx}`
          const delay = Math.min(idx * 60, 600)

          switch (node.kind) {
            case 'year-header':
              return (
                <div key={key} style={{ animationDelay: `${delay}ms` }}>
                  <ChapterDivider year={node.year} counts={node.counts} />
                </div>
              )

            case 'month-header':
              return (
                <div key={key} style={{ animationDelay: `${delay}ms` }}>
                  <MonthMarker label={node.label} />
                </div>
              )

            case 'connector':
              return (
                <div key={key} style={{ animationDelay: `${delay}ms` }}>
                  <Connector text={node.text} />
                </div>
              )

            case 'entry': {
              const { item } = node
              return (
                <div
                  key={key}
                  className="py-4"
                  style={{ animationDelay: `${delay}ms` }}
                >
                  {item.type === 'memory' && (
                    <MemoryEntry item={item} onSelect={onSelect} />
                  )}
                  {item.type === 'wisdom' && (
                    <WisdomEntry item={item} onSelect={onSelect} />
                  )}
                  {item.type === 'photo' && (
                    <PhotoEntry item={item} onSelect={onSelect} />
                  )}
                </div>
              )
            }

            case 'photo-gallery':
              return (
                <div
                  key={key}
                  className="py-4"
                  style={{ animationDelay: `${delay}ms` }}
                >
                  <PhotoGallery items={node.items} onSelect={onSelect} />
                </div>
              )

            default:
              return null
          }
        })}
      </div>
    </>
  )
}
