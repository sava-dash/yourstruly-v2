'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, Brain, ImagePlus, Mic, ChevronRight, Scan, RefreshCw, Smartphone, QrCode, Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { VoiceVideoChat } from '@/components/voice'
import GalleryUpload from '@/components/gallery/GalleryUpload'
import DigitizeModal from '@/components/gallery/DigitizeModal'

type AddMode = 'menu' | 'memory' | 'wisdom' | 'photos'

interface Prompt {
  id: string
  promptText: string
  type: string
}

interface AddContentModalProps {
  isOpen: boolean
  onClose: () => void
  onContentAdded?: () => void
}

export default function AddContentModal({ isOpen, onClose, onContentAdded }: AddContentModalProps) {
  const [mode, setMode] = useState<AddMode>('menu')
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [showDigitize, setShowDigitize] = useState(false)

  // Prompt types to exclude — these are better handled via forms (contact info,
  // field-based data) or require a photo context and aren't suited for voice input.
  const EXCLUDED_TYPES = [
    'photo_backstory', 'tag_person',
    'missing_info', 'quick_question', 'contact_info',
    'personality', 'religion', 'skills', 'languages',
    'favorite_books', 'favorite_movies', 'favorite_music', 'favorite_foods',
    'daily_checkin', 'recipe',
  ]

  const fetchPrompts = useCallback(async (category: 'memory' | 'wisdom') => {
    setLoadingPrompts(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Query engagement_prompts directly, excluding form-based + photo types
      const typeFilter = category === 'wisdom'
        ? ['knowledge', 'recipes_wisdom']
        : ['memory', 'life_story', 'childhood', 'family', 'relationship', 'career', 'milestone', 'memory_prompt']

      const { data } = await supabase
        .from('engagement_prompts')
        .select('id, prompt_text, type')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .not('type', 'in', `(${EXCLUDED_TYPES.join(',')})`)
        .in('type', typeFilter)
        .limit(20)

      if (data && data.length > 0) {
        const shuffled = data.sort(() => Math.random() - 0.5).slice(0, 3)
        setPrompts(shuffled.map(p => ({ id: p.id, promptText: p.prompt_text, type: p.type })))
      } else {
        // Broader query if no type-specific prompts found
        const { data: anyData } = await supabase
          .from('engagement_prompts')
          .select('id, prompt_text, type')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .not('type', 'in', `(${EXCLUDED_TYPES.join(',')})`)
          .limit(20)

        if (anyData && anyData.length > 0) {
          const shuffled = anyData.sort(() => Math.random() - 0.5).slice(0, 3)
          setPrompts(shuffled.map(p => ({ id: p.id, promptText: p.prompt_text, type: p.type })))
        } else {
          // Use fallbacks
          throw new Error('No prompts available')
        }
      }
    } catch {
      const fallbacks = category === 'memory'
        ? [
            { id: 'f1', promptText: 'What\'s your earliest childhood memory?', type: 'memory' },
            { id: 'f2', promptText: 'Tell me about a time that changed your life.', type: 'memory' },
            { id: 'f3', promptText: 'What\'s a moment you wish you could relive?', type: 'memory' },
          ]
        : [
            { id: 'f1', promptText: 'What\'s the best advice you\'ve ever received?', type: 'wisdom' },
            { id: 'f2', promptText: 'What life lesson took you the longest to learn?', type: 'wisdom' },
            { id: 'f3', promptText: 'What would you tell your younger self?', type: 'wisdom' },
          ]
      setPrompts(fallbacks)
    } finally {
      setLoadingPrompts(false)
    }
  }, [])

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setMode('menu')
      setSelectedPrompt(null)
      setPrompts([])
    }
  }, [isOpen])

  // Fetch prompts when mode changes
  useEffect(() => {
    if (mode === 'memory' || mode === 'wisdom') {
      fetchPrompts(mode)
    }
  }, [mode, fetchPrompts])

  const handleMemorySaved = (memoryId: string) => {
    onContentAdded?.()
    setTimeout(() => onClose(), 1500)
  }

  const handleClose = () => {
    setMode('menu')
    setSelectedPrompt(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#DDE3DF] flex-shrink-0">
            <div className="flex items-center gap-2">
              {mode !== 'menu' && (
                <button
                  onClick={() => { setMode('menu'); setSelectedPrompt(null) }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-[#5A6660]"
                >
                  <ChevronRight size={18} className="rotate-180" />
                </button>
              )}
              <h3 className="text-lg font-semibold text-[#1A1F1C]" style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}>
                {mode === 'menu' && 'Add to Your Story'}
                {mode === 'memory' && (selectedPrompt ? 'Record Memory' : 'Choose a Prompt')}
                {mode === 'wisdom' && (selectedPrompt ? 'Share Wisdom' : 'Choose a Prompt')}
                {mode === 'photos' && 'Add Photos'}
              </h3>
            </div>
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} className="text-[#5A6660]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">

              {/* ---- Menu ---- */}
              {mode === 'menu' && (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 space-y-3"
                >
                  <button
                    onClick={() => setMode('memory')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#DDE3DF] hover:border-[#2D5A3D]/30 hover:bg-[#2D5A3D]/3 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#2D5A3D]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#2D5A3D]/15 transition-colors">
                      <Heart size={22} className="text-[#2D5A3D]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1A1F1C]">Memory</p>
                      <p className="text-xs text-[#94A09A] mt-0.5">Record a cherished moment through voice</p>
                    </div>
                    <ChevronRight size={18} className="text-[#94A09A] group-hover:text-[#2D5A3D] transition-colors" />
                  </button>

                  <button
                    onClick={() => setMode('wisdom')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#DDE3DF] hover:border-[#C4A235]/30 hover:bg-[#C4A235]/3 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#C4A235]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#C4A235]/15 transition-colors">
                      <Brain size={22} className="text-[#C4A235]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1A1F1C]">Wisdom</p>
                      <p className="text-xs text-[#94A09A] mt-0.5">Share life lessons and advice</p>
                    </div>
                    <ChevronRight size={18} className="text-[#94A09A] group-hover:text-[#C4A235] transition-colors" />
                  </button>

                  <button
                    onClick={() => setMode('photos')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#DDE3DF] hover:border-[#4A7FB5]/30 hover:bg-[#4A7FB5]/3 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#4A7FB5]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#4A7FB5]/15 transition-colors">
                      <ImagePlus size={22} className="text-[#4A7FB5]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1A1F1C]">Photos</p>
                      <p className="text-xs text-[#94A09A] mt-0.5">Upload or digitize printed photos</p>
                    </div>
                    <ChevronRight size={18} className="text-[#94A09A] group-hover:text-[#4A7FB5] transition-colors" />
                  </button>
                </motion.div>
              )}

              {/* ---- Memory / Wisdom prompt selection ---- */}
              {(mode === 'memory' || mode === 'wisdom') && !selectedPrompt && (
                <motion.div
                  key="prompts"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4"
                >
                  {loadingPrompts ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: mode === 'memory' ? '#2D5A3D' : '#C4A235', borderTopColor: 'transparent' }} />
                    </div>
                  ) : (
                    <>
                      {/* Free-form: just start talking */}
                      <button
                        onClick={() => setSelectedPrompt({ id: 'free', promptText: mode === 'memory' ? 'Share a memory' : 'Share some wisdom', type: mode })}
                        className="w-full flex items-center gap-3 p-4 mb-4 rounded-xl border-2 border-[#2D5A3D] bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#2D5A3D] flex items-center justify-center flex-shrink-0">
                          <Mic size={18} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#2D5A3D]">Just start talking</p>
                          <p className="text-xs text-[#94A09A] mt-0.5">Say whatever&apos;s on your mind</p>
                        </div>
                      </button>

                      <p className="text-sm text-[#94A09A] mb-3">Or pick a question to get started:</p>
                      <div className="space-y-2.5">
                        {prompts.map((p, i) => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPrompt(p)}
                            className="w-full flex items-center gap-3 p-4 rounded-xl border border-[#DDE3DF] hover:border-[#2D5A3D]/20 hover:bg-[#F5F0EA] transition-all text-left group"
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{
                              background: mode === 'memory' ? 'rgba(45,90,61,0.1)' : 'rgba(196,162,53,0.1)',
                              color: mode === 'memory' ? '#2D5A3D' : '#C4A235',
                            }}>
                              {i + 1}
                            </div>
                            <p className="text-sm text-[#1A1F1C] flex-1">{p.promptText}</p>
                            <Mic size={16} className="text-[#94A09A] group-hover:text-[#2D5A3D] transition-colors flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => fetchPrompts(mode as 'memory' | 'wisdom')}
                        className="flex items-center gap-2 mx-auto mt-4 px-4 py-2 rounded-lg text-sm text-[#5A6660] hover:bg-[#F5F0EA] transition-colors"
                      >
                        <RefreshCw size={14} />
                        Shuffle prompts
                      </button>
                    </>
                  )}
                </motion.div>
              )}

              {/* ---- Memory / Wisdom voice capture ---- */}
              {(mode === 'memory' || mode === 'wisdom') && selectedPrompt && (
                <motion.div
                  key="capture"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4"
                >
                  {/* Show prompt card only if user picked a specific prompt (not free-form) */}
                  {selectedPrompt.id !== 'free' && (
                    <div className="mb-4 p-3 rounded-xl bg-[#F5F0EA] border border-[#E8E2D8]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-[#94A09A] uppercase tracking-wide">Prompt</span>
                      </div>
                      <p className="text-sm text-[#1A1F1C] font-medium">{selectedPrompt.promptText}</p>
                    </div>
                  )}
                  <VoiceVideoChat
                    sessionType="memory_capture"
                    topic={selectedPrompt.id !== 'free' ? selectedPrompt.promptText : undefined}
                    personaName="journalist"
                    enableVideo={false}
                    maxQuestions={5}
                    onMemorySaved={handleMemorySaved}
                    onComplete={() => {}}
                    showTranscript={true}
                  />
                </motion.div>
              )}

              {/* ---- Photos ---- */}
              {mode === 'photos' && (
                <motion.div
                  key="photos"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4"
                >
                  <GalleryUpload onUploadComplete={() => { onContentAdded?.(); onClose() }} />

                  {/* Digitize option */}
                  <div className="mt-4 pt-4 border-t border-[#DDE3DF]">
                    <button
                      onClick={() => { setShowDigitize(true) }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#C4A235]/40 text-[#C4A235] hover:bg-[#C4A235]/5 transition-colors text-sm font-medium"
                    >
                      <Scan size={18} />
                      Digitize Printed Photos
                    </button>
                    <p className="text-xs text-[#94A09A] text-center mt-2">
                      Scan printed photos — we&apos;ll detect, crop, and enhance them
                    </p>
                  </div>

                  {/* Upload from phone via QR */}
                  <div className="mt-4 pt-4 border-t border-[#DDE3DF]">
                    <MobileUploadQR onComplete={() => { onContentAdded?.() }} />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Digitize modal (separate layer) */}
      <DigitizeModal
        isOpen={showDigitize}
        onClose={() => setShowDigitize(false)}
        onComplete={() => { setShowDigitize(false); onContentAdded?.(); onClose() }}
      />
    </>
  )
}

/** Shows a QR code that mobile devices can scan to upload photos to the account */
function MobileUploadQR({ onComplete }: { onComplete: () => void }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mobile-upload/token', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setQrUrl(data.url)
        setExpiresAt(data.expiresAt)
      }
    } catch {}
    setLoading(false)
  }

  if (!qrUrl) {
    return (
      <button
        onClick={generate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#2D5A3D]/40 text-[#2D5A3D] hover:bg-[#2D5A3D]/5 transition-colors text-sm font-medium disabled:opacity-50"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Smartphone size={18} />}
        {loading ? 'Generating...' : 'Upload from Phone'}
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl border border-[#DDE3DF]">
      <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
        <Smartphone size={16} className="text-[#2D5A3D]" />
        Scan with your phone
      </p>
      <div className="bg-white p-3 rounded-xl border border-gray-200">
        <QRCodeSVG value={qrUrl} size={180} level="M" />
      </div>
      <p className="text-xs text-gray-500 text-center max-w-xs">
        Open your phone&apos;s camera and point it at the code. You&apos;ll be able to upload photos directly to your account.
      </p>
      <p className="text-[10px] text-gray-400">
        Expires in 1 hour
      </p>
      <button
        onClick={generate}
        className="text-xs text-[#2D5A3D] hover:underline flex items-center gap-1"
      >
        <RefreshCw size={10} /> Generate new code
      </button>
    </div>
  )
}
