'use client'

import Image from 'next/image'

export type ContentType = 'memory' | 'wisdom' | 'photo'

export interface StoryItem {
  id: string
  type: ContentType
  title: string
  subtitle?: string
  imageUrl?: string
  /** When the memory happened (memory_date, taken_at, etc.) */
  date: string
  /** When the user saved this entry (DB created_at) — for "latest first" */
  savedAt?: string
  mood?: string | null
  category?: string
  locationName?: string
}

const TYPE_INDICATOR: Record<ContentType, { color: string; label: string }> = {
  memory: { color: '#2D5A3D', label: 'Memory' },
  wisdom: { color: '#C4A235', label: 'Wisdom' },
  photo: { color: '#4A7FB5', label: 'Photo' },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface StoryCardProps {
  item: StoryItem
  onSelect?: (item: StoryItem) => void
}

export default function StoryCard({ item, onSelect }: StoryCardProps) {
  const indicator = TYPE_INDICATOR[item.type]
  const hasImage = item.type === 'photo' || !!item.imageUrl

  const handleClick = () => {
    onSelect?.(item)
  }

  // Photo-only cards: compact image grid style
  if (item.type === 'photo' && item.imageUrl) {
    return (
      <button onClick={handleClick} className="block group text-left w-full">
        <div className="relative aspect-square rounded-xl overflow-hidden bg-[#F0F0EC] shadow-sm hover:shadow-lg transition-all hover:scale-[1.02]">
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            unoptimized
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            {item.locationName && (
              <p className="text-white text-xs truncate drop-shadow-sm">{item.locationName}</p>
            )}
            <p className="text-white/70 text-[10px] drop-shadow-sm">{formatDate(item.date)}</p>
          </div>
        </div>
      </button>
    )
  }

  // Memory and Wisdom cards: richer layout
  return (
    <button onClick={handleClick} className="block group text-left w-full">
      <div className="bg-white rounded-xl border border-[#DDE3DF] shadow-sm overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5">
        {/* Image area for memories with photos */}
        {hasImage && item.imageUrl && (
          <div className="relative w-full aspect-[16/9] bg-[#F0F0EC]">
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        )}

        {/* Text content */}
        <div className="p-4">
          {/* Type badge */}
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: indicator.color }}
            />
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: indicator.color }}>
              {indicator.label}
            </span>
            <span className="text-[11px] text-[#94A09A] ml-auto">{formatDate(item.date)}</span>
          </div>

          <h3
            className="text-[15px] font-semibold text-[#1A1F1C] line-clamp-2 leading-snug"
            style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
          >
            {item.title}
          </h3>

          {item.subtitle && (
            <p className="text-[13px] text-[#5A6660] line-clamp-2 mt-1.5 leading-relaxed">
              {item.subtitle}
            </p>
          )}

          {/* Badges row */}
          {(item.mood || item.category || item.locationName) && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {item.mood && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#2D5A3D]/8 text-[#2D5A3D] font-medium">
                  {item.mood}
                </span>
              )}
              {item.category && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#C4A235]/10 text-[#C4A235] font-medium">
                  {item.category}
                </span>
              )}
              {item.locationName && (
                <span className="text-[11px] text-[#94A09A] truncate max-w-[140px]">
                  📍 {item.locationName}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
