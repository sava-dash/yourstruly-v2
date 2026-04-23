'use client'

/**
 * CardChainCard — renders one card within a memory/wisdom chain.
 *
 * Extracted from src/app/(dashboard)/dashboard/page.tsx so it can be reused
 * by the "Continue this memory" append flow (src/components/my-story/
 * AppendMemoryChain.tsx). No behavior changes on extraction; this file is a
 * pure lift-and-shift of the original inline component plus the constants it
 * depended on (CARD_H, CATEGORY_COLORS, PROFILE_OPTIONS).
 */

import React, { useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'

import { WhenWhereCard } from '@/components/home-v2/cards/WhenWhereCard'
import { TextVoiceVideoCard } from '@/components/home-v2/cards/TextVoiceVideoCard'
import { BackstoryCard } from '@/components/home-v2/cards/BackstoryCard'
import { MediaUploadCard } from '@/components/home-v2/cards/MediaUploadCard'
import { MediaItemCard } from '@/components/home-v2/cards/MediaItemCard'
import { FieldInputCard } from '@/components/home-v2/cards/FieldInputCard'
import { PillSelectCard } from '@/components/home-v2/cards/PillSelectCard'
import { TagPeopleCard } from '@/components/home-v2/cards/TagPeopleCard'
import { PlusCard } from '@/components/home-v2/cards/PlusCard'
import { InviteCollaboratorCard } from '@/components/home-v2/cards/InviteCollaboratorCard'
import { SongCard } from '@/components/home-v2/cards/SongCard'
import { ConversationCard } from '@/components/home-v2/cards/ConversationCard'
import { SynopsisCard } from '@/components/home-v2/cards/SynopsisCard'
import { PeoplePresentCard } from '@/components/home-v2/cards/PeoplePresentCard'
import { ListItemCard } from '@/components/home-v2/cards/ListItemCard'

import type { PromptRow, ChainCard, CardType } from '@/components/home-v2/types'
import { TYPE_CONFIG, getFieldLabel } from '@/app/(dashboard)/dashboard/constants'
import { getChapterStyle } from '@/lib/engagement/chapter-styles'

/** Shared card height — also used by the dashboard for skeleton + spacer. */
export const CARD_H = 600

/** Category palette for cardchain surfaces. */
export const CATEGORY_COLORS: Record<string, { bg: string; border: string; accent: string; cardBg: string }> = {
  memory:    { bg: '#E6F0EA', border: '#7A9B88', accent: '#2D5A3D', cardBg: '#F7FAF8' },
  photo:     { bg: '#FAF5E4', border: '#C4A235', accent: '#7A6520', cardBg: '#FDFBF3' },
  wisdom:    { bg: '#FBF0EB', border: '#B8562E', accent: '#6B3A1E', cardBg: '#FDF8F5' },
  contact:   { bg: '#E6F0EA', border: '#2D7A4F', accent: '#1B3926', cardBg: '#F7FAF8' },
  profile:   { bg: '#F5F1EA', border: '#C4A235', accent: '#5A6660', cardBg: '#FAFAF7' },
  favorites: { bg: '#F0EAF5', border: '#8A6BA8', accent: '#4A3552', cardBg: '#FAF8FC' },
}

/** Pill-select options by prompt type. */
export const PROFILE_OPTIONS: Record<string, string[]> = {
  personality: ['Adventurous', 'Analytical', 'Creative', 'Empathetic', 'Funny', 'Introverted', 'Leader', 'Optimistic', 'Patient', 'Thoughtful'],
  religion: ['Christianity', 'Islam', 'Judaism', 'Buddhism', 'Hinduism', 'Spiritual', 'Agnostic', 'Atheist', 'Other'],
  skills: ['Cooking', 'Writing', 'Music', 'Sports', 'Gardening', 'Photography', 'Teaching', 'Programming', 'Art', 'Public Speaking'],
  languages: ['English', 'Spanish', 'French', 'Mandarin', 'Arabic', 'Hindi', 'Portuguese', 'German', 'Japanese', 'Korean'],
}

interface CardChainCardProps {
  card: ChainCard
  row: PromptRow
  index: number
  onCardSave: (cardId: string, data: Record<string, any>) => void
  onAddCard: (type: CardType) => void
  onMediaUploaded: (files: { url: string; name: string; type: string }[]) => void
  onDelete?: () => void
  onFinish?: () => void
  isFinishing?: boolean
}

export function CardChainCard({
  card,
  row,
  index,
  onCardSave,
  onAddCard,
  onMediaUploaded,
  onDelete,
  onFinish,
  isFinishing,
}: CardChainCardProps) {
  const handleSave = useCallback((data: Record<string, any>) => {
    onCardSave(card.id, data)
  }, [card.id, onCardSave])

  const isPlus = card.type === 'plus'

  // Shape matches the PromptCard: thick ink border, 10px radius, cream bg.
  // Keeps category identity via its subtle background tint on the inner card.
  const cardStyle: React.CSSProperties = isPlus
    ? {
        width: '280px', height: `${CARD_H}px`,
        borderRadius: '10px', overflow: 'hidden',
        background: '#FAF7EC',
        border: '3px dashed rgba(26,31,28,0.35)',
        display: 'flex', flexDirection: 'column',
      }
    : {
        width: 'var(--card-w)', height: `${CARD_H}px`,
        borderRadius: '10px', overflow: 'hidden',
        background: '#FAF7EC',
        border: '3px solid #1A1F1C',
        boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column',
      }

  const renderContent = () => {
    switch (card.type) {
      case 'conversation':
        return (
          <ConversationCard
            data={card.data}
            promptText={row.promptText}
            accentColor={getChapterStyle(row.dbCategory || row.lifeChapter).accentColor}
            onSave={handleSave}
            saved={card.saved}
            cardId={card.id}
          />
        )
      case 'synopsis': {
        // Build the transcript from the conversation card's saved text
        const convCard = row.cards.find((c) => c.type === 'conversation')
        const transcript = (convCard?.data?.text as string) || ''
        const memoryId = (row.metadata as any)?.memoryId as string | undefined
        // Append mode (set by AppendMemoryChain) unions entities into the
        // existing memory instead of overwriting.
        const synopsisMode: 'create' | 'merge' = (row.metadata as any)?.appendMode ? 'merge' : 'create'
        // Pass the prompt question so the extractor can resolve pronouns
        // (she/he/they) against the prompt's named subject and skip them
        // when the reference is ambiguous.
        const promptQuestion = (row.promptText || '').split('\n---\n')[0] || row.promptText
        return (
          <SynopsisCard
            data={card.data}
            conversationTranscript={transcript}
            promptText={promptQuestion}
            memoryId={memoryId || null}
            mode={synopsisMode}
            accentColor={getChapterStyle(row.dbCategory || row.lifeChapter).accentColor}
            onSave={handleSave}
            saved={card.saved}
          />
        )
      }
      case 'when-where':
        return <WhenWhereCard data={card.data} onSave={handleSave} saved={card.saved} />
      case 'text-voice-video': {
        const isUserAdded = !!card.addedBy
        const hasPrefilledText = !!card.data.text && !card.data.messages
        // Use BackstoryCard (AI conversation) for photo/memory
        if (!isUserAdded && (row.category === 'photo' || row.category === 'memory')) {
          // Pre-seed with concierge text: user's story first, AI follow-up generated after
          const cardData = hasPrefilledText
            ? { ...card.data, messages: [
                { role: 'user' as const, content: card.data.text },
              ]}
            : card.data
          return <BackstoryCard promptText={row.promptText} category={row.category} data={cardData} onSave={handleSave} saved={card.saved} />
        }
        const addedLabel = isUserAdded ? 'Add More' : (row.category === 'wisdom' ? 'Share Your Wisdom' : 'Your Story')
        const addedPlaceholder = isUserAdded
          ? 'What else is on your mind about this memory?'
          : (row.promptText || 'Share your thoughts...')
        return <TextVoiceVideoCard label={addedLabel} placeholder={addedPlaceholder} data={card.data} onSave={handleSave} saved={card.saved} />
      }
      case 'tag-people':
        return <TagPeopleCard photoUrl={row.photoUrl} photoId={row.photoId} data={card.data} onSave={handleSave} saved={card.saved} />
      case 'people-present':
        return <PeoplePresentCard data={card.data} onSave={handleSave} saved={card.saved} />
      case 'media-upload':
        return <MediaUploadCard onUpload={onMediaUploaded} />
      case 'media-item':
        return (
          <MediaItemCard
            url={card.data.url}
            name={card.data.name}
            type={card.data.type}
            addedBy={card.addedBy}
            mediaPath={card.data.path}
            detectedFaces={card.data.faces}
            mediaId={card.data.mediaId}
            displayPositionX={card.data.displayPosition?.x ?? card.data.displayPositionX ?? null}
            displayPositionY={card.data.displayPosition?.y ?? card.data.displayPositionY ?? null}
          />
        )
      case 'field-input':
        return (
          <FieldInputCard
            contactName={row.contactName}
            contactPhotoUrl={row.contactPhotoUrl}
            missingField={row.missingField}
            missingFieldLabel={getFieldLabel(row.missingField)}
            data={card.data}
            onSave={handleSave}
            saved={card.saved}
          />
        )
      case 'pill-select':
        return <PillSelectCard label={row.promptText} options={PROFILE_OPTIONS[row.promptType] || PROFILE_OPTIONS.skills} data={card.data} onSave={handleSave} saved={card.saved} />
      case 'quote':
        // Saved quotes show large typography; unsaved use text input
        if (card.saved && card.data.text) {
          return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'linear-gradient(135deg, #F8F0E3 0%, #EDE8DD 100%)' }}>
              <div className="text-[#C4A235]/30 text-6xl font-serif leading-none mb-4">&ldquo;</div>
              <p className="text-xl sm:text-2xl font-bold text-[#3A3228] leading-relaxed italic" style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}>
                {card.data.text}
              </p>
              <div className="text-[#C4A235]/30 text-6xl font-serif leading-none mt-4">&rdquo;</div>
              {card.addedBy && (
                <p className="text-xs text-[#94A09A] mt-4">Added by {card.addedBy.name}</p>
              )}
            </div>
          )
        }
        return <TextVoiceVideoCard label="Quote" placeholder="Add a memorable quote..." data={card.data} onSave={handleSave} saved={card.saved} />
      case 'comment':
        return <TextVoiceVideoCard label="Comment" placeholder="Add a note..." data={card.data} onSave={handleSave} saved={card.saved} />
      case 'invite-collaborator':
        return <InviteCollaboratorCard promptText={row.promptText} promptId={row.promptId} onSave={handleSave} saved={card.saved} data={card.data} />
      case 'list-item': {
        // Determine category from prompt type
        const favCategory = row.promptType?.replace('favorite_', '') || 'books'
        return <ListItemCard category={favCategory} promptText={row.promptText} data={card.data} onSave={handleSave} saved={card.saved} />
      }
      case 'song':
        return <SongCard data={card.data} onSave={handleSave} saved={card.saved} />
      case 'plus':
        return (
          <PlusCard
            onAdd={onAddCard}
            onFinish={onFinish}
            category={row.category}
            isFinishing={isFinishing}
            xpReward={TYPE_CONFIG[row.promptType]?.xp ?? 10}
          />
        )
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.05 + index * 0.05 }}
      style={{ ...cardStyle, position: 'relative' }}
    >
      {/* Delete button — only on user-added cards */}
      {onDelete && (
        <button
          onClick={onDelete}
          style={{
            position: 'absolute', top: '10px', right: '10px', zIndex: 5,
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)', border: '1px solid #DDE3DF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#B8562E',
          }}
          title="Remove card"
        >
          <Trash2 size={13} />
        </button>
      )}
      {renderContent()}
    </motion.div>
  )
}
