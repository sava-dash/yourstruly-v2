'use client'

import Image from 'next/image'
import { Mic, Play, MapPin, Plus, Camera, Video } from 'lucide-react'

export type ContentType = 'memory' | 'wisdom' | 'photo'

export interface MediaCounts {
  photos: number
  videos: number
  audio: number
}

export interface StoryItem {
  id: string
  type: ContentType
  title: string
  /** Full description / response text. The card renders first ~2 lines as preview. */
  preview?: string
  imageUrl?: string
  /** When the memory happened (memory_date, taken_at, etc.) */
  date: string
  /** When the user saved this entry (DB created_at) — for "latest first" */
  savedAt?: string
  mood?: string | null
  category?: string
  locationName?: string
  /** Names extracted from the memory description (AI-extracted). */
  people?: string[]
  /** Tags on a wisdom entry. */
  tags?: string[]
  /** For wisdom only — whether the user recorded audio. */
  hasAudio?: boolean
  /** Breakdown of attached media items. */
  mediaCounts?: MediaCounts
}

// Editorial palette per content type.
const TYPE_STYLE: Record<ContentType, { bar: string; label: string; icon: typeof Mic }> = {
  memory: { bar: 'var(--ed-blue)',   label: 'MEMORY', icon: Mic },
  wisdom: { bar: 'var(--ed-black)',  label: 'WISDOM', icon: Play },
  photo:  { bar: 'var(--ed-yellow)', label: 'MEDIA',  icon: MapPin },
}

// Deterministic avatar color from a name — same name always the same color.
const AVATAR_PALETTE = [
  { bg: 'var(--ed-red)',    fg: '#fff' },
  { bg: 'var(--ed-blue)',   fg: '#fff' },
  { bg: 'var(--ed-yellow)', fg: 'var(--ed-ink)' },
  { bg: 'var(--ed-black)',  fg: '#fff' },
] as const

function pickAvatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}

function formatEditorialDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  return `${month} ${d.getDate()} · ${d.getFullYear()}`
}

interface StoryCardProps {
  item: StoryItem
  onSelect?: (item: StoryItem) => void
  /** When present, the hover-revealed "+ ADD" button calls this. */
  onAdd?: (item: StoryItem) => void
}

/**
 * Small avatar-stack for `extracted_entities.people`. Renders up to 3 circular
 * initials in the editorial palette; overflow shown as "+N".
 */
function PeopleStack({ people }: { people: string[] }) {
  if (!people.length) return null
  const head = people.slice(0, 3)
  const rest = people.length - head.length
  return (
    <div className="flex items-center" title={people.join(', ')}>
      {head.map((name, i) => {
        const c = pickAvatarColor(name)
        return (
          <span
            key={`${name}-${i}`}
            className="flex items-center justify-center text-[10px] font-bold"
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              background: c.bg,
              color: c.fg,
              border: '1.5px solid var(--ed-ink)',
              marginLeft: i === 0 ? 0 : -6,
              fontFamily: 'var(--font-mono)',
              zIndex: head.length - i,
            }}
          >
            {initialsFromName(name)}
          </span>
        )
      })}
      {rest > 0 && (
        <span
          className="flex items-center justify-center text-[9px] font-bold ml-[-6px]"
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: 'var(--ed-paper)',
            color: 'var(--ed-ink)',
            border: '1.5px solid var(--ed-ink)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          +{rest}
        </span>
      )}
    </div>
  )
}

/** Tiny monospace badges like `🎙 AUDIO` / `📷 5` — rendered from mediaCounts. */
function MediaIndicators({
  counts,
  hasAudio,
}: {
  counts?: MediaCounts
  hasAudio?: boolean
}) {
  const items: { icon: typeof Mic; label: string }[] = []
  if (counts?.photos) items.push({ icon: Camera, label: counts.photos > 1 ? `${counts.photos}` : '1' })
  if (counts?.videos) items.push({ icon: Video, label: counts.videos > 1 ? `${counts.videos}` : '1' })
  if (counts?.audio || hasAudio) items.push({ icon: Mic, label: 'AUDIO' })
  if (!items.length) return null
  return (
    <div className="flex items-center gap-2">
      {items.map((it, i) => {
        const Icon = it.icon
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-[10px] tracking-[0.12em] text-[var(--ed-muted)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <Icon size={11} strokeWidth={2.5} />
            {it.label}
          </span>
        )
      })}
    </div>
  )
}

