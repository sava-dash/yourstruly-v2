'use client'

import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TimelineScrollerProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  startDate?: Date // Earliest date with content
}

export default function TimelineScroller({ 
  selectedDate, 
  onDateChange,
  startDate = new Date(2020, 0, 1)
}: TimelineScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Generate months from startDate to now
  const months: Date[] = []
  const now = new Date()
  let current = new Date(now.getFullYear(), now.getMonth(), 1)
  
  while (current >= startDate) {
    months.push(new Date(current))
    current.setMonth(current.getMonth() - 1)
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short' })
  }

  const formatYear = (date: Date) => {
    return date.getFullYear().toString()
  }

  const isSelected = (date: Date) => {
    return date.getMonth() === selectedDate.getMonth() && 
           date.getFullYear() === selectedDate.getFullYear()
  }

  const isCurrentMonth = (date: Date) => {
    const now = new Date()
    return date.getMonth() === now.getMonth() && 
           date.getFullYear() === now.getFullYear()
  }

  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScroll()
    // Scroll to selected month on mount
    const selectedIndex = months.findIndex(m => isSelected(m))
    if (selectedIndex > 0 && scrollRef.current) {
      const itemWidth = 80
      scrollRef.current.scrollLeft = Math.max(0, (selectedIndex - 2) * itemWidth)
    }
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = 240
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
    setTimeout(checkScroll, 300)
  }

  // Group months by year for year indicators
  let lastYear = -1

  return (
    <div className="relative">
      {/* Gradient fades */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#F5F3EE] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#F5F3EE] to-transparent z-10 pointer-events-none" />
      
      {/* Scroll buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors"
        >
          <ChevronLeft size={18} className="text-[#2D5A3D]" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors"
        >
          <ChevronRight size={18} className="text-[#2D5A3D]" />
        </button>
      )}

      {/* Timeline */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-1 overflow-x-auto scrollbar-hide px-8 py-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {months.map((month, i) => {
          const showYear = month.getFullYear() !== lastYear
          lastYear = month.getFullYear()
          
          return (
            <div key={i} className="flex flex-col items-center">
              {/* Year indicator */}
              {showYear && (
                <span className="text-xs text-[#2D5A3D]/60 font-medium mb-1">
                  {formatYear(month)}
                </span>
              )}
              {!showYear && <span className="text-xs mb-1 opacity-0">-</span>}
              
              {/* Month button */}
              <button
                onClick={() => onDateChange(month)}
                className={`
                  relative px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${isSelected(month) 
                    ? 'bg-[#2D5A3D] text-white shadow-md' 
                    : 'text-[#2D5A3D]/70 hover:bg-[#2D5A3D]/10'
                  }
                `}
              >
                {formatMonth(month)}
                
                {/* Current month indicator */}
                {isCurrentMonth(month) && !isSelected(month) && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#C4A235] rounded-full" />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
