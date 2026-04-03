'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Image as ImageIcon, Upload, Scan, Tag, MapPin, Calendar, 
  Check, X, ChevronDown, Grid, List, Filter, Clock, Folder,
  Users, Play, Pause, ChevronLeft, ChevronRight
} from 'lucide-react'
import PhotoMetadataModal from '@/components/gallery/PhotoMetadataModal'
import FaceTagger from '@/components/media/FaceTagger'

interface MediaItem {
  id: string
  file_url: string
  file_type: string
  taken_at?: string
  exif_lat?: number
  exif_lng?: number
  caption?: string
  memory_id?: string
  created_at: string
  memory?: {
    id: string
    title: string
    memory_date: string
    location_name?: string
  }
}

type LibraryFilter = 'all' | 'recent' | 'no-date'
type LibraryViewMode = 'grid' | 'list'

interface LibraryBrowseProps {
  onSelectMedia?: (media: MediaItem) => void
}

export function LibraryBrowse({ onSelectMedia }: LibraryBrowseProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [viewMode, setViewMode] = useState<LibraryViewMode>('grid')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [taggingItem, setTaggingItem] = useState<MediaItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const supabase = createClient()

  // Load all media
  useEffect(() => {
    loadMedia()
  }, [])

  const loadMedia = async () => {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get all media with their memory associations
    const { data, error } = await supabase
      .from('memory_media')
      .select(`
        id,
        file_url,
        file_type,
        taken_at,
        exif_lat,
        exif_lng,
        caption,
        memory_id,
        created_at,
        memory:memories(
          id,
          title,
          memory_date,
          location_name
        )
      `)
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading media:', error)
    } else {
      // Transform the data - memory is returned as array from join, get first item
      const transformed = (data || []).map((item: any) => ({
        ...item,
        memory: Array.isArray(item.memory) ? item.memory[0] : item.memory
      }))
      setMedia(transformed)
    }
    setLoading(false)
  }

  // Filter media
  const filteredMedia = useMemo(() => {
    let result = [...media]

    // Apply filter
    switch (filter) {
      case 'no-date':
        result = result.filter(m => !m.taken_at)
        break
      case 'recent':
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        result = result.filter(m => new Date(m.created_at) >= thirtyDaysAgo)
        break
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(m =>
        m.caption?.toLowerCase().includes(q) ||
        m.memory?.title?.toLowerCase().includes(q) ||
        m.memory?.location_name?.toLowerCase().includes(q)
      )
    }

    return result
  }, [media, filter, searchQuery])

  // Group by date for display
  const groupedMedia = useMemo(() => {
    const groups: { [key: string]: MediaItem[] } = {}
    
    filteredMedia.forEach(item => {
      const date = item.taken_at || item.created_at
      const key = new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      })
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    
    return Object.entries(groups)
  }, [filteredMedia])

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedItems(newSelection)
  }

  // Select all visible
  const selectAll = () => {
    setSelectedItems(new Set(filteredMedia.map(m => m.id)))
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedItems(new Set())
  }

  // Stats
  const stats = useMemo(() => ({
    total: media.length,
    noDate: media.filter(m => !m.taken_at).length,
    recent: media.filter(m => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return new Date(m.created_at) >= thirtyDaysAgo
    }).length,
  }), [media])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#2D5A3D] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-[#2D5A3D] text-white'
                : 'bg-white/80 text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Photos
            <span className="ml-1.5 opacity-70">{stats.total}</span>
          </button>
          <button
            onClick={() => setFilter('no-date')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === 'no-date'
                ? 'bg-amber-500 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-gray-100'
            }`}
          >
            No Date
            <span className="ml-1.5 opacity-70">{stats.noDate}</span>
          </button>
          <button
            onClick={() => setFilter('recent')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === 'recent'
                ? 'bg-blue-500 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Clock size={14} className="inline mr-1" />
            Recent
            <span className="ml-1.5 opacity-70">{stats.recent}</span>
          </button>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center gap-2">
          {/* Selection actions */}
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm text-gray-500">{selectedItems.size} selected</span>
              <button
                onClick={clearSelection}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Clear
              </button>
            </div>
          )}
          
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white/80 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#2D5A3D] text-white' : 'text-gray-500'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#2D5A3D] text-white' : 'text-gray-500'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredMedia.length === 0 && (
        <div className="text-center py-20 bg-white/50 rounded-2xl">
          <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {filter === 'no-date' 
              ? 'All photos have dates' 
              : filter === 'recent'
              ? 'No recent uploads'
              : 'No photos yet'}
          </h3>
          <p className="text-gray-500 text-sm">
            {filter === 'no-date'
              ? 'Great! All your photos have timestamps.'
              : 'Create memories and add photos to see them here'}
          </p>
        </div>
      )}

      {/* Media Grid */}
      {viewMode === 'grid' && (
        <div className="space-y-8">
          {groupedMedia.map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-500 mb-3 sticky top-0 bg-gradient-to-br from-[#faf9f7]/90 to-[#f5f3f0]/90 backdrop-blur-sm py-2 z-10">
                {date}
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer group ${
                      selectedItems.has(item.id) ? 'ring-2 ring-[#2D5A3D] ring-offset-2' : ''
                    }`}
                    onClick={() => onSelectMedia?.(item)}
                  >
                    <img
                      src={item.file_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                          className="p-2 bg-white/90 rounded-full hover:bg-white"
                          title="Edit details"
                        >
                          <MapPin size={14} className="text-gray-700" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setTaggingItem(item); }}
                          className="p-2 bg-white/90 rounded-full hover:bg-white"
                          title="Tag faces"
                        >
                          <Users size={14} className="text-gray-700" />
                        </button>
                      </div>
                    </div>

                    {/* Selection checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}
                      className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedItems.has(item.id)
                          ? 'bg-[#2D5A3D] border-[#2D5A3D]'
                          : 'bg-white/80 border-white/80 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {selectedItems.has(item.id) && <Check size={12} className="text-white" />}
                    </button>

                    {/* No date indicator */}
                    {!item.taken_at && (
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-amber-500/90 text-white text-[10px] font-medium rounded">
                        No Date
                      </div>
                    )}

                    {/* Memory badge */}
                    {item.memory && (
                      <div className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-black/60 text-white text-[10px] rounded truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.memory.title}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredMedia.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-4 p-3 bg-white rounded-xl hover:shadow-md transition-all cursor-pointer ${
                selectedItems.has(item.id) ? 'ring-2 ring-[#2D5A3D]' : ''
              }`}
              onClick={() => onSelectMedia?.(item)}
            >
              {/* Checkbox */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedItems.has(item.id)
                    ? 'bg-[#2D5A3D] border-[#2D5A3D]'
                    : 'border-gray-300'
                }`}
              >
                {selectedItems.has(item.id) && <Check size={12} className="text-white" />}
              </button>

              {/* Thumbnail */}
              <img
                src={item.file_url}
                alt=""
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.memory?.title || item.caption || 'Untitled'}
                </p>
                <p className="text-xs text-gray-500">
                  {item.taken_at 
                    ? new Date(item.taken_at).toLocaleDateString()
                    : new Date(item.created_at).toLocaleDateString()}
                </p>
                {!item.taken_at && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">
                    No Date
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Edit details"
                >
                  <MapPin size={16} className="text-gray-400" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setTaggingItem(item); }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Tag faces"
                >
                  <Users size={16} className="text-gray-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingItem && (
        <PhotoMetadataModal
          media={{
            id: editingItem.id,
            file_url: editingItem.file_url,
            taken_at: editingItem.taken_at || null,
            exif_lat: editingItem.exif_lat ?? null,
            exif_lng: editingItem.exif_lng ?? null,
            memory: editingItem.memory ? {
              title: editingItem.memory.title,
              location_name: editingItem.memory.location_name,
            } : undefined,
          }}
          onClose={() => setEditingItem(null)}
          onSave={async (updates) => {
            // Refresh media list after save
            await loadMedia()
            setEditingItem(null)
          }}
        />
      )}

      {/* Face Tagger Modal */}
      {taggingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Tag Faces</h3>
              <button
                onClick={() => setTaggingItem(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <FaceTagger
                mediaId={taggingItem.id}
                imageUrl={taggingItem.file_url}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LibraryBrowse
