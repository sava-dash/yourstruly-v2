'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X, Loader2 } from 'lucide-react'
import { useEffect } from 'react'

interface CelebrationModalProps {
  open: boolean
  xpEarned: number
  reflection: string | null
  loading: boolean
  onClose: () => void
  /** The original prompt question — shown above the reflection */
  promptText?: string
  /** The prompt category — controls the headline (e.g. "Wisdom saved" vs "Memory saved") */
  promptCategory?: string
}

/**
 * Centered celebration shown after Save & Finish.
 * Replaces the old bottom XP toast with a warmer, more deliberate
 * moment: big XP number, a 2-line AI reflection that makes the user
 * feel heard, and a "Continue" CTA.
 */
export function CelebrationModal({
  open,
  xpEarned,
  reflection,
  loading,
  onClose,
  promptText,
  promptCategory,
}: CelebrationModalProps) {
  const headline = promptCategory === 'wisdom' ? 'Wisdom saved'
    : promptCategory === 'contact' ? 'Contact updated'
    : promptCategory === 'profile' ? 'Profile updated'
    : promptCategory === 'favorites' ? 'Favorites saved'
    : 'Memory saved'
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="celebration-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            background: 'rgba(26, 31, 28, 0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.88, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 12, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '420px',
              padding: '36px 28px 28px',
              borderRadius: '28px',
              background:
                'linear-gradient(180deg, #FDFBF3 0%, #F7FAF8 100%)',
              boxShadow:
                '0 30px 80px rgba(45, 90, 61, 0.28), 0 8px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
              border: '1px solid rgba(45, 90, 61, 0.12)',
              textAlign: 'center',
              fontFamily: 'var(--font-inter-tight, Inter, sans-serif)',
              color: '#1A1F1C',
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#5A6660',
              }}
            >
              <X size={16} />
            </button>

            {/* Sparkle burst */}
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 240, delay: 0.08 }}
              style={{
                margin: '0 auto 14px',
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, #2D5A3D 0%, #3D6B52 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  '0 12px 30px rgba(45, 90, 61, 0.35), inset 0 -4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <Sparkles size={32} color="#FDFBF3" strokeWidth={2.2} />
            </motion.div>

            {/* Prompt question — the original card prompt */}
            {promptText && (
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  color: '#5A6660',
                  maxWidth: '320px',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {promptText}
              </p>
            )}

            {/* Congrats headline */}
            <h2
              id="celebration-title"
              style={{
                margin: 0,
                fontSize: '26px',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                color: '#1A1F1C',
                fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)',
              }}
            >
              {headline}
            </h2>

            {/* XP pill */}
            {xpEarned > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.35 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '14px',
                  padding: '8px 18px',
                  borderRadius: '999px',
                  background:
                    'linear-gradient(90deg, rgba(196, 162, 53, 0.18), rgba(232, 216, 74, 0.25))',
                  border: '1px solid rgba(196, 162, 53, 0.45)',
                  color: '#7A6520',
                  fontSize: '15px',
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                }}
              >
                <span aria-hidden="true">⚡</span>
                +{xpEarned} XP earned
              </motion.div>
            )}

            {/* Reflection — 2 lines, AI-generated */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.45 }}
              style={{
                marginTop: '22px',
                padding: '18px 18px',
                borderRadius: '18px',
                background: 'rgba(230, 240, 234, 0.55)',
                border: '1px solid rgba(45, 90, 61, 0.14)',
                minHeight: '72px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {loading ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#5A6660',
                    fontSize: '13px',
                    fontStyle: 'italic',
                  }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  Finding the right words…
                </span>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    lineHeight: 1.55,
                    color: '#2D5A3D',
                    fontFamily: 'var(--font-inter-tight, Inter, sans-serif)',
                    fontWeight: 500,
                    letterSpacing: '0.005em',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {reflection || "That's a piece of your story now, safely kept.\nThank you for taking the time to put it into words."}
                </p>
              )}
            </motion.div>

            {/* Continue CTA */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.35 }}
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              style={{
                marginTop: '22px',
                width: '100%',
                padding: '13px 18px',
                borderRadius: '14px',
                background: '#2D5A3D',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(45, 90, 61, 0.3)',
              }}
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