/** A colored editorial chip. Used for mood (filled) and category (outline). */
function Chip({
  label,
  tone,
}: {
  label: string
  tone: 'filled-blue' | 'filled-red' | 'filled-yellow' | 'filled-black' | 'outline'
}) {
  const styles: Record<typeof tone, React.CSSProperties> = {
    'filled-blue':   { background: 'var(--ed-blue)',   color: '#fff' },
    'filled-red':    { background: 'var(--ed-red)',    color: '#fff' },
    'filled-yellow': { background: 'var(--ed-yellow)', color: 'var(--ed-ink)' },
    'filled-black':  { background: 'var(--ed-ink)',    color: '#fff' },
    'outline':       { background: 'transparent',      color: 'var(--ed-ink)' },
  }
  return (
    <span
      className="inline-flex items-center px-2 py-[3px] text-[10px] tracking-[0.15em] font-bold"
      style={{
        ...styles[tone],
        fontFamily: 'var(--font-mono)',
        border: '1.5px solid var(--ed-ink)',
        borderRadius: 2,
      }}
    >
      {label.toUpperCase()}
    </span>
  )
}

/** Hover-revealed "+ ADD" pill in the top-right corner. */
function AddBadge({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-[0.18em] opacity-0 translate-y-[-4px] group-hover:opacity-100 group-hover:translate-y-0 transition-all"
      style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        background: 'var(--ed-red)',
        color: '#fff',
        border: '2px solid var(--ed-ink)',
        borderRadius: 2,
      }}
    >
      <Plus size={11} strokeWidth={3} />
      ADD
    </button>
  )
}

