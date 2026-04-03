'use client'

import { motion } from 'framer-motion'

interface TapeDecorationProps {
  position?: 'top-left' | 'top-right' | 'top-center' | 'random'
  color?: 'cream' | 'yellow' | 'blue' | 'pink'
  animate?: boolean
  className?: string
}

const TAPE_COLORS = {
  cream: 'from-[#F5F3EE]/80 to-[#E8E5D5]/60',
  yellow: 'from-yellow-200/80 to-yellow-100/60',
  blue: 'from-blue-200/80 to-blue-100/60',
  pink: 'from-pink-200/80 to-pink-100/60',
}

export default function TapeDecoration({ 
  position = 'top-center', 
  color = 'cream',
  animate = true,
  className = ''
}: TapeDecorationProps) {
  // Random rotation for natural look
  const getRotation = () => {
    switch (position) {
      case 'top-left': return -12
      case 'top-right': return 12
      case 'top-center': return Math.random() * 6 - 3
      case 'random': return Math.random() * 30 - 15
      default: return 0
    }
  }

  const getPosition = () => {
    switch (position) {
      case 'top-left': return 'left-4 -top-3'
      case 'top-right': return 'right-4 -top-3'
      case 'top-center': return 'left-1/2 -translate-x-1/2 -top-3'
      case 'random': return 'left-1/2 -translate-x-1/2 -top-3'
      default: return 'left-1/2 -translate-x-1/2 -top-3'
    }
  }

  const rotation = getRotation()

  return (
    <motion.div
      className={`absolute ${getPosition()} z-50 pointer-events-none ${className}`}
      initial={animate ? { scale: 0, rotate: rotation - 20, opacity: 0, y: -20 } : false}
      animate={{ scale: 1, rotate: rotation, opacity: 1, y: 0 }}
      exit={animate ? { scale: 0, rotate: rotation + 20, opacity: 0, y: -20 } : undefined}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 25,
        duration: 0.4
      }}
    >
      {/* Tape strip with texture - longer for better visibility */}
      <div 
        className={`
          w-24 h-7 
          bg-gradient-to-b ${TAPE_COLORS[color]}
          rounded-sm
          shadow-md
          backdrop-blur-sm
          border border-white/30
          relative
        `}
        style={{
          transform: `rotate(${rotation}deg)`,
          // Tape texture overlay - mimics real tape
          backgroundImage: `
            linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 3px,
              rgba(0,0,0,0.03) 3px,
              rgba(0,0,0,0.03) 6px
            )
          `,
        }}
      >
        {/* Torn/ripped edge effect on sides */}
        <div className="absolute -left-1 top-0 bottom-0 w-2 bg-gradient-to-r from-transparent via-white/5 to-transparent" 
             style={{ clipPath: 'polygon(30% 0, 100% 5%, 100% 95%, 30% 100%, 0 85%, 20% 50%, 0 15%)' }} />
        <div className="absolute -right-1 top-0 bottom-0 w-2 bg-gradient-to-l from-transparent via-white/5 to-transparent"
             style={{ clipPath: 'polygon(0 5%, 70% 0, 100% 15%, 80% 50%, 100% 85%, 70% 100%, 0 95%)' }} />
        {/* Subtle shine */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-sm" />
      </div>
    </motion.div>
  )
}
