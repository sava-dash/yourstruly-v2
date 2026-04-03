'use client'

import { useState, useRef, useCallback } from 'react'
import { Heart, MessageCircle, Image as ImageIcon, FolderOpen, Smile } from 'lucide-react'
import Link from 'next/link'
import { getCategoryIcon } from '@/lib/dashboard/icons'
import { stripMarkdown } from '@/components/memories/LifeMemoryCard'

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
  shared_with_count?: number
  comment_count?: number
  view_count?: number
  is_private?: boolean
  circle_ids?: string[]
  memory_media?: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
}

interface MemoryCardCleanProps {
  memory: Memory
  showReactions?: boolean
}

// Emoji reactions for memories
const REACTIONS = ['❤️', '😊', '😢', '😮', '🎉', '🙏']

// Category to paper color mapping
const CATEGORY_PAPER_COLORS: Record<string, string> = {
  family: '/assets/brand/lightgreenpaper.png',
  travel: '/assets/brand/lightbluepaper.png',
  celebration: '/assets/brand/lightpurplepaper.png',
  food: '/assets/brand/greenpaper.png',
  nature: '/assets/brand/lightgreenpaper.png',
  wisdom: '/assets/brand/lightpurplepaper.png',
  everyday: '/assets/brand/greypaper1.png',
  work: '/assets/brand/greypaper1.png',
  health: '/assets/brand/lightbluepaper.png',
  creative: '/assets/brand/lightpurplepaper.png',
}

export default function MemoryCardClean({ memory, showReactions = true }: MemoryCardCleanProps) {
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  // Long press handling
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const isLongPress = useRef(false)

  const rawCoverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
  // Only use cover if it has a valid file_url
  const coverMedia = rawCoverMedia?.file_url ? rawCoverMedia : null
  const showImage = coverMedia && !imageError
  const mediaCount = memory.memory_media?.length || 0
  const categoryIcon = memory.ai_category ? getCategoryIcon(memory.ai_category) : null
  const categoryPaper = memory.ai_category ? CATEGORY_PAPER_COLORS[memory.ai_category.toLowerCase()] : null

  // Truncate description — strip markdown first
  const rawDesc = stripMarkdown(memory.description || memory.ai_summary || '')
  const truncatedDesc = rawDesc.length > 80 ? rawDesc.slice(0, 80) + '...' : rawDesc

  // Long press handlers
  const handleTouchStart = useCallback(() => {
    isLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true
      setShowReactionPicker(true)
    }, 500) // 500ms for long press
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    // If it was a long press, prevent navigation
    if (isLongPress.current) {
      e.preventDefault()
      isLongPress.current = false
    }
  }, [])

  return (
    <div 
      className="group relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <Link href={`/dashboard/memories/${memory.id}`} onClick={handleClick}>
        {/* Image Container with Torn Edge */}
        <div className="relative mb-3">
          <div className="relative aspect-[4/3] rounded-t-2xl overflow-hidden bg-gray-100">
            {showImage ? (
              <img
                src={coverMedia.file_url}
                alt={memory.title || 'Memory'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#8DACAB]/20 flex items-center justify-center">
                <ImageIcon size={32} className="text-[#2D5A3D]/30" />
              </div>
            )}

            {/* Category Badge with Colored Paper */}
            {memory.ai_category && (
              <div className="absolute top-3 left-3">
                <div 
                  className="px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm"
                  style={{
                    backgroundImage: categoryPaper ? `url(${categoryPaper})` : undefined,
                    backgroundSize: 'cover',
                    backgroundColor: categoryPaper ? undefined : 'rgba(255,255,255,0.9)',
                  }}
                >
                  {categoryIcon && (
                    
<img src={categoryIcon} alt="" className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                    {memory.ai_category}
                  </span>
                </div>
              </div>
            )}

            {/* Favorite heart */}
            {memory.is_favorite && (
              <div className="absolute top-3 right-3">
                <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center">
                  <Heart size={16} className="text-red-500 fill-red-500" />
                </div>
              </div>
            )}

            {/* Media count badge */}
            {mediaCount > 1 && (
              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs">
                +{mediaCount - 1}
              </div>
            )}
          </div>
          
        </div>

        {/* Content Below */}
        <div className="px-1 pt-1">
          {/* Title */}
          <h3 className="font-semibold text-[#2d2d2d] text-base mb-1 line-clamp-1 group-hover:text-[#2D5A3D] transition-colors">
            {memory.title || 'Untitled Memory'}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-500 line-clamp-2 mb-3 leading-relaxed">
            {truncatedDesc}
          </p>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-3">
              {/* Collections/Folders */}
              <span className="flex items-center gap-1">
                <FolderOpen size={14} />
                {memory.circle_ids?.length || 0}
              </span>
              
              {/* Media count */}
              <span className="flex items-center gap-1">
                <ImageIcon size={14} />
                {mediaCount}
              </span>
              
              {/* Comments */}
              <span className="flex items-center gap-1">
                <MessageCircle size={14} />
                {memory.comment_count || 0}
              </span>
            </div>

            {/* Reaction button */}
            {showReactions && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowReactionPicker(!showReactionPicker)
                  }}
                  className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-100 transition-colors"
                >
                  {selectedReaction ? (
                    <span className="text-base">{selectedReaction}</span>
                  ) : (
                    <Smile size={16} className="text-gray-400" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Reaction Picker Popup - Outside Link to prevent navigation */}
      {showReactionPicker && (
        <div 
          className="absolute bottom-16 right-2 p-2 bg-white rounded-full shadow-lg border border-gray-100 flex gap-1 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSelectedReaction(emoji === selectedReaction ? null : emoji)
                setShowReactionPicker(false)
              }}
              className={`w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-xl transition-transform hover:scale-125 ${
                selectedReaction === emoji ? 'bg-[#2D5A3D]/10 scale-110' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Backdrop to close reaction picker */}
      {showReactionPicker && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowReactionPicker(false)}
        />
      )}
    </div>
  )
}
