'use client'

import { useMemo } from 'react'
import { Heart, MapPin, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface Memory {
  id: string
  title: string
  description: string
  memory_date: string
  memory_type: string
  location_name: string
  ai_summary: string
  ai_mood: string
  ai_category: string
  ai_labels: string[]
  is_favorite: boolean
  memory_media?: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
}

interface ScrapbookCardProps {
  memory: Memory
  index: number
}

const WASHI_TAPE_STYLES = [
  { className: 'washi-tape-top-left', type: 'default' },
  { className: 'washi-tape-top-right', type: 'default' },
  { className: 'washi-tape-top', type: 'blue' },
  { className: 'washi-tape-top', type: 'brown' },
  { className: 'washi-tape-top-left', type: 'brown' },
]

export default function ScrapbookCard({ memory, index }: ScrapbookCardProps) {
  const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
  
  // Generate consistent random values based on memory id
  const { rotation, showTape, tapeStyle, tapeRotation } = useMemo(() => {
    // Use memory id to generate consistent "random" values
    const hash = memory.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const rotation = ((hash % 70) / 10) - 3.5 // -3.5 to +3.5 degrees
    const showTape = hash % 3 !== 0 // ~66% of cards get tape
    const tapeStyleIndex = hash % WASHI_TAPE_STYLES.length
    const tapeRotation = ((hash % 30) / 10) - 1.5 // -1.5 to +1.5 extra rotation
    
    return {
      rotation,
      showTape,
      tapeStyle: WASHI_TAPE_STYLES[tapeStyleIndex],
      tapeRotation,
    }
  }, [memory.id])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const getTapeClasses = () => {
    const base = 'absolute z-10 pointer-events-none'
    const position = tapeStyle.className.includes('left') 
      ? 'top-[-8px] left-[10px]'
      : tapeStyle.className.includes('right')
        ? 'top-[-8px] right-[10px] left-auto'
        : 'top-[-10px] left-1/2 -translate-x-1/2'
    
    const size = tapeStyle.type === 'brown' 
      ? 'w-[100px] h-[28px]' 
      : 'w-[80px] h-[20px]'
    
    return `${base} ${position} ${size}`
  }

  const getTapeBackground = () => {
    switch (tapeStyle.type) {
      case 'blue':
        return "url('/images/washi-tape-blue.svg')"
      case 'brown':
        return "url('/images/brown-tape-02.png')"
      default:
        return "url('/images/washi-tape.svg')"
    }
  }

  return (
    <Link href={`/dashboard/memories/${memory.id}`} className="block">
      <div
        className="scrapbook-polaroid group"
        style={{
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {/* Washi tape decoration */}
        {showTape && (
          <div
            className={getTapeClasses()}
            style={{
              backgroundImage: getTapeBackground(),
              backgroundSize: '100% 100%',
              transform: `rotate(${tapeRotation + (tapeStyle.className.includes('left') ? -12 : tapeStyle.className.includes('right') ? 12 : 0)}deg)`,
            }}
          />
        )}

        {/* Photo area */}
        <div className="scrapbook-polaroid-photo">
          {coverMedia ? (
            <img
              src={coverMedia.file_url}
              alt={memory.title || 'Memory'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#C4A235]/20 flex items-center justify-center">
              <Sparkles size={32} className="text-[#2D5A3D]/40" />
            </div>
          )}
          
          {/* Favorite heart */}
          {memory.is_favorite && (
            <div className="absolute top-2 right-2 opacity-90">
              <Heart size={18} className="text-red-500 fill-red-500 drop-shadow-md" />
            </div>
          )}
        </div>

        {/* Caption area - handwritten style */}
        <div className="scrapbook-polaroid-caption">
          {memory.title && (
            <p className="scrapbook-caption-title truncate">
              {memory.title}
            </p>
          )}
          <p className="scrapbook-caption-date">
            {formatDate(memory.memory_date)}
            {memory.location_name && (
              <span className="inline-flex items-center gap-1 ml-2">
                <MapPin size={10} />
                <span className="truncate max-w-[80px]">{memory.location_name}</span>
              </span>
            )}
          </p>
        </div>
      </div>
    </Link>
  )
}
