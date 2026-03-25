'use client'

import { motion } from 'framer-motion'
import { Sparkles, Camera, Heart, Brain, User, BookOpen, ChevronRight } from 'lucide-react'
import type { PromptCategory } from './types'

interface PromptColumnItem {
  id: string
  promptText: string
  type: string
  category: PromptCategory
  photoUrl?: string
  contactName?: string
  savedCount: number
  totalCards: number
}

interface PromptColumnProps {
  prompts: PromptColumnItem[]
  onSelect: (promptId: string) => void
  isLoading: boolean
}

const CATEGORY_ICONS: Record<string, any> = {
  memory: Heart,
  photo: Camera,
  wisdom: Brain,
  contact: User,
  profile: Sparkles,
  favorites: BookOpen,
}

const CATEGORY_COLORS: Record<string, string> = {
  memory: '#8B5CF6',
  photo: '#D9C61A',
  wisdom: '#EF4444',
  contact: '#406A56',
  profile: '#8DACAB',
  favorites: '#F59E0B',
}

export function PromptColumn({ prompts, onSelect, isLoading }: PromptColumnProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-[88px] rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {prompts.map((prompt, index) => {
        const Icon = CATEGORY_ICONS[prompt.category] || Sparkles
        const color = CATEGORY_COLORS[prompt.category] || '#8DACAB'
        const progress = prompt.totalCards > 0 ? prompt.savedCount / prompt.totalCards : 0

        return (
          <motion.button
            key={prompt.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.3 }}
            onClick={() => onSelect(prompt.id)}
            className="w-full text-left group"
          >
            <div className="relative rounded-2xl border border-white/[0.08] bg-[#252525] hover:bg-[#2a2a2a] hover:border-white/[0.12] transition-all overflow-hidden">
              {/* Progress bar — top edge */}
              <div className="h-[3px]" style={{ background: progress > 0 ? `linear-gradient(to right, ${color} ${progress * 100}%, transparent ${progress * 100}%)` : 'transparent' }} />

              <div className="flex items-center gap-4 px-5 py-4">
                {/* Left: photo thumbnail or icon circle */}
                {prompt.photoUrl ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-white/[0.06]">
                    <img src={prompt.photoUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                  </div>
                ) : (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                  >
                    <Icon size={22} style={{ color }} />
                  </div>
                )}

                {/* Center: prompt text + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-white/90 font-medium leading-snug truncate">
                    {prompt.promptText}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {prompt.contactName && (
                      <span className="text-xs text-white/35">
                        About {prompt.contactName}
                      </span>
                    )}
                    {prompt.savedCount > 0 && (
                      <span className="text-xs text-emerald-400/80 font-medium">
                        {prompt.savedCount} saved
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: chevron */}
                <ChevronRight size={18} className="text-white/15 group-hover:text-white/30 transition-colors flex-shrink-0" />
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
