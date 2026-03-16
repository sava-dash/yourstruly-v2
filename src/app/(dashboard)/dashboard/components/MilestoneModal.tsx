'use client'

import { motion, AnimatePresence } from 'framer-motion'

export interface Milestone {
  type: 'memories' | 'streak' | 'xp' | 'contacts' | null
  value: number
  message: string
}

interface MilestoneModalProps {
  milestone: Milestone | null
  onClose: () => void
}

export function MilestoneModal({ milestone, onClose }: MilestoneModalProps) {
  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="milestone-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="milestone-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="milestone-icon">
              {milestone.type === 'memories' && '📚'}
              {milestone.type === 'xp' && '⭐'}
              {milestone.type === 'contacts' && '👥'}
            </div>
            <h2 className="milestone-title">Milestone Reached!</h2>
            <p className="milestone-message">{milestone.message}</p>
            <button onClick={onClose} className="milestone-button">
              Keep Going!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
