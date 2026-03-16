'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { X, Sparkles, Mic, Send, RotateCcw, UserPlus } from 'lucide-react'
import { TYPE_CONFIG, isContactPrompt, PHOTO_TAGGING_TYPES } from '../constants'
import dynamic from 'next/dynamic'

const FaceTagger = dynamic(() => import('@/components/media/FaceTagger'), { ssr: false })

interface Prompt {
  id: string
  type: string
  promptText: string
  photoUrl?: string
  photoId?: string
  contactName?: string
  contactId?: string
  missingField?: string
  metadata?: any
}

interface SwipeableCardStackProps {
  prompts: Prompt[]
  onCardDismiss: (promptId: string) => void
  onCardAnswer: (promptId: string, response: { type: 'text' | 'voice' | 'selection'; text?: string }) => Promise<void>
  onNeedMorePrompts: () => void
  getPromptText: (prompt: Prompt) => string
}

export function SwipeableCardStack({
  prompts,
  onCardDismiss,
  onCardAnswer,
  onNeedMorePrompts,
  getPromptText,
}: SwipeableCardStackProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter out dismissed cards
  const visiblePrompts = prompts.filter(p => !dismissedIds.has(p.id))

  // Request more prompts when running low
  useEffect(() => {
    if (visiblePrompts.length < 5 && prompts.length > 0) {
      onNeedMorePrompts()
    }
  }, [visiblePrompts.length, prompts.length, onNeedMorePrompts])

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => new Set([...prev, id]))
    onCardDismiss(id)
  }, [onCardDismiss])

  // Auto-focus on mount for keyboard navigation
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (visiblePrompts.length === 0) return
      
      const currentPrompt = visiblePrompts[0]
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        handleDismiss(currentPrompt.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visiblePrompts, handleDismiss])

  if (visiblePrompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[520px] text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-6">
          <Sparkles size={40} className="text-white" />
        </div>
        <h3 className="text-2xl font-semibold text-[#406A56] mb-2">All caught up!</h3>
        <p className="text-[#406A56]/60 mb-6 max-w-sm">
          You've gone through all your prompts. Shuffle to get more.
        </p>
        <button
          onClick={onNeedMorePrompts}
          className="flex items-center gap-2 px-6 py-3 bg-[#406A56] text-white rounded-full hover:bg-[#4a7a64] transition-colors font-medium"
        >
          <Sparkles size={18} />
          Get More Prompts
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative h-[520px] w-full max-w-md mx-auto focus:outline-none" tabIndex={0}>
      <div className="relative h-full">
        <AnimatePresence mode="popLayout">
          {visiblePrompts.slice(0, 3).map((prompt, index) => (
            <FlippableCard
              key={prompt.id}
              prompt={prompt}
              index={index}
              totalVisible={Math.min(visiblePrompts.length, 3)}
              onDismiss={() => handleDismiss(prompt.id)}
              onAnswer={onCardAnswer}
              getPromptText={getPromptText}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface FlippableCardProps {
  prompt: Prompt
  index: number
  totalVisible: number
  onDismiss: () => void
  onAnswer: (promptId: string, response: { type: 'text' | 'voice' | 'selection'; text?: string }) => Promise<void>
  getPromptText: (prompt: Prompt) => string
}

function FlippableCard({
  prompt,
  index,
  totalVisible,
  onDismiss,
  onAnswer,
  getPromptText,
}: FlippableCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5])
  
  const isDragging = useRef(false)
  const dragStartX = useRef(0)

  const config = TYPE_CONFIG[prompt.type] || TYPE_CONFIG.memory_prompt
  const isContact = isContactPrompt(prompt.type)
  const hasPhoto = prompt.photoUrl && (prompt.type === 'photo_backstory' || prompt.type === 'tag_person')

  const handleDragStart = () => {
    isDragging.current = true
    dragStartX.current = x.get()
  }

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (isFlipped) return // Don't dismiss while flipped
    
    const threshold = 80
    const velocity = Math.abs(info.velocity.x)
    const offset = Math.abs(info.offset.x)
    
    if (offset > threshold || (velocity > 500 && offset > 30)) {
      onDismiss()
    }
    
    setTimeout(() => {
      isDragging.current = false
    }, 50)
  }

  const handleClick = () => {
    if (isFlipped) return
    if (!isDragging.current && Math.abs(x.get() - dragStartX.current) < 10) {
      setIsFlipped(true)
    }
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isFlipped) {
      setIsFlipped(false)
      setResponseText('')
    } else {
      onDismiss()
    }
  }

  const handleSubmit = async () => {
    if (!responseText.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await onAnswer(prompt.id, { type: 'text', text: responseText })
      setIsFlipped(false)
      setResponseText('')
      onDismiss()
    } catch (err) {
      console.error('Failed to submit:', err)
    }
    setIsSubmitting(false)
  }

  const stackOffset = index * 6
  const stackScale = 1 - index * 0.04

  return (
    <motion.div
      className="absolute inset-0"
      style={{ 
        zIndex: totalVisible - index,
        perspective: 1000,
      }}
      initial={{ scale: 0.9, opacity: 0, y: 30 }}
      animate={{
        scale: stackScale,
        opacity: 1,
        y: stackOffset,
      }}
      exit={{
        x: x.get() >= 0 ? 400 : -400,
        opacity: 0,
        rotate: x.get() >= 0 ? 15 : -15,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.8,
      }}
    >
      <motion.div
        className="h-full w-full"
        style={{ 
          x: isFlipped ? 0 : x, 
          rotate: isFlipped ? 0 : rotate, 
          opacity,
          transformStyle: 'preserve-3d',
        }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        drag={index === 0 && !isFlipped ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={index === 0 ? handleClick : undefined}
      >
        {/* Front of card */}
        <div 
          className={`
            absolute inset-0 rounded-3xl overflow-hidden
            bg-white shadow-xl
            ${index === 0 && !isFlipped ? 'cursor-grab active:cursor-grabbing' : ''}
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Close/Skip button */}
          {index === 0 && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/40 transition-colors"
            >
              <X size={20} />
            </button>
          )}

          <div className="h-full flex flex-col">
            {/* Photo or gradient header */}
            {hasPhoto ? (
              <div className="relative h-[60%] bg-gray-100">
                <img src={prompt.photoUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
            ) : (
              <div className={`relative h-[40%] bg-gradient-to-br ${
                config.color === 'yellow' ? 'from-amber-400 to-orange-500' :
                config.color === 'green' ? 'from-emerald-400 to-teal-500' :
                config.color === 'red' ? 'from-rose-400 to-red-500' :
                config.color === 'blue' ? 'from-blue-400 to-indigo-500' :
                'from-purple-400 to-violet-500'
              }`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles size={64} className="text-white/30" />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  config.color === 'yellow' ? 'bg-amber-100 text-amber-700' :
                  config.color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                  config.color === 'red' ? 'bg-rose-100 text-rose-700' :
                  config.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {config.label}
                </span>
                {config.xp > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <Sparkles size={12} />+{config.xp} XP
                  </span>
                )}
              </div>

              {isContact && prompt.contactName && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#406A56] to-[#8DACAB] flex items-center justify-center text-white font-medium">
                    {prompt.contactName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{prompt.contactName}</p>
                    {prompt.missingField && (
                      <p className="text-xs text-gray-500">Add {prompt.missingField.replace(/_/g, ' ')}</p>
                    )}
                  </div>
                </div>
              )}

              <p className="text-lg text-gray-800 font-medium leading-relaxed flex-1">
                {getPromptText(prompt)}
              </p>

              <p className="text-xs text-gray-400 text-center mt-4">
                Tap to answer • Swipe or ← → to skip
              </p>
            </div>
          </div>
        </div>

        {/* Back of card (response UI) */}
        <div 
          className="absolute inset-0 rounded-3xl overflow-hidden bg-white shadow-xl"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Back button */}
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <RotateCcw size={18} />
          </button>

          {/* Tag Person: show large photo + FaceTagger */}
          {PHOTO_TAGGING_TYPES.includes(prompt.type) && prompt.photoUrl && prompt.photoId ? (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-hidden relative">
                <FaceTagger
                  mediaId={prompt.photoId}
                  imageUrl={prompt.photoUrl}
                  onXPEarned={(amount, action) => {
                    // Tag completed — dismiss card
                    onDismiss()
                  }}
                />
              </div>
              <div className="p-4 text-center border-t border-gray-100">
                <span className="text-xs text-amber-600 font-medium">
                  <Sparkles size={12} className="inline mr-1" />
                  Earn +{config.xp} XP per tag
                </span>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col p-6 pt-16">
              {/* Question recap */}
              <div className="mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block mb-2 ${
                  config.color === 'yellow' ? 'bg-amber-100 text-amber-700' :
                  config.color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                  config.color === 'red' ? 'bg-rose-100 text-rose-700' :
                  config.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {config.label}
                </span>
                <p className="text-gray-800 font-medium">{getPromptText(prompt)}</p>
              </div>

              {/* Photo thumbnail if exists */}
              {hasPhoto && (
                <div className="w-20 h-20 rounded-xl overflow-hidden mb-4">
                  <img src={prompt.photoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Response input */}
              <div className="flex-1 flex flex-col">
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="flex-1 w-full p-4 bg-gray-50 rounded-2xl border-0 resize-none focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-gray-800 placeholder-gray-400"
                  autoFocus={isFlipped}
                />
                
                <div className="flex items-center justify-between mt-4">
                  <button className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                    <Mic size={20} />
                  </button>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!responseText.trim() || isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 bg-[#406A56] text-white rounded-full hover:bg-[#4a7a64] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                    {isSubmitting ? 'Saving...' : 'Save Memory'}
                  </button>
                </div>
              </div>

              {/* XP indicator */}
              <div className="text-center mt-4">
                <span className="text-xs text-amber-600 font-medium">
                  <Sparkles size={12} className="inline mr-1" />
                  Earn +{config.xp} XP
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
