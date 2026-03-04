'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Memory {
  id: string
  memory_date: string
  [key: string]: unknown
}

interface TimelineScrubberProps {
  memories: Memory[]
  onJumpTo: (date: Date) => void
  currentScrollDate?: Date | null
}

interface TimeMarker {
  year: number
  month?: number
  date: Date
  count: number
  position: number // 0-1 representing position in timeline
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function TimelineScrubber({ memories, onJumpTo, currentScrollDate }: TimelineScrubberProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const scrubberRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  // Build timeline markers from memories
  const { markers, dateRange, yearMarkers } = useMemo(() => {
    if (memories.length === 0) {
      return { markers: [], dateRange: null, yearMarkers: [] }
    }

    // Get dates and sort
    const dates = memories
      .filter(m => m.memory_date)
      .map(m => new Date(m.memory_date))
      .sort((a, b) => b.getTime() - a.getTime()) // newest first

    if (dates.length === 0) {
      return { markers: [], dateRange: null, yearMarkers: [] }
    }

    const newestDate = dates[0]
    const oldestDate = dates[dates.length - 1]
    const totalRange = newestDate.getTime() - oldestDate.getTime()

    // Group by year-month and count
    const monthGroups = new Map<string, { date: Date; count: number }>()
    
    memories.forEach(m => {
      if (!m.memory_date) return
      const date = new Date(m.memory_date)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      
      if (!monthGroups.has(key)) {
        monthGroups.set(key, { 
          date: new Date(date.getFullYear(), date.getMonth(), 15), // middle of month
          count: 0 
        })
      }
      monthGroups.get(key)!.count++
    })

    // Convert to markers with positions
    const allMarkers: TimeMarker[] = Array.from(monthGroups.entries())
      .map(([key, { date, count }]) => {
        const [year, month] = key.split('-').map(Number)
        const position = totalRange > 0 
          ? 1 - (date.getTime() - oldestDate.getTime()) / totalRange
          : 0.5
        return { year, month, date, count, position }
      })
      .sort((a, b) => a.position - b.position)

    // Extract unique years for main markers
    const years = new Set(allMarkers.map(m => m.year))
    const yearMarkersArr: TimeMarker[] = Array.from(years).map(year => {
      const yearStart = new Date(year, 6, 1) // July (middle of year)
      const position = totalRange > 0 
        ? 1 - (yearStart.getTime() - oldestDate.getTime()) / totalRange
        : 0.5
      const count = allMarkers.filter(m => m.year === year).reduce((sum, m) => sum + m.count, 0)
      return { year, date: yearStart, count, position: Math.max(0, Math.min(1, position)) }
    }).sort((a, b) => a.position - b.position)

    return {
      markers: allMarkers,
      dateRange: { oldest: oldestDate, newest: newestDate, total: totalRange },
      yearMarkers: yearMarkersArr
    }
  }, [memories])

  // Calculate current position based on currentScrollDate
  const currentPosition = useMemo(() => {
    if (!currentScrollDate || !dateRange) return 0
    const pos = 1 - (currentScrollDate.getTime() - dateRange.oldest.getTime()) / dateRange.total
    return Math.max(0, Math.min(1, pos))
  }, [currentScrollDate, dateRange])

  // Get date from position (0-1)
  const getDateFromPosition = useCallback((position: number): Date | null => {
    if (!dateRange) return null
    const clampedPos = Math.max(0, Math.min(1, position))
    const timestamp = dateRange.newest.getTime() - (clampedPos * dateRange.total)
    return new Date(timestamp)
  }, [dateRange])

  // Get position from Y coordinate
  const getPositionFromY = useCallback((clientY: number): number => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    const y = clientY - rect.top
    return Math.max(0, Math.min(1, y / rect.height))
  }, [])

