'use client'

import React, { useState, useEffect, use, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  ChevronLeft, Heart, MapPin, Calendar, Sparkles, 
  Trash2, Edit2, X, Plus, Image as ImageIcon, Upload, Zap, Play, Square, Share2, Users, FolderPlus, MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import '@/styles/home.css'
import Modal from '@/components/ui/Modal'
import FaceTagger from '@/components/media/FaceTagger'
import ShareMemoryModal from '@/components/memories/ShareMemoryModal'
import MemoryContributions from '@/components/memories/MemoryContributions'
import AddToCapsuleModal from '@/components/capsules/AddToCapsuleModal'
import MoodSelector from '@/components/memories/MoodSelector'
import { MoodType } from '@/lib/ai/moodAnalysis'
import { motion, AnimatePresence } from 'framer-motion'

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
  created_at: string
  mood: MoodType | null
  mood_override: boolean
}

interface Media {
  id: string
  file_url: string
  file_type: string
  mime_type: string
  width: number
  height: number
  is_cover: boolean
}

interface MemoryShare {
  id: string
  contact_id: string
  can_comment: boolean
  can_add_media: boolean
  contact: {
    id: string
    name: string
    email?: string
    phone?: string
    relationship_type?: string
  }
}

// Parse conversation markdown into structured content
function parseMemoryContent(description: string) {
  if (!description) return null;
  
  // Check if it's a conversation format
  if (!description.includes('## Summary') && !description.includes('## Conversation')) {
    return { type: 'plain', content: description };
  }
  
  const parts = description.split('## Conversation');
  const summaryPart = parts[0]?.replace('## Summary', '').trim();
  
  const qaSection = parts[1] || '';
  const exchanges: { question: string; answer: string; audioUrl?: string }[] = [];
  
  // Split by --- separator first
  const qaPairs = qaSection.split(/\n\n---\n\n/).filter(s => s.trim());
  
  for (const pair of qaPairs) {
    // Extract question
    const qMatch = pair.match(/\*\*Q\d+:\*\*\s*(.+?)(?=\n\n\*\*A)/s);
    // Extract answer (everything between **A#:** and either 🎙️ or end)
    const aMatch = pair.match(/\*\*A\d+:\*\*\s*(.+?)(?=\n\n🎙️|$)/s);
    // Extract audio URL
    const audioMatch = pair.match(/🎙️ \[Audio\]\((.+?)\)/);
    
    if (qMatch && aMatch) {
      exchanges.push({
        question: qMatch[1]?.trim() || '',
        answer: aMatch[1]?.trim() || '',
        audioUrl: audioMatch?.[1]?.trim(),
      });
    }
  }
  
  return { type: 'conversation', summary: summaryPart, exchanges };
}

// Toast Component (for XP and info messages)
function Toast({ amount, message, onComplete }: { amount?: number; message?: string; onComplete?: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 2500)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full shadow-lg shadow-amber-500/30">
        {amount && amount > 0 && (
          <>
            <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Zap size={20} className="text-white fill-white" />
            </motion.div>
            <span className="text-white font-bold text-lg">+{amount} XP</span>
          </>
        )}
        {message && <span className="text-white/80 text-sm">{message}</span>}
      </div>
    </motion.div>
  )
}

