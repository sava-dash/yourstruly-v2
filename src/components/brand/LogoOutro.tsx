'use client'

import { motion } from 'framer-motion'

interface LogoOutroProps {
  /** Duration in seconds */
  duration?: number
  /** Background style */
  variant?: 'gradient' | 'solid' | 'transparent'
  /** Show tagline */
  showTagline?: boolean
  /** Custom tagline text */
  tagline?: string
  /** Callback when animation completes */
  onComplete?: () => void
}

/**
 * Logo Outro Component
 * 
 * Used at the end of slideshows, videos, and shared content.
 * Designed to be easily swappable with a video/Lottie animation in the future.
 * 
 * To replace with custom animation:
 * 1. Create your animation (After Effects → Lottie, or video)
 * 2. Import here and conditionally render based on a prop
 * 3. Maintain same props interface for compatibility
 */
export function LogoOutro({
  duration = 3,
  variant = 'gradient',
  showTagline = true,
  tagline = 'Live on.',
  onComplete,
}: LogoOutroProps) {
  const backgrounds = {
    gradient: 'bg-gradient-to-br from-[#F2F1E5] via-[#E8E4D4] to-[#DED8C8]',
    solid: 'bg-[#F2F1E5]',
    transparent: 'bg-transparent',
  }

  return (
    <motion.div
      className={`w-full h-full flex flex-col items-center justify-center ${backgrounds[variant]}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => {
        // Wait for full duration then call onComplete
        setTimeout(() => onComplete?.(), (duration - 0.5) * 1000)
      }}
    >
      {/* Logo Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        {/* Logo Text - Styled like brand */}
        <motion.h1
          className="text-4xl md:text-5xl font-serif italic text-[#406A56] tracking-wide"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          YoursTruly
        </motion.h1>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="w-24 h-0.5 bg-[#D9C61A] mt-3 mb-4"
        />

        {/* Tagline */}
        {showTagline && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="text-sm text-[#4A3552]/70 tracking-wider"
          >
            {tagline}
          </motion.p>
        )}
      </motion.div>

      {/* Optional: Decorative elements from brand assets */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 flex gap-4"
      >
        {/* Small decorative icons */}
        <img src="/assets/brand/yellowflower.png" alt="" className="w-6 h-6 opacity-50" />
        <img src="/assets/brand/blueheart.png" alt="" className="w-5 h-5 opacity-50" />
        <img src="/assets/brand/orangestar.png" alt="" className="w-6 h-6 opacity-50" />
      </motion.div>
    </motion.div>
  )
}

/**
 * Placeholder for future video/Lottie animation
 * 
 * When you have a custom animation ready:
 * 
 * import Lottie from 'lottie-react'
 * import logoAnimation from '@/assets/animations/logo-outro.json'
 * 
 * export function LogoOutroAnimated(props: LogoOutroProps) {
 *   return (
 *     <div className="w-full h-full flex items-center justify-center bg-[#F2F1E5]">
 *       <Lottie
 *         animationData={logoAnimation}
 *         loop={false}
 *         onComplete={props.onComplete}
 *       />
 *     </div>
 *   )
 * }
 */

export default LogoOutro
