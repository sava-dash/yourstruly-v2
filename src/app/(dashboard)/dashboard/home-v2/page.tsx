'use client'

import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useEngagementPrompts } from '@/hooks/useEngagementPrompts'
import { PromptColumn } from '@/components/home-v2/PromptColumn'
import { CardChain } from '@/components/home-v2/CardChain'
import { Sparkles, RefreshCw } from 'lucide-react'
import type { PromptRow, ChainCard, CardType, PromptCategory } from '@/components/home-v2/types'
import { categorizePrompt, generateInitialCards } from '@/components/home-v2/types'

// Generate a unique ID
const uid = () => `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export default function HomeV2Page() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  // Engagement prompts
  const {
    prompts: rawPrompts,
    isLoading: promptsLoading,
    shuffle,
    answerPrompt,
  } = useEngagementPrompts(30, null)

  // State
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [rows, setRows] = useState<Map<string, PromptRow>>(new Map())

  // Load user
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (p) setProfile(p)
      }
    }
    load()
  }, [])

  // Build rows from prompts (dedup photos, skip tag_person)
  useEffect(() => {
    const seenPhotoIds = new Set<string>()
    const newRows = new Map<string, PromptRow>()

    for (const prompt of rawPrompts) {
      if (prompt.type === 'tag_person') continue
      if (prompt.photoId) {
        if (seenPhotoIds.has(prompt.photoId)) continue
        seenPhotoIds.add(prompt.photoId)
      }

      const category = categorizePrompt(prompt.type)
      const cardTypes = generateInitialCards(category, prompt.type)

      // Preserve existing row state if we already have it
      const existing = rows.get(prompt.id)
      if (existing) {
        newRows.set(prompt.id, existing)
        continue
      }

      const cards: ChainCard[] = cardTypes.map(type => ({
        id: uid(),
        type,
        data: {},
        saved: false,
        createdAt: new Date().toISOString(),
      }))

      // For photo prompts, pre-populate the photo as a media-item card
      if (category === 'photo' && prompt.photoUrl) {
        const photoCard: ChainCard = {
          id: uid(),
          type: 'media-item',
          data: { url: prompt.photoUrl, name: 'Photo', type: 'image/jpeg' },
          saved: true,
          createdAt: new Date().toISOString(),
        }
        // Insert after when-where
        const whenIdx = cards.findIndex(c => c.type === 'when-where')
        cards.splice(whenIdx + 1, 0, photoCard)
      }

      newRows.set(prompt.id, {
        promptId: prompt.id,
        promptText: prompt.promptText,
        promptType: prompt.type,
        category,
        photoUrl: prompt.photoUrl,
        photoId: prompt.photoId,
        contactName: prompt.contactName,
        contactId: prompt.contactId,
        metadata: prompt.metadata,
        cards,
        expanded: false,
      })
    }

    setRows(newRows)
  }, [rawPrompts])

  // Select a prompt → expand into card chain
  const handleSelect = useCallback((promptId: string) => {
    setExpandedRowId(promptId)
  }, [])

  const handleBack = useCallback(() => {
    setExpandedRowId(null)
  }, [])

  // Save a card's data
  const handleCardSave = useCallback(async (promptId: string, cardId: string, data: Record<string, any>) => {
    setRows(prev => {
      const next = new Map(prev)
      const row = next.get(promptId)
      if (!row) return prev
      const updatedCards = row.cards.map(c =>
        c.id === cardId ? { ...c, data: { ...c.data, ...data }, saved: true } : c
      )
      next.set(promptId, { ...row, cards: updatedCards })
      return next
    })

    // Auto-save to API
    try {
      const row = rows.get(promptId)
      if (!row) return

      // Determine what to save based on card type
      const card = row.cards.find(c => c.id === cardId)
      if (!card) return

      if (card.type === 'text-voice-video' || card.type === 'quote' || card.type === 'comment') {
        await answerPrompt(promptId, {
          type: 'text',
          text: data.text || '',
        })
      } else if (card.type === 'when-where') {
        // Save location/date to media if photo prompt
        if (row.photoId) {
          await supabase
            .from('memory_media')
            .update({
              location_name: data.location || null,
              taken_at: data.date || null,
            })
            .eq('id', row.photoId)
        }
      } else if (card.type === 'field-input') {
        await answerPrompt(promptId, {
          type: 'text',
          text: Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n'),
        })
      } else if (card.type === 'pill-select') {
        const selected = data.selected || []
        await answerPrompt(promptId, {
          type: 'selection',
          text: selected.join(', '),
          data: { value: selected.join(', ') },
        })
      }
    } catch (err) {
      console.error('Auto-save failed:', err)
    }
  }, [rows, answerPrompt, supabase])

  // Add a new card to a row
  const handleAddCard = useCallback((promptId: string, type: CardType) => {
    setRows(prev => {
      const next = new Map(prev)
      const row = next.get(promptId)
      if (!row) return prev

      const newCard: ChainCard = {
        id: uid(),
        type,
        data: {},
        saved: false,
        addedBy: user ? { userId: user.id, name: profile?.full_name || 'You' } : undefined,
        createdAt: new Date().toISOString(),
      }

      // Insert before the plus card
      const plusIdx = row.cards.findIndex(c => c.type === 'plus')
      const updatedCards = [...row.cards]
      if (plusIdx >= 0) {
        updatedCards.splice(plusIdx, 0, newCard)
      } else {
        updatedCards.push(newCard)
      }

      next.set(promptId, { ...row, cards: updatedCards })
      return next
    })
  }, [user, profile])

  // Handle media uploaded → create media-item cards
  const handleMediaUploaded = useCallback((promptId: string, files: { url: string; name: string; type: string }[]) => {
    setRows(prev => {
      const next = new Map(prev)
      const row = next.get(promptId)
      if (!row) return prev

      const newCards: ChainCard[] = files.map(file => ({
        id: uid(),
        type: 'media-item' as CardType,
        data: file,
        saved: true,
        addedBy: user ? { userId: user.id, name: profile?.full_name || 'You' } : undefined,
        createdAt: new Date().toISOString(),
      }))

      // Insert before plus card
      const plusIdx = row.cards.findIndex(c => c.type === 'plus')
      const updatedCards = [...row.cards]
      if (plusIdx >= 0) {
        updatedCards.splice(plusIdx, 0, ...newCards)
      } else {
        updatedCards.push(...newCards)
      }

      next.set(promptId, { ...row, cards: updatedCards })
      return next
    })
  }, [user, profile])

  // Build prompt column data
  const columnPrompts = Array.from(rows.values()).map(row => ({
    id: row.promptId,
    promptText: row.promptText,
    type: row.promptType,
    category: row.category,
    photoUrl: row.photoUrl,
    contactName: row.contactName,
    savedCount: row.cards.filter(c => c.saved && c.type !== 'plus' && c.type !== 'media-upload').length,
    totalCards: row.cards.filter(c => c.type !== 'plus' && c.type !== 'media-upload').length,
  }))

  const expandedRow = expandedRowId ? rows.get(expandedRowId) : null

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#1A1A1A]/95 backdrop-blur-sm border-b border-white/8">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">
              {profile ? `Hey ${profile.full_name?.split(' ')[0] || 'there'}` : 'Home'}
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              {columnPrompts.length} prompts waiting
            </p>
          </div>
          <button
            onClick={() => shuffle()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 text-sm transition-colors"
          >
            <RefreshCw size={14} />
            Shuffle
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {expandedRow ? (
            <CardChain
              key="chain"
              row={expandedRow}
              onBack={handleBack}
              onCardSave={(cardId, data) => handleCardSave(expandedRow.promptId, cardId, data)}
              onAddCard={(type) => handleAddCard(expandedRow.promptId, type)}
              onMediaUploaded={(files) => handleMediaUploaded(expandedRow.promptId, files)}
            />
          ) : (
            <div key="column" className="py-6">
              <PromptColumn
                prompts={columnPrompts}
                onSelect={handleSelect}
                isLoading={promptsLoading}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
