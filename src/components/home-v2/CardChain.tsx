'use client'

import { useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import type { PromptRow, CardType, ChainCard } from './types'
import { WhenWhereCard } from './cards/WhenWhereCard'
import { TextVoiceVideoCard } from './cards/TextVoiceVideoCard'
import { BackstoryCard } from './cards/BackstoryCard'
import { MediaUploadCard } from './cards/MediaUploadCard'
import { MediaItemCard } from './cards/MediaItemCard'
import { FieldInputCard } from './cards/FieldInputCard'
import { PillSelectCard } from './cards/PillSelectCard'
import { TagPeopleCard } from './cards/TagPeopleCard'
import { PlusCard } from './cards/PlusCard'

const PROFILE_OPTIONS: Record<string, string[]> = {
  personality: ['Adventurous', 'Analytical', 'Creative', 'Empathetic', 'Funny', 'Introverted', 'Leader', 'Optimistic', 'Patient', 'Thoughtful'],
  religion: ['Christianity', 'Islam', 'Judaism', 'Buddhism', 'Hinduism', 'Spiritual', 'Agnostic', 'Atheist', 'Other'],
  skills: ['Cooking', 'Writing', 'Music', 'Sports', 'Gardening', 'Photography', 'Teaching', 'Programming', 'Art', 'Public Speaking'],
  languages: ['English', 'Spanish', 'French', 'Mandarin', 'Arabic', 'Hindi', 'Portuguese', 'German', 'Japanese', 'Korean'],
}

const cardVariants = {
  hidden: { opacity: 0, x: 120, scale: 0.88 },
  visible: (i: number) => ({
    opacity: 1, x: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 220, damping: 18, mass: 0.8, delay: 0.08 + i * 0.1 },
  }),
  exit: (i: number) => ({
    opacity: 0, x: 100, scale: 0.92,
    transition: { type: 'spring' as const, stiffness: 300, damping: 26, delay: i * 0.04 },
  }),
}

const CARD_W = 530
const CARD_H = 600

interface CardChainProps {
  row: PromptRow
  onCardSave: (cardId: string, data: Record<string, any>) => void
  onAddCard: (type: CardType) => void
  onMediaUploaded: (files: { url: string; name: string; type: string }[]) => void
}

export function CardChain({ row, onCardSave, onAddCard, onMediaUploaded }: CardChainProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to next card after saving
  const scrollToNext = useCallback((currentIndex: number) => {
    const nextIndex = currentIndex + 1
    // +1 because the prompt card is the first element in the flex row (not part of this component)
    // Each card is CARD_W + 16px gap
    if (nextIndex < row.cards.length) {
      const el = containerRef.current?.parentElement
      if (el) {
        // Scroll by one card width + gap
        el.scrollBy({ left: CARD_W + 16, behavior: 'smooth' })
      }
    }
  }, [row.cards.length])

  const handleSave = useCallback((cardId: string, data: Record<string, any>, index: number) => {
    onCardSave(cardId, data)
    // Auto-advance unless it's the last non-plus card
    const nonPlusCards = row.cards.filter(c => c.type !== 'plus')
    const cardIdx = nonPlusCards.findIndex(c => c.id === cardId)
    if (cardIdx < nonPlusCards.length - 1) {
      setTimeout(() => scrollToNext(index), 300)
    }
  }, [onCardSave, row.cards, scrollToNext])

  const renderCard = useCallback((card: ChainCard, index: number) => {
    const wrapCard = (children: React.ReactNode) => (
      <motion.div
        key={card.id}
        custom={index}
        variants={cardVariants}
        initial="hidden"
        exit="exit"
        animate="visible"
        style={{
          flexShrink: 0, width: `${CARD_W}px`, height: `${CARD_H}px`,
          borderRadius: '24px', overflow: 'hidden', background: '#FFFFFF',
          border: '1px solid #DDE5E0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column', scrollSnapAlign: 'start',
        }}
      >
        {children}
      </motion.div>
    )

    const wrapPlus = (children: React.ReactNode) => (
      <motion.div
        key={card.id}
        custom={index}
        variants={cardVariants}
        initial="hidden"
        exit="exit"
        animate="visible"
        style={{
          flexShrink: 0, width: '280px', height: `${CARD_H}px`,
          borderRadius: '24px', overflow: 'hidden', background: 'rgba(255,255,255,0.5)',
          border: '2px dashed #DDE5E0',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {children}
      </motion.div>
    )

    switch (card.type) {
      case 'when-where':
        return wrapCard(<WhenWhereCard data={card.data} onSave={(data) => handleSave(card.id, data, index)} saved={card.saved} />)
      case 'text-voice-video':
        // Use BackstoryCard for photo/memory categories (conversational), TextVoiceVideoCard for others
        if (row.category === 'photo' || row.category === 'memory') {
          return wrapCard(<BackstoryCard promptText={row.promptText} category={row.category} data={card.data} onSave={(data) => handleSave(card.id, data, index)} saved={card.saved} />)
        }
        return wrapCard(<TextVoiceVideoCard label={row.category === 'wisdom' ? 'Share Your Wisdom' : 'Your Story'} placeholder={row.promptText || 'Share your thoughts...'} data={card.data} onSave={(data) => handleSave(card.id, data, index)} saved={card.saved} />)
      case 'tag-people':
        return wrapCard(<TagPeopleCard photoUrl={row.photoUrl} photoId={row.photoId} data={card.data} onSave={(data) => handleSave(card.id, data, index)} saved={card.saved} />)
      case 'media-upload':
        return wrapCard(<MediaUploadCard onUpload={onMediaUploaded} />)
      case 'media-item':
        return wrapCard(<MediaItemCard url={card.data.url} name={card.data.name} type={card.data.type} addedBy={card.addedBy} />)
      case 'field-input':
        return wrapCard(<FieldInputCard contactName={row.contactName} data={card.data} onSave={(data) => handleSave(card.id, data, index)} saved={card.saved} />)
      case 'pill-select':
        return wrapCard(<PillSelectCard label={row.promptText} options={PROFILE_OPTIONS[row.promptType] || PROFILE_OPTIONS.skills} data={card.data} onSave={(data) => handleSave(card.id, data, index)} saved={card.saved} />)
      case 'quote':
      case 'comment':
        return wrapCard(<TextVoiceVideoCard label={card.type === 'quote' ? 'Quote' : 'Comment'} placeholder={card.type === 'quote' ? 'Add a memorable quote...' : 'Add a note...'} data={card.data} onSave={(data) => handleSave(card.id, data, index)} saved={card.saved} />)
      case 'plus':
        return wrapPlus(<PlusCard onAdd={onAddCard} category={row.category} />)
      default:
        return null
    }
  }, [row, handleSave, onAddCard, onMediaUploaded])

  return <div ref={containerRef} style={{ display: 'contents' }}>{row.cards.map((card, i) => renderCard(card, i))}</div>
}
