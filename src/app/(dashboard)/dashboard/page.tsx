'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useEngagementPrompts } from '@/hooks/useEngagementPrompts'
import { useSubscription } from '@/hooks/useSubscription'
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
import { PeoplePresentCard } from '@/components/home-v2/cards/PeoplePresentCard'
import { ListItemCard } from '@/components/home-v2/cards/ListItemCard'
import { RefreshCw, X, Heart, Camera, Brain, User, BookOpen, Sparkles, Menu, Trash2, ChevronLeft, ChevronRight, Clock, LayoutGrid } from 'lucide-react'
import type { PromptRow, ChainCard, CardType, PromptCategory } from '@/components/home-v2/types'
import { categorizePrompt, generateInitialCards } from '@/components/home-v2/types'
import { useDashboardData } from './hooks/useDashboardData'
import { useXpState } from './hooks/useXpState'
import { useGamificationConfig } from '@/hooks/useGamificationConfig'
import { TYPE_CONFIG, getFieldLabel, LIFE_CHAPTERS } from './constants'
import { trackEngagement } from './analytics'
import { getChapterStyle } from '@/lib/engagement/chapter-styles'
import { EngagementErrorBoundary } from './components/EngagementErrorBoundary'
import { CelebrationModal } from './components/CelebrationModal'
import { HistoryPanel } from './components/HistoryPanel'
import { CategoriesPanel } from './components/CategoriesPanel'
import { VisibilityModal } from './components/VisibilityModal'

const MemoryOfTheDayBanner = dynamic(() => import('@/components/dashboard/MemoryOfTheDayBanner'), { ssr: false })
const BadgeDisplay = dynamic(() => import('@/components/dashboard/BadgeDisplay'), { ssr: false })
const WeeklyChallenges = dynamic(() => import('@/components/dashboard/WeeklyChallenges'), { ssr: false })
const OnThisDayRow = dynamic(() => import('@/components/home-v2/OnThisDayRow'), { ssr: false })

