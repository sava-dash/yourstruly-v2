'use client'

import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'

interface MediaItem {
  id: string
  taken_at: string | null
}

interface TimeGroup {
  year: number
  month: number
  monthName: string
  count: number
  key: string
}

interface GalleryTimelineFilterProps {
  media: MediaItem[]
  selectedTimeframe: { year?: number; month?: number } | null
  onTimeframeSelect: (timeframe: { year?: number; month?: number } | null) => void
}

export default function GalleryTimelineFilter({
  media,
  selectedTimeframe,
  onTimeframeSelect
}: GalleryTimelineFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Group media by year/month
  const timeGroups = useMemo(() => {
    const groups: Record<string, TimeGroup> = {}

    media.forEach(item => {
      if (!item.taken_at) return
      const date = new Date(item.taken_at)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const monthName = date.toLocaleString('default', { month: 'short' })
      const key = `${year}-${month.toString().padStart(2, '0')}`

      if (!groups[key]) {
        groups[key] = { year, month, monthName, count: 0, key }
      }
      groups[key].count++
    })

    return Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
  }, [media])

  // Get unique years for year-only view
  const years = useMemo(() => {
    const yearMap: Record<number, number> = {}
    timeGroups.forEach(g => {
      if (!yearMap[g.year]) yearMap[g.year] = 0
      yearMap[g.year] += g.count
    })
    return Object.entries(yearMap)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.year - a.year)
  }, [timeGroups])

  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = direction === 'left' ? -300 : 300
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    setTimeout(checkScroll, 300)
  }

  const isSelected = (year?: number, month?: number) => {
    if (!selectedTimeframe) return false
    if (month) {
      return selectedTimeframe.year === year && selectedTimeframe.month === month
    }
    return selectedTimeframe.year === year && !selectedTimeframe.month
  }

  return (
    <div className="glass-card-page p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[#2D5A3D]" />
          <span className="font-medium text-[#2d2d2d]">Filter by Time</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="p-2 rounded-full bg-white/80 border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="p-2 rounded-full bg-white/80 border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Timeline Filter */}
      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="gallery-timeline-filter"
      >
        {/* All button */}
        <motion.button
          onClick={() => onTimeframeSelect(null)}
          className={`timeline-filter-btn ${!selectedTimeframe ? 'active' : ''}`}
          whileTap={{ scale: 0.95 }}
        >
          <span className="year">All</span>
          <span className="count">{media.filter(m => m.taken_at).length}</span>
        </motion.button>

        {/* Year buttons */}
        {years.map(({ year, count }, index) => (
          <motion.button
            key={year}
            onClick={() => onTimeframeSelect(
              isSelected(year) ? null : { year }
            )}
            className={`timeline-filter-btn ${isSelected(year) ? 'active' : ''}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="year">{year}</span>
            <span className="count">{count} photos</span>
          </motion.button>
        ))}

        {/* Divider */}
        {timeGroups.length > 0 && (
          <div className="w-px h-12 bg-[#2D5A3D]/20 flex-shrink-0 mx-2" />
        )}

        {/* Month buttons (for detailed filtering) */}
        {timeGroups.slice(0, 24).map((group, index) => (
          <motion.button
            key={group.key}
            onClick={() => onTimeframeSelect(
              isSelected(group.year, group.month) 
                ? null 
                : { year: group.year, month: group.month }
            )}
            className={`timeline-filter-btn ${isSelected(group.year, group.month) ? 'active' : ''}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (years.length + index) * 0.02 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="month">{group.monthName}</span>
            <span className="year">{group.year}</span>
            <span className="count">{group.count}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
