'use client'

import { useMemo } from 'react'
import StoryCard, { type StoryItem } from './StoryCard'

interface StoryTimelineProps {
  items: StoryItem[]
  onSelect?: (item: StoryItem) => void
}

/** Group items by month-year, e.g. "March 2025" */
function groupByMonth(items: StoryItem[]): { label: string; items: StoryItem[] }[] {
  const groups = new Map<string, StoryItem[]>()

  for (const item of items) {
    const d = new Date(item.date)
    if (isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(item)
  }

  // Sort keys descending (newest first)
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a))

  return sortedKeys.map((key) => {
    const groupItems = groups.get(key)!
    const d = new Date(groupItems[0].date)
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return { label, items: groupItems }
  })
}

export default function StoryTimeline({ items, onSelect }: StoryTimelineProps) {
  const groups = useMemo(() => groupByMonth(items), [items])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[#94A09A] text-sm">No items match your search.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-[#DDE3DF]" />

      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.label} className="relative">
            {/* Month header */}
            <div className="flex items-center gap-3 mb-4 pl-0">
              <div className="relative z-10 w-8 h-8 rounded-full bg-[#2D5A3D] flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {group.label.slice(0, 1)}
                </span>
              </div>
              <h3
                className="text-base font-semibold text-[#1A1F1C]"
                style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
              >
                {group.label}
              </h3>
            </div>

            {/* Items in this month */}
            <div className="pl-12 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.items.map((item) => (
                <StoryCard key={`${item.type}-${item.id}`} item={item} onSelect={onSelect} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
