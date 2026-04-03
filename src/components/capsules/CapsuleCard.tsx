'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, Image as ImageIcon, MapPin, MoreVertical, Trash2, Edit2, Play } from 'lucide-react'
import { MemoryAlbum, CAPSULE_THEMES } from '@/types/album'

interface AlbumCardProps {
  album: MemoryAlbum
  onEdit?: (album: MemoryAlbum) => void
  onDelete?: (album: MemoryAlbum) => void
}

export default function AlbumCard({ album, onEdit, onDelete }: AlbumCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const theme = CAPSULE_THEMES.find(t => t.value === album.theme) || CAPSULE_THEMES[3]
  const memoryCount = album.memory_ids?.length || 0

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <motion.div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowMenu(false) }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      {/* Scrapbook-style tape decoration */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-6 bg-amber-100/80 rotate-1 shadow-sm z-10" 
           style={{ clipPath: 'polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)' }} />
      
      <Link href={`/dashboard/albums/${album.id}`}>
        <div className="relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer bg-white shadow-lg border border-[#d4c9b8]/50">
          {/* Cover Image */}
          {album.cover_image_url ? (
            <img
              src={album.cover_image_url}
              alt={album.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${theme.color} flex items-center justify-center`}>
              <span className="text-6xl">{theme.icon}</span>
            </div>
          )}

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Theme Badge */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-[#2D5A3D] text-xs font-semibold flex items-center gap-1.5 shadow-md">
              <span>{theme.icon}</span>
              <span className="uppercase tracking-wider">{theme.label}</span>
            </span>
          </div>

          {/* Memory Count Badge */}
          <div className="absolute top-4 right-4">
            <span className="px-2.5 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs flex items-center gap-1.5">
              <ImageIcon size={12} />
              <span>{memoryCount}</span>
            </span>
          </div>

          {/* Play Button (hover) */}
          {isHovered && memoryCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                <Play size={28} className="text-[#2D5A3D] ml-1" fill="currentColor" />
              </div>
            </motion.div>
          )}

          {/* Bottom Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white text-lg font-semibold truncate mb-1 drop-shadow-lg">
              {album.name}
            </h3>
            
            {album.description && (
              <p className="text-white/70 text-sm line-clamp-2 mb-2">
                {album.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-white/60 text-xs">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(album.created_at)}
              </span>
            </div>
          </div>

          {/* Decorative corner fold */}
          <div className="absolute bottom-0 right-0 w-12 h-12 overflow-hidden">
            <div className="absolute bottom-0 right-0 w-16 h-16 bg-[#f5f0e8] transform rotate-45 translate-x-8 translate-y-8 shadow-inner" />
          </div>
        </div>
      </Link>

      {/* Action Menu Button */}
      {(onEdit || onDelete) && (
        <div className="absolute top-3 right-3 z-20">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu) }}
            className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical size={16} />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute top-10 right-0 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[140px] z-30"
            >
              {onEdit && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(album); setShowMenu(false) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit2 size={14} /> Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(album); setShowMenu(false) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  )
}
