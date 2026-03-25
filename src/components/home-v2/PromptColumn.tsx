'use client'

import { motion } from 'framer-motion'
import { Sparkles, Camera, Heart, Brain, User, BookOpen, Mic } from 'lucide-react'
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

const CATEGORY_META: Record<string, { icon: any; label: string; inputHint: string; timeHint: string }> = {
  memory: { icon: Heart, label: 'Remember When', inputHint: '🎙️ Talk or type', timeHint: '~2 min' },
  photo: { icon: Camera, label: 'Tell The Story', inputHint: '🎙️ Talk or type', timeHint: '~2 min' },
  wisdom: { icon: Brain, label: 'Share Wisdom', inputHint: '🎙️ Talk or type', timeHint: '~3 min' },
  contact: { icon: User, label: 'Update Info', inputHint: '⌨️ Quick fill', timeHint: '~30 sec' },
  profile: { icon: Sparkles, label: 'About You', inputHint: '👆 Tap to select', timeHint: '~30 sec' },
  favorites: { icon: BookOpen, label: 'Your Favorites', inputHint: '⌨️ Type', timeHint: '~1 min' },
}

export function PromptColumn({ prompts, onSelect, isLoading }: PromptColumnProps) {
  if (isLoading) {
    return (
      <div className="space-y-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-[280px] rounded-3xl bg-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {prompts.map((prompt, index) => {
        const meta = CATEGORY_META[prompt.category] || CATEGORY_META.memory
        const hasPhoto = !!prompt.photoUrl

        return (
          <motion.button
            key={prompt.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.35 }}
            onClick={() => onSelect(prompt.id)}
            className="w-full text-left group"
          >
            <div className="rounded-3xl overflow-hidden shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: 'linear-gradient(to bottom, #faf8f4, #f3efe8)' }}
            >
              {/* Photo hero (if available) */}
              {hasPhoto && (
                <div className="relative h-[220px] overflow-hidden">
                  <img
                    src={prompt.photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  {/* Category badge on photo */}
                  <div className="absolute bottom-3 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md text-white">
                      {meta.label}
                    </span>
                  </div>
                </div>
              )}

              {/* Content area */}
              <div className={`${hasPhoto ? 'p-6' : 'p-8'} flex flex-col`}>
                {/* Category badge (when no photo) */}
                {!hasPhoto && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-full bg-[#406A56]/10 flex items-center justify-center">
                      <meta.icon size={16} className="text-[#406A56]" />
                    </div>
                    <span className="text-xs font-semibold text-[#406A56]/60 uppercase tracking-wider">
                      {meta.label}
                    </span>
                  </div>
                )}

                {/* Prompt text */}
                <p className={`${hasPhoto ? 'text-xl' : 'text-2xl'} font-bold text-[#2d3b36] leading-snug`}>
                  {prompt.promptText}
                </p>

                {/* Contact name */}
                {prompt.contactName && (
                  <p className="text-sm text-[#406A56]/50 mt-1.5">
                    About {prompt.contactName}
                  </p>
                )}

                {/* Input hints */}
                <div className="flex items-center justify-center gap-3 mt-5 text-[12px] text-[#2d3b36]/35">
                  <span>{meta.inputHint}</span>
                  <span className="w-1 h-1 rounded-full bg-[#2d3b36]/20" />
                  <span>{meta.timeHint}</span>
                  <span className="w-1 h-1 rounded-full bg-[#2d3b36]/20" />
                  <span>Tap to start</span>
                </div>
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
