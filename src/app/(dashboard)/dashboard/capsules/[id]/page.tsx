'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { 
  ChevronLeft, Play, Download, Edit2, Trash2, 
  Calendar, MapPin, Image as ImageIcon, GripVertical,
  FileText, Film, Share2, Heart, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MemoryAlbum, AlbumMemory, CAPSULE_THEMES } from '@/types/album'
import CreateAlbumModal from '@/components/albums/CreateAlbumModal'
import { SlideshowPlayer } from '@/components/slideshow'
import '@/styles/page-styles.css'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AlbumDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  
  const [album, setAlbum] = useState<MemoryAlbum | null>(null)
  const [memories, setMemories] = useState<AlbumMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSlideshow, setShowSlideshow] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [reorderedIds, setReorderedIds] = useState<string[]>([])
  const [savingOrder, setSavingOrder] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  
  const supabase = createClient()

  const loadAlbum = useCallback(async () => {
    setLoading(true)
    
    // Load album
    const { data: albumData, error: albumError } = await supabase
      .from('memory_albums')
      .select('*')
      .eq('id', id)
      .single()

    if (albumError || !albumData) {
      console.error('Error loading album:', albumError)
      router.push('/dashboard/capsules')
      return
    }

    setAlbum(albumData)
    setReorderedIds(albumData.memory_ids || [])

    // Load memories in order
    if (albumData.memory_ids?.length > 0) {
      const { data: memoriesData } = await supabase
        .from('memories')
        .select(`
          id, title, description, memory_date, memory_type,
          location_name, ai_summary, ai_mood, ai_category, is_favorite,
          memory_media(id, file_url, file_type, is_cover)
        `)
        .in('id', albumData.memory_ids)

      // Sort by the order in memory_ids
      const sortedMemories = albumData.memory_ids
        .map((memId: string) => memoriesData?.find(m => m.id === memId))
        .filter(Boolean) as AlbumMemory[]

      setMemories(sortedMemories)
    } else {
      setMemories([])
    }

    setLoading(false)
  }, [id, supabase, router])

  useEffect(() => {
    loadAlbum()
  }, [loadAlbum])

  const handleSaveAlbum = (updated: MemoryAlbum) => {
    setAlbum(updated)
    loadAlbum()
    setShowEditModal(false)
  }

  const handleDelete = async () => {
    if (!album) return
    if (!confirm(`Delete "${album.name}"? This cannot be undone.`)) return
    
    const { error } = await supabase
      .from('memory_albums')
      .delete()
      .eq('id', album.id)

    if (!error) {
      router.push('/dashboard/capsules')
    }
  }

  const handleReorder = (newIds: string[]) => {
    setReorderedIds(newIds)
    // Reorder memories to match
    setMemories(prev => {
      const memoryMap = new Map(prev.map(m => [m.id, m]))
      return newIds.map(id => memoryMap.get(id)).filter(Boolean) as AlbumMemory[]
    })
  }

  const saveReorder = async () => {
    if (!album) return
    setSavingOrder(true)

    const { error } = await supabase
      .from('memory_albums')
      .update({ memory_ids: reorderedIds })
      .eq('id', album.id)

    if (!error) {
      setAlbum({ ...album, memory_ids: reorderedIds })
      setIsReordering(false)
    }
    setSavingOrder(false)
  }

  const cancelReorder = () => {
    setReorderedIds(album?.memory_ids || [])
    setMemories(prev => {
      const memoryMap = new Map(prev.map(m => [m.id, m]))
      return (album?.memory_ids || []).map(id => memoryMap.get(id)).filter(Boolean) as AlbumMemory[]
    })
    setIsReordering(false)
  }

  const exportAsPDF = async () => {
    // Open print dialog with formatted view
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const theme = album ? CAPSULE_THEMES.find(t => t.value === album.theme) || CAPSULE_THEMES[3] : CAPSULE_THEMES[3]
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${album?.name} - Memory Album</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@400;500&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', sans-serif; 
            background: #f9f7f4; 
            color: #2d2d2d;
            padding: 40px;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid #e5e0d8;
          }
          .title {
            font-family: 'Playfair Display', serif;
            font-size: 36px;
            margin-bottom: 10px;
          }
          .description { color: #666; margin-bottom: 15px; }
          .theme { 
            display: inline-block;
            padding: 5px 15px;
            background: #f0ebe4;
            border-radius: 20px;
            font-size: 14px;
          }
          .memory-grid { 
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
          }
          .memory-card {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            page-break-inside: avoid;
          }
          .memory-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
          }
          .memory-content { padding: 20px; }
          .memory-title { 
            font-family: 'Playfair Display', serif;
            font-size: 18px;
            margin-bottom: 8px;
          }
          .memory-meta { font-size: 12px; color: #888; margin-bottom: 8px; }
          .memory-description { font-size: 14px; line-height: 1.6; color: #555; }
          @media print {
            body { background: white; }
            .memory-card { box-shadow: none; border: 1px solid #e5e0d8; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${album?.name}</h1>
          ${album?.description ? `<p class="description">${album.description}</p>` : ''}
          <span class="theme">${theme.icon} ${theme.label}</span>
        </div>
        <div class="memory-grid">
          ${memories.map(m => {
            const cover = m.memory_media?.find(mm => mm.is_cover) || m.memory_media?.[0]
            return `
              <div class="memory-card">
                ${cover ? `<img class="memory-image" src="${cover.file_url}" alt="" />` : ''}
                <div class="memory-content">
                  <h3 class="memory-title">${m.title || 'Untitled Memory'}</h3>
                  <p class="memory-meta">
                    ${m.memory_date ? new Date(m.memory_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                    ${m.location_name ? ` • ${m.location_name}` : ''}
                  </p>
                  ${m.ai_summary ? `<p class="memory-description">${m.ai_summary}</p>` : ''}
                </div>
              </div>
            `
          }).join('')}
        </div>
        <script>window.onload = () => window.print()</script>
      </body>
      </html>
    `)
    printWindow.document.close()
    setShowExportMenu(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="pb-8 pb-24">
        <div className="h-8 w-32 bg-white/50 rounded-lg animate-pulse mb-8" />
        <div className="h-64 bg-white/50 rounded-2xl animate-pulse mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-white/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!album) return null

  const theme = CAPSULE_THEMES.find(t => t.value === album.theme) || CAPSULE_THEMES[3]
  
  // Prepare slideshow items
  const slideshowItems = memories.flatMap(m => 
    m.memory_media?.map(media => ({
      id: media.id,
      url: media.file_url,
      title: m.title || undefined,
      description: m.ai_summary || undefined,
      date: m.memory_date || undefined,
    })) || []
  )

  return (
    <div className="pb-8 pb-24">
      {/* Back Button */}
      <Link 
        href="/dashboard/capsules"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
      >
        <ChevronLeft size={20} />
        <span>Back to Albums</span>
      </Link>

      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden mb-8"
      >
        {/* Cover Image or Gradient */}
        <div className="h-64 md:h-80">
          {album.cover_image_url ? (
            <img 
              src={album.cover_image_url} 
              alt={album.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${theme.color}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm mb-3">
                <span>{theme.icon}</span>
                <span>{theme.label}</span>
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                {album.name}
              </h1>
              {album.description && (
                <p className="text-white/80 text-lg max-w-2xl">{album.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-white/60 text-sm">
                <span className="flex items-center gap-1.5">
                  <ImageIcon size={14} />
                  {memories.length} memories
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  Created {formatDate(album.created_at)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {memories.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSlideshow(true)}
                  className="px-5 py-3 bg-white text-[#2D5A3D] rounded-xl font-medium flex items-center gap-2 shadow-lg"
                >
                  <Play size={18} fill="currentColor" />
                  Play Slideshow
                </motion.button>
              )}
              
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl transition-colors"
                >
                  <Download size={18} />
                </button>
                
                {showExportMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[160px] z-20"
                  >
                    <button
                      onClick={exportAsPDF}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FileText size={16} /> Export as PDF
                    </button>
                    <button
                      onClick={() => { setShowSlideshow(true); setShowExportMenu(false) }}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Film size={16} /> Video Slideshow
                    </button>
                  </motion.div>
                )}
              </div>

              <button
                onClick={() => setShowEditModal(true)}
                className="p-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl transition-colors"
              >
                <Edit2 size={18} />
              </button>

              <button
                onClick={handleDelete}
                className="p-3 bg-white/20 backdrop-blur-sm hover:bg-red-500/50 text-white rounded-xl transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Reorder Controls */}
      {memories.length > 1 && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Memories</h2>
          {isReordering ? (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelReorder}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveReorder}
                disabled={savingOrder}
                className="px-5 py-2 bg-[#2D5A3D] hover:bg-[#234A31] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {savingOrder ? 'Saving...' : 'Save Order'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsReordering(true)}
              className="px-4 py-2 text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-xl transition-colors flex items-center gap-2"
            >
              <GripVertical size={16} />
              Reorder
            </button>
          )}
        </div>
      )}

      {/* Memories Grid/List */}
      {memories.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white/50 rounded-2xl"
        >
          <Sparkles size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">This album is waiting for its first story</h3>
          <p className="text-gray-500 mb-6">Add a memory to get started</p>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-5 py-2.5 bg-[#2D5A3D] hover:bg-[#234A31] text-white rounded-xl font-medium transition-colors"
          >
            Add Memories
          </button>
        </motion.div>
      ) : isReordering ? (
        <Reorder.Group 
          axis="y" 
          values={reorderedIds} 
          onReorder={handleReorder}
          className="space-y-3"
        >
          {memories.map((memory) => {
            const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
            return (
              <Reorder.Item 
                key={memory.id} 
                value={memory.id}
                className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm cursor-grab active:cursor-grabbing group border border-gray-100"
              >
                <GripVertical size={20} className="text-gray-400 flex-shrink-0" />
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {coverMedia ? (
                    
<img src={coverMedia.file_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={24} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{memory.title || 'Untitled Memory'}</h3>
                  <p className="text-sm text-gray-500 truncate">
                    {memory.memory_date && formatDate(memory.memory_date)}
                    {memory.location_name && ` • ${memory.location_name}`}
                  </p>
                  {memory.ai_summary && (
                    <p className="text-sm text-gray-400 truncate mt-1">{memory.ai_summary}</p>
                  )}
                </div>
                {memory.is_favorite && (
                  <Heart size={16} className="text-red-500 fill-red-500 flex-shrink-0" />
                )}
              </Reorder.Item>
            )
          })}
        </Reorder.Group>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {memories.map((memory, index) => {
            const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
            return (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/dashboard/memories/${memory.id}`}>
                  <div className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer bg-white shadow-md hover:shadow-xl transition-all">
                    {coverMedia ? (
                      <img
                        src={coverMedia.file_url}
                        alt={memory.title || 'Memory'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <ImageIcon size={32} className="text-gray-400" />
                      </div>
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                    {/* Order Number */}
                    <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm font-bold text-[#2D5A3D]">
                      {index + 1}
                    </div>

                    {/* Favorite */}
                    {memory.is_favorite && (
                      <div className="absolute top-2 right-2">
                        <Heart size={16} className="text-red-500 fill-red-500 drop-shadow-md" />
                      </div>
                    )}

                    {/* Bottom Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-white font-medium truncate text-sm drop-shadow-lg">
                        {memory.title || 'Untitled'}
                      </h3>
                      {memory.memory_date && (
                        <p className="text-white/70 text-xs">{formatDate(memory.memory_date)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <CreateAlbumModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onCreated={handleSaveAlbum}
            editAlbum={album}
          />
        )}
      </AnimatePresence>

      {/* Slideshow */}
      {slideshowItems.length > 0 && (
        <SlideshowPlayer
          items={slideshowItems}
          title={album.name}
          isOpen={showSlideshow}
          onClose={() => setShowSlideshow(false)}
          autoPlay={true}
          slideDuration={5}
          showDownload={true}
        />
      )}
    </div>
  )
}
