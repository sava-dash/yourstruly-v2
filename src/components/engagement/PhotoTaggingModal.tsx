'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import FaceTagger from '@/components/media/FaceTagger'

interface PhotoTaggingModalProps {
  photoId: string
  photoUrl: string
  promptId: string
  onComplete: (result: { xpAwarded: number }) => void
  onClose: () => void
}

export function PhotoTaggingModal({ 
  photoId, 
  photoUrl, 
  promptId,
  onComplete, 
  onClose 
}: PhotoTaggingModalProps) {
  
  const handleXPEarned = (amount: number, action: string) => {
    console.log(`XP earned: ${amount} for ${action}`)
  }

  const handleDone = () => {
    // Award XP for completing the tagging
    onComplete({ xpAwarded: 10 })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Tag People</h2>
            <p className="text-sm text-gray-500">Click on faces to tag them</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Face Tagger */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <FaceTagger
            mediaId={photoId}
            imageUrl={photoUrl}
            onXPEarned={handleXPEarned}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="px-6 py-2 bg-[#2D5A3D] text-white rounded-lg hover:bg-[#234A31] transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
