'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Image as ImageIcon, MapPin, Plus, Users, PawPrint, Upload, Scan, X, Play, Globe, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
// TimelineRuler removed - using vertical timeline instead
import DigitizeModal from '@/components/gallery/DigitizeModal'
import PhotoMetadataModal from '@/components/gallery/PhotoMetadataModal'
import PhotoPreviewPanel from '@/components/gallery/PhotoPreviewPanel'
import OrbitalCarousel from '@/components/gallery/OrbitalCarousel'
import ImmersiveTimeline from '@/components/gallery/ImmersiveTimeline'
import VerticalTimeline from '@/components/gallery/VerticalTimeline'
import { SlideshowPlayer, PlayButtonOverlay } from '@/components/slideshow'
import '@/styles/page-styles.css'
import '@/styles/gallery.css'

const GalleryGlobe = dynamic(() => import('@/components/gallery/GalleryGlobe'), {
  ssr: false,
  loading: () => (
    <div className="gallery-globe-section flex items-center justify-center">
      <div className="text-[#406A56]/50">Loading globe...</div>
    </div>
  )
})

import { GalleryMediaItem as MediaItem } from '@/types/gallery'

export default function GalleryPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYearRange] = useState<[number, number] | null>(null)
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDigitizeModal, setShowDigitizeModal] = useState(false)
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null)
  const [slideshowAlbum, setSlideshowAlbum] = useState<{ name: string; photos: MediaItem[] } | null>(null)
  const [userAlbums, setUserAlbums] = useState<Array<{ id: string; name: string; memory_ids: string[]; cover_image_url?: string; theme?: string }>>([])
  const [viewMode, setViewMode] = useState<'globe' | 'timeline'>('globe')
  const [timelineIndex, setTimelineIndex] = useState(0)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Filter and sort media by date - NEWEST FIRST
  // This filtered array is used by ALL components to ensure index consistency
  const sortedMedia = useMemo(() => {
    const filtered = [...media]
      .filter(m => {
        // Only include images and videos (same filter as ImmersiveTimeline)
        if (!m.file_url) return false
        const fileType = m.file_type?.toLowerCase() || ''
        const url = m.file_url.toLowerCase()
        if (fileType.startsWith('audio/')) return false
        if (url.endsWith('.mp3') || url.endsWith('.wav') || url.endsWith('.m4a')) return false
        const isImage = fileType.startsWith('image/') || url.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i)
        const isVideo = fileType.startsWith('video/') || url.match(/\.(mp4|mov|avi|webm)$/i)
        return isImage || isVideo
      })
      .sort((a, b) => {
        const dateA = new Date(a.taken_at || a.created_at || 0).getTime()
        const dateB = new Date(b.taken_at || b.created_at || 0).getTime()
        return dateB - dateA // Newest first
      })
    
    return filtered
  }, [media])
  const supabase = createClient()

  // Auto-albums based on locations, dates, etc.
  const autoAlbums = useMemo(() => {
    const albums: Array<{ name: string; count: number; cover: string; type: 'location' | 'time' | 'recent' }> = []
    
    // 1. Location-based albums
    const locationAlbums: Record<string, MediaItem[]> = {}
    media.forEach(m => {
      if (m.memory?.location_name) {
        const loc = m.memory.location_name
        if (!locationAlbums[loc]) locationAlbums[loc] = []
        locationAlbums[loc].push(m)
      }
    })
    
    Object.entries(locationAlbums)
      .filter(([_, items]) => items.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 4)
      .forEach(([name, items]) => {
        albums.push({
          name,
          count: items.length,
          cover: items[0].file_url,
          type: 'location'
        })
      })
    
    // 2. Year-based albums (if we have dated photos)
    const yearAlbums: Record<number, MediaItem[]> = {}
    media.forEach(m => {
      if (m.taken_at) {
        const year = new Date(m.taken_at).getFullYear()
        if (!yearAlbums[year]) yearAlbums[year] = []
        yearAlbums[year].push(m)
      }
    })
    
    Object.entries(yearAlbums)
      .filter(([_, items]) => items.length >= 3)
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
      .slice(0, 3)
      .forEach(([year, items]) => {
        albums.push({
          name: `Year ${year}`,
          count: items.length,
          cover: items[0].file_url,
          type: 'time'
        })
      })
    
    // 3. Recent Photos album (always show if we have any media)
    if (media.length >= 3 && albums.length < 6) {
      albums.push({
        name: 'Recent Photos',
        count: Math.min(media.length, 20),
        cover: media[0].file_url,
        type: 'recent'
      })
    }
    
    return albums.slice(0, 6)
  }, [media])

  // Helper to get photos for an album
  const getAlbumPhotos = useCallback((albumName: string, albumType: 'location' | 'time' | 'recent'): MediaItem[] => {
    if (albumType === 'location') {
      return media.filter(m => m.memory?.location_name === albumName)
    }
    if (albumType === 'time') {
      const yearMatch = albumName.match(/Year (\d{4})/)
      if (yearMatch) {
        const year = parseInt(yearMatch[1])
        return media.filter(m => m.taken_at && new Date(m.taken_at).getFullYear() === year)
      }
    }
    if (albumType === 'recent') {
      return media.slice(0, 20)
    }
    return []
  }, [media])

  // Open slideshow for an album
  const openAlbumSlideshow = useCallback((albumName: string, albumType: 'location' | 'time' | 'recent') => {
    const photos = getAlbumPhotos(albumName, albumType)
    if (photos.length > 0) {
      setSlideshowAlbum({ name: albumName, photos })
    }
  }, [getAlbumPhotos])

  const loadMedia = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Get media with memory info
    const { data } = await supabase
      .from('memory_media')
      .select(`
        id, file_url, file_type, exif_lat, exif_lng, taken_at, created_at, memory_id,
        memory:memories(id, title, location_name, location_lat, location_lng, memory_type, memory_date)
      `)
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false, nullsFirst: false })

    // Transform and filter out interview media
    const transformed: MediaItem[] = (data || [])
      .map(item => {
        const memory = item.memory ? (Array.isArray(item.memory) ? item.memory[0] : item.memory) : undefined
        
        // Compute effective date: memory_date > taken_at > created_at
        // memory_date is DATE (no time), taken_at/created_at are TIMESTAMPTZ
        const memoryDate = memory?.memory_date ? new Date(memory.memory_date + 'T12:00:00Z').toISOString() : null
        const effectiveDate = memoryDate || item.taken_at || item.created_at
        
        return {
          ...item,
          memory,
          // Use effective date for sorting/display
          taken_at: effectiveDate,
          // User-set location takes priority over EXIF metadata
          location_lat: memory?.location_lat || item.exif_lat || null,
          location_lng: memory?.location_lng || item.exif_lng || null,
        }
      })
      .filter(item => {
        // Exclude media from interview memories
        if (item.memory && (item.memory as any).memory_type === 'interview') {
          return false
        }
        return true
      })

    setMedia(transformed)
    
    // Also load user-created albums
    const { data: albumsData } = await supabase
      .from('memory_capsules')
      .select('id, name, memory_ids, cover_image_url, theme')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    
    setUserAlbums(albumsData || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadMedia() }, [loadMedia])

  const handleGlobeSelect = (item: MediaItem) => {
    setPreviewMedia(item)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    for (const file of Array.from(files)) {
      try {
        const memoryRes = await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: file.name.replace(/\.[^/.]+$/, ''),
            memory_date: new Date().toISOString().split('T')[0],
            memory_type: 'moment',
          }),
        })
        const { memory } = await memoryRes.json()
        if (!memory?.id) continue

        const formData = new FormData()
        formData.append('file', file)
        await fetch(`/api/memories/${memory.id}/media`, { method: 'POST', body: formData })
      } catch (err) {
        console.error('Upload error:', err)
      }
    }
    
    setUploading(false)
    loadMedia()
  }

  const handleSaveMetadata = async (updates: { taken_at?: string; exif_lat?: number; exif_lng?: number; location_name?: string }) => {
    if (!editingMedia) return
    
    console.log('Saving metadata for media:', editingMedia.id, updates)
    
    const res = await fetch(`/api/media/${editingMedia.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    
    const result = await res.json()
    console.log('Save result:', result)
    
    if (!res.ok) {
      console.error('Save failed:', result)
      throw new Error('Failed to save')
    }
    
    // Reload media to show updated data
    loadMedia()
  }

  return (
    <div className="page-container">
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="page-header mb-5">
          <Link href="/dashboard" className="page-header-back">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="page-header-title">Gallery</h1>
            <p className="page-header-subtitle">Your visual memories around the world</p>
          </div>
        </header>

        {/* Upload Button */}
        <div className="flex justify-end mb-5">
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={uploading}
            className="glass-card px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-white/90 transition-all"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-[#8a7c08] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus size={20} className="text-[#8a7c08]" />
            )}
            <span className="text-sm font-medium text-[#8a7c08]">Add Photos</span>
          </button>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="glass-card-page p-12 text-center">
            <p className="text-[#666]">Loading gallery...</p>
          </div>
        ) : media.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#406A56]/10 rounded-full flex items-center justify-center">
              <ImageIcon size={32} className="text-[#406A56]/50" />
            </div>
            <h3 className="text-lg font-semibold text-[#2d2d2d] mb-2">No photos yet</h3>
            <p className="text-[#666]">Upload your first photos to see them on the globe</p>
          </div>
        ) : (
          <>
            {/* Unified Viewer - Globe or Time Machine */}
            <div className="overflow-hidden mb-5 relative flex rounded-2xl" style={{ background: 'linear-gradient(to bottom, #1a1a2e, #050508)' }}>
              {/* LEFT: Vertical Timeline (shared between both views) */}
              {sortedMedia.some(m => m.taken_at) && (
                <div className="w-16 relative flex-shrink-0 border-r border-white/10">
                  <div className="absolute inset-4">
                    <VerticalTimeline 
                      media={sortedMedia}
                      currentIndex={timelineIndex}
                      onYearClick={(year, idx) => {
                        setTimelineIndex(idx)
                        setSelectedYear(year)
                        // If in globe view, this could filter the globe to that year
                      }}
                    />
                  </div>
                </div>
              )}

              {/* RIGHT: Main View Area */}
              <div className="flex-1 relative">
                {/* View Selector */}
                <div className="absolute top-4 right-4 z-40 flex rounded-xl overflow-hidden bg-black/30 backdrop-blur-sm border border-white/10">
                  <button
                    onClick={() => setViewMode('globe')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                      viewMode === 'globe'
                        ? 'bg-[#406A56] text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Globe size={16} />
                    Globe
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                      viewMode === 'timeline'
                        ? 'bg-[#406A56] text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Clock size={16} />
                    Time Machine
                  </button>
                </div>

                {/* Globe View */}
                {viewMode === 'globe' && (
                  <GalleryGlobe
                    media={sortedMedia}
                    selectedTimeframe={selectedYear ? { yearRange: [selectedYear, selectedYear] } : null}
                    onSelectMedia={(item) => {
                      handleGlobeSelect(item)
                      // Update timeline index to match selected photo
                      const idx = sortedMedia.findIndex(m => m.id === item.id)
                      if (idx >= 0) setTimelineIndex(idx)
                    }}
                  />
                )}

                {/* Time Machine View */}
                {viewMode === 'timeline' && sortedMedia.some(m => m.taken_at) && (
                  <div style={{ height: '500px' }}>
                    <ImmersiveTimeline 
                      media={sortedMedia}
                      initialIndex={timelineIndex}
                      onPhotoClick={(item) => setPreviewMedia(item as MediaItem)}
                      onIndexChange={setTimelineIndex}
                    />
                  </div>
                )}

                {/* No dated photos message for timeline */}
                {viewMode === 'timeline' && !sortedMedia.some(m => m.taken_at) && (
                  <div className="h-[500px] flex items-center justify-center">
                    <div className="text-center text-white/50">
                      <Clock size={48} className="mx-auto mb-4 opacity-30" />
                      <p>No dated photos for Time Machine</p>
                      <p className="text-sm mt-1">Add dates to your photos to use this view</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* All Photos Grid */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#2d2d2d]">All Photos</h3>
                <p className="text-xs text-[#666]">{sortedMedia.length} photos</p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {sortedMedia.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleGlobeSelect(item)}
                    className="bubble-tile aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#406A56] transition-all relative group"
                  >
                    <img
                      src={item.file_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {/* Edit button on hover */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingMedia(item); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      title="Edit date & location"
                    >
                      <span className="text-white text-xs">✏️</span>
                    </button>
                    {/* Missing data indicator */}
                    {(!item.taken_at || (!item.exif_lat && !item.location_lat)) && (
                      <div className="absolute top-2 left-2 w-5 h-5 bg-amber-500/90 backdrop-blur rounded-full flex items-center justify-center" title="Missing date or location">
                        <span className="text-white text-[10px]">!</span>
                      </div>
                    )}
                    {(item.location_lat && item.location_lng) || (item.exif_lat && item.exif_lng) ? (
                      <div className="absolute bottom-2 right-2 w-5 h-5 bg-white/80 backdrop-blur rounded-full flex items-center justify-center">
                        <MapPin size={10} className="text-[#406A56]" />
                      </div>
                    ) : null}
                    {item.taken_at && (
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/50 backdrop-blur rounded text-[8px] text-white">
                        {new Date(item.taken_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Unified Albums Section - User + Smart Albums */}
            {(userAlbums.length > 0 || autoAlbums.length > 0) && (
              <div className="glass-card p-5 mt-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#2d2d2d]">Albums</h3>
                  <Link href="/dashboard/capsules" className="text-xs text-[#406A56] hover:underline">
                    Manage Albums
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {/* User-created albums first */}
                  {userAlbums.map((album) => {
                    const coverMedia = album.cover_image_url || 
                      (album.memory_ids?.length > 0 ? 
                        media.find(m => m.memory_id === album.memory_ids[0])?.file_url : null)
                    
                    return (
                      <Link
                        key={album.id}
                        href={`/dashboard/capsules/${album.id}`}
                        className="group cursor-pointer"
                      >
                        <div className="aspect-square rounded-xl overflow-hidden mb-2 relative bg-gray-100">
                          {coverMedia ? (
                            <img
                              src={coverMedia}
                              alt={album.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#406A56]/20 to-[#D9C61A]/20">
                              <ImageIcon size={24} className="text-[#406A56]/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-white text-sm font-medium truncate">{album.name}</p>
                            <p className="text-white/60 text-xs">{album.memory_ids?.length || 0} memories</p>
                          </div>
                          {/* User album badge */}
                          <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#406A56]/80 backdrop-blur rounded-full">
                            <span className="text-white text-[10px] font-medium">My Album</span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                  
                  {/* Smart/auto albums */}
                  {autoAlbums.map((album, i) => (
                    <div
                      key={`smart-${i}`}
                      className="group cursor-pointer"
                      onClick={() => openAlbumSlideshow(album.name, album.type)}
                    >
                      <div className="aspect-square rounded-xl overflow-hidden mb-2 relative">
                        <img
                          src={album.cover}
                          alt={album.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-sm font-medium truncate">{album.name}</p>
                          <p className="text-white/60 text-xs">{album.count} photos</p>
                        </div>
                        {/* Smart album badge */}
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#D9C61A]/80 backdrop-blur rounded-full">
                          <span className="text-[#2d2d2d] text-[10px] font-medium">✨ Smart</span>
                        </div>
                        {/* Play overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                            <Play size={16} className="text-[#406A56] ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Create new album button */}
                  <Link
                    href="/dashboard/capsules"
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-[#406A56] flex flex-col items-center justify-center gap-2 transition-colors group"
                  >
                    <Plus size={24} className="text-gray-400 group-hover:text-[#406A56]" />
                    <span className="text-xs text-gray-500 group-hover:text-[#406A56]">New Album</span>
                  </Link>
                </div>
              </div>
            )}

          </>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-sm relative"
            >
              {/* Close button */}
              <button
                onClick={() => setShowUploadModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#406A56]/10 hover:bg-[#406A56]/20 transition-colors"
              >
                <X size={18} className="text-[#406A56]" />
              </button>

              <h2 className="text-lg font-semibold text-[#2d2d2d] mb-2">Add Photos</h2>
              <p className="text-sm text-[#666] mb-6">Choose how you want to add photos to your gallery</p>

              <div className="space-y-3">
                {/* Upload from Device */}
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    fileInputRef.current?.click()
                  }}
                  className="w-full p-4 rounded-xl bg-[#406A56]/10 hover:bg-[#406A56]/20 transition-all group text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#406A56]/20 flex items-center justify-center group-hover:bg-[#406A56]/30 transition-colors">
                    <Upload size={24} className="text-[#406A56]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#2d2d2d]">Upload from Device</p>
                    <p className="text-sm text-[#666]">Select photos from your phone or computer</p>
                  </div>
                </button>

                {/* Digitize Printed Photos */}
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setShowDigitizeModal(true)
                  }}
                  className="w-full p-4 rounded-xl bg-[#D9C61A]/10 hover:bg-[#D9C61A]/20 transition-all group text-left flex items-center gap-4 relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#D9C61A]/20 flex items-center justify-center group-hover:bg-[#D9C61A]/30 transition-colors">
                    <Scan size={24} className="text-[#8a7c08]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[#2d2d2d]">Digitize Printed Photos</p>
                    <p className="text-sm text-[#666]">Scan, detect grid, and enhance old photographs</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Digitize Modal */}
      <DigitizeModal
        isOpen={showDigitizeModal}
        onClose={() => setShowDigitizeModal(false)}
        onComplete={(memoryId, count) => {
          setShowDigitizeModal(false)
          loadMedia()
        }}
      />

      {/* Photo Metadata Editor */}
      {editingMedia && (
        <PhotoMetadataModal
          media={editingMedia}
          onClose={() => setEditingMedia(null)}
          onSave={handleSaveMetadata}
        />
      )}

      {/* Photo Preview Panel */}
      {previewMedia && (
        <PhotoPreviewPanel
          media={previewMedia}
          allMedia={media}
          onClose={() => setPreviewMedia(null)}
          onNavigate={(m) => setPreviewMedia(m)}
          onEdit={(m) => {
            setPreviewMedia(null)
            setEditingMedia(m)
          }}
        />
      )}

      {/* Album Slideshow Player */}
      <SlideshowPlayer
        isOpen={!!slideshowAlbum}
        onClose={() => setSlideshowAlbum(null)}
        title={slideshowAlbum?.name}
        items={(slideshowAlbum?.photos || []).map(p => ({
          id: p.id,
          url: p.file_url,
          title: p.memory?.title,
          description: p.memory?.location_name,
          date: p.taken_at ? new Date(p.taken_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) : undefined
        }))}
        slideDuration={4}
        autoPlay={true}
      />
    </div>
  )
}
