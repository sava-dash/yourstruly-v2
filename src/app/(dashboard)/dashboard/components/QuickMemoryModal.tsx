'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { VoiceVideoChat } from '@/components/voice'

interface QuickMemoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function QuickMemoryModal({ isOpen, onClose }: QuickMemoryModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#406A56]">Quick Memory</h2>
                <p className="text-sm text-[#406A56]/60">Share a story through voice</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <VoiceVideoChat
                sessionType="memory_capture"
                personaName="journalist"
                enableVideo={false}
                maxQuestions={5}
                onMemorySaved={(memoryId) => {
                  onClose()
                }}
                onError={(error) => console.error('Voice error:', error)}
                showTranscript={true}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
