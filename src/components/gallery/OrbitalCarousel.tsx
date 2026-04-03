'use client'

import { useRef, useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface Album {
  id: string
  name: string
  cover: string
  count: number
  type: 'location' | 'people' | 'time' | 'custom' | 'recent'
  images?: string[]
}

interface OrbitalCarouselProps {
  albums: Album[]
  onAlbumClick?: (album: Album) => void
}

export default function OrbitalCarousel({ albums, onAlbumClick }: OrbitalCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement[]>([])
  const [activeIndex, setActiveIndex] = useState(Math.floor(albums.length / 2))
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const currentRotation = useRef(0)
  
  // Configuration
  const cardWidth = 200
  const cardHeight = 260
  const radius = 400 // Distance from center
  const angleStep = 360 / Math.max(albums.length, 1)
  
  // Position cards in 3D orbital arrangement
  const positionCards = (rotation: number = currentRotation.current) => {
    cardsRef.current.forEach((card, i) => {
      if (!card) return
      
      const angle = (i * angleStep + rotation) * (Math.PI / 180)
      
      // Calculate position on arc (only X and Z, keeping Y flat)
      const x = Math.sin(angle) * radius
      const z = Math.cos(angle) * radius - radius // Shift so center is at z=0
      
      // Scale and opacity based on z position (front = 1, back = smaller)
      const normalizedZ = (z + radius) / (radius * 2) // 0 to 1
      const scale = 0.6 + normalizedZ * 0.4 // 0.6 to 1.0
      const opacity = 0.3 + normalizedZ * 0.7 // 0.3 to 1.0
      
      // Rotation to face viewer
      const rotateY = -angle * (180 / Math.PI) // Face outward from center
      
      gsap.to(card, {
        x,
        z,
        scale,
        opacity,
        rotateY: rotateY + 180, // Face camera
        duration: 0.5,
        ease: 'power2.out',
        transformOrigin: 'center center',
      })
    })
  }
  
  // Initialize positions
  useEffect(() => {
    positionCards()
  }, [albums.length])
  
  // Navigate to specific card
  const navigateTo = (index: number) => {
    const targetRotation = -index * angleStep
    currentRotation.current = targetRotation
    setActiveIndex(index)
    positionCards(targetRotation)
  }
  
  // Navigate left/right
  const navigate = (direction: 'left' | 'right') => {
    const newIndex = direction === 'right' 
      ? (activeIndex + 1) % albums.length
      : (activeIndex - 1 + albums.length) % albums.length
    navigateTo(newIndex)
  }
  
  // Handle drag
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    dragStartX.current = 'touches' in e ? e.touches[0].clientX : e.clientX
  }
  
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    
    const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const deltaX = currentX - dragStartX.current
    const rotationDelta = (deltaX / radius) * 50
    
    positionCards(currentRotation.current + rotationDelta)
  }
  
  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    
    const currentX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX
    const deltaX = currentX - dragStartX.current
    const rotationDelta = (deltaX / radius) * 50
    
    currentRotation.current += rotationDelta
    
    // Snap to nearest card
    const snappedRotation = Math.round(currentRotation.current / angleStep) * angleStep
    currentRotation.current = snappedRotation
    
    // Update active index
    const newIndex = Math.round(-snappedRotation / angleStep) % albums.length
    setActiveIndex((newIndex + albums.length) % albums.length)
    
    positionCards(snappedRotation)
  }
  
  // Handle card click
  const handleCardClick = (album: Album, index: number) => {
    if (index === activeIndex) {
      setSelectedAlbum(album)
      onAlbumClick?.(album)
    } else {
      navigateTo(index)
    }
  }
  
  if (albums.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-500">
        No albums to display
      </div>
    )
  }
  
  return (
    <div className="relative">
      {/* Carousel Container */}
      <div 
        ref={containerRef}
        className="h-[400px] relative overflow-hidden"
        style={{ perspective: '1200px' }}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* 3D Stage */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ 
            transformStyle: 'preserve-3d',
            width: cardWidth,
            height: cardHeight,
          }}
        >
          {albums.map((album, i) => (
            <div
              key={album.id}
              ref={(el) => { if (el) cardsRef.current[i] = el }}
              onClick={() => handleCardClick(album, i)}
              className="absolute cursor-pointer"
              style={{
                width: cardWidth,
                height: cardHeight,
                left: -cardWidth / 2,
                top: -cardHeight / 2,
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
              }}
            >
              {/* Card Content */}
              <div className="w-full h-full rounded-2xl overflow-hidden bg-white shadow-xl hover:shadow-2xl transition-shadow group">
                {/* Cover Image */}
                <div className="relative w-full h-3/4 overflow-hidden">
                  <img 
                    src={album.cover} 
                    alt={album.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Photo count badge */}
                  <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700">
                    {album.count} photos
                  </div>
                </div>
                
                {/* Album Info */}
                <div className="p-3 h-1/4 flex flex-col justify-center">
                  <h3 className="font-semibold text-gray-800 truncate text-sm">
                    {album.name}
                  </h3>
                  <p className="text-xs text-gray-500 capitalize">
                    {album.type} album
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigation Arrows */}
      <button
        onClick={() => navigate('left')}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 transition-all z-10"
      >
        <ChevronLeft size={24} className="text-gray-700" />
      </button>
      <button
        onClick={() => navigate('right')}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 transition-all z-10"
      >
        <ChevronRight size={24} className="text-gray-700" />
      </button>
      
      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {albums.map((_, i) => (
          <button
            key={i}
            onClick={() => navigateTo(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === activeIndex 
                ? 'bg-[#B8562E] w-6' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
      
      {/* Album Detail Modal (Horizontal Scroll) */}
      <AnimatePresence>
        {selectedAlbum && selectedAlbum.images && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setSelectedAlbum(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-6xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between text-white mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedAlbum.name}</h2>
                  <p className="text-white/60">{selectedAlbum.count} photos</p>
                </div>
                <button 
                  onClick={() => setSelectedAlbum(null)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Horizontal Scrolling Images */}
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {selectedAlbum.images.map((img, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex-shrink-0 snap-center"
                  >
                    <img
                      src={img}
                      alt=""
                      className="h-80 w-auto rounded-xl object-cover"
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