export default function StoryCard({ item, onSelect, onAdd }: StoryCardProps) {
  const style = TYPE_STYLE[item.type]
  const Icon = style.icon

  const handleOpen = () => onSelect?.(item)
  const handleAdd = (e: React.MouseEvent) => {
    // Keep the card click from firing when the user clicks the ADD badge.
    e.stopPropagation()
    onAdd?.(item)
  }

  // ── PHOTO card (no ADD — photos are a target, not a source) ────────────
  if (item.type === 'photo' && item.imageUrl) {
    return (
      <button onClick={handleOpen} className="group block text-left w-full relative">
        <div
          className="relative flex overflow-hidden transition-transform group-hover:-translate-y-0.5"
          style={{
            background: 'var(--ed-paper)',
            border: '2px solid var(--ed-ink)',
            borderRadius: 2,
          }}
        >
          <span
            aria-hidden
            className="shrink-0"
            style={{ width: 10, background: style.bar, borderRight: '2px solid var(--ed-ink)' }}
          />
          <div className="relative flex-1 aspect-[4/3] bg-[var(--ed-cream)]">
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
              <p
                className="text-[10px] text-white/90 tracking-[0.14em]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                MEDIA · {formatEditorialDate(item.date).toUpperCase()}
              </p>
              {item.locationName && (
                <p className="text-sm text-white font-semibold truncate">{item.locationName}</p>
              )}
            </div>
          </div>
        </div>
      </button>
    )
  }

  // ── WISDOM card (distinct prompt-as-quote layout) ───────────────────────
  if (item.type === 'wisdom') {
    const categoryLabel = item.category ? item.category.replace(/_/g, ' ') : null
    return (
      <button onClick={handleOpen} className="group block text-left w-full relative">
        <div
          className="relative flex overflow-hidden transition-transform group-hover:-translate-y-0.5"
          style={{
            background: 'var(--ed-paper)',
            border: '2px solid var(--ed-ink)',
            borderRadius: 2,
          }}
        >
          <span
            aria-hidden
            className="shrink-0"
            style={{ width: 10, background: style.bar, borderRight: '2px solid var(--ed-ink)' }}
          />
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span aria-hidden className="inline-block rounded-full" style={{ width: 8, height: 8, background: style.bar }} />
              <span className="text-[10px] tracking-[0.18em] text-[var(--ed-ink)]" style={{ fontFamily: 'var(--font-mono)' }}>
                {style.label} · {formatEditorialDate(item.date)}
              </span>
            </div>

            {/* Prompt as italic quoted line — smaller, muted */}
            <p
              className="text-[13px] text-[var(--ed-muted)] italic line-clamp-2 leading-snug mb-2"
              style={{ fontFamily: 'var(--font-dm-serif), serif' }}
            >
              “{item.title}”
            </p>

            {/* Response is the body */}
            {item.preview && (
              <p className="text-[15px] text-[var(--ed-ink)] line-clamp-3 leading-[1.35]">
                {item.preview}
              </p>
            )}

            {/* Category + tags row */}
            {(categoryLabel || item.tags?.length) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {categoryLabel && <Chip label={categoryLabel} tone="outline" />}
                {item.tags?.slice(0, 2).map((tag) => (
                  <Chip key={tag} label={tag} tone="outline" />
                ))}
              </div>
            )}

            <div className="flex items-end justify-between gap-3 mt-4">
              <MediaIndicators hasAudio={item.hasAudio} />
              <span
                aria-hidden
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: 28, height: 28, borderRadius: 999,
                  background: style.bar, color: '#fff',
                  border: '2px solid var(--ed-ink)',
                }}
              >
                <Icon size={14} strokeWidth={2.5} />
              </span>
            </div>
          </div>
        </div>
        {onAdd && <AddBadge onClick={handleAdd} />}
      </button>
    )
  }

  // ── MEMORY card (default) ───────────────────────────────────────────────
  const moodLabel = item.mood ? item.mood.replace(/_/g, ' ') : null
  const categoryLabel = item.category ? item.category.replace(/_/g, ' ') : null
  const hasChips = moodLabel || categoryLabel
  const hasFooter = (item.people && item.people.length > 0) || item.mediaCounts

  return (
    <button onClick={handleOpen} className="group block text-left w-full relative">
      <div
        className="relative flex overflow-hidden transition-transform group-hover:-translate-y-0.5"
        style={{
          background: 'var(--ed-paper)',
          border: '2px solid var(--ed-ink)',
          borderRadius: 2,
        }}
      >
        {/* Thick colored left bar — type indicator */}
        <span
          aria-hidden
          className="shrink-0"
          style={{ width: 10, background: style.bar, borderRight: '2px solid var(--ed-ink)' }}
        />

        <div className="flex-1 p-4 sm:p-5">
          {/* Top row: type label + date on left, small cover thumb on right */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span aria-hidden className="inline-block rounded-full shrink-0" style={{ width: 8, height: 8, background: style.bar }} />
              <span
                className="text-[10px] tracking-[0.18em] text-[var(--ed-ink)] truncate"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {style.label} · {formatEditorialDate(item.date)}
              </span>
            </div>
            {item.imageUrl && (
              <div
                className="relative shrink-0"
                style={{ width: 56, height: 56, border: '2px solid var(--ed-ink)', borderRadius: 2, overflow: 'hidden' }}
              >
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="56px"
                />
              </div>
            )}
          </div>

          {/* Bold display title */}
          <h3
            className="text-[18px] sm:text-[19px] leading-[1.15] text-[var(--ed-ink)] line-clamp-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {item.title}
          </h3>

          {/* Preview snippet — the actual memory content (2 lines) */}
          {item.preview && (
            <p className="text-[13px] text-[var(--ed-muted)] line-clamp-2 leading-[1.4] mt-2">
              {item.preview}
            </p>
          )}

          {/* Mood + Category + synopsis tag chips */}
          {(hasChips || (item.tags && item.tags.length > 0)) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {moodLabel && <Chip label={moodLabel} tone="filled-red" />}
              {categoryLabel && <Chip label={categoryLabel} tone="outline" />}
              {/* Synopsis tags — concrete recall keywords (e.g. "summer",
                  "kitchen", "first-job"). Cap at 2 so the card stays scannable. */}
              {item.tags?.slice(0, 2).map((tag) => (
                <Chip key={tag} label={tag} tone="outline" />
              ))}
            </div>
          )}

          {/* Footer: people avatars + media indicators (left), type icon (right) */}
          <div className="flex items-end justify-between gap-3 mt-4">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              {item.people && item.people.length > 0 && <PeopleStack people={item.people} />}
              <MediaIndicators counts={item.mediaCounts} />
              {!hasFooter && item.locationName && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] tracking-[0.12em] text-[var(--ed-muted)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <MapPin size={11} strokeWidth={2.5} />
                  {item.locationName}
                </span>
              )}
            </div>
            <span
              aria-hidden
              className="shrink-0 flex items-center justify-center"
              style={{
                width: 28, height: 28, borderRadius: 999,
                background: style.bar, color: '#fff',
                border: '2px solid var(--ed-ink)',
              }}
            >
              <Icon size={14} strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </div>
      {onAdd && <AddBadge onClick={handleAdd} />}
    </button>
  )
}
