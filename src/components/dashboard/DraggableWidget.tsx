'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Unlock, GripVertical } from 'lucide-react'
import TapeDecoration from '@/components/ui/TapeDecoration'

interface DraggableWidgetProps {
  id: string
  children: React.ReactNode
  position: { x: number; y: number }
  locked?: boolean
  onLockToggle?: (id: string, locked: boolean) => void
}

export default function DraggableWidget({
  id,
  children,
  position,
  locked = false,
  onLockToggle,
}: DraggableWidgetProps) {
  const [showControls, setShowControls] = useState(false)
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: locked,
  })

  // Real-time transform during drag
  const style: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    // Apply transform for real-time movement during drag
    transform: transform 
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)` 
      : undefined,
  }

  // Randomly select tape color for variety
  const tapeColors = ['cream', 'yellow', 'blue', 'pink'] as const
  const tapeColor = tapeColors[id.charCodeAt(0) % tapeColors.length]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        w-72 xl:w-80
        ${isDragging ? 'z-50 cursor-grabbing' : 'z-10 cursor-grab'}
        ${locked ? 'cursor-default' : ''}
        transition-shadow duration-200
      `}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isDragging && setShowControls(false)}
      {...(locked ? {} : { ...attributes, ...listeners })}
    >
      {/* Tape decoration when locked */}
      <AnimatePresence>
        {locked && (
          <TapeDecoration 
            position="top-center" 
            color={tapeColor}
            animate={true}
          />
        )}
      </AnimatePresence>

      {/* Hover zone extension for controls - prevents flickering */}
      <div className="absolute -top-12 -left-2 -right-2 h-14 z-40" />

      {/* Drag handle and controls */}
      <AnimatePresence>
        {(showControls || isDragging) && !locked && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900/95 backdrop-blur-sm rounded-full px-3 py-2 border border-white/10 shadow-lg z-50"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} className="text-white/50" />
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onLockToggle?.(id, true)
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1"
              title="Lock in place"
            >
              <Lock size={14} className="text-white/70" />
              <span className="text-xs text-white/60">Lock</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unlock button when locked */}
      <AnimatePresence>
        {locked && showControls && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onLockToggle?.(id, false)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gray-900/95 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10 text-sm text-white/70 hover:text-white hover:bg-gray-800 transition-colors shadow-lg z-50"
            title="Unlock"
          >
            <Unlock size={14} />
            <span>Unlock</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Drop shadow when dragging */}
      {isDragging && (
        <div className="absolute inset-0 bg-black/20 rounded-2xl blur-xl -z-10 translate-y-2" />
      )}

      {/* The actual widget content */}
      <div className={`
        transition-all duration-200
        ${isDragging ? 'ring-2 ring-amber-500/50 ring-offset-2 ring-offset-transparent rounded-2xl' : ''}
        ${locked ? 'ring-1 ring-[#F5F3EE]/20 rounded-2xl' : ''}
      `}>
        {children}
      </div>
    </div>
  )
}
