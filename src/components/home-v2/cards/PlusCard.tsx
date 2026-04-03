'use client'

import { useState } from 'react'
import { Plus, MessageSquare, Quote, Mic, Image as ImageIcon, MapPin } from 'lucide-react'
import type { CardType } from '../types'

interface PlusCardProps {
  onAdd: (type: CardType) => void
  category: string
}

const ADD_OPTIONS: { type: CardType; label: string; icon: any; description: string }[] = [
  { type: 'text-voice-video', label: 'Add Story', icon: MessageSquare, description: 'Text, voice, or video' },
  { type: 'quote', label: 'Add Quote', icon: Quote, description: 'A memorable quote' },
  { type: 'media-upload', label: 'Add Media', icon: ImageIcon, description: 'Photos or videos' },
  { type: 'comment', label: 'Add Comment', icon: Mic, description: 'A quick note' },
  { type: 'when-where', label: 'When & Where', icon: MapPin, description: 'Location and date' },
]

export function PlusCard({ onAdd, category }: PlusCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  // Filter options based on category
  const options = ADD_OPTIONS.filter(opt => {
    if (category === 'contact') return false // contacts don't expand
    if (category === 'profile') return ['text-voice-video', 'comment'].includes(opt.type)
    return true
  })

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 relative">
      {!showMenu ? (
        <button
          onClick={() => setShowMenu(true)}
          className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#DDE5E0] hover:border-[#3D6B52]/40 hover:bg-[#E8F0EC] flex items-center justify-center transition-colors group"
        >
          <Plus size={24} className="text-[#94A39C] group-hover:text-[#3D6B52]" />
        </button>
      ) : (
        <div className="w-full space-y-1.5">
          <p className="text-[10px] text-[#94A39C] uppercase tracking-wider text-center mb-2">Add to this memory</p>
          {options.map(opt => (
            <button
              key={opt.type}
              onClick={() => { onAdd(opt.type); setShowMenu(false) }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#E8F0EC] transition-colors text-left"
            >
              <opt.icon size={14} className="text-[#2D5A3D] flex-shrink-0" />
              <div>
                <p className="text-xs text-[#1A2B23] font-medium">{opt.label}</p>
                <p className="text-[10px] text-[#94A39C]">{opt.description}</p>
              </div>
            </button>
          ))}
          <button
            onClick={() => setShowMenu(false)}
            className="w-full text-center text-[10px] text-[#94A39C] hover:text-[#5C6D64] py-1"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
