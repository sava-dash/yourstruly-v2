'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { X, Sparkles, RotateCcw } from 'lucide-react'
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
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Filter out dismissed cards
  const visiblePrompts = prompts.filter(p => !dismissedIds.has(p.id))

  const handleDismiss = useCallback((id: string, direction: 'left' | 'right') => {
    setExitDirection(direction)
    setDismissedIds(prev => new Set([...prev, id]))
    onCardDismiss(id)
  }, [onCardDismiss])

  const handleUndo = useCallback(() => {
    const lastDismissed = Array.from(dismissedIds).pop()
    if (lastDismissed) {
      setDismissedIds(prev => {
        const next = new Set(prev)
        next.delete(lastDismissed)
        return next
      })
    }
  }, [dismissedIds])

  if (visiblePrompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-6">
          <Sparkles size={40} className="text-white" />
        </div>
        <h3 className="text-2xl font-semibold text-[#406A56] mb-2">All caught up!</h3>
        <p className="text-[#406A56]/60 mb-6 max-w-sm">
          You've gone through all your prompts. Shuffle to get more or come back later.
        </p>
        <div className="flex gap-3">
          {dismissedIds.size > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              <RotateCcw size={18} />
              Undo
            </button>
          )}
          <button
            onClick={onShuffle}
            className="flex items-center gap-2 px-6 py-3 bg-[#406A56] text-white rounded-full hover:bg-[#4a7a64] transition-colors font-medium"
          >
            <Sparkles size={18} />
            Get More Prompts
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[520px] w-full max-w-md mx-auto">
      {/* Card stack */}
      <div className="relative h-full">
        <AnimatePresence mode="popLayout">
          {visiblePrompts.slice(0, 3).map((prompt, index) => (
            <SwipeableCard
              key={prompt.id}
              prompt={prompt}
              index={index}
              totalVisible={Math.min(visiblePrompts.length, 3)}
              onDismiss={handleDismiss}
              onClick={() => onCardClick(prompt)}
              getPromptText={getPromptText}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <button
          onClick={() => visiblePrompts[0] && handleDismiss(visiblePrompts[0].id, 'left')}
          className="w-14 h-14 rounded-full bg-white shadow-lg border-2 border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-all hover:scale-110"
          title="Skip"
        >
          <X size={28} />
        </button>
        
        <button
          onClick={() => visiblePrompts[0] && onCardClick(visiblePrompts[0])}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-[#406A56] to-[#5a8a76] shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform"
          title="Answer"
        >
          <Sparkles size={28} />
        </button>

        {dismissedIds.size > 0 && (
          <button
            onClick={handleUndo}
            className="w-14 h-14 rounded-full bg-white shadow-lg border-2 border-gray-200 flex items-center justify-center text-gray-400 hover:text-amber-500 hover:border-amber-200 transition-all hover:scale-110"
            title="Undo"
          >
            <RotateCcw size={24} />
          </button>
        )}
      </div>
    </div>
  )
}

interface SwipeableCardProps {
  prompt: Prompt
  index: number
  totalVisible: number
  onDismiss: (id: string, direction: 'left' | 'right') => void
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
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5])
  
  // Swipe indicators
  const skipOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0])
  const answerOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1])

  const config = TYPE_CONFIG[prompt.type] || TYPE_CONFIG.memory_prompt
  const isContact = isContactPrompt(prompt.type)
  const hasPhoto = prompt.photoUrl && (prompt.type === 'photo_backstory' || prompt.type === 'tag_person')

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100
    if (info.offset.x > threshold) {
      onDismiss(prompt.id, 'right')
    } else if (info.offset.x < -threshold) {
      onDismiss(prompt.id, 'left')
    }
  }

  // Stack positioning
  const stackOffset = index * 8
  const stackScale = 1 - index * 0.05

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        zIndex: totalVisible - index,
      }}
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{
        scale: stackScale,
        opacity: 1,
        y: stackOffset,
        transition: { type: 'spring', stiffness: 300, damping: 25 }
      }}
      exit={{
        x: x.get() > 0 ? 300 : -300,
        opacity: 0,
        rotate: x.get() > 0 ? 20 : -20,
        transition: { duration: 0.3 }
      }}
    >
      <motion.div
        className={`
          h-full w-full rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing
          bg-white shadow-2xl border border-gray-100
          ${index === 0 ? '' : 'pointer-events-none'}
        `}
        style={{ x, rotate, opacity }}
        drag={index === 0 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        onClick={index === 0 ? onClick : undefined}
        whileTap={index === 0 ? { scale: 0.98 } : undefined}
      >
        {/* Swipe indicators */}
        {index === 0 && (
          <>
            <motion.div
              className="absolute top-6 left-6 px-4 py-2 bg-red-500 text-white font-bold rounded-lg z-10 rotate-[-15deg]"
              style={{ opacity: skipOpacity }}
            >
              SKIP
            </motion.div>
            <motion.div
              className="absolute top-6 right-6 px-4 py-2 bg-green-500 text-white font-bold rounded-lg z-10 rotate-[15deg]"
              style={{ opacity: answerOpacity }}
            >
              ANSWER
            </motion.div>
          </>
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

            {/* Tap hint */}
            <p className="text-xs text-gray-400 text-center mt-4">
              Tap to answer • Swipe to skip
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
