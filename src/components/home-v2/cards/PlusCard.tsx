'use client'

import { MessageSquare, Quote, Mic, Image as ImageIcon, UserPlus, Music, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import type { CardType } from '../types'

interface PlusCardProps {
  onAdd: (type: CardType) => void
  onFinish?: () => void
  category: string
  isFinishing?: boolean
  /** XP awarded on Save & Finish (per-chain, shown on the button) */
  xpReward?: number
}

const ADD_OPTIONS: { type: CardType; label: string; icon: any; description: string }[] = [
  { type: 'text-voice-video', label: 'Add Story', icon: MessageSquare, description: 'Text, voice, or video' },
  { type: 'quote', label: 'Add Quote', icon: Quote, description: 'A memorable quote' },
  { type: 'media-upload', label: 'Add Media', icon: ImageIcon, description: 'Photos or videos' },
  { type: 'comment', label: 'Add Comment', icon: Mic, description: 'A quick note' },
  { type: 'song', label: 'Add Song', icon: Music, description: 'Attach a song to this memory' },
  { type: 'invite-collaborator', label: 'Invite Collaborator', icon: UserPlus, description: 'Invite someone to add their perspective' },
]

export function PlusCard({ onAdd, onFinish, category, isFinishing = false, xpReward }: PlusCardProps) {
  // Filter options based on category
  const options = ADD_OPTIONS.filter(opt => {
    if (category === 'contact') return false
    if (category === 'profile') return ['text-voice-video', 'comment'].includes(opt.type)
    return true
  })

  // Show options directly — no extra click needed
  return (
    <div className="h-full flex flex-col justify-center p-4">
      {/* Save & Finish button at top — chain XP lives here */}
      {onFinish && (
        <motion.button
          whileTap={isFinishing ? undefined : { scale: 0.96 }}
          onClick={isFinishing ? undefined : onFinish}
          disabled={isFinishing}
          aria-busy={isFinishing}
          className={`w-full flex items-center justify-center gap-2 py-3.5 mb-4 rounded-xl text-white text-sm font-semibold transition-colors shadow-sm ${
            isFinishing
              ? 'bg-[#2D5A3D]/60 cursor-not-allowed'
              : 'bg-[#2D5A3D] hover:bg-[#234A31]'
          }`}
        >
          <CheckCircle size={16} />
          {isFinishing
            ? 'Saving…'
            : (
              <span className="flex items-center gap-2">
                Save &amp; Continue
                {typeof xpReward === 'number' && xpReward > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(255,255,255,0.18)' }}
                  >
                    ⚡ +{xpReward} XP
                  </span>
                )}
              </span>
            )}
        </motion.button>
      )}

      <div className="w-full space-y-1.5">
        <p className="text-[10px] text-[#94A09A] uppercase tracking-wider text-center mb-3 font-semibold">Add to this memory</p>
        {options.map(opt => (
          <button
            key={opt.type}
            onClick={() => onAdd(opt.type)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#E6F0EA] transition-colors text-left border border-transparent hover:border-[#DDE3DF]"
          >
            <div className="w-8 h-8 rounded-full bg-[#E6F0EA] flex items-center justify-center flex-shrink-0">
              <opt.icon size={14} className="text-[#2D5A3D]" />
            </div>
            <div>
              <p className="text-sm text-[#1A1F1C] font-medium">{opt.label}</p>
              <p className="text-[11px] text-[#94A09A]">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
