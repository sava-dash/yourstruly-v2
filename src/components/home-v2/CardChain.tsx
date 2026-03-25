'use client'

import { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'
import type { PromptRow, CardType, ChainCard } from './types'
import { WhenWhereCard } from './cards/WhenWhereCard'
import { TextVoiceVideoCard } from './cards/TextVoiceVideoCard'
import { MediaUploadCard } from './cards/MediaUploadCard'
import { MediaItemCard } from './cards/MediaItemCard'
import { FieldInputCard } from './cards/FieldInputCard'
import { PillSelectCard } from './cards/PillSelectCard'
import { PlusCard } from './cards/PlusCard'

// Pill options for profile cards
const PROFILE_OPTIONS: Record<string, string[]> = {
  personality: ['Adventurous', 'Analytical', 'Creative', 'Empathetic', 'Funny', 'Introverted', 'Leader', 'Optimistic', 'Patient', 'Thoughtful'],
  religion: ['Christianity', 'Islam', 'Judaism', 'Buddhism', 'Hinduism', 'Spiritual', 'Agnostic', 'Atheist', 'Other'],
  skills: ['Cooking', 'Writing', 'Music', 'Sports', 'Gardening', 'Photography', 'Teaching', 'Programming', 'Art', 'Public Speaking'],
  languages: ['English', 'Spanish', 'French', 'Mandarin', 'Arabic', 'Hindi', 'Portuguese', 'German', 'Japanese', 'Korean'],
}

interface CardChainProps {
  row: PromptRow
  onBack: () => void
  onCardSave: (cardId: string, data: Record<string, any>) => void
  onAddCard: (type: CardType) => void
  onMediaUploaded: (files: { url: string; name: string; type: string }[]) => void
}

export function CardChain({ row, onBack, onCardSave, onAddCard, onMediaUploaded }: CardChainProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const renderCard = useCallback((card: ChainCard, index: number) => {
    const cardStyle = "w-[300px] h-[380px] flex-shrink-0 rounded-2xl bg-[#252525] border border-white/8 overflow-hidden"

    switch (card.type) {
      case 'when-where':
        return (
          <div key={card.id} className={cardStyle}>
            <WhenWhereCard
              data={card.data}
              onSave={(data) => onCardSave(card.id, data)}
              saved={card.saved}
            />
          </div>
        )

      case 'text-voice-video':
        return (
          <div key={card.id} className={cardStyle}>
            <TextVoiceVideoCard
              label={row.category === 'wisdom' ? 'Share Your Wisdom' : 'Your Story'}
              placeholder={row.promptText || 'Share your thoughts...'}
              data={card.data}
              onSave={(data) => onCardSave(card.id, data)}
              saved={card.saved}
            />
          </div>
        )

      case 'media-upload':
        return (
          <div key={card.id} className={cardStyle}>
            <MediaUploadCard onUpload={onMediaUploaded} />
          </div>
        )

      case 'media-item':
        return (
          <div key={card.id} className={cardStyle}>
            <MediaItemCard
              url={card.data.url}
              name={card.data.name}
              type={card.data.type}
              addedBy={card.addedBy}
            />
          </div>
        )

      case 'field-input':
        return (
          <div key={card.id} className={cardStyle}>
            <FieldInputCard
              contactName={row.contactName}
              data={card.data}
              onSave={(data) => onCardSave(card.id, data)}
              saved={card.saved}
            />
          </div>
        )

      case 'pill-select':
        return (
          <div key={card.id} className={cardStyle}>
            <PillSelectCard
              label={row.promptText}
              options={PROFILE_OPTIONS[row.promptType] || PROFILE_OPTIONS.skills}
              data={card.data}
              onSave={(data) => onCardSave(card.id, data)}
              saved={card.saved}
            />
          </div>
        )

      case 'quote':
      case 'comment':
        return (
          <div key={card.id} className={cardStyle}>
            <TextVoiceVideoCard
              label={card.type === 'quote' ? 'Quote' : 'Comment'}
              placeholder={card.type === 'quote' ? 'Add a memorable quote...' : 'Add a note...'}
              data={card.data}
              onSave={(data) => onCardSave(card.id, data)}
              saved={card.saved}
            />
          </div>
        )

      case 'plus':
        return (
          <div key={card.id} className={`w-[200px] h-[380px] flex-shrink-0 rounded-2xl bg-[#252525]/50 border border-dashed border-white/8 overflow-hidden`}>
            <PlusCard onAdd={onAddCard} category={row.category} />
          </div>
        )

      default:
        return null
    }
  }, [row, onCardSave, onAddCard, onMediaUploaded])

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-lg truncate">{row.promptText}</p>
          <p className="text-white/40 text-xs flex items-center gap-1.5">
            <Sparkles size={10} />
            {row.cards.filter(c => c.saved).length} of {row.cards.filter(c => c.type !== 'plus').length} completed
          </p>
        </div>
        {row.photoUrl && (
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
            <img src={row.photoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Horizontal scrolling card chain */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="flex gap-4 h-full items-center">
          {row.cards.map((card, i) => renderCard(card, i))}
        </div>
      </div>
    </motion.div>
  )
}
