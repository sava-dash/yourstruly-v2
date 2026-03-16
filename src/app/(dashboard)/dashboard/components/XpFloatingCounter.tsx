'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface XpFloatingCounterProps {
  show: boolean
  amount: number
}

export function XpFloatingCounter({ show, amount }: XpFloatingCounterProps) {
  return (
    <AnimatePresence>
      {show && amount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#D9C61A] to-[#C35F33] text-white font-bold shadow-2xl"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 0.5 }}
          >
            <Sparkles size={18} />
          </motion.div>
          <span className="text-lg">+{amount} XP</span>
          <span className="text-sm opacity-80">🎉</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
