'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Check } from 'lucide-react'

interface CompletionOverlayProps {
  /** Whether to show the overlay */
  show: boolean
  /** XP amount earned */
  xp?: number
  /** Title text (default: "Memory Saved!") */
  title?: string
  /** Optional subtitle */
  subtitle?: string
  /** Custom icon (replaces default checkmark) */
  icon?: React.ReactNode
  /** Called after animation auto-dismisses (if autoClose > 0) */
  onDone?: () => void
  /** Auto-close after ms (0 = manual, default 1500) */
  autoClose?: number
}

/**
 * Shared completion overlay for engagement interactions.
 * Shows a "Memory saved" celebration with XP earned.
 * 
 * Usage:
 * ```tsx
 * <CompletionOverlay show={saved} xp={15} onDone={() => close()} />
 * ```
 */
export function CompletionOverlay({
  show,
  xp = 0,
  title = 'Memory saved',
  subtitle,
  icon,
  onDone,
  autoClose = 1500,
}: CompletionOverlayProps) {
  // Auto-close timer
  if (show && autoClose > 0 && onDone) {
    setTimeout(onDone, autoClose)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 50,
            borderRadius: 'inherit',
          }}
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
            style={{ textAlign: 'center' }}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2D5A3D, #5a9a7a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 24px rgba(64, 106, 86, 0.3)',
              }}
            >
              {icon || <Check size={32} color="white" strokeWidth={3} />}
            </motion.div>

            {/* Title */}
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#2d2d2d',
                margin: '0 0 4px',
              }}
            >
              {title}
            </motion.h3>

            {/* Subtitle */}
            {subtitle && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{
                  fontSize: '14px',
                  color: '#888',
                  margin: '0 0 12px',
                }}
              >
                {subtitle}
              </motion.p>
            )}

            {/* XP Badge */}
            {xp > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.45, type: 'spring', stiffness: 400 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '100px',
                  background: 'linear-gradient(135deg, rgba(217, 198, 26, 0.15), rgba(217, 198, 26, 0.08))',
                  border: '1px solid rgba(217, 198, 26, 0.3)',
                  color: '#8B7B00',
                  fontSize: '15px',
                  fontWeight: 700,
                }}
              >
                <Sparkles size={16} color="#C4A235" />
                +{xp} XP
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