const uid = () => `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// Category colors from Ogilvy brand palette
const CATEGORY_COLORS: Record<string, { bg: string; border: string; accent: string; cardBg: string }> = {
  memory:    { bg: '#E6F0EA', border: '#7A9B88', accent: '#2D5A3D', cardBg: '#F7FAF8' },
  photo:     { bg: '#FAF5E4', border: '#C4A235', accent: '#7A6520', cardBg: '#FDFBF3' },
  wisdom:    { bg: '#FBF0EB', border: '#B8562E', accent: '#6B3A1E', cardBg: '#FDF8F5' },
  contact:   { bg: '#E6F0EA', border: '#2D7A4F', accent: '#1B3926', cardBg: '#F7FAF8' },
  profile:   { bg: '#F5F1EA', border: '#C4A235', accent: '#5A6660', cardBg: '#FAFAF7' },
  favorites: { bg: '#F0EAF5', border: '#8A6BA8', accent: '#4A3552', cardBg: '#FAF8FC' },
}

const CATEGORY_META: Record<string, { icon: any; label: string; hint: string; time: string }> = {
  memory: { icon: Heart, label: 'Remember When', hint: '🎙️ Talk or type', time: '~2 min' },
  photo: { icon: Camera, label: 'Tell The Story', hint: '🎙️ Talk or type', time: '~2 min' },
  wisdom: { icon: Brain, label: 'Share Wisdom', hint: '🎙️ Talk or type', time: '~3 min' },
  contact: { icon: User, label: 'Update Info', hint: '⌨️ Quick fill', time: '~30 sec' },
  profile: { icon: Sparkles, label: 'About You', hint: '👆 Tap to select', time: '~30 sec' },
  favorites: { icon: BookOpen, label: 'Your Favorites', hint: '⌨️ Type', time: '~1 min' },
}

function getXpLevel(xp: number, levels?: any[]) {
  const defaultLevels = [
    { title: 'Memory Keeper', emoji: '🔖', minXp: 0 },
    { title: 'Storyteller', emoji: '📖', minXp: 200 },
    { title: 'Family Historian', emoji: '🏛️', minXp: 500 },
    { title: 'Legacy Builder', emoji: '🌟', minXp: 1000 },
    { title: 'Time Capsule Master', emoji: '💎', minXp: 2500 },
  ]
  const lvls = levels && levels.length > 0 ? levels : defaultLevels
  let current = lvls[0]
  let next = lvls[1]
  for (let i = lvls.length - 1; i >= 0; i--) {
    if (xp >= lvls[i].minXp) {
      current = lvls[i]
      next = lvls[i + 1] || null
      break
    }
  }
  const progress = next ? ((xp - current.minXp) / (next.minXp - current.minXp)) * 100 : 100
  const xpToNext = next ? next.minXp - xp : 0
  return { ...current, nextLevel: next, progress: Math.min(progress, 100), xpToNext }
}

const CARD_H = 600

export default function HomeV2Page() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  // Declared early so it can be passed to useEngagementPrompts as the
  // lifeChapter arg — flipping the filter triggers a fresh server-side
  // fetch that returns the FULL chapter pool (not the slotted subset).
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const {
    prompts: rawPrompts,
    isLoading: promptsLoading,
    shuffle,
    answerPrompt,
    stats: engagementStats,
  } = useEngagementPrompts(100, categoryFilter)

  const { subscription } = useSubscription()
  const { stats: dashboardStats, refreshStats: refreshDashboardStats } = useDashboardData(user?.id || null)
  const { totalXp, xpAnimating, addXp, refreshXp } = useXpState(user?.id || null)
  const { config: gamificationConfig } = useGamificationConfig()
  const streakDays = 0

  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const expandedRowIdRef = useRef<string | null>(null)
  const [shuffleKey, setShuffleKey] = useState(0)
  const scrollRowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  // Keep ref in sync with state
  useEffect(() => { expandedRowIdRef.current = expandedRowId }, [expandedRowId])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows, setRows] = useState<Map<string, PromptRow>>(new Map())
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [finishingRowId, setFinishingRowId] = useState<string | null>(null)
  const [celebration, setCelebration] = useState<{
    open: boolean
    xpEarned: number
    reflection: string | null
    loading: boolean
    promptText: string
    promptCategory: string
  }>({ open: false, xpEarned: 0, reflection: null, loading: false, promptText: '', promptCategory: '' })
  const [visibility, setVisibility] = useState<{
    open: boolean
    memoryId: string | null
    promptText: string
    mentionedPeople: { id: string; name: string }[]
    onComplete: () => void
  }>({ open: false, memoryId: null, promptText: '', mentionedPeople: [], onComplete: () => {} })
  const [historyOpen, setHistoryOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  // (categoryFilter is declared above the useEngagementPrompts call so
  // it can drive the hook's lifeChapter arg.)
  // All categories/life chapters known to the template library. Fetched
  // once on mount so the right panel can list chapters the user hasn't
  // loaded any prompts for yet (those tiles click-to-shuffle).
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  // Pick up pre-filled memory from AI Concierge via custom event
  const insertConciergeDraft = useCallback((draft: { title: string; description: string; location?: string; date?: string; people?: string[]; mood?: string }) => {
    const promptId = `concierge-${Date.now()}`
    const cards: ChainCard[] = [
      { id: uid(), type: 'when-where', data: { location: draft.location || '', date: draft.date || '' }, saved: !!(draft.location || draft.date), createdAt: new Date().toISOString() },
      { id: uid(), type: 'text-voice-video', data: { text: draft.description || '' }, saved: false, createdAt: new Date().toISOString() },  // BackstoryCard will pre-seed messages from text
      { id: uid(), type: 'people-present', data: { preselectedNames: draft.people || [] }, saved: false, createdAt: new Date().toISOString() },
      { id: uid(), type: 'media-upload', data: {}, saved: false, createdAt: new Date().toISOString() },
      { id: uid(), type: 'plus', data: {}, saved: false, createdAt: new Date().toISOString() },
    ]
    const newRow: PromptRow = {
      promptId, promptText: draft.title || 'New Memory', promptType: 'memory',
      category: 'memory', cards, expanded: false,
    }
    setRows(prev => {
      const result = new Map<string, PromptRow>()
      result.set(promptId, newRow)
      prev.forEach((v, k) => result.set(k, v))
      return result
    })
    setTimeout(() => {
      setExpandedRowId(promptId)
      requestAnimationFrame(() => {
        const scrollEl = scrollRowRefs.current.get(promptId)
        if (scrollEl) {
          const firstCard = scrollEl.querySelector('[data-chain-card="0"]') as HTMLElement
          if (firstCard) firstCard.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'center' })
        }
      })
    }, 200)
  }, [])

  // Listen for concierge draft events
  useEffect(() => {
    const handler = (e: CustomEvent) => insertConciergeDraft(e.detail)
    window.addEventListener('concierge-create-memory', handler as EventListener)
    // Also check sessionStorage on mount (for cross-page navigation)
    const stored = sessionStorage.getItem('concierge-memory-draft')
    if (stored) {
      sessionStorage.removeItem('concierge-memory-draft')
      try { insertConciergeDraft(JSON.parse(stored)) } catch {}
    }
    return () => window.removeEventListener('concierge-create-memory', handler as EventListener)
  }, [insertConciergeDraft])

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

  // First-load seed: if user has no engagement_prompts, trigger seeding
  const hasTriedSeed = useRef(false)
  useEffect(() => {
    if (!user || hasTriedSeed.current || promptsLoading) return
    // Always try seeding — the endpoint is idempotent (checks for seed_library source)
    // This ensures existing users with only old-style prompts get the new seeds too
    hasTriedSeed.current = true
    fetch('/api/engagement/seed-first-session', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.seeded > 0) shuffle()
      })
      .catch(() => {})
  }, [user, rawPrompts.length, promptsLoading, shuffle])

  // Load the full set of chapter/category keys the system knows about
  // so the right panel can show every chapter even when no prompt of
  // that type is currently loaded into the feed.
  useEffect(() => {
    let cancelled = false
    const loadCategories = async () => {
      // Start with the hard-coded life chapters as the canonical floor.
      const keys = new Set<string>(LIFE_CHAPTERS.map((c) => c.id))

      // Merge in anything else the template library uses. Two columns
      // contribute: prompt_templates.category and prompt_templates.life_chapter.
      try {
        const { data: templates } = await supabase
          .from('prompt_templates')
          .select('category, life_chapter')
          .eq('is_active', true)
        for (const t of templates || []) {
          if ((t as any).category) keys.add(((t as any).category as string).trim())
          if ((t as any).life_chapter) keys.add(((t as any).life_chapter as string).trim())
        }
      } catch (err) {
        console.warn('[categories] prompt_templates fetch failed', err)
      }

      if (!cancelled) setAvailableCategories(Array.from(keys).filter(Boolean))
    }
    loadCategories()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const seenPhotoIds = new Set<string>()
    const newRows = new Map<string, PromptRow>()

    // IMPORTANT: Preserve the currently expanded row even if answerPrompt removed it from rawPrompts.
    const currentExpandedId = expandedRowIdRef.current
    if (currentExpandedId) {
      const existingExpanded = rows.get(currentExpandedId)
      if (existingExpanded) {
        newRows.set(currentExpandedId, existingExpanded)
        if (existingExpanded.photoId) seenPhotoIds.add(existingExpanded.photoId)
      }
    }

    // Client-side shuffle using shuffleKey as seed — works even if DB migration not applied
    const shuffledPrompts = shuffleKey > 0
      ? [...rawPrompts].sort(() => Math.random() - 0.5)
      : rawPrompts

    for (const prompt of shuffledPrompts) {
      if (prompt.type === 'tag_person') continue
      if (prompt.photoId) {
        if (seenPhotoIds.has(prompt.photoId)) continue
        seenPhotoIds.add(prompt.photoId)
      }
      // Preserve existing card state (saves, data) but always use rawPrompts order
      const existing = rows.get(prompt.id)
      if (existing) { newRows.set(prompt.id, existing); continue }
      const category = categorizePrompt(prompt.type)
      const cardTypes = generateInitialCards(category, prompt.type)
      // Pre-fill when-where from photo EXIF metadata if available
      const photoMeta = (prompt as any).photoMetadata || {}
      const cards: ChainCard[] = cardTypes.map(type => {
        if (type === 'when-where' && (photoMeta.location_name || photoMeta.exif_lat || photoMeta.taken_at)) {
          const d = photoMeta.taken_at ? new Date(photoMeta.taken_at).toISOString().split('T')[0] : ''
          return {
            id: uid(), type, saved: false, createdAt: new Date().toISOString(),
            data: {
              location: photoMeta.location_name || '',
              lat: photoMeta.exif_lat || undefined,
              lng: photoMeta.exif_lng || undefined,
              date: d,
            },
          }
        }
        return { id: uid(), type, data: {}, saved: false, createdAt: new Date().toISOString() }
      })
      // No extra media-item card for photos — the photo is shown on the prompt card itself
      // Chain order for photo: when-where → backstory → tag-people → plus
      newRows.set(prompt.id, {
        promptId: prompt.id, promptText: prompt.promptText, promptType: prompt.type,
        category,
        dbCategory: prompt.category || null,
        lifeChapter: prompt.lifeChapter || null,
        photoUrl: prompt.photoUrl, photoId: prompt.photoId,
        contactName: prompt.contactName, contactId: prompt.contactId,
        contactPhotoUrl: prompt.contactPhotoUrl,
        missingField: prompt.missingField,
        metadata: prompt.metadata, cards, expanded: false,
      })
    }
    setRows(newRows)
  }, [rawPrompts, shuffleKey])

  // Auto-expand a row when ?expand={promptId} is in the URL
  // (used by "Add Backstory" button in My Story to dive into a photo memory)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const expandId = params.get('expand')
    if (expandId && rows.has(expandId)) {
      setExpandedRowId(expandId)
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('expand')
      window.history.replaceState({}, '', url.toString())
    }
  }, [rows])

  // Open: expand row, scroll to first chain card
  const handleSelect = useCallback((promptId: string) => {
    setExpandedRowId(promptId)
    const row = rows.get(promptId)
    trackEngagement('card_expanded', {
      promptId,
      promptType: row?.promptType,
      category: row?.category,
    })
    // After state update and render, scroll to the first chain card
    requestAnimationFrame(() => {
      const scrollEl = scrollRowRefs.current.get(promptId)
      if (scrollEl) {
        const firstChainCard = scrollEl.querySelector('[data-chain-card="0"]') as HTMLElement
        if (firstChainCard) {
          firstChainCard.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'center' })
        }
      }
    })
  }, [rows])

  // Close: collapse back to feed
  const handleBack = useCallback(() => {
    setExpandedRowId(null)
  }, [])

  // Save & Finish: mark prompt as answered, remove from feed
  const handleFinish = useCallback(async () => {
    if (!expandedRowId) return
    // Double-submit guard: ignore repeat clicks while a finish is in flight
    if (finishingRowId) return
    const row = rows.get(expandedRowId)
    if (!row) { setExpandedRowId(null); return }

    // Collect all saved card data into a summary
    const savedCards = row.cards.filter(c => c.saved && c.type !== 'plus')
    const textParts: string[] = []
    const mediaUrls: { url: string; name?: string; type?: string; mediaId?: string }[] = []
    let chainLocation: { name?: string; lat?: number; lng?: number } | undefined
    let chainDate: string | undefined
    for (const card of savedCards) {
      if (card.type === 'media-item' && card.data?.url) {
        mediaUrls.push({
          url: card.data.url,
          name: card.data.name,
          type: card.data.type,
          mediaId: card.data.mediaId,
        })
        continue
      }
      // If this card has a full conversation (BackstoryCard), format as Q&A.
      // Each exchange pairs a Q + A in one block so parseStory can parse them.
      if (card.data.messages && Array.isArray(card.data.messages) && card.data.messages.length > 1) {
        const msgs = card.data.messages as { role: string; content: string }[]
        const exchanges: string[] = []
        let qNum = 0
        let currentQ = ''
        for (const msg of msgs) {
          if (msg.role === 'assistant') {
            qNum++
            currentQ = `**Q${qNum}:** ${msg.content}`
          } else if (msg.role === 'user') {
            const aBlock = `**A${qNum || 1}:** ${msg.content}`
            if (currentQ) {
              exchanges.push(`${currentQ}\n\n${aBlock}`)
              currentQ = ''
            } else {
              exchanges.push(aBlock)
            }
          }
        }
        // If there's an unanswered trailing question, include it
        if (currentQ) exchanges.push(currentQ)
        if (exchanges.length > 0) {
          textParts.push(`## Conversation\n\n${exchanges.join('\n\n---\n\n')}`)
        }
      } else if (card.data.text) {
        textParts.push(card.data.text)
      }
      if (card.data.location) {
        textParts.push(`Location: ${card.data.location}`)
        if (!chainLocation) chainLocation = { name: card.data.location, lat: card.data.lat, lng: card.data.lng }
      }
      if (card.data.date) {
        textParts.push(`Date: ${card.data.date}`)
        if (!chainDate) chainDate = card.data.date
      }
      if (card.data.song?.name) textParts.push(`Song: ${card.data.song.name} by ${card.data.song.artist}`)
    }

    // Collect people tagged via PeoplePresentCard
    const chainPeople = savedCards
      .filter((c) => c.type === 'people-present' && c.data?.people)
      .flatMap((c) => (c.data.people as { id: string; name: string }[]) || [])

    const responseText = textParts.join('\n\n') || 'Completed'

    // Per-chain XP: one grant for completing the prompt, regardless of how
    // many cards are in the chain. Falls back to 10 for unknown types.
    const totalEarned = TYPE_CONFIG[row.promptType]?.xp ?? 10

    // Lock finish for this row
    setFinishingRowId(row.promptId)

    // Mark as answered in the backend BEFORE removing from local rows.
    // If this fails, we keep the row so the user can retry instead of
    // silently losing their work. The server awards the per-chain XP
    // (one grant per prompt type) via XP_REWARDS — single source of truth.
    let answerResult: any = null
    try {
      answerResult = await answerPrompt(row.promptId, {
        type: 'text',
        text: responseText,
        data: {
          mediaUrls,
          locationName: chainLocation?.name,
          locationLat: chainLocation?.lat,
          locationLng: chainLocation?.lng,
          memoryDate: chainDate,
          taggedPeople: chainPeople.length > 0 ? chainPeople : undefined,
        },
      })
    } catch (err) {
      console.error('Failed to finish prompt:', err)
      setFinishingRowId(null)
      setErrorToast("Couldn't save memory — check your connection and try again.")
      setTimeout(() => setErrorToast(null), 5000)
      trackEngagement('card_finish_failed', {
        promptId: row.promptId,
        promptType: row.promptType,
        error: (err as Error)?.message,
      })
      return
    }

    // Media is attached server-side via attachChainMedia (using the admin
    // client to bypass RLS). The mediaUrls are already in the request
    // body's responseData, so no client-side insert needed.

    const resultMemoryId = answerResult?.memoryId as string | undefined

    // ── Collect people mentioned for sharing options ──
    const mentionedPeople = savedCards
      .filter((c) => c.type === 'people-present' && c.data?.people)
      .flatMap((c) => (c.data.people as { id: string; name: string }[]) || [])

    // Success — close expanded view, remove row
    setExpandedRowId(null)
    setRows(prev => {
      const next = new Map(prev)
      next.delete(row.promptId)
      return next
    })
    setFinishingRowId(null)

    trackEngagement('card_finished', {
      promptId: row.promptId,
      promptType: row.promptType,
      cardsSaved: savedCards.length,
      xpEarned: totalEarned,
    })

    // ── Start generating the AI reflection NOW — don't wait for the
    // visibility popup to close. By the time the user picks private/
    // shared/circles, the reflection will be ready.
    const reflectionPromise = fetch('/api/engagement/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memoryText: responseText,
        promptText: row.promptText,
        promptType: row.promptType,
        contactName: row.contactName,
        memoryId: resultMemoryId,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (data?.reflection as string) || null)
      .catch(() => null)

    // ── Visibility popup → celebration modal ──
    setVisibility({
      open: true,
      memoryId: resultMemoryId || null,
      promptText: row.promptText,
      mentionedPeople,
      onComplete: () => {
        // Show celebration — reflection may already be resolved
        setCelebration({ open: true, xpEarned: totalEarned, reflection: null, loading: true, promptText: row.promptText, promptCategory: row.category })
        reflectionPromise.then((reflection) => {
          setCelebration((prev) => prev.open ? { ...prev, reflection, loading: false } : prev)
        })
      },
    })

    // Optimistic XP update so the counter animates immediately,
    // then refresh from server to reconcile with the truth.
    try { addXp(totalEarned, 'prompt_answered', row.promptId) } catch {}
    try { refreshDashboardStats?.() } catch {}
    // Delayed refresh to let the server finish awarding XP
    setTimeout(() => { try { refreshXp?.() } catch {} }, 2000)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('yt:challenges-refresh'))
    }
  }, [expandedRowId, finishingRowId, rows, answerPrompt, addXp, refreshDashboardStats, refreshXp, supabase, user])

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
    try {
      const row = rows.get(promptId)
      if (!row) return
      const card = row.cards.find(c => c.id === cardId)
      if (!card) return
      // Auto-save intermediate content. The server grants per-chain XP on the
      // first successful call and guards repeats via alreadyAnswered — so XP
      // lands at most once per prompt no matter which card triggers the save.
      if (card.type === 'text-voice-video' || card.type === 'quote' || card.type === 'comment') {
        await answerPrompt(promptId, { type: 'text', text: data.text || '' })
      } else if (card.type === 'when-where' && row.photoId) {
        await supabase.from('memory_media').update({ location_name: data.location || null, taken_at: data.date || null }).eq('id', row.photoId)
      } else if (card.type === 'field-input') {
        await answerPrompt(promptId, { type: 'text', text: Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n') })
      } else if (card.type === 'pill-select') {
        const selected = data.selected || []
        await answerPrompt(promptId, { type: 'selection', text: selected.join(', '), data: { value: selected.join(', ') } })
      }
    } catch (err) {
      console.error('Auto-save failed:', err)
      setErrorToast("Couldn't save that card — we'll keep it here so you can retry.")
      setTimeout(() => setErrorToast(null), 5000)
      // Roll back the "saved" flag so the card stays editable
      setRows(prev => {
        const next = new Map(prev)
        const r = next.get(promptId)
        if (!r) return prev
        next.set(promptId, {
          ...r,
          cards: r.cards.map(c => (c.id === cardId ? { ...c, saved: false } : c)),
        })
        return next
      })
      trackEngagement('card_save_failed', { promptId, error: (err as Error)?.message })
      return
    }

    // No per-card XP grant — chain XP is awarded once on Save & Finish.
    const rowForAnalytics = rows.get(promptId)
    const cardForAnalytics = rowForAnalytics?.cards.find(c => c.id === cardId)
    if (cardForAnalytics) {
      trackEngagement('card_saved', {
        cardType: cardForAnalytics.type,
        promptType: rowForAnalytics?.promptType,
      })
    }

    // When the user saves the main story card, extract mentioned people
    // and feed them into the "who was there" card on this row. Matched
    // contacts auto-select; unmatched names become pending custom entries
    // that need a relationship pick before the card can save.
    if (cardForAnalytics && cardForAnalytics.type === 'text-voice-video') {
      const storyText = (data.text as string | undefined)?.trim()
      if (storyText && storyText.length > 8) {
        ;(async () => {
          try {
            const res = await fetch('/api/voice/extract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transcript: storyText }),
            })
            if (!res.ok) return
            const extracted = await res.json()
            const resolved: Array<{
              name: string
              contactId: string | null
              contactName: string | null
              isNew: boolean
            }> = extracted?.resolvedPeople || []
            if (resolved.length === 0) return
            setRows(prev => {
              const next = new Map(prev)
              const r = next.get(promptId)
              if (!r) return prev
              const updatedCards = r.cards.map(c => {
                if (c.type !== 'people-present') return c
                const existing = (c.data?.detectedPeople as any[]) || []
                const byName = new Map<string, any>()
                for (const p of existing) byName.set((p.name || '').toLowerCase(), p)
                for (const p of resolved) byName.set((p.name || '').toLowerCase(), p)
                return {
                  ...c,
                  data: {
                    ...c.data,
                    detectedPeople: Array.from(byName.values()),
                  },
                }
              })
              next.set(promptId, { ...r, cards: updatedCards })
              return next
            })
          } catch (err) {
            console.warn('[voice/extract] failed', err)
          }
        })()
      }
    }

    // Auto-advance: scroll to next card in carousel
    setTimeout(() => {
      const scrollEl = scrollRowRefs.current.get(promptId)
      if (!scrollEl) return
      const savedCard = scrollEl.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement | null
      if (!savedCard) return
      const next = savedCard.nextElementSibling as HTMLElement | null
      if (!next) return
      // Use offsetLeft (relative to scroll container) — most reliable
      const target = next.offsetLeft - scrollEl.clientWidth / 2 + next.offsetWidth / 2
      console.log('[CardChain] Auto-advance', { from: scrollEl.scrollLeft, to: target, nextOffsetLeft: next.offsetLeft })
      scrollEl.scrollTo({ left: target, behavior: 'smooth' })
    }, 400)
  }, [rows, answerPrompt, supabase])


  const handleAddCard = useCallback((promptId: string, type: CardType) => {
    setRows(prev => {
      const next = new Map(prev)
      const row = next.get(promptId)
      if (!row) return prev
      const newCard: ChainCard = {
        id: uid(), type, data: {}, saved: false,
        addedBy: user ? { userId: user.id, name: profile?.full_name || 'You' } : undefined,
        createdAt: new Date().toISOString(),
      }
      const plusIdx = row.cards.findIndex(c => c.type === 'plus')
      const updatedCards = [...row.cards]
      if (plusIdx >= 0) updatedCards.splice(plusIdx, 0, newCard)
      else updatedCards.push(newCard)
      next.set(promptId, { ...row, cards: updatedCards })
      return next
    })
  }, [user, profile])

  const handleDeleteCard = useCallback((promptId: string, cardId: string) => {
    setRows(prev => {
      const next = new Map(prev)
      const row = next.get(promptId)
      if (!row) return prev
      const updatedCards = row.cards.filter(c => c.id !== cardId)
      next.set(promptId, { ...row, cards: updatedCards })
      return next
    })
  }, [])

  const handleMediaUploaded = useCallback((promptId: string, files: { url: string; name: string; type: string; path?: string; faces?: any[]; mediaId?: string }[]) => {
    setRows(prev => {
      const next = new Map(prev)
      const row = next.get(promptId)
      if (!row) return prev
      const newCards: ChainCard[] = files.map(file => ({
        id: uid(), type: 'media-item' as CardType,
        data: { url: file.url, name: file.name, type: file.type, path: file.path, faces: file.faces, mediaId: file.mediaId },
        saved: true,
        addedBy: user ? { userId: user.id, name: profile?.full_name || 'You' } : undefined,
        createdAt: new Date().toISOString(),
      }))
      const plusIdx = row.cards.findIndex(c => c.type === 'plus')
      const updatedCards = [...row.cards]
      if (plusIdx >= 0) updatedCards.splice(plusIdx, 0, ...newCards)
      else updatedCards.push(...newCards)
      next.set(promptId, { ...row, cards: updatedCards })
      return next
    })
  }, [user, profile])

  const allRows = Array.from(rows.values())
  // Per-category counts for the right panel.
  // Floor = every category known to the template library (so zero-count
  // tiles still show up with a shuffle hint). On top of that we layer
  // live counts from what's currently in the feed. When a chapter
  // filter is active the feed IS the chapter pool, so counts reflect
  // exactly what the user is looking at.
  const categoryCounts: Record<string, number> = { all: allRows.length }
  for (const key of availableCategories) {
    categoryCounts[key] = 0
  }
  for (const r of allRows) {
    const key = (r.dbCategory || r.category || 'general').toString()
    categoryCounts[key] = (categoryCounts[key] || 0) + 1
  }
  // Server-side filtering: when categoryFilter is set, the hook already
  // refetched with p_life_chapter = categoryFilter, so rawPrompts only
  // contains chapter hits. No client-side filter needed.
  const allPrompts = allRows
  const expandedRow = expandedRowId ? rows.get(expandedRowId) : null

  // Sidebar data
  const rawFirstName = profile?.full_name?.split(' ')[0] || 'there'
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)
  const currentStreakDays = Math.max(engagementStats?.currentStreakDays ?? 0, streakDays)
  const storageUsed = subscription?.storage?.total_bytes ? subscription.storage.total_bytes / (1024 * 1024 * 1024) : 0
  const storageLimit = subscription?.storage?.limit_bytes ? subscription.storage.limit_bytes / (1024 * 1024 * 1024) : 10
  const storagePercentage = subscription?.storage?.percentage || (storageUsed / storageLimit) * 100
  const lvl = getXpLevel(totalXp, gamificationConfig?.xpLevels)

  return (
    <div className="feed-page" data-theme="light" style={{ background: '#FAFAF7', color: '#1A1F1C' }}>
      {/* ── Mobile sidebar toggle ── */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="sidebar-toggle-btn"
        style={{
          display: 'none', /* shown via media query */
          position: 'fixed', top: '62px', left: '12px', zIndex: 20,
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(0,0,0,0.04)', border: '1px solid #DDE3DF',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: '#5A6660',
        }}
      >
        <Menu size={18} />
      </button>

      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              zIndex: 25, display: 'none', /* shown via media query */
            }}
            className="sidebar-overlay"
          />
        )}
      </AnimatePresence>

      {/* ── Left Sidebar ── */}
      <aside
        className={`dashboard-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        style={{
          position: 'fixed', top: '56px', left: 0, width: '280px',
          height: 'calc(100vh - 56px)', overflowY: 'auto', overflowX: 'hidden',
          padding: '12px 12px 12px 16px', display: 'flex', flexDirection: 'column',
          gap: '10px', zIndex: 30,
        }}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="sidebar-close-btn"
          style={{
            display: 'none', /* shown via media query */
            alignSelf: 'flex-end', padding: '4px',
            background: 'rgba(0,0,0,0.04)', borderRadius: '8px',
            border: 'none', color: '#5A6660', cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>
        <div className="profile-card-feed" style={{ borderRadius: '16px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 className="profile-card-name" style={{ fontSize: '18px', fontWeight: '600', margin: 0, fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}>Hey {firstName}</h2>
            {currentStreakDays > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '3px 8px', background: 'linear-gradient(90deg, rgba(217,198,26,0.15), rgba(195,95,51,0.15))', borderRadius: '12px' }}>
                <span style={{ fontSize: '13px' }}>🔥</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#B8562E' }}>{currentStreakDays}</span>
              </div>
            )}
          </div>
          <div className="profile-card-stats" style={{ display: 'flex', alignItems: 'center', textAlign: 'center', marginBottom: '12px' }}>
            <Link href="/dashboard/my-story" style={{ flex: 1, textDecoration: 'none' }}>
              <div className="profile-stat-value">{dashboardStats?.memories ?? 0}</div>
              <div className="profile-stat-label">Memories</div>
            </Link>
            <Link href="/dashboard/contacts" className="profile-stat-bordered" style={{ flex: 1, textDecoration: 'none' }}>
              <div className="profile-stat-value">{dashboardStats?.contacts ?? 0}</div>
              <div className="profile-stat-label">People</div>
            </Link>
            <Link href="/dashboard/my-story?tab=photos" className="profile-stat-bordered-r" style={{ flex: 1, textDecoration: 'none' }}>
              <div className="profile-stat-value">{dashboardStats?.photos ?? 0}</div>
              <div className="profile-stat-label">Photos</div>
            </Link>
            <div style={{ flex: 1 }}>
              <div className={`profile-stat-xp ${xpAnimating ? 'animate-pulse' : ''}`}>{totalXp.toLocaleString()}</div>
              <div className="profile-stat-label-xp"><span>⚡</span> XP</div>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="profile-card-name" style={{ fontSize: '12px', fontWeight: '700' }}>{lvl.emoji} {lvl.title}</span>
              {lvl.nextLevel && <span style={{ fontSize: '10px', color: '#94A09A' }}>{lvl.xpToNext} XP to {lvl.nextLevel.title}</span>}
            </div>
            <div style={{ height: '4px', background: 'rgba(217,198,26,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '2px', width: `${lvl.progress}%`, background: 'linear-gradient(90deg, #C4A235, #E8D84A)', transition: 'width 0.8s ease-out' }} />
            </div>
          </div>
          <BadgeDisplay />
          <div className="profile-storage">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="profile-storage-label">Storage</span>
              <span className="profile-storage-value">{storageUsed < 0.1 ? `${(storageUsed * 1024).toFixed(0)} MB` : `${storageUsed.toFixed(1)} GB`} / {storageLimit.toFixed(0)} GB</span>
            </div>
            <div className="profile-storage-track">
              <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min(storagePercentage, 100)}%`, background: storagePercentage >= 90 ? 'linear-gradient(90deg, #B8562E, #dc2626)' : 'linear-gradient(90deg, #2D5A3D, #8DACAB)', transition: 'width 0.8s ease-out' }} />
            </div>
          </div>
        </div>
        <WeeklyChallenges />
      </aside>

      {/* ── Edge toggles for slide-out panels ── */}
      <button
        onClick={() => setHistoryOpen(true)}
        className="edge-toggle edge-toggle-left"
        aria-label="Open history"
        title="Your history"
      >
        <Clock size={14} />
        <span className="edge-toggle-label">History</span>
      </button>
      <button
        onClick={() => setCategoriesOpen(true)}
        className="edge-toggle edge-toggle-right"
        aria-label="Browse chapters"
        title="Browse chapters"
      >
        <LayoutGrid size={14} />
        <span className="edge-toggle-label">Chapters</span>
        {categoryFilter && <span className="edge-toggle-dot" aria-hidden="true" />}
      </button>

      {/* ── Main Content — snap-scroll viewport ── */}
      <main className="dashboard-main home-v2-main" style={{ minHeight: '100vh' }}>
        <MemoryOfTheDayBanner />
        {/* Top action row: filter pill (when active) + shuffle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 24px 0',
          }}
        >
          {/* Filter pill — inline, only shown when a chapter filter is active */}
          <div style={{ flex: '0 1 auto', minWidth: 0 }}>
            <AnimatePresence>
              {categoryFilter && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 6px 7px 14px',
                    borderRadius: '999px',
                    background: '#2D5A3D',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(45,90,61,0.22)',
                    fontSize: '13px',
                    fontWeight: 600,
                    maxWidth: '100%',
                  }}
                >
                  <LayoutGrid size={13} />
                  <span
                    style={{
                      textTransform: 'capitalize',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {categoryFilter.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => setCategoryFilter(null)}
                    aria-label="Clear filter"
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              trackEngagement('shuffle_clicked', { count: allPrompts.length })
              shuffle()
              setShuffleKey((k) => k + 1)
            }}
            title="Shuffle to see more cards"
            aria-label="Shuffle to see more cards"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '12px',
              background: 'white',
              border: '1px solid #DDE3DF',
              color: '#5A6660',
              fontSize: '13px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <RefreshCw size={14} /> Shuffle
          </motion.button>
        </div>

        {/* On This Day — memory resurfacing */}
        <OnThisDayRow />

        {/* Loading — only show skeletons when there's no expanded chain
            (background refetches shouldn't yank the card chain away) */}
        {promptsLoading && !expandedRowId && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', paddingTop: '40px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="card-skeleton" style={{ height: `${CARD_H}px`, borderRadius: '24px', background: 'linear-gradient(90deg, #FAFAF7 25%, #EDE8DB 50%, #FAFAF7 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
            ))}
          </div>
        )}

        {/* Empty state — no prompts available (not while chain is open) */}
        {!promptsLoading && allPrompts.length === 0 && !expandedRowId && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              padding: '80px 24px',
              textAlign: 'center',
              color: '#5A6660',
            }}
          >
            <div style={{ fontSize: '56px' }}>🌿</div>
            <h2
              style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: 700,
                color: '#1A1F1C',
                fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)',
              }}
            >
              You're all caught up
            </h2>
            <p style={{ margin: 0, fontSize: '14px', maxWidth: '340px', lineHeight: 1.55 }}>
              No memory prompts waiting right now. New ones surface as you add
              photos, tag people, and capture stories — come back later or
              shuffle to see if anything fresh is ready.
            </p>
            <button
              onClick={() => { trackEngagement('shuffle_clicked', { from: 'empty_state' }); shuffle(); setShuffleKey(k => k + 1) }}
              style={{
                marginTop: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '12px',
                background: '#2D5A3D',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} /> Shuffle prompts
            </button>
          </div>
        )}

        {/* Vertical feed — always render when a chain is expanded, even
            during background refetches that might temporarily empty the list */}
        {(!promptsLoading || expandedRowId) && (allPrompts.length > 0 || expandedRowId) && (
          <EngagementErrorBoundary onReset={() => setExpandedRowId(null)}>
          <div
            ref={mainRef}
            className="snap-container"
            style={{
              height: `calc(100vh - 100px)`,
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollSnapType: expandedRowId ? 'none' : 'y mandatory',
            }}
          >
            {allPrompts.map((row, index) => {
              const isExpanded = row.promptId === expandedRowId
              const hasExpandedRow = !!expandedRowId
              const isBehind = hasExpandedRow && !isExpanded

              return (
                <React.Fragment key={row.promptId}>
                <motion.div
                  data-tour={index === 0 ? 'engagement-card' : undefined}
                  animate={{
                    opacity: isBehind ? 0.3 : 1,
                    filter: isBehind ? 'blur(4px)' : 'blur(0px)',
                    scale: isBehind ? 0.97 : 1,
                  }}
                  transition={{ duration: 0.35 }}
                  style={{
                    scrollSnapAlign: 'start',
                    minHeight: `${CARD_H + 80}px`,
                    paddingTop: index === 0 ? '24px' : '8px',
                    paddingBottom: '8px',
                    pointerEvents: isBehind ? 'none' : 'auto',
                    position: 'relative',
                  }}
                >
                  {/* Close button — top right, visible when expanded */}
                  {isExpanded && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={(e) => { e.stopPropagation(); handleBack() }}
                      style={{
                        position: 'absolute', top: `${index === 0 ? 32 : 24}px`, right: '16px',
                        zIndex: 10, width: '40px', height: '40px', borderRadius: '50%',
                        background: '#FFFFFF', border: '1px solid #DDE3DF',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#5A6660',
                      }}
                    >
                      <X size={18} />
                    </motion.button>
                  )}

                  {/* Prev/Next navigation arrows — only when expanded */}
                  {isExpanded && (
                    <>
                      <motion.button
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          const el = scrollRowRefs.current.get(row.promptId)
                          if (!el) return
                          const cards = Array.from(el.querySelectorAll('[data-card-id], [data-chain-card="-1"]')) as HTMLElement[]
                          const containerCenter = el.scrollLeft + el.clientWidth / 2
                          let currentIdx = 0
                          for (let i = 0; i < cards.length; i++) {
                            const center = cards[i].offsetLeft + cards[i].offsetWidth / 2
                            if (Math.abs(center - containerCenter) < cards[i].offsetWidth / 2) {
                              currentIdx = i
                              break
                            }
                          }
                          const prev = cards[Math.max(0, currentIdx - 1)]
                          if (prev) {
                            const target = prev.offsetLeft - el.clientWidth / 2 + prev.offsetWidth / 2
                            el.scrollTo({ left: target, behavior: 'smooth' })
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: '20px',
                          top: '50%',
                          marginTop: '-28px',
                          zIndex: 30,
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: '#2D5A3D',
                          border: '3px solid #FFFFFF',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#FFFFFF',
                          fontSize: '32px',
                          fontWeight: 700,
                          lineHeight: 1,
                          padding: 0,
                        }}
                        aria-label="Previous card"
                      >
                        <ChevronLeft size={28} strokeWidth={3} />
                      </motion.button>
                      <motion.button
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          const el = scrollRowRefs.current.get(row.promptId)
                          if (!el) return
                          const cards = Array.from(el.querySelectorAll('[data-card-id], [data-chain-card="-1"]')) as HTMLElement[]
                          const containerCenter = el.scrollLeft + el.clientWidth / 2
                          let currentIdx = 0
                          for (let i = 0; i < cards.length; i++) {
                            const center = cards[i].offsetLeft + cards[i].offsetWidth / 2
                            if (Math.abs(center - containerCenter) < cards[i].offsetWidth / 2) {
                              currentIdx = i
                              break
                            }
                          }
                          const next = cards[Math.min(cards.length - 1, currentIdx + 1)]
                          if (next) {
                            const target = next.offsetLeft - el.clientWidth / 2 + next.offsetWidth / 2
                            el.scrollTo({ left: target, behavior: 'smooth' })
                          }
                        }}
                        style={{
                          position: 'absolute',
                          right: '20px',
                          top: '50%',
                          marginTop: '-28px',
                          zIndex: 30,
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: '#2D5A3D',
                          border: '3px solid #FFFFFF',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#FFFFFF',
                          fontSize: '32px',
                          fontWeight: 700,
                          lineHeight: 1,
                          padding: 0,
                        }}
                        aria-label="Next card"
                      >
                        <ChevronRight size={28} strokeWidth={3} />
                      </motion.button>
                    </>
                  )}

                  {/* Horizontal scroll carousel */}
                  <div
                    ref={(el) => { if (el) scrollRowRefs.current.set(row.promptId, el); }}
                    className="card-carousel"
                    style={{
                      display: 'flex',
                      gap: '16px',
                      overflowX: isExpanded ? 'auto' : 'hidden',
                      overflowY: 'visible',
                      scrollSnapType: isExpanded ? 'x mandatory' : 'none',
                      scrollBehavior: 'smooth',
                      WebkitOverflowScrolling: 'touch',
                      paddingLeft: 'var(--card-inset)',
                      paddingRight: 'var(--card-inset)',
                      paddingTop: '8px',
                      paddingBottom: '40px',
                    }}
                  >
                    {/* Prompt card */}
                    <div style={{ flexShrink: 0, scrollSnapAlign: 'center' }} data-chain-card="-1">
                      <PromptCard
                        row={row}
                        onClick={isExpanded ? undefined : () => handleSelect(row.promptId)}
                        onClose={isExpanded ? handleBack : undefined}
                        isExpanded={isExpanded}
                        index={index}
                      />
                    </div>

                    {/* Chain cards — visible when expanded */}
                    {isExpanded && row.cards.map((card, ci) => (
                      <div
                        key={card.id}
                        style={{ flexShrink: 0, scrollSnapAlign: 'center' }}
                        data-chain-card={ci}
                        data-card-id={card.id}
                      >
                        <CardChainCard
                          card={card}
                          row={row}
                          index={ci}
                          onCardSave={(cardId, data) => handleCardSave(row.promptId, cardId, data)}
                          onAddCard={(type) => handleAddCard(row.promptId, type)}
                          onMediaUploaded={(files) => handleMediaUploaded(row.promptId, files)}
                          onDelete={card.addedBy ? () => handleDeleteCard(row.promptId, card.id) : undefined}
                          onFinish={card.type === 'plus' ? handleFinish : undefined}
                          isFinishing={finishingRowId === row.promptId}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
                {index < allPrompts.length - 1 && !hasExpandedRow && (
                  <div style={{ height: '1px', background: 'rgba(45,90,61,0.08)', margin: '32px 64px' }} />
                )}
                </React.Fragment>
              )
            })}
            {/* Infinite scroll sentinel — loads more prompts when visible */}
            <LoadMoreSentinel onVisible={shuffle} isLoading={promptsLoading} />
            {/* Bottom spacer so last card can snap to top */}
            <div style={{ height: `calc(100vh - ${CARD_H + 140}px)`, flexShrink: 0 }} />
          </div>
          </EngagementErrorBoundary>
        )}

        <style jsx global>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }

          @keyframes gradientFloat {
            0%   { background-position: 0% 50%; }
            33%  { background-position: 100% 0%; }
            66%  { background-position: 50% 100%; }
            100% { background-position: 0% 50%; }
          }

          /* ── Edge toggle buttons for slide-out panels ── */
          .edge-toggle {
            position: fixed;
            top: 50%;
            transform: translateY(-50%);
            padding: 10px 10px;
            background: #FFFFFF;
            border: 1px solid #DDE3DF;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
            color: #2D5A3D;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            cursor: pointer;
            z-index: 22;
            transition: background 0.15s ease, transform 0.15s ease;
          }
          .edge-toggle:hover {
            background: #F7FAF8;
          }
          .edge-toggle-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            line-height: 1;
            color: #5A6660;
          }
          .edge-toggle-left {
            left: 0;
            border-left: none;
            border-radius: 0 14px 14px 0;
          }
          .edge-toggle-right {
            right: 0;
            border-right: none;
            border-radius: 14px 0 0 14px;
          }
          .edge-toggle-dot {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #C4A235;
            box-shadow: 0 0 0 2px #FFFFFF;
          }
          /* On desktop, shift the left toggle past the sidebar so it sits
             on the edge of the main content area */
          @media (min-width: 1025px) {
            .edge-toggle-left { left: 280px; }
          }

          /* ── Profile card light theme ── */
          .feed-page[data-theme="light"] .profile-card-feed {
            background: rgba(255,255,255,0.92);
            backdrop-filter: blur(12px);
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            border: 1px solid #DDE3DF;
          }
          .feed-page[data-theme="light"] .profile-card-name { color: #3D6B52; }
          .feed-page[data-theme="light"] .profile-stat-value { font-size: 22px; font-weight: 700; color: #3D6B52; }
          .feed-page[data-theme="light"] .profile-stat-label { font-size: 9px; color: #94A09A; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
          .feed-page[data-theme="light"] .profile-stat-bordered { border-left: 1px solid #DDE3DF; border-right: 1px solid #DDE3DF; }
          .feed-page[data-theme="light"] .profile-stat-bordered-r { border-right: 1px solid #DDE3DF; }
          .feed-page[data-theme="light"] .profile-stat-xp { font-size: 22px; font-weight: 700; color: #C4A235; }
          .feed-page[data-theme="light"] .profile-stat-label-xp { font-size: 9px; color: rgba(217,198,26,0.6); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 2px; }
          .feed-page[data-theme="light"] .profile-storage { border-top: 1px solid #DDE3DF; padding-top: 10px; }
          .feed-page[data-theme="light"] .profile-storage-label { font-size: 10px; font-weight: 600; color: #94A09A; text-transform: uppercase; letter-spacing: 0.5px; }
          .feed-page[data-theme="light"] .profile-storage-value { font-size: 10px; color: #5A6660; }
          .feed-page[data-theme="light"] .profile-storage-track { height: 6px; background: #F5F1EA; border-radius: 3px; overflow: hidden; }

          /* ── Desktop layout ── */
          .home-v2-main { margin-left: 280px; }
          .dashboard-sidebar { background: #FAFAF7; border-right: 1px solid #DDE3DF; }
          aside::-webkit-scrollbar { width: 4px; }
          aside::-webkit-scrollbar-track { background: transparent; }
          aside::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }

          /* ── Card sizing via CSS custom properties ── */
          .home-v2-main {
            --card-w: min(530px, calc(100vw - 280px - 64px));
            --card-inset: calc((100% - min(530px, calc(100vw - 280px - 64px))) / 2);
          }

          /* ── Snap scroll — 1 card per swipe ── */
          .snap-container {
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: contain;
            /* Paper texture — subtle noise grain */
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          }
          .snap-container::-webkit-scrollbar { width: 6px; }
          .snap-container::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }

          /* ── Horizontal card carousel — hide scrollbar ── */
          .card-carousel::-webkit-scrollbar { display: none; }
          .card-carousel { -ms-overflow-style: none; scrollbar-width: none; }

          /* ── Loading skeleton ── */
          .card-skeleton { width: var(--card-w); margin: 0 auto; }

          /* ── Mobile (< 768px) ── */
          @media (max-width: 767px) {
            .home-v2-main {
              margin-left: 0 !important;
              --card-w: calc(100vw - 48px);
              --card-inset: 16px;
            }

            .dashboard-sidebar {
              transform: translateX(-100%);
              transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              background: #FAFAF7;
              box-shadow: none;
            }
            .dashboard-sidebar.sidebar-open {
              transform: translateX(0);
              box-shadow: 8px 0 32px rgba(0,0,0,0.12);
            }

            .sidebar-toggle-btn { display: flex !important; }
            .sidebar-overlay { display: block !important; }
            .sidebar-close-btn { display: flex !important; }
          }

          /* ── Tablet (768-1024) ── */
          @media (min-width: 768px) and (max-width: 1024px) {
            .home-v2-main {
              margin-left: 0 !important;
              --card-w: min(530px, calc(100vw - 64px));
              --card-inset: calc((100% - min(530px, calc(100vw - 64px))) / 2);
            }
            .dashboard-sidebar {
              transform: translateX(-100%);
              transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              background: #FAFAF7;
            }
            .dashboard-sidebar.sidebar-open {
              transform: translateX(0);
              box-shadow: 8px 0 32px rgba(0,0,0,0.12);
            }
            .sidebar-toggle-btn { display: flex !important; }
            .sidebar-overlay { display: block !important; }
            .sidebar-close-btn { display: flex !important; }
          }
        `}</style>
      </main>

      {/* Visibility / sharing popup — shown before celebration */}
      <VisibilityModal
        open={visibility.open}
        memoryId={visibility.memoryId}
        promptText={visibility.promptText}
        mentionedPeople={visibility.mentionedPeople}
        onComplete={() => {
          setVisibility((prev) => ({ ...prev, open: false }))
          visibility.onComplete()
        }}
        onSkip={() => {
          setVisibility((prev) => ({ ...prev, open: false }))
          visibility.onComplete()
        }}
      />

      {/* Celebration modal — centered, AI reflection, replaces old XP toast */}
      <CelebrationModal
        open={celebration.open}
        xpEarned={celebration.xpEarned}
        reflection={celebration.reflection}
        loading={celebration.loading}
        promptText={celebration.promptText}
        promptCategory={celebration.promptCategory}
        onClose={() => setCelebration({ open: false, xpEarned: 0, reflection: null, loading: false, promptText: '', promptCategory: '' })}
      />

      {/* Slide-out panels */}
      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <CategoriesPanel
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        activeCategory={categoryFilter}
        counts={categoryCounts}
        onSelect={(cat) => setCategoryFilter(cat)}
        onShufflePull={async () => {
          // Clicking a chapter with 0 loaded prompts should try to pull
          // fresh ones from the library before the filter shows an
          // empty state.
          trackEngagement('shuffle_clicked', { from: 'category_panel' })
          await shuffle()
          setShuffleKey((k) => k + 1)
        }}
      />

      {/* Error toast — save failures, keep row in feed so user can retry */}
      <AnimatePresence>
        {errorToast && (
          <motion.div
            role="alert"
            aria-live="assertive"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            style={{
              position: 'fixed',
              bottom: '96px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 101,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              borderRadius: '14px',
              maxWidth: 'calc(100vw - 32px)',
              background: '#B8562E',
              boxShadow: '0 12px 40px rgba(184, 86, 46, 0.35), 0 2px 8px rgba(0,0,0,0.15)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-inter-tight, Inter, sans-serif)',
              fontSize: '13px',
              fontWeight: 500,
              lineHeight: 1.35,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '16px' }}>⚠️</span>
            <span>{errorToast}</span>
            <button
              onClick={() => setErrorToast(null)}
              aria-label="Dismiss error"
              style={{
                marginLeft: '8px',
                padding: 0,
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}


/* ─── Prompt Card — light theme, portrait, used in both states ─── */
/** Sentinel that triggers loading more prompts when scrolled into view */
function LoadMoreSentinel({ onVisible, isLoading }: { onVisible: () => void; isLoading: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const hasTriggered = React.useRef(false)

  React.useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading && !hasTriggered.current) {
          hasTriggered.current = true
          onVisible()
          // Reset after a delay so it can trigger again
          setTimeout(() => { hasTriggered.current = false }, 5000)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [onVisible, isLoading])

  return (
    <div ref={ref} className="flex items-center justify-center py-8" style={{ flexShrink: 0 }}>
      {isLoading && (
        <div className="w-6 h-6 border-2 border-[#2D5A3D] border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )
}

function PromptCard({ row, onClick, onClose, isExpanded, index }: {
  row: PromptRow
  onClick?: () => void
  onClose?: () => void
  isExpanded: boolean
  index: number
}) {
  const meta = CATEGORY_META[row.category] || CATEGORY_META.memory
  const colors = CATEGORY_COLORS[row.category] || CATEGORY_COLORS.memory
  const chapterStyle = getChapterStyle(row.dbCategory || row.lifeChapter)
  const hasPhoto = !!row.photoUrl
  const Icon = meta.icon

  return (
    <motion.div
      onClick={onClick || undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      style={{
        width: 'var(--card-w)',
        height: `${CARD_H}px`,
        borderRadius: '20px',
        overflow: 'hidden',
        background: '#FAFAF7',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        cursor: 'pointer',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
      whileHover={!isExpanded ? { boxShadow: '0 2px 4px rgba(45,90,61,0.06), 0 8px 24px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.04)' } : {}}
      whileTap={!isExpanded ? { scale: 0.96 } : {}}
    >
      {/* Amorphous gradient blob — confined to bottom of card */}
      <div className="chapter-gradient-blob" style={{
        position: 'absolute', bottom: '-10%', left: '-30%', right: '-30%', height: '65%',
        background: `radial-gradient(ellipse 90% 80% at 50% 85%, ${chapterStyle.accentColor}55 0%, ${chapterStyle.accentColor}30 35%, transparent 65%)`,
        pointerEvents: 'none', zIndex: 0,
      }}>
        <div className="chapter-blob-inner" style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 70% 60% at 25% 90%, ${chapterStyle.accentColor}45 0%, transparent 55%)`,
        }} />
        <div className="chapter-blob-inner-2" style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 65% 55% at 75% 80%, ${chapterStyle.accentColor}40 0%, transparent 50%)`,
        }} />
      </div>
      {/* Photo hero — fills ~60% of card */}
      {hasPhoto && (
        <div style={{ position: 'relative', flex: '0 0 60%', overflow: 'hidden' }}>
          <img
            src={row.photoUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent 60%)',
          }} />
          {/* Close button when expanded */}
          {isExpanded && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
              }}
              onClick={(e) => { e.stopPropagation(); onClose ? onClose() : onClick?.() }}
            >
              <X size={16} />
            </motion.button>
          )}
          {/* Category badge */}
          <div style={{ position: 'absolute', bottom: '14px', left: '18px' }}>
            <span style={{
              padding: '5px 14px', borderRadius: '20px',
              fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
              color: '#fff',
            }}>
              {chapterStyle.label}
            </span>
          </div>
        </div>
      )}

      {/* Content — thicker bottom padding for Polaroid-style caption area */}
      <div style={{
        padding: hasPhoto ? '20px 24px 40px' : '32px 24px 40px',
        flex: 1, display: 'flex', flexDirection: 'column',
      }}>
        {!hasPhoto && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color={chapterStyle.accentColor} />
            </div>
            <span style={{
              fontSize: '10px', fontWeight: 700,
              color: chapterStyle.accentColor,
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              {chapterStyle.label}
            </span>
            {isExpanded && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  marginLeft: 'auto', width: '34px', height: '34px', borderRadius: '50%',
                  background: '#F5F1EA', border: '1px solid #DDE3DF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#5A6660',
                }}
                onClick={(e) => { e.stopPropagation(); onClose ? onClose() : onClick?.() }}
              >
                <X size={16} />
              </motion.button>
            )}
          </div>
        )}

        {(() => {
          const parts = (row.promptText || '').split('\n---\n');
          const question = parts[0];
          const hints = parts.length > 1 ? parts[1] : null;
          return (
            <>
              <p style={{
                fontSize: hasPhoto ? '22px' : '24px',
                fontWeight: 700, color: '#1A1F1C',
                lineHeight: 1.5, letterSpacing: '0.01em', margin: 0,
                fontFamily: 'var(--font-playfair, Playfair Display, serif)',
              }}>
                {question}
              </p>
              {hints && (
                <div style={{
                  fontSize: '14px', color: '#5A6660',
                  lineHeight: 1.6, marginTop: '10px',
                  fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)',
                }}>
                  {hints.split('\n').map((line, i) => (
                    <p key={i} style={{ margin: line.startsWith('\u2022') ? '4px 0 4px 8px' : '0 0 4px' }}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </>
          );
        })()}

        {(() => {
          // Only surface the "About NAME" subtitle when it actually adds
          // information. If the prompt text already mentions the contact
          // (by full name OR first name), showing "About NAME" is
          // redundant. If the prompt text mentions a DIFFERENT name than
          // row.contactName (happens when the prompt template was
          // substituted with one contact but contact_id resolves to
          // another), the subtitle would be a mismatch — so suppress it.
          if (!row.contactName) return null
          const fullName = row.contactName.trim()
          const firstName = fullName.split(/\s+/)[0]
          const promptLower = (row.promptText || '').toLowerCase()
          if (!firstName) return null
          if (promptLower.includes(fullName.toLowerCase())) return null
          if (promptLower.includes(firstName.toLowerCase())) return null
          // Heuristic: if the prompt text contains any capitalized word
          // that looks like a person name (not the first word), the
          // template already has a name baked in — don't add a
          // conflicting subtitle.
          const inlineName = (row.promptText || '').match(/(?:^|\s)([A-Z][a-z]{2,})(?=['’]s|\s|$)/g)
          if (inlineName && inlineName.length > 0) return null
          return (
            <p style={{ fontSize: '13px', color: '#94A09A', margin: '8px 0 0' }}>
              About {fullName}
            </p>
          )
        })()}

        {/* Bottom caption area */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '12px', marginTop: 'auto', paddingTop: '16px',
          borderTop: `1px solid ${colors.border}15`,
          fontSize: '14px', fontWeight: 500, color: '#6B7A73',
          position: 'relative', zIndex: 1,
        }}>
          <span>{meta.hint}</span>
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#DDE3DF' }} />
          <span>{meta.time}</span>
          {!isExpanded && (
            <>
              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#DDE3DF' }} />
              <span>Tap to start</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}


/* ─── Chain Card — renders a single card from the chain ─── */
const PROFILE_OPTIONS: Record<string, string[]> = {
  personality: ['Adventurous', 'Analytical', 'Creative', 'Empathetic', 'Funny', 'Introverted', 'Leader', 'Optimistic', 'Patient', 'Thoughtful'],
  religion: ['Christianity', 'Islam', 'Judaism', 'Buddhism', 'Hinduism', 'Spiritual', 'Agnostic', 'Atheist', 'Other'],
  skills: ['Cooking', 'Writing', 'Music', 'Sports', 'Gardening', 'Photography', 'Teaching', 'Programming', 'Art', 'Public Speaking'],
  languages: ['English', 'Spanish', 'French', 'Mandarin', 'Arabic', 'Hindi', 'Portuguese', 'German', 'Japanese', 'Korean'],
}

function CardChainCard({ card, row, index, onCardSave, onAddCard, onMediaUploaded, onDelete, onFinish, isFinishing }: {
  card: ChainCard
  row: PromptRow
  index: number
  onCardSave: (cardId: string, data: Record<string, any>) => void
  onAddCard: (type: CardType) => void
  onMediaUploaded: (files: { url: string; name: string; type: string }[]) => void
  onDelete?: () => void
  onFinish?: () => void
  isFinishing?: boolean
}) {
  const handleSave = useCallback((data: Record<string, any>) => {
    onCardSave(card.id, data)
  }, [card.id, onCardSave])

  const isPlus = card.type === 'plus'
  const colors = CATEGORY_COLORS[row.category] || CATEGORY_COLORS.memory

  const cardStyle: React.CSSProperties = isPlus
    ? {
        width: '280px', height: `${CARD_H}px`,
        borderRadius: '24px', overflow: 'hidden',
        background: `${colors.cardBg}80`,
        border: `2px dashed ${colors.border}40`,
        display: 'flex', flexDirection: 'column',
      }
    : {
        width: 'var(--card-w)', height: `${CARD_H}px`,
        borderRadius: '24px', overflow: 'hidden',
        background: `linear-gradient(180deg, ${colors.cardBg} 0%, ${colors.cardBg}F0 100%)`,
        border: `1px solid ${colors.border}25`,
        boxShadow: '0 1px 2px rgba(45,90,61,0.04), 0 4px 16px rgba(0,0,0,0.05), 0 12px 40px rgba(0,0,0,0.03)',
        display: 'flex', flexDirection: 'column',
      }

  const renderContent = () => {
    switch (card.type) {
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
