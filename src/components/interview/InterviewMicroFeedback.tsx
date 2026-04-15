'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * InterviewMicroFeedback
 *
 * A calm, rotating encouragement banner that lives ABOVE the
 * InterviewConversation component on the interview page. We chose this
 * "rotating banner" path (instead of a sibling event-listener pill) because
 * the existing InterviewConversation component does not currently dispatch a
 * CustomEvent on transcribe success, and PR C is concurrently editing that
 * file — so we cannot add an event surface to it in this PR.
 *
 * Visuals are intentionally subtle: a single line of warm copy that fades
 * between messages every ~6 seconds. Designed to reassure a 70-year-old
 * recipient on her phone without distracting her from the question above.
 */
const MESSAGES = [
  "You're doing great — take your time.",
  'Saved automatically as you go.',
  'There are no wrong answers.',
  'Speak from the heart — we will listen.',
]

const ROTATE_MS = 6000

export function InterviewMicroFeedback() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [])

  const message = MESSAGES[index]

  return (
    <div
      aria-live="polite"
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        padding: '10px 16px 4px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: '#D3E1DF',
          color: '#2d4d3e',
          borderRadius: 999,
          padding: '8px 18px',
          fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 13,
          lineHeight: 1.4,
          maxWidth: 420,
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(64,106,86,0.08)',
          minHeight: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={message}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            {message}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default InterviewMicroFeedback
