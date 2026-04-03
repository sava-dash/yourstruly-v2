'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface MediaItem {
  id: string
  taken_at: string | null
  created_at?: string
}

interface VerticalTimelineProps {
  media: MediaItem[]
  currentIndex?: number
  onYearClick?: (year: number, firstIndex: number) => void
  className?: string
}

export default function VerticalTimeline({ 
  media, 
  currentIndex = 0, 
  onYearClick,
  className = ''
}: VerticalTimelineProps) {
  // Build year data with positions based on where photos actually are
  const yearData = useMemo(() => {
    const yearsMap = new Map<number, { firstIndex: number; count: number }>()
    
    // Media is already sorted by parent (newest first)
    media.forEach((item, index) => {
      const dateStr = item.taken_at || item.created_at
      if (dateStr) {
        const year = new Date(dateStr).getFullYear()
        if (!yearsMap.has(year)) {
          yearsMap.set(year, { firstIndex: index, count: 1 })
        } else {
          yearsMap.get(year)!.count++
        }
      }
    })
    
    // Sort by year descending (newest first = top)
    // Calculate position based on firstIndex in the sorted array
    const totalPhotos = media.length
    return Array.from(yearsMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, data]) => ({ 
        year, 
        ...data,
        // Position = where this year's photos START in the array (as percentage)
        position: totalPhotos > 1 ? (data.firstIndex / (totalPhotos - 1)) * 100 : 0
      }))
  }, [media])

  // Get current year based on index
  const currentYear = useMemo(() => {
    if (media[currentIndex]) {
      const dateStr = media[currentIndex].taken_at || media[currentIndex].created_at
      if (dateStr) return new Date(dateStr).getFullYear()
    }
    return yearData[0]?.year || new Date().getFullYear()
  }, [media, currentIndex, yearData])

  // Progress position matches photo index (same scale as year positions)
  const progressPosition = useMemo(() => {
    return media.length > 1 ? (currentIndex / (media.length - 1)) * 100 : 0
  }, [media.length, currentIndex])

  if (yearData.length === 0) return null

  return (
    <div className={`relative h-full ${className}`}>
      {/* Track line */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-white/20" />
      
      {/* Progress indicator - moves with current photo index */}
      <motion.div 
        className="absolute right-[-4px] w-[9px] h-[9px] rounded-full bg-[#C4A235] z-10"
        style={{ boxShadow: '0 0 10px rgba(217, 198, 26, 0.5)' }}
        animate={{ top: `${progressPosition}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />

      {/* Year labels - positioned based on where their photos are */}
      {yearData.map((data) => {
        const isActive = data.year === currentYear
        
        return (
          <button
            key={data.year}
            onClick={() => onYearClick?.(data.year, data.firstIndex)}
            className="absolute right-0 flex items-center justify-end gap-1 group"
            style={{ top: `${data.position}%`, transform: 'translateY(-50%)' }}
          >
            <span className={`
              text-xs font-medium transition-all whitespace-nowrap
              ${isActive ? 'text-[#C4A235] font-bold' : 'text-white/40 group-hover:text-white/70'}
            `}>
              {data.year}
            </span>
            <div className={`
              w-2 h-px transition-all
              ${isActive ? 'bg-[#C4A235] w-3' : 'bg-white/30 group-hover:bg-white/50'}
            `} />
          </button>
        )
      })}
    </div>
  )
}
