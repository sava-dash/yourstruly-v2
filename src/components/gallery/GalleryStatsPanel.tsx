'use client'

import { useMemo, useState, useEffect } from 'react'
import { 
  X, Image as ImageIcon, Video, MapPin, Globe, Heart, 
  Calendar, Camera, ChevronLeft, ChevronRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface MediaItem {
  id: string
  file_url: string
  file_type: string
  location_lat: number | null
  location_lng: number | null
  taken_at: string | null
  memory_id: string
  memory?: {
    id: string
    title: string
    location_name: string
  }
}

interface GalleryStatsPanelProps {
  media: MediaItem[]
  selectedMedia: MediaItem | null
  relatedMedia?: MediaItem[]
  onClose: () => void
  onNavigate: (media: MediaItem) => void
}

export default function GalleryStatsPanel({ 
  media, 
  selectedMedia,
  relatedMedia = [],
  onClose,
  onNavigate
}: GalleryStatsPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Calculate stats
  const stats = useMemo(() => {
    const photos = media.filter(m => m.file_type === 'image' || !m.file_type?.startsWith('video'))
    const videos = media.filter(m => m.file_type === 'video')
    const withLocation = media.filter(m => m.location_lat && m.location_lng)
    
    const locations = new Set(
      media.filter(m => m.memory?.location_name).map(m => m.memory?.location_name)
    )
    
    const years = new Set(
      media.filter(m => m.taken_at).map(m => new Date(m.taken_at!).getFullYear())
    )
    
    const locationCounts: Record<string, number> = {}
    media.forEach(m => {
      if (m.memory?.location_name) {
        locationCounts[m.memory.location_name] = (locationCounts[m.memory.location_name] || 0) + 1
      }
    })
    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
    
    const recentMedia = [...media]
      .sort((a, b) => {
        if (a.taken_at && b.taken_at) return new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()
        return 0
      })
      .slice(0, 4)

    return {
      totalPhotos: photos.length,
      totalVideos: videos.length,
      totalMedia: media.length,
      withLocation: withLocation.length,
      uniqueLocations: locations.size,
      yearsSpan: years.size > 0 ? `${Math.min(...years)} - ${Math.max(...years)}` : 'N/A',
      topLocations,
      recentMedia
    }
  }, [media])

  const previewList = relatedMedia.length > 0 ? relatedMedia : (selectedMedia ? [selectedMedia] : [])
  const currentPreview = previewList[currentIndex] || selectedMedia

  const navigatePreview = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) setCurrentIndex(currentIndex - 1)
    else if (direction === 'next' && currentIndex < previewList.length - 1) setCurrentIndex(currentIndex + 1)
  }

  // Reset index when selected media changes
  useEffect(() => setCurrentIndex(0), [selectedMedia?.id])

  return (
    <div className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {selectedMedia ? (
          // Preview Mode - Warm glass-card styling
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Preview Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2D5A3D]/10">
              <div className="min-w-0 flex-1">
                {currentPreview?.memory?.id ? (
                  <Link 
                    href={`/dashboard/memories/${currentPreview.memory.id}`}
                    className="text-[#2d2d2d] font-semibold truncate hover:text-[#2D5A3D] transition-colors block"
                  >
                    {currentPreview.memory.title || 'Photo'}
                  </Link>
                ) : (
                  <h3 className="text-[#2d2d2d] font-semibold truncate">
                    {currentPreview?.memory?.title || 'Photo'}
                  </h3>
                )}
                {currentPreview?.memory?.location_name && (
                  <p className="text-[#666] text-sm flex items-center gap-1 truncate mt-0.5">
                    <MapPin size={12} className="text-[#2D5A3D]" />
                    {currentPreview.memory.location_name}
                  </p>
                )}
              </div>
              
              {/* Photo counter */}
              {previewList.length > 1 && (
                <span className="text-xs text-[#666] bg-[#2D5A3D]/10 px-2 py-1 rounded-full mr-2 flex-shrink-0">
                  {currentIndex + 1} of {previewList.length}
                </span>
              )}
              
              <button
                onClick={onClose}
                className="p-2 bg-[#2D5A3D]/10 hover:bg-[#2D5A3D]/20 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={18} className="text-[#2D5A3D]" />
              </button>
            </div>

            {/* Preview Image */}
            <div className="flex-1 relative bg-[#2d2d2d]/5 flex items-center justify-center p-4 min-h-0">
              {currentPreview?.file_type === 'video' ? (
                <video
                  key={currentPreview.id}
                  src={currentPreview.file_url}
                  className="max-w-full max-h-full rounded-xl object-contain shadow-lg"
                  controls
                  autoPlay
                  muted
                />
              ) : (
                <img
                  key={currentPreview?.id}
                  src={currentPreview?.file_url}
                  alt=""
                  className="max-w-full max-h-full rounded-xl object-contain shadow-lg"
                />
              )}

              {/* Navigation Arrows - Always visible when multiple photos */}
              {previewList.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigatePreview('prev'); }}
                    disabled={currentIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed rounded-full transition-all hover:scale-110 shadow-xl border border-white/20"
                  >
                    <ChevronLeft size={24} className="text-white" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigatePreview('next'); }}
                    disabled={currentIndex >= previewList.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed rounded-full transition-all hover:scale-110 shadow-xl border border-white/20"
                  >
                    <ChevronRight size={24} className="text-white" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {previewList.length > 1 && (
              <div className="p-3 border-t border-[#2D5A3D]/10 bg-white/50">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {previewList.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all ${
                        idx === currentIndex 
                          ? 'ring-2 ring-[#2D5A3D] shadow-md' 
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      
<img src={item.file_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          // Stats Mode - Warm theme (no scrollbar)
          <motion.div
            key="stats"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 p-5"
          >
            <h3 className="text-[#2d2d2d] font-semibold text-lg mb-4">Gallery Overview</h3>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#2D5A3D]/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-[#2D5A3D] mb-1">
                  <ImageIcon size={16} />
                </div>
                <p className="text-2xl font-bold text-[#2d2d2d]">{stats.totalPhotos}</p>
                <p className="text-xs text-[#666]">Photos</p>
              </div>
              <div className="bg-[#B8562E]/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-[#B8562E] mb-1">
                  <Video size={16} />
                </div>
                <p className="text-2xl font-bold text-[#2d2d2d]">{stats.totalVideos}</p>
                <p className="text-xs text-[#666]">Videos</p>
              </div>
              <div className="bg-[#C4A235]/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-[#8a7c08] mb-1">
                  <MapPin size={16} />
                </div>
                <p className="text-2xl font-bold text-[#2d2d2d]">{stats.uniqueLocations}</p>
                <p className="text-xs text-[#666]">Locations</p>
              </div>
              <div className="bg-[#4A3552]/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-[#4A3552] mb-1">
                  <Calendar size={16} />
                </div>
                <p className="text-lg font-bold text-[#2d2d2d]">{stats.yearsSpan}</p>
                <p className="text-xs text-[#666]">Years</p>
              </div>
            </div>

            {/* Top Locations */}
            {stats.topLocations.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 text-[#666] mb-3">
                  <Heart size={14} />
                  <span className="text-xs uppercase tracking-wide font-medium">Top Places</span>
                </div>
                <div className="space-y-2">
                  {stats.topLocations.map(([location, count]) => (
                    <div 
                      key={location}
                      className="flex items-center justify-between bg-white/50 rounded-lg px-3 py-2"
                    >
                      <span className="text-[#2d2d2d] text-sm truncate">{location}</span>
                      <span className="text-[#2D5A3D] text-xs font-semibold bg-[#2D5A3D]/10 px-2 py-0.5 rounded">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tip */}
            <div className="mt-4 bg-[#2D5A3D]/10 rounded-xl p-3 text-center">
              <p className="text-[#2D5A3D] text-sm">
                Click markers on the globe to preview photos
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
