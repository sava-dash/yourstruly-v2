'use client'

import { useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
  showDone?: boolean
  onDone?: () => void
  doneText?: string
  doneDisabled?: boolean
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-md',
  showDone = true,
  onDone,
  doneText = 'Done',
  doneDisabled = false
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleDone = () => {
    onDone?.()
    onClose()
  }

  const modal = (
    <div 
      ref={overlayRef}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className={`bg-white/90 backdrop-blur-[24px] rounded-[20px] border border-white/50 w-full ${maxWidth} max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 shadow-[0_4px_16px_rgba(195,95,51,0.06),0_20px_60px_rgba(0,0,0,0.1)]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2D5A3D]/10">
          <h3 className="text-[#2d2d2d] font-semibold text-lg">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-[#2d2d2d] transition-colors p-1 hover:bg-[#2D5A3D]/10 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer with Done button */}
        {showDone && (
          <div className="p-4 border-t border-[#2D5A3D]/10 flex justify-end">
            <button
              onClick={handleDone}
              disabled={doneDisabled}
              className="px-6 py-2 bg-[#2D5A3D] hover:bg-[#234A31] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {doneText}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // Use portal to render at document body level
  if (typeof window === 'undefined') return null
  return createPortal(modal, document.body)
}