export default function MemoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [memory, setMemory] = useState<Memory | null>(null)
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', memory_date: '', location_name: '' })
  const [uploading, setUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null)
  const [xpToasts, setXpToasts] = useState<Array<{ id: number; amount?: number; message?: string }>>([])
  const [isPlayingConversation, setIsPlayingConversation] = useState(false)
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(-1)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shares, setShares] = useState<MemoryShare[]>([])
  const [showSharedList, setShowSharedList] = useState(false)
  const [removingShareId, setRemovingShareId] = useState<string | null>(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<{ shareId: string; name: string } | null>(null)
  const [showCapsuleModal, setShowCapsuleModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toastIdRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playingRef = useRef(false)
  
  const supabase = createClient()

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopConversationPlayback()
    }
  }, [])

  const stopConversationPlayback = () => {
    playingRef.current = false
    setIsPlayingConversation(false)
    setCurrentPlayingIndex(-1)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  const playConversation = async (exchanges: Array<{ question: string; answer: string; audioUrl?: string }>) => {
    if (isPlayingConversation) {
      stopConversationPlayback()
      return
    }

    playingRef.current = true
    setIsPlayingConversation(true)

    try {
      for (let i = 0; i < exchanges.length; i++) {
        if (!playingRef.current) break
        
        const ex = exchanges[i]
        setCurrentPlayingIndex(i)

        // Speak question using browser TTS
        if ('speechSynthesis' in window) {
          await new Promise<void>((resolve) => {
            if (!playingRef.current) { resolve(); return }
            
            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(ex.question)
            utterance.rate = 0.95
            
            // Try to find a good voice
            const voices = window.speechSynthesis.getVoices()
            const preferredVoice = voices.find(v => 
              v.name.includes('Samantha') || 
              v.name.includes('Google US English') ||
              (v.lang.startsWith('en') && v.localService)
            ) || voices.find(v => v.lang.startsWith('en-US'))
            if (preferredVoice) utterance.voice = preferredVoice
            
            utterance.onend = () => resolve()
            utterance.onerror = () => resolve()
            window.speechSynthesis.speak(utterance)
          })
        }

        if (!playingRef.current) break
        await new Promise(r => setTimeout(r, 400))

        // Play answer audio if available
        if (ex.audioUrl && playingRef.current) {
          await new Promise<void>((resolve) => {
            const audio = new Audio(ex.audioUrl)
            audioRef.current = audio
            audio.onended = () => {
              audioRef.current = null
              resolve()
            }
            audio.onerror = () => {
              audioRef.current = null
              resolve()
            }
            audio.play().catch(() => resolve())
          })
        }

        if (!playingRef.current) break
        await new Promise(r => setTimeout(r, 500))
      }
    } finally {
      setIsPlayingConversation(false)
      setCurrentPlayingIndex(-1)
      playingRef.current = false
    }
  }

  const showXP = (amount?: number, message?: string) => {
    const id = toastIdRef.current++
    setXpToasts(prev => [...prev, { id, amount, message }])
  }

  const removeToast = (id: number) => {
    setXpToasts(prev => prev.filter(t => t.id !== id))
  }

  useEffect(() => {
    loadMemory()
    loadShares()
  }, [id])

  const loadShares = async () => {
    try {
      const res = await fetch(`/api/memories/${id}/share`)
      if (res.ok) {
        const data = await res.json()
        setShares(data.shares || [])
      }
    } catch (err) {
      console.error('Failed to load shares:', err)
    }
  }

  const handleRemoveShare = async (contactId: string) => {
    setRemovingShareId(contactId)
    try {
      const res = await fetch(`/api/memories/${id}/share?contact_id=${contactId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setShares(prev => prev.filter(s => s.contact_id !== contactId))
        showXP(undefined, 'Share removed')
      }
    } catch (err) {
      console.error('Failed to remove share:', err)
    } finally {
      setRemovingShareId(null)
      setShowRemoveConfirm(null)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const loadMemory = async () => {
    setLoading(true)
    
    const { data: memoryData } = await supabase
      .from('memories')
      .select('*')
      .eq('id', id)
      .single()

    if (memoryData) {
      setMemory(memoryData)
      setEditForm({
        title: memoryData.title || '',
        description: memoryData.description || '',
        memory_date: memoryData.memory_date || '',
        location_name: memoryData.location_name || '',
      })
    }

    const { data: mediaData } = await supabase
      .from('memory_media')
      .select('*')
      .eq('memory_id', id)
      .order('sort_order')

    setMedia(mediaData || [])
    if (mediaData?.length) {
      setSelectedMedia(mediaData.find(m => m.is_cover) || mediaData[0])
    }

    setLoading(false)
  }

  const toggleFavorite = async () => {
    if (!memory) return
    
    const { error } = await supabase
      .from('memories')
      .update({ is_favorite: !memory.is_favorite })
      .eq('id', memory.id)

    if (!error) {
      setMemory({ ...memory, is_favorite: !memory.is_favorite })
    }
  }

  const handleSaveEdit = async () => {
    if (!memory) return

    const { error } = await supabase
      .from('memories')
      .update(editForm)
      .eq('id', memory.id)

    if (!error) {
      setMemory({ ...memory, ...editForm })
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this memory? This cannot be undone.')) return

    for (const m of media) {
      const key = m.file_url.split('/memories/')[1]
      if (key) {
        await supabase.storage.from('memories').remove([key])
      }
    }

    await supabase.from('memories').delete().eq('id', id)
    window.location.href = '/dashboard/memories'
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !memory) return

    setUploading(true)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue
        if (file.size > 50 * 1024 * 1024) {
          alert(`File ${file.name} is too large (max 50MB)`)
          continue
        }

        // Use our API that handles face detection and XP
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`/api/memories/${id}/media`, {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const data = await res.json()
          
          // Show face detection results (no XP for upload)
          if (data.faces?.length > 0) {
            showXP(undefined, `👤 ${data.faces.length} face${data.faces.length > 1 ? 's' : ''} detected`)
          }
        }
      }

      // Reload media
      await loadMemory()
      
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteMedia = async () => {
    if (!deletingMediaId) return

    const mediaToDelete = media.find(m => m.id === deletingMediaId)
    if (!mediaToDelete) return

    const key = mediaToDelete.file_url.split('/memories/')[1]
    if (key) {
      await supabase.storage.from('memories').remove([key])
    }

    await supabase.from('memory_media').delete().eq('id', deletingMediaId)

    const newMedia = media.filter(m => m.id !== deletingMediaId)
    setMedia(newMedia)

    if (selectedMedia?.id === deletingMediaId) {
      setSelectedMedia(newMedia[0] || null)
    }

    if (mediaToDelete.is_cover && newMedia.length > 0) {
      await supabase.from('memory_media').update({ is_cover: true }).eq('id', newMedia[0].id)
      newMedia[0].is_cover = true
    }

    setShowDeleteConfirm(false)
    setDeletingMediaId(null)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
    })
  }

  // Parse content for display
  const parsedContent = memory ? parseMemoryContent(memory.description) : null;

  if (loading) {
    return (
      <div className="pb-8 relative">
        <div className="home-background">
          <div className="home-blob home-blob-1" />
          <div className="home-blob home-blob-2" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Loading memory...</div>
        </div>
      </div>
    )
  }

  if (!memory) {
    return (
      <div className="pb-8 relative">
        <div className="home-background">
          <div className="home-blob home-blob-1" />
          <div className="home-blob home-blob-2" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Memory not found</p>
            <Link href="/dashboard/memories" className="text-[#406A56] hover:underline">
              Back to memories
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-8 relative pb-24">
      {/* Warm background */}
      <div className="home-background">
        <div className="home-blob home-blob-1" />
        <div className="home-blob home-blob-2" />
        <div className="home-blob home-blob-3" />
      </div>
      
      <div className="relative z-10 p-6">
      {/* Toasts */}
      <AnimatePresence>
        {xpToasts.map(toast => (
          <Toast
            key={toast.id}
            amount={toast.amount}
            message={toast.message}
            onComplete={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>

      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <Link href="/dashboard/memories" className="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm rounded-xl text-gray-600 hover:text-gray-900 transition-all border border-gray-200 shadow-sm">
          <ChevronLeft size={18} />
          <span>Back</span>
        </Link>
        
        <div className="flex items-center gap-2">
          {/* Shared indicator - clickable to show list */}
          {shares.length > 0 && (
            <button
              onClick={() => setShowSharedList(!showSharedList)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#406A56]/10 hover:bg-[#406A56]/20 rounded-full text-[#406A56] text-sm transition-colors"
            >
              <Users size={14} />
              <span>Shared with {shares.length}</span>
            </button>
          )}
          {/* Add to Album button */}
          <button
            onClick={() => setShowCapsuleModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all shadow-sm"
            title="Add to Album"
          >
            <FolderPlus size={16} />
            <span className="text-sm font-medium hidden sm:inline">Album</span>
          </button>
          {/* Share button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#406A56] text-white rounded-xl hover:bg-[#4a7a64] transition-all shadow-sm"
          >
            <Share2 size={16} />
            <span className="text-sm font-medium">Share</span>
          </button>
          <button
            onClick={toggleFavorite}
            className={`p-2.5 bg-white/80 backdrop-blur-sm rounded-xl transition-all border border-gray-200 shadow-sm ${memory.is_favorite ? 'text-[#C35F33]' : 'text-gray-400 hover:text-[#C35F33]'}`}
          >
            <Heart size={18} fill={memory.is_favorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2.5 bg-white/80 backdrop-blur-sm text-gray-400 hover:text-gray-700 rounded-xl transition-all border border-gray-200 shadow-sm"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2.5 bg-white/80 backdrop-blur-sm text-gray-400 hover:text-red-500 rounded-xl transition-all border border-gray-200 shadow-sm"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Shared With Panel - Expandable */}
      <AnimatePresence>
        {showSharedList && shares.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#2d2d2d] flex items-center gap-2">
                  <Users size={16} className="text-[#406A56]" />
                  Shared with {shares.length} {shares.length === 1 ? 'person' : 'people'}
                </h3>
                <button
                  onClick={() => setShowSharedList(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2">
                {shares.map(share => (
                  <div
                    key={share.id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F2F1E5] transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#406A56] to-[#5A8A72] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {getInitials(share.contact.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[#2d2d2d] font-medium text-sm truncate">
                        {share.contact.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {share.contact.relationship_type && (
                          <span className="text-[#406A56]">{share.contact.relationship_type}</span>
                        )}
                        {share.can_add_media && (
                          <span className="px-1.5 py-0.5 bg-[#D9C61A]/20 text-[#8a7c08] rounded text-[10px]">
                            Contributor
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRemoveConfirm({ shareId: share.contact_id, name: share.contact.name })}
                      disabled={removingShareId === share.contact_id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {removingShareId === share.contact_id ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <X size={16} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto">
        {/* New 3-column layout: Left actions | Center content | Right metadata */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CENTER COLUMN - Media + Transcript (main content) */}
          <div className="lg:col-span-8 lg:col-start-1 space-y-6 order-2 lg:order-1">
            
            {/* Title */}
            <div className="text-center lg:text-left">
              <h1 className="text-2xl lg:text-3xl font-bold text-[#2d2d2d]">
                {memory.title || 'Untitled Memory'}
              </h1>
              {parsedContent?.summary && (
                <p className="text-gray-500 mt-2 text-sm italic max-w-2xl">
                  {parsedContent.summary.length > 150 ? parsedContent.summary.slice(0, 150) + '...' : parsedContent.summary}
                </p>
              )}
            </div>

            {/* Media Gallery - Top Center */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100">
              {selectedMedia ? (
                <div className="space-y-4">
                  {/* Main image with face tagging */}
                  <FaceTagger
                    mediaId={selectedMedia.id}
                    imageUrl={selectedMedia.file_url}
                    onXPEarned={showXP}
                  />
                  
                  {/* Thumbnail strip */}
                  {media.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
                      {media.map(m => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMedia(m)}
                          className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            selectedMedia?.id === m.id ? 'border-[#406A56] ring-2 ring-[#406A56]/20' : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img src={m.file_url} alt="" className="w-full h-full object-cover" />
                          {m.is_cover && (
                            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-amber-600 rounded-full flex items-center justify-center">
                              <Sparkles size={10} className="text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                      
                      {/* Add more photos button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#406A56] flex items-center justify-center transition-colors bg-white/50"
                      >
                        {uploading ? (
                          <div className="w-5 h-5 border-2 border-[#406A56] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Plus size={20} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                  <ImageIcon size={48} className="text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">No photos yet</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#406A56] hover:bg-[#355a49] text-white rounded-lg transition-colors"
                  >
                    <Upload size={18} />
                    Upload Photos
                  </button>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Transcript / Conversation - Center with great formatting */}
            {parsedContent?.type === 'conversation' && parsedContent.exchanges && parsedContent.exchanges.length > 0 && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Transcript Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#406A56]/5 to-transparent">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#2d2d2d] flex items-center gap-2">
                      <MessageSquare size={18} className="text-[#406A56]" />
                      Conversation
                    </h2>
                    
                    {/* Play/Pause Button */}
                    <button
                      onClick={() => playConversation(parsedContent.exchanges)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                        isPlayingConversation 
                          ? 'bg-[#406A56] text-white' 
                          : 'bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20'
                      }`}
                    >
                      {isPlayingConversation ? (
                        <>
                          <Square size={14} fill="currentColor" />
                          <span className="text-sm font-medium">
                            Playing {currentPlayingIndex + 1}/{parsedContent.exchanges.length}
                          </span>
                        </>
                      ) : (
                        <>
                          <Play size={14} fill="currentColor" />
                          <span className="text-sm font-medium">Play All</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {parsedContent.exchanges.length} questions & answers
                  </p>
                </div>
                
                {/* Q&A Exchanges - Beautiful card layout */}
                <div className="p-6 space-y-8">
                  {parsedContent.exchanges.map((ex: { question: string; answer: string; audioUrl?: string }, idx: number) => (
                    <div key={idx} className={`relative ${isPlayingConversation && currentPlayingIndex === idx ? 'ring-2 ring-[#406A56]/30 rounded-xl p-2 -m-2' : ''}`}>
                      {/* Question */}
                      <div className="mb-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#406A56] flex items-center justify-center text-white text-xs font-bold">
                            Q{idx + 1}
                          </div>
                          <div className="flex-1 bg-[#406A56]/5 rounded-2xl rounded-tl-none px-4 py-3">
                            <p className="text-[#2d2d2d] font-medium leading-relaxed">{ex.question}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Answer */}
                      <div className="pl-11">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#D9C61A] to-[#C9B60A] flex items-center justify-center text-white text-xs font-bold">
                            A
                          </div>
                          <div className="flex-1">
                            <div className="bg-gradient-to-br from-[#FEFCE8] to-white border border-[#D9C61A]/20 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{ex.answer}</p>
                            </div>
                            
                            {/* Audio playback button */}
                            {ex.audioUrl && (
                              <button 
                                onClick={() => new Audio(ex.audioUrl).play()}
                                className="mt-2 flex items-center gap-1.5 text-xs text-[#406A56] hover:text-[#355a49] transition-colors"
                              >
                                <Play size={12} fill="currentColor" />
                                <span>Listen to original response</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Separator */}
                      {idx < parsedContent.exchanges.length - 1 && (
                        <div className="mt-8 flex items-center justify-center">
                          <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#D9C61A]/30 to-transparent" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plain description for non-conversation memories */}
            {(!parsedContent || parsedContent.type !== 'conversation') && memory.description && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{memory.description}</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Metadata & Actions */}
          <div className="lg:col-span-4 space-y-4 order-1 lg:order-2">
            
            {/* Quick Actions Card */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#406A56]/10 hover:bg-[#406A56]/20 text-[#406A56] rounded-lg transition-colors text-sm font-medium"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#406A56] hover:bg-[#4a7a64] text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Share2 size={14} />
                  Share
                </button>
                <button
                  onClick={() => setShowCapsuleModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <FolderPlus size={14} />
                  Album
                </button>
                <button
                  onClick={toggleFavorite}
                  className={`p-2 rounded-lg transition-colors ${memory.is_favorite ? 'bg-[#C35F33]/10 text-[#C35F33]' : 'bg-gray-100 text-gray-400 hover:text-[#C35F33]'}`}
                >
                  <Heart size={16} fill={memory.is_favorite ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            {/* Metadata Card */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</h3>
              <div className="space-y-3">
                {memory.memory_date && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#406A56]/10 flex items-center justify-center">
                      <Calendar size={14} className="text-[#406A56]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Date</p>
                      <p className="text-sm text-gray-700 font-medium">{formatDate(memory.memory_date)}</p>
                    </div>
                  </div>
                )}
                {memory.location_name && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#C35F33]/10 flex items-center justify-center">
                      <MapPin size={14} className="text-[#C35F33]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Location</p>
                      <p className="text-sm text-gray-700 font-medium">{memory.location_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mood Tag */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-gray-100">
              <MoodSelector
                memoryId={memory.id}
                currentMood={memory.mood}
                isOverride={memory.mood_override || false}
                onMoodChange={(newMood) => {
                  setMemory(prev => prev ? { ...prev, mood: newMood } : prev)
                }}
              />
            </div>

            {/* Smart Tags */}
            {(memory.ai_summary || memory.ai_mood || memory.ai_category || memory.ai_labels?.length) && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-[#406A56] flex items-center gap-2 mb-3">
                  <Sparkles size={14} />
                  Smart Tags
                </h3>
                
                {memory.ai_summary && (
                  <div className="space-y-2 mb-3">
                    {memory.ai_summary.split('\n').map((line, i) => {
                      const match = line.match(/^-\s*\*\*(.+?)\*\*:\s*(.+)$/);
                      if (match) {
                        return (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#D9C61A] mt-2 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-[#4A3552]">{match[1]}:</span>
                              <span className="text-gray-600 ml-1">{match[2]}</span>
                            </div>
                          </div>
                        );
                      }
                      if (line.trim()) {
                        return <p key={i} className="text-gray-600 text-sm">{line}</p>;
                      }
                      return null;
                    })}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {memory.ai_mood && (
                    <span className="px-2 py-1 bg-[#4A3552]/10 text-[#4A3552] rounded-full text-xs capitalize">
                      {memory.ai_mood}
                    </span>
                  )}
                  {memory.ai_category && (
                    <span className="px-2 py-1 bg-[#8DACAB]/20 text-[#406A56] rounded-full text-xs capitalize">
                      {memory.ai_category}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Shared With */}
            {shares.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users size={14} />
                  Shared with {shares.length}
                </h3>
                <div className="space-y-2">
                  {shares.map(share => (
                    <div key={share.id} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#406A56] to-[#5A8A72] flex items-center justify-center text-white text-xs">
                        {getInitials(share.contact.name)}
                      </div>
                      <span className="text-gray-700">{share.contact.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delete Button */}
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm"
            >
              <Trash2 size={14} />
              Delete Memory
            </button>
          </div>
        </div>

        {/* Contributions Section */}
        <div className="mt-8">
          <MemoryContributions memoryId={id} />
        </div>
      </main>
      </div>

      {/* Edit Modal - Warm styling */}
      <Modal 
        isOpen={isEditing} 
        onClose={() => setIsEditing(false)} 
        title="Edit Memory"
        showDone={false}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[#2d2d2d] text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-[#406A56]/20 rounded-xl text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 focus:border-[#406A56] transition-all"
              placeholder="Give this memory a title..."
            />
          </div>
          <div>
            <label className="block text-[#2d2d2d] text-sm font-medium mb-2">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-white border border-[#406A56]/20 rounded-xl text-[#2d2d2d] placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 focus:border-[#406A56] transition-all"
              placeholder="What happened? Who was there? How did you feel?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#2d2d2d] text-sm font-medium mb-2">
                <Calendar size={14} className="inline mr-1.5 text-[#406A56]" />
                Date
              </label>
              <input
                type="date"
                value={editForm.memory_date}
                onChange={(e) => setEditForm({ ...editForm, memory_date: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-[#406A56]/20 rounded-xl text-[#2d2d2d] focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 focus:border-[#406A56] transition-all"
              />
            </div>
            <div>
              <label className="block text-[#2d2d2d] text-sm font-medium mb-2">
                <MapPin size={14} className="inline mr-1.5 text-[#406A56]" />
                Location
              </label>
              <input
                type="text"
                value={editForm.location_name}
                onChange={(e) => setEditForm({ ...editForm, location_name: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-[#406A56]/20 rounded-xl text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 focus:border-[#406A56] transition-all"
                placeholder="Where was this?"
              />
            </div>
          </div>
          <button
            onClick={handleSaveEdit}
            className="w-full py-3 bg-[#406A56] hover:bg-[#4a7a64] text-white rounded-xl font-medium transition-colors shadow-sm mt-2"
          >
            Save Changes
          </button>
        </div>
      </Modal>

      {/* Delete Confirm Modal - Warm styling */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Photo" showDone={false}>
        <p className="text-gray-600 mb-6">Are you sure you want to delete this photo? This action cannot be undone.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="flex-1 py-2.5 bg-white border border-[#406A56]/20 hover:bg-[#F2F1E5] text-[#2d2d2d] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteMedia}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>

      {/* Remove Share Confirm Modal */}
      <Modal 
        isOpen={!!showRemoveConfirm} 
        onClose={() => setShowRemoveConfirm(null)} 
        title="Remove Share" 
        showDone={false}
      >
        <p className="text-gray-600 mb-6">
          Remove <span className="font-semibold text-[#2d2d2d]">{showRemoveConfirm?.name}</span> from this memory? 
          They will no longer be able to view or contribute to it.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRemoveConfirm(null)}
            className="flex-1 py-2.5 bg-white border border-[#406A56]/20 hover:bg-[#F2F1E5] text-[#2d2d2d] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => showRemoveConfirm && handleRemoveShare(showRemoveConfirm.shareId)}
            disabled={!!removingShareId}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {removingShareId ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Removing...
              </>
            ) : (
              'Remove'
            )}
          </button>
        </div>
      </Modal>

      {/* Share Memory Modal */}
      <ShareMemoryModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false)
          loadShares() // Refresh shares when modal closes
        }}
        memoryId={id}
        memoryTitle={memory?.title}
      />

      {/* Add to Capsule Modal */}
      <AddToCapsuleModal
        isOpen={showCapsuleModal}
        onClose={() => setShowCapsuleModal(false)}
        memoryId={id}
        onAdded={() => showXP(undefined, 'Added to album!')}
      />
    </div>
  )
}
