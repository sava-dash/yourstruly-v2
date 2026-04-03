'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Calendar, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MediaItem {
  id: string
  file_url: string
  file_type?: string
  taken_at: string | null
  created_at?: string
  memory_id: string | null
  memory?: {
    id: string
    title: string | null
    location_name: string | null
  }
}

interface ImmersiveTimelineProps {
  media: MediaItem[]
  initialIndex?: number
  onPhotoClick?: (item: MediaItem) => void
  onIndexChange?: (index: number) => void
  onClose?: () => void
}

export default function ImmersiveTimeline({ media, initialIndex = 0, onPhotoClick, onIndexChange, onClose }: ImmersiveTimelineProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const lastInitialIndexRef = useRef(initialIndex)
  
  // Sync with external initialIndex changes
  useEffect(() => {
    if (initialIndex !== lastInitialIndexRef.current) {
      lastInitialIndexRef.current = initialIndex
      setCurrentIndex(initialIndex)
    }
  }, [initialIndex])
  const [direction, setDirection] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollAccumulator = useRef(0)
  const scrollTimeout = useRef<NodeJS.Timeout | undefined>(undefined)

  // Media is already filtered and sorted by parent - use directly
  const filteredMedia = media

  // Preload nearby images
  useEffect(() => {
    const preloadRange = 3
    for (let i = -preloadRange; i <= preloadRange; i++) {
      const idx = currentIndex + i
      if (idx >= 0 && idx < filteredMedia.length) {
        const img = new Image()
        img.src = filteredMedia[idx].file_url
      }
    }
  }, [currentIndex, filteredMedia])

  const currentPhoto = filteredMedia[currentIndex]
  const currentDateStr = currentPhoto?.taken_at || currentPhoto?.created_at
  const currentDate = currentDateStr ? new Date(currentDateStr) : new Date()

  // Navigation
  const goTo = useCallback((index: number, dir?: number) => {
    const clampedIndex = Math.max(0, Math.min(filteredMedia.length - 1, index))
    if (clampedIndex !== currentIndex) {
      setDirection(dir ?? (clampedIndex > currentIndex ? 1 : -1))
      setCurrentIndex(clampedIndex)
      onIndexChange?.(clampedIndex)
    }
  }, [filteredMedia.length, currentIndex, onIndexChange])

  const goForward = useCallback(() => goTo(currentIndex + 1, 1), [currentIndex, goTo])
  const goBack = useCallback(() => goTo(currentIndex - 1, -1), [currentIndex, goTo])
  const goToNow = useCallback(() => goTo(0, -1), [goTo])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack()
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        goForward()
      }
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goBack, goForward, onClose])

  // Smooth scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      scrollAccumulator.current += e.deltaY * 0.3
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
      
      const threshold = 60
      if (Math.abs(scrollAccumulator.current) >= threshold) {
        if (scrollAccumulator.current > 0) goForward()
        else goBack()
        scrollAccumulator.current = scrollAccumulator.current % threshold
      }
      
      scrollTimeout.current = setTimeout(() => {
        scrollAccumulator.current = 0
      }, 150)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    }
  }, [goBack, goForward])

  // Touch support
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    let touchStartY = 0
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }
    
    const handleTouchEnd = (e: TouchEvent) => {
      const diff = touchStartY - e.changedTouches[0].clientY
      if (Math.abs(diff) > 30) {
        if (diff > 0) goForward()
        else goBack()
      }
    }
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [goBack, goForward])

  if (filteredMedia.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No photos to display</p>
      </div>
    )
  }

  const stackPhotos = filteredMedia.slice(currentIndex + 1, currentIndex + 4)

  // Animation variants
  const cardVariants = {
    enter: (dir: number) => ({
      y: dir > 0 ? 80 : -80,
      scale: 0.9,
      opacity: 0,
    }),
    center: {
      y: 0,
      scale: 1,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    },
    exit: (dir: number) => ({
      y: dir > 0 ? -60 : 60,
      scale: 0.95,
      opacity: 0,
      transition: { type: 'spring' as const, stiffness: 400, damping: 30 }
    })
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-gradient-to-b from-[#1a1a2e] via-[#0d0d1a] to-[#050508]"
      style={{ minHeight: '500px' }}
    >
      {/* Starfield */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 80px 60px, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 140px 90px, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 200px 40px, rgba(255,255,255,0.4), transparent)
          `,
          backgroundSize: '250px 120px',
        }}
      />

      {/* Photo Card Area - Centered */}
      <div 
        className="absolute inset-4 bottom-16 flex items-center justify-center"
        style={{ perspective: '1200px' }}
      >
        {/* Background stack cards */}
        {stackPhotos.map((photo, i) => {
          const stackIndex = i + 1
          return (
            <motion.div
              key={`stack-${photo.id}`}
              className="absolute pointer-events-none"
              animate={{
                y: stackIndex * 8,
                scale: 1 - stackIndex * 0.04,
                opacity: Math.max(0.1, 0.5 - stackIndex * 0.15),
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ zIndex: 10 - stackIndex }}
            >
              <div 
                className="rounded-xl overflow-hidden"
                style={{
                  width: '360px',
                  boxShadow: `0 ${8 + stackIndex * 4}px ${20 + stackIndex * 8}px rgba(0,0,0,0.4)`,
                }}
              >
                <div className="h-7 bg-[#2D5A3D]/80" />
                <div className="aspect-[4/3] bg-[#1a1a2e]">
                  
<img src={photo.file_url} alt="" className="w-full h-full object-cover" loading="eager" />
                </div>
                <div className="h-9 bg-[#F5F3EE]/90" />
              </div>
            </motion.div>
          )
        })}

        {/* Current photo card */}
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={currentPhoto?.id}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="relative z-20 cursor-pointer"
            onClick={() => onPhotoClick?.(currentPhoto)}
          >
            <div 
              className="rounded-xl overflow-hidden"
              style={{
                width: '380px',
                boxShadow: '0 0 80px rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.5)',
              }}
            >
              {/* Header */}
              <div className="h-10 bg-gradient-to-r from-[#2D5A3D] to-[#234A31] flex items-center px-4">
                <Calendar size={14} className="text-white/70 mr-2" />
                <span className="text-white text-sm font-medium truncate">
                  {currentPhoto?.memory?.title || 'Memory'}
                </span>
              </div>
              
              {/* Photo */}
              <div className="aspect-[4/3] bg-[#1a1a2e]">
                <motion.img 
                  src={currentPhoto?.file_url} 
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                  initial={{ scale: 1.02 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              {/* Footer */}
              <div className="px-4 py-2.5 bg-[#F5F3EE] flex items-center justify-between">
                <span className="text-sm font-medium text-[#2d2d2d]">
                  {currentDate.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                {currentPhoto?.memory?.location_name && (
                  <div className="flex items-center gap-1 text-[#2D5A3D]">
                    <MapPin size={12} />
                    <span className="text-xs truncate max-w-[100px]">
                      {currentPhoto.memory.location_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center px-6 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={goBack}
            disabled={currentIndex === 0}
            className={`p-2 rounded-full transition-all ${
              currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <ChevronLeft size={20} className="text-white" />
          </button>
          
          <div className="text-center min-w-[160px]">
            <span className="text-white font-medium text-sm">
              {currentIndex === 0 ? 'Today' : currentDate.toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
              })}
            </span>
          </div>
          
          <button
            onClick={goForward}
            disabled={currentIndex >= filteredMedia.length - 1}
            className={`p-2 rounded-full transition-all ${
              currentIndex >= filteredMedia.length - 1 ? 'opacity-30 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <ChevronRight size={20} className="text-white" />
          </button>
        </div>
        
        {currentIndex > 0 && (
          <button
            onClick={goToNow}
            className="absolute right-4 flex items-center gap-1 text-[#C4A235] hover:text-[#e8d52a] text-sm font-medium"
          >
            <RotateCcw size={14} />
            Return to Now
          </button>
        )}
        
        <span className="absolute left-4 text-white/50 text-xs">
          {currentIndex + 1} / {filteredMedia.length}
        </span>
      </div>
    </div>
  )
}
