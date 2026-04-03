'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Camera, MessageCircle, Sparkles, Quote, Upload, Image as ImageIcon, Loader2, Check } from 'lucide-react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface AddContributionModalProps {
  isOpen: boolean
  onClose: () => void
  memoryId: string
  onSubmit: (type: string, content: string, mediaUrl?: string) => void
}

const CONTRIBUTION_TYPES = [
  { 
    id: 'photo', 
    label: 'Photo', 
    icon: Camera, 
    color: 'bg-blue-500', 
    bgLight: 'bg-blue-100',
    textColor: 'text-blue-600',
    description: 'Upload a photo or video'
  },
  { 
    id: 'comment', 
    label: 'Comment', 
    icon: MessageCircle, 
    color: 'bg-emerald-500', 
    bgLight: 'bg-emerald-100',
    textColor: 'text-emerald-600',
    description: 'Share your thoughts'
  },
  { 
    id: 'moment', 
    label: 'Moment', 
    icon: Sparkles, 
    color: 'bg-amber-500', 
    bgLight: 'bg-amber-100',
    textColor: 'text-amber-600',
    description: 'Highlight a special moment'
  },
  { 
    id: 'quote', 
    label: 'Quote', 
    icon: Quote, 
    color: 'bg-purple-500', 
    bgLight: 'bg-purple-100',
    textColor: 'text-purple-600',
    description: 'Add a memorable quote'
  },
]

const QUICK_REACTIONS = ['❤️', '🎉', '😂', '🔥', '👏', '😍', '🥹', '💯', '✨', '🙌']

export default function AddContributionModal({ isOpen, onClose, memoryId, onSubmit }: AddContributionModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please select an image or video file')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File is too large (max 50MB)')
      return
    }

    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }, [])

  const handleRemoveMedia = useCallback(() => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview)
    }
    setMediaFile(null)
    setMediaPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [mediaPreview])

  const handleSubmit = async () => {
    if (!selectedType || !content.trim()) return
    
    setIsSubmitting(true)

    try {
      // Simulate upload delay
      await new Promise(r => setTimeout(r, 800))

      // In real implementation, upload media and get URL
      const mediaUrl = mediaPreview // For mock, use preview URL

      // Add reaction to content if selected
      const finalContent = selectedReaction 
        ? `${content} ${selectedReaction}`
        : content

      onSubmit(selectedType, finalContent, selectedType === 'photo' ? mediaUrl || undefined : undefined)
      
      // Reset form
      resetForm()
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedType(null)
    setContent('')
    handleRemoveMedia()
    setSelectedReaction(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const getPlaceholder = () => {
    switch (selectedType) {
      case 'photo': return 'Add a caption for this photo...'
      case 'comment': return 'Share your thoughts about this memory...'
      case 'moment': return 'Describe this special moment...'
      case 'quote': return 'Enter the memorable quote...'
      default: return 'Write something...'
    }
  }

  if (!isOpen) return null

  const modal = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#2d2d2d]">Add Contribution</h3>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-[#2d2d2d] mb-3">
              What would you like to add?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONTRIBUTION_TYPES.map(type => {
                const TypeIcon = type.icon
                const isSelected = selectedType === type.id
                
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? `${type.bgLight} border-current ${type.textColor}`
                        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected ? type.color : 'bg-gray-100'
                    }`}>
                      <TypeIcon size={20} className={isSelected ? 'text-white' : 'text-gray-500'} />
                    </div>
                    <div className="text-left">
                      <div className={`font-medium text-sm ${isSelected ? type.textColor : 'text-[#2d2d2d]'}`}>
                        {type.label}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {type.description}
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={16} className={`ml-auto ${type.textColor}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Media Upload (for photo type) */}
          <AnimatePresence>
            {selectedType === 'photo' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Photo or Video
                </label>
                {!mediaPreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 font-medium mb-1">Click to upload</p>
                    <p className="text-gray-400 text-sm">or drag and drop</p>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden">
                    <img 
                      src={mediaPreview} 
                      alt="Preview" 
                      className="w-full max-h-48 object-cover"
                    />
                    <button
                      onClick={handleRemoveMedia}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content Input */}
          {selectedType && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                {selectedType === 'quote' ? 'Quote' : 'Your Message'}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={getPlaceholder()}
                rows={selectedType === 'quote' ? 4 : 3}
                className={`w-full px-4 py-3 bg-[#F5F3EE] border border-gray-200 rounded-xl text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 focus:border-[#2D5A3D] transition-all resize-none ${
                  selectedType === 'quote' ? 'italic text-lg' : ''
                }`}
              />
            </motion.div>
          )}

          {/* Emoji Reactions */}
          {selectedType && content.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                Add a Reaction (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setSelectedReaction(selectedReaction === emoji ? null : emoji)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                      selectedReaction === emoji
                        ? 'bg-[#2D5A3D]/10 border-2 border-[#2D5A3D] scale-110'
                        : 'bg-gray-100 hover:bg-gray-200 border-2 border-transparent'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedType || !content.trim() || (selectedType === 'photo' && !mediaPreview) || isSubmitting}
            className="flex-1 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234A31] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Check size={18} />
                Add Contribution
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )

  if (typeof window === 'undefined') return null
  return createPortal(modal, document.body)
}
