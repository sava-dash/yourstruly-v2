'use client'

/**
 * AppendMemoryChain — "Continue this memory" overlay.
 *
 * Mounts the exact same cardchain the user saw when FIRST creating the
 * memory (conversation → synopsis → plus), but at Finish time posts to
 * /api/memories/[id]/append or /api/wisdom/[id]/append instead of creating
 * a new row. The row's metadata carries `appendMode: true` so nested cards
 * (notably SynopsisCard) switch to merge-mode on the server side.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import Image from 'next/image'

import { CardChainCard } from '@/components/home-v2/CardChainCard'
import { generateInitialCards } from '@/components/home-v2/types'
import type { ChainCard, CardType, PromptCategory, PromptRow } from '@/components/home-v2/types'

const uid = () => `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export interface AppendTarget {
  id: string
  type: 'memory' | 'wisdom'
  title: string
  coverUrl?: string
}

interface AppendMemoryChainProps {
  isOpen: boolean
  target: AppendTarget | null
  onClose: () => void
  /** Fires after a successful server-side append. The page should re-fetch. */
  onSaved: () => void
}

export function AppendMemoryChain({ isOpen, target, onClose, onSaved }: AppendMemoryChainProps) {
  const category: PromptCategory = target?.type === 'wisdom' ? 'wisdom' : 'memory'

  const [row, setRow] = useState<PromptRow | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Build a fresh PromptRow each time the overlay opens for a new target.
  useEffect(() => {
    if (!isOpen || !target) {
      setRow(null)
      setErrorMsg(null)
      return
    }
    const types = generateInitialCards(category, 'memory_append')
    const cards: ChainCard[] = types.map((t) => ({
      id: uid(),
      type: t,
      data: {},
      saved: false,
      createdAt: new Date().toISOString(),
    }))
    setRow({
      promptId: `append:${target.id}`,
      promptText: `What else do you want to remember about "${target.title}"?`,
      promptType: category === 'wisdom' ? 'knowledge' : 'memory_append',
      category,
      dbCategory: null,
      lifeChapter: null,
      // appendMode flag is read by CardChainCard → SynopsisCard → API, so
      // the server merges extracted_entities instead of overwriting.
      metadata: { memoryId: target.id, appendMode: true },
      cards,
      expanded: true,
    })
  }, [isOpen, target, category])

  const handleCardSave = useCallback((cardId: string, data: Record<string, any>) => {
    setRow((r) => {
      if (!r) return r
      return {
        ...r,
        cards: r.cards.map((c) =>
          c.id === cardId ? { ...c, data: { ...c.data, ...data }, saved: true } : c,
        ),
      }
    })
  }, [])

  const handleAddCard = useCallback((type: CardType) => {
    setRow((r) => {
      if (!r) return r
      const newCard: ChainCard = {
        id: uid(),
        type,
        data: {},
        saved: false,
        createdAt: new Date().toISOString(),
      }
      // Insert immediately before the plus tile so the chain UX stays intact.
      const plusIdx = r.cards.findIndex((c) => c.type === 'plus')
      const cards = plusIdx >= 0
        ? [...r.cards.slice(0, plusIdx), newCard, ...r.cards.slice(plusIdx)]
        : [...r.cards, newCard]
      return { ...r, cards }
    })
  }, [])

  const handleMediaUploaded = useCallback((files: { url: string; name: string; type: string }[]) => {
    setRow((r) => {
      if (!r) return r
      const newCards: ChainCard[] = files.map((f) => ({
        id: uid(),
        type: 'media-item',
        data: { url: f.url, name: f.name, type: f.type },
        saved: true,
        createdAt: new Date().toISOString(),
      }))
      // Consume the media-upload card (it transforms into the resulting items).
      const without = r.cards.filter((c) => c.type !== 'media-upload')
      const plusIdx = without.findIndex((c) => c.type === 'plus')
      return {
        ...r,
        cards: plusIdx >= 0
          ? [...without.slice(0, plusIdx), ...newCards, ...without.slice(plusIdx)]
          : [...without, ...newCards],
      }
    })
  }, [])

  const handleDeleteCard = useCallback((cardId: string) => {
    setRow((r) => (r ? { ...r, cards: r.cards.filter((c) => c.id !== cardId) } : r))
  }, [])

  const handleFinish = useCallback(async () => {
    if (!row || !target) return
    setIsFinishing(true)
    setErrorMsg(null)
    try {
      const savedCards = row.cards.filter((c) => c.saved && c.type !== 'plus')

      const textParts: string[] = []
      const mediaUrls: { url: string; name?: string; type?: string; mediaId?: string }[] = []
      let location: { name: string; lat?: number; lng?: number } | undefined
      let date: string | undefined
      const taggedPeople: { id?: string; name: string }[] = []
      let quote: string | undefined
      let song: { title: string; artist?: string } | undefined
      let comment: string | undefined
      let synopsisData: any = null

      for (const card of savedCards) {
        switch (card.type) {
          case 'conversation': {
            // ConversationCard stores final transcript on .data.text. If the
            // user had a Q&A exchange, .data.messages is present — format it.
            const msgs = card.data?.messages as { role: string; content: string }[] | undefined
            if (Array.isArray(msgs) && msgs.length > 1) {
              const blocks: string[] = []
              let q = ''
              let qNum = 0
              for (const m of msgs) {
                if (m.role === 'assistant') { qNum += 1; q = `**Q${qNum}:** ${m.content}` }
                else if (m.role === 'user') {
                  const a = `**A${qNum || 1}:** ${m.content}`
                  blocks.push(q ? `${q}\n\n${a}` : a)
                  q = ''
                }
              }
              if (q) blocks.push(q)
              if (blocks.length > 0) textParts.push(blocks.join('\n\n---\n\n'))
            } else if (card.data?.text) {
              textParts.push(card.data.text)
            }
            break
          }
          case 'synopsis':
            synopsisData = card.data
            if (card.data?.where && !location) location = { name: card.data.where }
            if (card.data?.when && !date) {
              const d = new Date(card.data.when)
              if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0]
            }
            break
          case 'when-where':
            if (card.data?.location && !location) {
              location = { name: card.data.location, lat: card.data.lat, lng: card.data.lng }
            }
            if (card.data?.date && !date) date = card.data.date
            break
          case 'text-voice-video':
            if (card.data?.text) textParts.push(card.data.text)
            break
          case 'media-item':
            if (card.data?.url) {
              mediaUrls.push({
                url: card.data.url,
                name: card.data.name,
                type: card.data.type,
                mediaId: card.data.mediaId,
              })
            }
            break
          case 'tag-people':
          case 'people-present': {
            const list = (card.data?.people as any[]) || []
            for (const p of list) {
              if (p?.name || p?.id) taggedPeople.push({ id: p.id, name: p.name })
            }
            break
          }
          case 'quote':
            if (card.data?.text) quote = card.data.text
            break
          case 'song':
            if (card.data?.name || card.data?.title) {
              song = { title: card.data.name || card.data.title, artist: card.data.artist }
            }
            break
          case 'comment':
            if (card.data?.text) comment = card.data.text
            break
        }
      }

      const endpoint = target.type === 'wisdom'
        ? `/api/wisdom/${target.id}/append`
        : `/api/memories/${target.id}/append`

      const payload: Record<string, any> = target.type === 'wisdom'
        ? {
            text: textParts.join('\n\n') || undefined,
            // Wisdom chain can include an audio media-item — treat the first
            // one as the new audio_url.
            audioUrl: mediaUrls.find((m) => (m.type || '').toLowerCase().includes('audio'))?.url,
            tags: synopsisData?.tags,
          }
        : {
            text: textParts.join('\n\n') || undefined,
            mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
            taggedPeople: taggedPeople.length > 0 ? taggedPeople : undefined,
            location,
            date,
            quote,
            song,
            comment,
            extracted: synopsisData
              ? {
                  where: synopsisData.where,
                  when: synopsisData.when,
                  mood: synopsisData.mood,
                  tags: synopsisData.tags,
                  summary: synopsisData.extras?.summary || null,
                  people: Array.isArray(synopsisData.who)
                    ? synopsisData.who.map((p: any) => p?.name).filter(Boolean)
                    : [],
                }
              : undefined,
          }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        setErrorMsg(`Couldn't add to memory. ${body.slice(0, 120)}`)
        return
      }
      onSaved()
      onClose()
    } catch (err) {
      console.error('[AppendMemoryChain] finish failed:', err)
      setErrorMsg('Network error. Try again.')
    } finally {
      setIsFinishing(false)
    }
  }, [row, target, onSaved, onClose])

  const overlay = useMemo(() => {
    if (!isOpen || !target || !row) return null
    return (
      <AnimatePresence>
        <motion.div
          key="append-overlay-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100]"
          style={{ background: 'rgba(17,17,17,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="relative h-full overflow-y-auto"
            style={{ background: 'var(--ed-cream)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header strip: cover thumb + title + "CONTINUING…" kicker + close */}
            <div
              className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4"
              style={{ background: 'var(--ed-cream)', borderBottom: '2px solid var(--ed-ink)' }}
            >
              {target.coverUrl ? (
                <div
                  className="relative shrink-0"
                  style={{ width: 56, height: 56, border: '2px solid var(--ed-ink)', borderRadius: 2, overflow: 'hidden' }}
                >
                  <Image src={target.coverUrl} alt="" fill unoptimized className="object-cover" sizes="56px" />
                </div>
              ) : null}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] tracking-[0.22em] text-[var(--ed-red)]"
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                >
                  CONTINUING…
                </p>
                <h2
                  className="text-[var(--ed-ink)] truncate leading-tight"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 3.5vw, 28px)' }}
                >
                  {target.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center shrink-0"
                style={{ width: 36, height: 36, borderRadius: 999, border: '2px solid var(--ed-ink)', background: 'var(--ed-paper)' }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Inline error surface — non-intrusive, above the chain */}
            {errorMsg && (
              <div
                className="mx-6 mt-4 px-4 py-2 text-[12px]"
                style={{
                  border: '2px solid var(--ed-ink)',
                  background: 'var(--ed-red)',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.1em',
                }}
              >
                {errorMsg.toUpperCase()}
              </div>
            )}

            {/* Card chain — same visual as dashboard */}
            <div
              className="flex flex-wrap gap-5 justify-center px-6 py-8"
              style={{
                ['--card-w' as any]: 'min(560px, calc(100vw - 48px))',
                minHeight: 'calc(100vh - 80px)',
              }}
            >
              {row.cards.map((card, index) => (
                <CardChainCard
                  key={card.id}
                  card={card}
                  row={row}
                  index={index}
                  onCardSave={handleCardSave}
                  onAddCard={handleAddCard}
                  onMediaUploaded={handleMediaUploaded}
                  // Only user-added cards get the delete affordance; the seed
                  // cards (conversation / synopsis / plus) are permanent.
                  onDelete={
                    card.type === 'plus' || card.type === 'conversation' || card.type === 'synopsis'
                      ? undefined
                      : () => handleDeleteCard(card.id)
                  }
                  onFinish={handleFinish}
                  isFinishing={isFinishing}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }, [
    isOpen, target, row, errorMsg, isFinishing,
    handleCardSave, handleAddCard, handleMediaUploaded, handleDeleteCard, handleFinish, onClose,
  ])

  if (typeof document === 'undefined') return null
  return overlay ? createPortal(overlay, document.body) : null
}