  // Handle drag start
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true)
    setShowTooltip(true)
    const pos = getPositionFromY(clientY)
    setDragPosition(pos)
  }, [getPositionFromY])

  // Handle drag move
  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return
    const pos = getPositionFromY(clientY)
    setDragPosition(pos)
  }, [isDragging, getPositionFromY])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (dragPosition !== null) {
      const date = getDateFromPosition(dragPosition)
      if (date) {
        onJumpTo(date)
      }
    }
    setIsDragging(false)
    setDragPosition(null)
    // Keep tooltip visible briefly after release
    setTimeout(() => setShowTooltip(false), 500)
  }, [dragPosition, getDateFromPosition, onJumpTo])

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientY)
  }, [handleDragStart])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY)
    }

    const handleMouseUp = () => {
      handleDragEnd()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleDragStart(touch.clientY)
  }, [handleDragStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleDragMove(touch.clientY)
  }, [handleDragMove])

  const handleTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // Click to jump
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return
    const pos = getPositionFromY(e.clientY)
    const date = getDateFromPosition(pos)
    if (date) {
      onJumpTo(date)
    }
  }, [isDragging, getPositionFromY, getDateFromPosition, onJumpTo])

  // Get current date being hovered/dragged
  const hoveredDate = useMemo(() => {
    const pos = dragPosition ?? currentPosition
    return getDateFromPosition(pos)
  }, [dragPosition, currentPosition, getDateFromPosition])

  // Format date for tooltip
  const formatTooltipDate = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    })
  }

  // Get the display position (drag position or current scroll position)
  const displayPosition = dragPosition ?? currentPosition

  // Don't render if no dated memories
  if (markers.length === 0) {
    return null
  }

  return (
    <div
      ref={scrubberRef}
      className="fixed right-4 top-1/2 -translate-y-1/2 z-40 
                 hidden sm:flex flex-col items-center gap-2
                 select-none"
      style={{ height: 'min(60vh, 400px)' }}
    >
      {/* Track container */}
      <div 
        ref={trackRef}
        className={`relative w-8 h-full cursor-pointer group
                    ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background track */}
        <div className="absolute left-1/2 -translate-x-1/2 w-1 h-full 
                        bg-[#406A56]/10 rounded-full backdrop-blur-sm" />

        {/* Density visualization */}
        {markers.map((marker, idx) => {
          const maxCount = Math.max(...markers.map(m => m.count))
          const intensity = marker.count / maxCount
          return (
            <div
              key={`${marker.year}-${marker.month}`}
              className="absolute left-1/2 -translate-x-1/2 w-1 rounded-full
                         bg-[#406A56]/30"
              style={{
                top: `${marker.position * 100}%`,
                height: '2px',
                width: `${4 + intensity * 8}px`,
                opacity: 0.3 + intensity * 0.7,
              }}
            />
          )
        })}

        {/* Year markers */}
        {yearMarkers.map((marker) => (
          <div
            key={marker.year}
            className="absolute right-full mr-2 flex items-center gap-1"
            style={{ top: `${marker.position * 100}%`, transform: 'translateY(-50%)' }}
          >
            <span className={`text-[10px] font-bold whitespace-nowrap
                             ${isDragging ? 'text-[#406A56]' : 'text-[#406A56]/60'}
                             transition-colors`}>
              {marker.year}
            </span>
            <div className="w-2 h-px bg-[#406A56]/30" />
          </div>
        ))}

        {/* Current position indicator */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 z-10"
          style={{ top: `${displayPosition * 100}%` }}
          animate={{ 
            scale: isDragging ? 1.2 : 1,
            y: '-50%'
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Outer glow */}
          <div className={`absolute -inset-2 rounded-full 
                          ${isDragging ? 'bg-[#406A56]/20' : 'bg-transparent'}
                          transition-colors`} />
          
          {/* Main indicator */}
          <div className={`w-4 h-4 rounded-full shadow-lg
                          ${isDragging 
                            ? 'bg-[#406A56] ring-4 ring-[#406A56]/30' 
                            : 'bg-[#406A56]/80 ring-2 ring-white'}
                          transition-all duration-200`}>
            {/* Inner dot */}
            <div className="absolute inset-1 rounded-full bg-white/80" />
          </div>
        </motion.div>

        {/* Tooltip */}
        <AnimatePresence>
          {(isDragging || showTooltip) && hoveredDate && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute right-full mr-4 
                         px-3 py-1.5 rounded-lg
                         bg-[#406A56] text-white text-sm font-medium
                         shadow-lg whitespace-nowrap pointer-events-none"
              style={{ 
                top: `${displayPosition * 100}%`, 
                transform: 'translateY(-50%)' 
              }}
            >
              {formatTooltipDate(hoveredDate)}
              {/* Arrow */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full
                              border-8 border-transparent border-l-[#406A56]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover hint line */}
        <div className={`absolute inset-0 
                        ${isDragging ? '' : 'group-hover:bg-[#406A56]/5'}
                        rounded-lg transition-colors`} />
      </div>

      {/* Top label (newest) */}
      <div className="absolute -top-6 text-[9px] text-[#406A56]/50 font-medium uppercase tracking-wider">
        Now
      </div>

      {/* Bottom label (oldest) */}
      <div className="absolute -bottom-6 text-[9px] text-[#406A56]/50 font-medium uppercase tracking-wider">
        {dateRange?.oldest.getFullYear()}
      </div>
    </div>
  )
}

export default TimelineScrubber
