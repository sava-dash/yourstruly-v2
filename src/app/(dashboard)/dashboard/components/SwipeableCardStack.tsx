'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'
import { TYPE_CONFIG, isContactPrompt } from '../constants'

interface Prompt {
  id: string
  type: string
  promptText: string
  photoUrl?: string
  contactName?: string
  contactId?: string
  missingField?: string
  metadata?: any
}

interface SwipeableCardStackProps {
  prompts: Prompt[]
  onCardClick: (prompt: Prompt) => void
  onCardDismiss: (promptId: string) => void
  onShuffle: () => void
  getPromptText: (prompt: Prompt) => string
}

export function SwipeableCardStack({
  prompts,
  onCardClick,
  onCardDismiss,
  onShuffle,
  getPromptText,
}: SwipeableCardStackProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter out dismissed cards
  const visiblePrompts = prompts.filter(p => !dismissedIds.has(p.id))

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
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onCardClick(currentPrompt)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visiblePrompts, handleDismiss, onCardClick])

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
          onClick={onShuffle}
          className="flex items-center gap-2 px-6 py-3 bg-[#406A56] text-white rounded-full hover:bg-[#4a7a64] transition-colors font-medium"
        >
          <Sparkles size={18} />
          Get More Prompts
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative h-[520px] w-full max-w-md mx-auto outline-none" tabIndex={0}>
      {/* Card stack */}
      <div className="relative h-full">
        <AnimatePresence mode="popLayout">
          {visiblePrompts.slice(0, 3).map((prompt, index) => (
            <SwipeableCard
              key={prompt.id}
              prompt={prompt}
              index={index}
              totalVisible={Math.min(visiblePrompts.length, 3)}
              onDismiss={() => handleDismiss(prompt.id)}
              onClick={() => onCardClick(prompt)}
              getPromptText={getPromptText}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface SwipeableCardProps {
  prompt: Prompt
  index: number
  totalVisible: number
  onDismiss: () => void
  onClick: () => void
  getPromptText: (prompt: Prompt) => string
}

function SwipeableCard({
  prompt,
  index,
  totalVisible,
  onDismiss,
  onClick,
  getPromptText,
}: SwipeableCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5])
  
  // Track if user is dragging to prevent click on swipe
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
    const threshold = 80
    const velocity = Math.abs(info.velocity.x)
    const offset = Math.abs(info.offset.x)
    
    // Dismiss if dragged far enough or with enough velocity
    if (offset > threshold || (velocity > 500 && offset > 30)) {
      onDismiss()
    }
    
    // Reset dragging flag after a short delay to prevent click
    setTimeout(() => {
      isDragging.current = false
    }, 50)
  }

  const handleClick = () => {
    // Only trigger click if not dragging
    if (!isDragging.current && Math.abs(x.get() - dragStartX.current) < 10) {
      onClick()
    }
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDismiss()
  }

  // Stack positioning
  const stackOffset = index * 6
  const stackScale = 1 - index * 0.04

  return (
    <motion.div
      className="absolute inset-0"
      style={{ zIndex: totalVisible - index }}
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
        className={`
          h-full w-full rounded-3xl overflow-hidden
          bg-white shadow-2xl border border-gray-100
          ${index === 0 ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}
        `}
        style={{ x, rotate, opacity }}
        drag={index === 0 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={index === 0 ? handleClick : undefined}
        whileDrag={{ scale: 1.02 }}
      >
        {/* Close button - top right */}
        {index === 0 && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/40 transition-colors"
          >
            <X size={20} />
          </button>
        )}

        {/* Card content */}
        <div className="h-full flex flex-col">
          {/* Photo area */}
          {hasPhoto ? (
            <div className="relative h-[60%] bg-gray-100">
              <img
                src={prompt.photoUrl}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
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

          {/* Content area */}
          <div className="flex-1 p-6 flex flex-col">
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`
                px-3 py-1 rounded-full text-xs font-medium
                ${config.color === 'yellow' ? 'bg-amber-100 text-amber-700' :
                  config.color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                  config.color === 'red' ? 'bg-rose-100 text-rose-700' :
                  config.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'}
              `}>
                {config.label}
              </span>
              {config.xp > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <Sparkles size={12} />
                  +{config.xp} XP
                </span>
              )}
            </div>

            {/* Contact info */}
            {isContact && prompt.contactName && (
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#406A56] to-[#8DACAB] flex items-center justify-center text-white font-medium">
                  {prompt.contactName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{prompt.contactName}</p>
                  {prompt.missingField && (
                    <p className="text-xs text-gray-500">
                      Add {prompt.missingField.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Question */}
            <p className="text-lg text-gray-800 font-medium leading-relaxed flex-1">
              {getPromptText(prompt)}
            </p>

            {/* Hint */}
            <p className="text-xs text-gray-400 text-center mt-4">
              Tap to answer • Swipe or press ← → to skip
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
