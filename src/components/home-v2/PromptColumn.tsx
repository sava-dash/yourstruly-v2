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
      <div className="space-y-3 px-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3 px-4">
      {prompts.map((prompt, index) => {
        const Icon = CATEGORY_ICONS[prompt.category] || Sparkles
        const color = CATEGORY_COLORS[prompt.category] || '#8DACAB'
        const progress = prompt.totalCards > 0 ? prompt.savedCount / prompt.totalCards : 0

        return (
          <motion.button
            key={prompt.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(prompt.id)}
            className="w-full text-left group"
          >
            <div className="relative rounded-2xl bg-[#252525] border border-white/8 hover:border-white/15 transition-all overflow-hidden">
              {/* Progress bar at top */}
              {progress > 0 && (
                <div className="h-0.5 bg-white/5">
                  <div className="h-full bg-emerald-500/60 transition-all" style={{ width: `${progress * 100}%` }} />
                </div>
              )}

              <div className="flex items-center gap-3 p-4">
                {/* Photo thumbnail or category icon */}
                {prompt.photoUrl ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={prompt.photoUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}15` }}
                  >
                    <Icon size={22} style={{ color }} />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 font-medium text-sm leading-snug line-clamp-2">
                    {prompt.promptText}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {prompt.contactName && (
                      <span className="text-[10px] text-white/40">
                        About {prompt.contactName}
                      </span>
                    )}
                    {prompt.savedCount > 0 && (
                      <span className="text-[10px] text-emerald-400/60">
                        {prompt.savedCount} saved
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight size={16} className="text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
