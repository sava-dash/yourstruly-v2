'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { X, Image as ImageIcon, Check, GripVertical, Trash2, Plus, Sparkles, Search } from 'lucide-react'
import NextImage from 'next/image'
import { MemoryAlbum, AlbumTheme, CAPSULE_THEMES, AlbumMemory } from '@/types/album'

interface CreateAlbumModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (album: MemoryAlbum) => void
  editAlbum?: MemoryAlbum | null
}

export default function CreateAlbumModal({ isOpen, onClose, onSave, editAlbum }: CreateAlbumModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [theme, setTheme] = useState<AlbumTheme>('custom')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([])
  const [availableMemories, setAvailableMemories] = useState<AlbumMemory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMemories, setLoadingMemories] = useState(true)
  const [step, setStep] = useState<'details' | 'memories'>('details')
  
  const supabase = createClient()

  // Load existing data if editing
  useEffect(() => {
    if (editAlbum) {
      setName(editAlbum.name)
      setDescription(editAlbum.description || '')
      setTheme(editAlbum.theme)
      setCoverImageUrl(editAlbum.cover_image_url)
      setSelectedMemoryIds(editAlbum.memory_ids || [])
    } else {
      setName('')
      setDescription('')
      setTheme('custom')
      setCoverImageUrl(null)
      setSelectedMemoryIds([])
    }
    setStep('details')
  }, [editAlbum, isOpen])

  // Load available memories
  useEffect(() => {
    if (!isOpen) return
    
    const loadMemories = async () => {
      setLoadingMemories(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('memories')
        .select(`
          id, title, description, memory_date, memory_type, 
          location_name, ai_summary, ai_mood, ai_category, is_favorite,
          memory_media(id, file_url, file_type, is_cover)
        `)
        .eq('user_id', user.id)
        .neq('memory_type', 'wisdom')
        .order('memory_date', { ascending: false })

      setAvailableMemories(data || [])
      setLoadingMemories(false)
    }

    loadMemories()
  }, [isOpen, supabase])

  const handleSave = async () => {
    if (!name.trim()) return
    
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const albumData = {
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      theme,
      cover_image_url: coverImageUrl,
      memory_ids: selectedMemoryIds,
    }

    try {
      if (editAlbum) {
        const { data, error } = await supabase
          .from('memory_albums')
          .update(albumData)
          .eq('id', editAlbum.id)
          .select()
          .single()

        if (error) throw error
        onSave(data)
      } else {
        const { data, error } = await supabase
          .from('memory_albums')
          .insert(albumData)
          .select()
          .single()

        if (error) throw error
        onSave(data)
      }
      onClose()
    } catch (error) {
      console.error('Error saving album:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleMemory = (memoryId: string) => {
    setSelectedMemoryIds(prev => 
      prev.includes(memoryId) 
        ? prev.filter(id => id !== memoryId)
        : [...prev, memoryId]
    )
  }

  const removeMemory = (memoryId: string) => {
    setSelectedMemoryIds(prev => prev.filter(id => id !== memoryId))
  }

  const setCoverFromMemory = (memory: AlbumMemory) => {
    const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
    if (coverMedia) {
      setCoverImageUrl(coverMedia.file_url)
    }
  }

  // Filter memories by search
  const filteredMemories = availableMemories.filter(m => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      m.title?.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query) ||
      m.location_name?.toLowerCase().includes(query) ||
      m.ai_category?.toLowerCase().includes(query)
    )
  })

  // Get selected memories in order
  const selectedMemories = selectedMemoryIds
    .map(id => availableMemories.find(m => m.id === id))
    .filter(Boolean) as AlbumMemory[]

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white/95 backdrop-blur-xl rounded-2xl border border-white/50 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2D5A3D]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Sparkles size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-[#2d2d2d] font-semibold text-lg">
                {editAlbum ? 'Edit Album' : 'Create Memory Album'}
              </h3>
              <p className="text-sm text-gray-500">
                {step === 'details' ? 'Step 1: Album details' : 'Step 2: Select memories'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {step === 'details' ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="My Summer Adventures..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#2D5A3D] focus:ring-2 focus:ring-[#2D5A3D]/20 outline-none transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="A collection of memories from..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#2D5A3D] focus:ring-2 focus:ring-[#2D5A3D]/20 outline-none transition-all resize-none"
                  />
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                  <div className="grid grid-cols-4 gap-3">
                    {CAPSULE_THEMES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                          theme === t.value 
                            ? 'border-[#2D5A3D] bg-[#2D5A3D]/5' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl">{t.icon}</span>
                        <span className="text-xs font-medium text-gray-700">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cover Preview */}
                {coverImageUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
                    <div className="relative w-32 aspect-[4/5] rounded-xl overflow-hidden">

<NextImage src={coverImageUrl} alt="Cover" fill className="object-cover" unoptimized />
                      <button
                        onClick={() => setCoverImageUrl(null)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="memories"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                {/* Selected Memories (Reorderable) */}
                {selectedMemories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Memories ({selectedMemories.length}) — Drag to reorder
                    </label>
                    <Reorder.Group 
                      axis="y" 
                      values={selectedMemoryIds} 
                      onReorder={setSelectedMemoryIds}
                      className="space-y-2"
                    >
                      {selectedMemories.map((memory) => {
                        const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
                        return (
                          <Reorder.Item 
                            key={memory.id} 
                            value={memory.id}
                            className="flex items-center gap-3 p-3 bg-[#2D5A3D]/5 rounded-xl cursor-grab active:cursor-grabbing group"
                          >
                            <GripVertical size={16} className="text-gray-400" />
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                              {coverMedia ? (

<NextImage src={coverMedia.file_url} alt="" width={48} height={48} className="w-full h-full object-cover" unoptimized />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon size={16} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate">{memory.title || 'Untitled Memory'}</p>
                              <p className="text-xs text-gray-500 truncate">{memory.ai_category || memory.memory_type}</p>
                            </div>
                            <button
                              onClick={() => setCoverFromMemory(memory)}
                              className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Set Cover
                            </button>
                            <button
                              onClick={() => removeMemory(memory.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          </Reorder.Item>
                        )
                      })}
                    </Reorder.Group>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    aria-label="Search" placeholder="Search memories..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#2D5A3D] focus:ring-2 focus:ring-[#2D5A3D]/20 outline-none transition-all text-sm"
                  />
                </div>

                {/* Available Memories Grid */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available Memories</label>
                  {loadingMemories ? (
                    <div className="grid grid-cols-4 gap-3">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto">
                      {filteredMemories.map(memory => {
                        const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
                        const isSelected = selectedMemoryIds.includes(memory.id)
                        
                        return (
                          <button
                            key={memory.id}
                            onClick={() => toggleMemory(memory.id)}
                            className={`relative aspect-square rounded-xl overflow-hidden group transition-all ${
                              isSelected ? 'ring-2 ring-[#2D5A3D] ring-offset-2' : 'hover:ring-2 hover:ring-gray-300'
                            }`}
                          >
                            {coverMedia ? (

<NextImage src={coverMedia.file_url} alt="" fill className="object-cover" unoptimized />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <ImageIcon size={20} className="text-gray-400" />
                              </div>
                            )}
                            
                            {/* Overlay */}
                            <div className={`absolute inset-0 transition-all ${
                              isSelected ? 'bg-[#2D5A3D]/40' : 'bg-black/0 group-hover:bg-black/20'
                            }`} />
                            
                            {/* Selection indicator */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#2D5A3D] flex items-center justify-center">
                                <Check size={14} className="text-white" />
                              </div>
                            )}
                            
                            {/* Title overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                              <p className="text-white text-[10px] truncate font-medium">{memory.title || 'Untitled'}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#2D5A3D]/10 flex items-center justify-between">
          <div>
            {step === 'memories' && (
              <button
                onClick={() => setStep('details')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            {step === 'details' ? (
              <button
                onClick={() => setStep('memories')}
                disabled={!name.trim()}
                className="px-6 py-2.5 bg-[#2D5A3D] hover:bg-[#234A31] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Select Memories →
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={loading || selectedMemoryIds.length === 0}
                className="px-6 py-2.5 bg-[#2D5A3D] hover:bg-[#234A31] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>{editAlbum ? 'Save Changes' : 'Create Album'}</>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
