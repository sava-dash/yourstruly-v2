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
  hidden: { opacity: 0, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25, delay: 0.05 + i * 0.05 },
  }),
  exit: (i: number) => ({
    opacity: 0, scale: 0.97,
    transition: { duration: 0.2, delay: i * 0.03 },
  }),
}

const CARD_W_DEFAULT = 530
const CARD_H = 600

interface CardChainProps {
  row: PromptRow
  onCardSave: (cardId: string, data: Record<string, any>) => void
  onAddCard: (type: CardType) => void
  onMediaUploaded: (files: { url: string; name: string; type: string }[]) => void
  cardWidth?: number
}

export function CardChain({ row, onCardSave, onAddCard, onMediaUploaded, cardWidth }: CardChainProps) {
  const CARD_W = cardWidth ?? CARD_W_DEFAULT
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to next card after saving (no-op in translate mode — parent handles advancement)
  const scrollToNext = useCallback((_currentIndex: number) => {
    // Parent now handles card advancement via focusedCardIdx
  }, [])

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
          border: '1px solid #DDE3DF',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)',
          display: 'flex', flexDirection: 'column',
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
          border: '2px dashed #DDE3DF',
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
