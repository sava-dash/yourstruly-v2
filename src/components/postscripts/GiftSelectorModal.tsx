'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { GiftSelector } from './GiftSelector'

interface GiftSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  postscriptId: string
  deliveryDate: Date | null
  deliveryType: 'date' | 'event' | 'passing'
  onGiftAdded: (gift: any) => void
}

export function GiftSelectorModal({
  isOpen,
  onClose,
  postscriptId,
  deliveryDate,
  deliveryType,
  onGiftAdded,
}: GiftSelectorModalProps) {
  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <GiftSelector
          postscriptId={postscriptId}
          deliveryDate={deliveryDate}
          deliveryType={deliveryType}
          onGiftAdded={(gift) => {
            onGiftAdded(gift)
            onClose()
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}
