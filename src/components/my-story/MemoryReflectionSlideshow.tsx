'use client'

/**
 * MemoryReflectionSlideshow
 * --------------------------
 * An at-your-own-pace, fullscreen slideshow for sitting back and reminiscing
 * over saved memories. Shows one memory per slide with all of the data
 * collected in the cardchain (title, date, location, media, story, AI summary
 * "quote", and comments from shared contacts).
 *
 * Manual navigation only — left/right arrows on screen, ← → on keyboard, Esc
 * to close. Like flipping through an old photo album.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronLeft, ChevronRight, Calendar, MapPin, Quote, MessageCircle, Sparkles, Loader2,
  Users, Smile, BookOpen, Play, ChevronDown, ImageIcon, Share2, Music, Headphones,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SlideMemoryRef {
  id: string
  title?: string
  date?: string
}

interface FullMemory {
  id: string
  title: string
  description: string | null
  memory_date: string | null
  location_name: string | null
  location_lat: number | null
  location_lng: number | null
  ai_summary: string | null
  ai_mood: string | null
  ai_category: string | null
  ai_labels: string[] | null
  mood: string | null
  is_favorite: boolean | null
  created_at: string
}

interface FullMedia {
  id: string
  file_url: string
  file_type: string | null
  is_cover: boolean | null
}

interface Collaborator {
  id: string
  contact_name: string
  contributor_name: string | null
  response_text: string | null
  status: string
  completed_at: string | null
}

interface TaggedPerson {
  contact_id: string
  full_name: string
  avatar_url: string | null
}

interface SlideData {
  memory: FullMemory
  media: FullMedia[]
  collaborators: Collaborator[]
  people: TaggedPerson[]
}

interface MemoryReflectionSlideshowProps {
  memories: SlideMemoryRef[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

const SERIF = 'var(--font-dm-serif, "DM Serif Display", serif)'

function formatDateLong(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function staticMapUrl(lat: number, lng: number, zoom = 10, w = 800, h = 240): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
  if (!token) return ''
  const pin = `pin-l+2D5A3D(${lng},${lat})`
  return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${pin}/${lng},${lat},${zoom},0/${w}x${h}@2x?access_token=${token}`
}

interface Exchange {
  question: string
  answer: string
}

/**
 * Parse the memory description for Q&A exchanges + any leading summary.
 * Supports two formats:
 *   1) Markdown "## Conversation" with **Q1:** / **A1:** blocks
 *   2) Plain text with duplicated consecutive lines (voice-pipeline artifact)
 */
function parseStory(text: string | null): { summary: string; exchanges: Exchange[]; paragraphs: string[] } {
  if (!text) return { summary: '', exchanges: [], paragraphs: [] }

  // Format 1: markdown Q/A
  if (text.includes('## Conversation') && text.includes('**Q')) {
    const parts = text.split('## Conversation')
    const summary = (parts[0] || '').replace('## Summary', '').trim()
    const qa = parts[1] || ''
    const exchanges: Exchange[] = []
    const pairs = qa.split(/\n\n---\n\n/).filter(Boolean)
    for (const pair of pairs) {
      const qm = pair.match(/\*\*Q\d+:\*\*\s*(.+?)(?=\n\n\*\*A)/s)
      const am = pair.match(/\*\*A\d+:\*\*\s*(.+?)(?=\n\n🔊|\n\n🎙️|$)/s)
      if (qm && am) {
        exchanges.push({ question: qm[1]?.trim() || '', answer: am[1]?.trim() || '' })
      }
    }
    return { summary, exchanges, paragraphs: [] }
  }

  // Format 2: plain prose — strip artifacts, metadata lines, dedupe
  const cleaned = text
    .replace(/🎙️ \[Audio\]\([^)]+\)/g, '')
    .replace(/🔊 \[Question Audio\]\([^)]+\)/g, '')
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean)
  const deduped: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Skip metadata lines that are already shown in Location/Date sections
    if (/^Location:\s/i.test(line)) continue
    if (/^Date:\s/i.test(line)) continue
    if (/^Song:\s/i.test(line)) continue
    if (i === 0 || line !== lines[i - 1]) deduped.push(line)
  }
  return { summary: '', exchanges: [], paragraphs: deduped }
}

/**
 * Build a short, neutral-tone synopsis written from the user's point of view.
 * Prefers ai_summary (already authored that way); otherwise rewrites the first
 * few sentences of the story into second-person neutral ("You ...") so the
 * reader feels gently guided through their own memory.
 */
function buildSynopsis(
  aiSummary: string | null,
  description: string | null,
  exchanges: Exchange[],
  title: string,
): string {
  // 1) AI summary wins if present
  if (aiSummary && aiSummary.trim().length > 0) {
    return aiSummary.trim()
  }

  // 2) When we have Q&A exchanges, weave the first 2-3 answers into a
  //    flowing narrative that reads like a warm recollection.
  if (exchanges.length > 0) {
    const answers = exchanges.slice(0, 3).map(e => e.answer.trim()).filter(Boolean)
    if (answers.length === 0) return ''
    // Join answers into a flowing paragraph, connected with em-dashes or periods
    let narrative = answers.join('. ').replace(/\.\./g, '.')
    // Trim to ~3 sentences max
    const sentences = narrative.match(/[^.!?]+[.!?]+/g) || [narrative]
    narrative = sentences.slice(0, 3).join(' ').trim()
    // Keep first-person — it reads more authentically as the user's own words
    return narrative
  }

  // 3) Plain text description — extract meaningful content
  if (!description) return ''
  let source = description
    .replace(/##\s*\w+/g, '')
    .replace(/\*\*Q\d+:\*\*/g, '')
    .replace(/\*\*A\d+:\*\*/g, '')
    .replace(/🎙️ \[Audio\]\([^)]+\)/g, '')
    .replace(/🔊 \[Question Audio\]\([^)]+\)/g, '')
    .replace(/^Location:\s.+$/gm, '')
    .replace(/^Date:\s.+$/gm, '')
    .replace(/^Song:\s.+$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!source) return ''

  const sentences = source.match(/[^.!?]+[.!?]+/g) || [source]
  return sentences.slice(0, 3).join(' ').trim()
}

export default function MemoryReflectionSlideshow({
  memories,
  initialIndex = 0,
  isOpen,
  onClose,
}: MemoryReflectionSlideshowProps) {
  const [index, setIndex] = useState(initialIndex)
  const [cache, setCache] = useState<Map<string, SlideData>>(new Map())
  const [loading, setLoading] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  // Reset index when slideshow opens
  useEffect(() => {
    if (isOpen) setIndex(initialIndex)
  }, [isOpen, initialIndex])

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  const currentRef = memories[index]
  const currentData = currentRef ? cache.get(currentRef.id) : undefined

  // Fetch the current memory's full data (and prefetch neighbors)
  const fetchMemory = useCallback(async (memoryId: string): Promise<SlideData | null> => {
    const [memRes, mediaRes, collabRes] = await Promise.all([
      supabase
        .from('memories')
        .select('id, title, description, memory_date, location_name, location_lat, location_lng, ai_summary, ai_mood, ai_category, ai_labels, mood, is_favorite, created_at')
        .eq('id', memoryId)
        .single(),
      supabase
        .from('memory_media')
        .select('id, file_url, file_type, is_cover')
        .eq('memory_id', memoryId)
        .order('created_at'),
      supabase
        .from('memory_collaborators')
        .select('id, contact_name, contributor_name, response_text, status, completed_at')
        .eq('memory_id', memoryId)
        .order('completed_at', { ascending: true }),
    ])
    if (!memRes.data) return null

    console.log('[Slideshow] memoryId:', memoryId, 'media count:', mediaRes.data?.length, 'location_name:', memRes.data.location_name, 'location_lat:', memRes.data.location_lat)

    // People — combine face tags from photos + "who was there" from the cardchain
    const allContactIds = new Set<string>()

    // Source 1: face tags on this memory's media
    const mediaIds = (mediaRes.data || []).map((m: any) => m.id)
    if (mediaIds.length > 0) {
      const { data: faceTags } = await supabase
        .from('memory_face_tags')
        .select('contact_id')
        .in('media_id', mediaIds)
        .not('contact_id', 'is', null)
      for (const t of faceTags || []) {
        if (t.contact_id) allContactIds.add(t.contact_id)
      }
    }

    // Source 2: "who was there" people saved via the engagement prompt
    const { data: promptRow } = await supabase
      .from('engagement_prompts')
      .select('response_data')
      .eq('result_memory_id', memoryId)
      .limit(1)
      .maybeSingle()
    const promptPeople = (promptRow?.response_data as any)?.taggedPeople as { id: string }[] | undefined
    if (promptPeople) {
      for (const p of promptPeople) {
        if (p.id) allContactIds.add(p.id)
      }
    }

    // Resolve contact details
    let people: TaggedPerson[] = []
    if (allContactIds.size > 0) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(allContactIds))
      people = (contacts || []).map((c: any) => ({
        contact_id: c.id,
        full_name: c.full_name,
        avatar_url: c.avatar_url,
      }))
    }

    return {
      memory: memRes.data as FullMemory,
      media: (mediaRes.data || []) as FullMedia[],
      collaborators: (collabRes.data || []) as Collaborator[],
      people,
    }
  }, [supabase])

  useEffect(() => {
    if (!isOpen || !currentRef) return
    if (cache.has(currentRef.id)) return
    let cancelled = false
    setLoading(true)
    fetchMemory(currentRef.id).then(data => {
      if (cancelled) return
      if (data) {
        setCache(prev => {
          const next = new Map(prev)
          next.set(currentRef.id, data)
          return next
        })
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [isOpen, currentRef, cache, fetchMemory])

  // Prefetch neighbors so left/right feel instant
  useEffect(() => {
    if (!isOpen) return
    const neighbors = [memories[index - 1], memories[index + 1]].filter(Boolean) as SlideMemoryRef[]
    for (const n of neighbors) {
      if (!cache.has(n.id)) {
        fetchMemory(n.id).then(data => {
          if (data) {
            setCache(prev => {
              if (prev.has(n.id)) return prev
              const next = new Map(prev)
              next.set(n.id, data)
              return next
            })
          }
        })
      }
    }
  }, [isOpen, index, memories, cache, fetchMemory])

  const goPrev = useCallback(() => {
    setIndex(i => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setIndex(i => Math.min(memories.length - 1, i + 1))
  }, [memories.length])

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, goPrev, goNext])

  if (!isOpen || memories.length === 0) return null

  const atStart = index === 0
  const atEnd = index === memories.length - 1

  const slide = (
    <AnimatePresence>
      <motion.div
        key="reflection-slideshow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[100] flex flex-col"
        style={{
          background: 'radial-gradient(ellipse at top, #2A201A 0%, #1A1410 60%, #0F0B08 100%)',
        }}
      >
        {/* Top bar — minimal chrome */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 z-20">
          <div className="flex items-center gap-2 text-white/50 text-xs tracking-wide">
            <span className="font-medium text-white/80 tabular-nums">{index + 1}</span>
            <span>of</span>
            <span className="tabular-nums">{memories.length}</span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white transition-all"
            aria-label="Close slideshow"
          >
            <X size={18} />
          </button>
        </div>

        {/* Slide content — scrolls vertically per slide */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRef?.id || index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl mx-auto"
            >
              {loading && !currentData ? (
                <div className="flex flex-col items-center justify-center py-32 text-white/50">
                  <Loader2 size={28} className="animate-spin mb-3" />
                  <p className="text-sm">Loading memory…</p>
                </div>
              ) : currentData ? (
                <SlideContent data={currentData} />
              ) : (
                <div className="flex items-center justify-center py-32 text-white/50">
                  <p className="text-sm">This memory could not be loaded.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom nav — prev/next + progress */}
        <div className="absolute bottom-0 inset-x-0 px-5 sm:px-8 py-5 z-20 flex items-center justify-between gap-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
          <button
            onClick={goPrev}
            disabled={atStart}
            className="pointer-events-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-25 disabled:hover:bg-white/10 backdrop-blur-md flex items-center justify-center text-white transition-all"
            aria-label="Previous memory"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="pointer-events-auto flex-1 max-w-md mx-auto">
            <div className="h-[2px] bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/70 transition-[width] duration-500 ease-out"
                style={{ width: `${((index + 1) / memories.length) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={goNext}
            disabled={atEnd}
            className="pointer-events-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-25 disabled:hover:bg-white/10 backdrop-blur-md flex items-center justify-center text-white transition-all"
            aria-label="Next memory"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Side click zones for desktop tap-to-advance */}
        <button
          onClick={goPrev}
          disabled={atStart}
          className="hidden lg:block absolute left-0 top-16 bottom-20 w-[15%] cursor-w-resize disabled:cursor-default"
          aria-label="Previous"
          tabIndex={-1}
        />
        <button
          onClick={goNext}
          disabled={atEnd}
          className="hidden lg:block absolute right-0 top-16 bottom-20 w-[15%] cursor-e-resize disabled:cursor-default"
          aria-label="Next"
          tabIndex={-1}
        />
      </motion.div>
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null
  return createPortal(slide, document.body)
}

/* ---------------------------------------------------------------------- */
/*  Prestalgia section card — warm parchment-style container               */
/* ---------------------------------------------------------------------- */
function SectionCard({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string
  icon?: typeof MapPin
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(165deg, rgba(62,48,35,0.85) 0%, rgba(42,32,26,0.92) 100%)',
        border: '1px solid rgba(196,162,53,0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,245,220,0.06)',
      }}
    >
      {title && (
        <div className="px-5 pt-4 pb-2 flex items-center gap-2.5">
          {Icon && <Icon size={14} className="text-[#C4A235]/70" />}
          <h3
            className="text-[13px] font-semibold tracking-wide text-[#D4C8A0]"
            style={{ fontFamily: SERIF }}
          >
            {title}
          </h3>
        </div>
      )}
      <div className="px-5 pb-5">{children}</div>
    </section>
  )
}

/* ---------------------------------------------------------------------- */
/*  Film-strip border — decorative row of tiny thumbnails                  */
/* ---------------------------------------------------------------------- */
function FilmStrip({ items }: { items: FullMedia[] }) {
  if (items.length < 2) return null
  const thumbs = items.slice(0, 12)
  return (
    <div className="flex items-center gap-[3px] overflow-hidden py-2 px-1">
      {/* Sprocket holes on left */}
      <div className="flex flex-col gap-1 flex-shrink-0 mr-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-[6px] h-[4px] rounded-[1px] bg-[#C4A235]/20" />
        ))}
      </div>
      {thumbs.map((item, i) => {
        const ft = (item.file_type || '').toLowerCase()
        return (
          <div
            key={item.id || i}
            className="relative flex-shrink-0 w-12 h-9 rounded-[3px] overflow-hidden ring-1 ring-[#C4A235]/20"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
          >
            {ft === 'video' ? (
              <div className="w-full h-full bg-[#2A201A] flex items-center justify-center">
                <Play size={10} className="text-[#C4A235]/50" />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.file_url}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: 'sepia(0.3) saturate(0.8) brightness(0.7)' }}
              />
            )}
          </div>
        )
      })}
      {/* Sprocket holes on right */}
      <div className="flex flex-col gap-1 flex-shrink-0 ml-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-[6px] h-[4px] rounded-[1px] bg-[#C4A235]/20" />
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------- */
/*  Slide content — prestalgia layout                                      */
/* ---------------------------------------------------------------------- */
function SlideContent({ data }: { data: SlideData }) {
  const { memory, media, collaborators, people } = data

  // Fallback: extract location name from description if not set on memory row
  const effectiveLocationName = useMemo(() => {
    if (memory.location_name) return memory.location_name
    const match = memory.description?.match(/^Location:\s*(.+)$/m)
    return match?.[1]?.trim() || null
  }, [memory.location_name, memory.description])

  // Geocode location name → coords when lat/lng are missing but name exists
  const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null)
  useEffect(() => {
    const hasCoords = memory.location_lat != null && memory.location_lat !== 0
      && memory.location_lng != null && memory.location_lng !== 0
    console.log('[Slideshow/Geocode] hasCoords:', hasCoords, 'location_name:', memory.location_name, 'effective:', effectiveLocationName, 'lat:', memory.location_lat, 'lng:', memory.location_lng)
    if (hasCoords || !effectiveLocationName) return
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return
    let cancelled = false
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(effectiveLocationName)}.json?access_token=${token}&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const feat = data?.features?.[0]
        if (feat?.center) {
          setGeocodedCoords({ lng: feat.center[0], lat: feat.center[1] })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [effectiveLocationName, memory.location_lat, memory.location_lng])

  const gallery = useMemo(
    () =>
      media.filter((m) => {
        if (!m.file_url) return false
        const t = (m.file_type || '').toLowerCase()
        // Include explicit image/video types
        if (t === 'image' || t === 'video') return true
        // Exclude explicit audio
        if (t === 'audio') return false
        // When file_type is null/empty, infer from URL
        const url = m.file_url.toLowerCase()
        if (url.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|avif|svg)(\?|$)/)) return true
        if (url.match(/\.(mp4|mov|webm|avi)(\?|$)/)) return true
        // If file_type is missing and URL doesn't match audio, assume image
        if (!t && !url.match(/\.(mp3|wav|m4a|ogg|aac)(\?|$)/)) return true
        return false
      }),
    [media]
  )
  const orderedGallery = useMemo(() => {
    const cov = gallery.find((g) => g.is_cover)
    if (!cov) return gallery
    return [cov, ...gallery.filter((g) => g.id !== cov.id)]
  }, [gallery])

  const audioClips = useMemo(
    () => media.filter((m) => (m.file_type || '').toLowerCase() === 'audio'),
    [media]
  )

  const coverImage = orderedGallery[0]
  const sightsGallery = orderedGallery.slice(1)

  const parsed = useMemo(() => parseStory(memory.description), [memory.description])
  const synopsis = useMemo(
    () => buildSynopsis(memory.ai_summary, memory.description, parsed.exchanges, memory.title),
    [memory.ai_summary, memory.description, parsed.exchanges, memory.title]
  )

  const completedCollabs = collaborators.filter(c => c.status === 'completed' && c.response_text)

  const mapLat = (memory.location_lat && memory.location_lat !== 0) ? memory.location_lat : geocodedCoords?.lat ?? null
  const mapLng = (memory.location_lng && memory.location_lng !== 0) ? memory.location_lng : geocodedCoords?.lng ?? null
  const hasMap = mapLat != null && mapLng != null
  const dateText = formatDateLong(memory.memory_date || memory.created_at)
  const shortDate = memory.memory_date || memory.created_at
    ? new Date(memory.memory_date || memory.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  const moodText = (memory.ai_mood || memory.mood || '').trim()
  const categoryText = (memory.ai_category || '').trim()

  return (
    <article className="text-[#F5F0E8]">
      {/* ── (Film strips removed — photos shown in Sights grid below) ── */}

      {/* ── Hero image with overlaid title ── */}
      <div className="relative w-full rounded-2xl overflow-hidden mb-1"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
      >
        {coverImage ? (
          <div className="relative w-full aspect-[4/5] sm:aspect-[16/10]">
            <Image
              src={coverImage.file_url}
              alt={memory.title || 'Memory'}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              priority
            />
            {/* Warm overlay for text legibility */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(26,20,16,0.25) 0%, rgba(26,20,16,0.1) 40%, rgba(26,20,16,0.6) 80%, rgba(26,20,16,0.85) 100%)',
              }}
            />
            {/* Title overlay — bottom-left */}
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 z-10">
              <h1
                className="text-3xl sm:text-5xl leading-[1.05] text-white drop-shadow-lg mb-2"
                style={{ fontFamily: SERIF, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
              >
                {memory.title || 'Untitled Memory'}
              </h1>
              {shortDate && (
                <p className="text-[12px] tracking-wider text-white/70 flex items-center gap-1.5">
                  <Calendar size={12} />
                  Saved {shortDate}
                </p>
              )}
            </div>
            {/* Share badge — top-right */}
            <div className="absolute top-4 right-4 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md text-[11px] text-white/80 border border-white/15">
                <Share2 size={11} /> Share Memory
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-[16/10] bg-gradient-to-br from-[#3E3023] to-[#2A201A] flex flex-col items-center justify-center text-white/30">
            <ImageIcon size={40} className="mb-3" />
            <h1
              className="text-3xl sm:text-4xl text-center px-6 text-white/80"
              style={{ fontFamily: SERIF }}
            >
              {memory.title || 'Untitled Memory'}
            </h1>
            {shortDate && (
              <p className="text-[12px] tracking-wider text-white/50 mt-3 flex items-center gap-1.5">
                <Calendar size={12} />
                Saved {shortDate}
              </p>
            )}
          </div>
        )}
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
      </div>

      {/* ── (Film strips + pill badges removed to match reference layout) ── */}

      {/* ── Section cards ── */}
      <div className="space-y-4 mt-6">

        {/* Location card */}
        {(hasMap || effectiveLocationName) && (
          <SectionCard title="Location" icon={MapPin}>
            {hasMap && staticMapUrl(mapLat!, mapLng!) ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden ring-1 ring-[#C4A235]/15">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={staticMapUrl(mapLat!, mapLng!, 11, 1000, 300)}
                    alt={effectiveLocationName || 'Location'}
                    className="w-full h-auto block"
                    style={{ filter: 'sepia(0.15) saturate(0.9)' }}
                  />
                </div>
                {effectiveLocationName && (
                  <p className="text-[14px] text-[#D4C8A0]/90 flex items-center gap-2">
                    <MapPin size={13} className="text-[#C4A235]/60 flex-shrink-0" />
                    {effectiveLocationName}
                  </p>
                )}
              </div>
            ) : effectiveLocationName ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C4A235]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} className="text-[#C4A235]/60" />
                </div>
                <p className="text-[15px] text-[#D4C8A0]">{effectiveLocationName}</p>
              </div>
            ) : null}
          </SectionCard>
        )}

        {/* Story + People — side by side on desktop, stacked on mobile */}
        {((synopsis || parsed.paragraphs.length > 0 || parsed.exchanges.length > 0) || people.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
            {/* Story card */}
            {(synopsis || parsed.paragraphs.length > 0 || parsed.exchanges.length > 0) && (
              <SectionCard title="Story" icon={BookOpen}>
                {synopsis && (
                  <p
                    className="text-[#E8DCC4] text-[15px] sm:text-[16px] leading-[1.75] mb-4"
                    style={{ fontFamily: SERIF }}
                  >
                    {synopsis}
                  </p>
                )}
                {/* Q&A exchanges — show both question and answer */}
                {parsed.exchanges.length > 0 && (
                  <div className="space-y-5 mt-2">
                    {parsed.exchanges.map((ex, i) => (
                      <div
                        key={i}
                        className="rounded-xl px-4 py-3.5"
                        style={{
                          background: 'rgba(196,162,53,0.05)',
                          border: '1px solid rgba(196,162,53,0.1)',
                        }}
                      >
                        <p className="text-[12px] uppercase tracking-wider text-[#C4A235]/80 font-medium mb-2 flex items-center gap-2">
                          <Sparkles size={11} className="text-[#C4A235]/60" />
                          {ex.question || `Question ${i + 1}`}
                        </p>
                        <p
                          className="text-[#E8DCC4]/85 text-[15px] leading-[1.8] text-pretty"
                          style={{ fontFamily: SERIF }}
                        >
                          {ex.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {parsed.exchanges.length === 0 && parsed.paragraphs.length > 0 && (
                  <div className="space-y-4">
                    {/* Show the prompt question above the answer when it looks like a Q&A */}
                    {memory.title && memory.title.includes('?') && (
                      <div
                        className="rounded-xl px-4 py-3.5"
                        style={{
                          background: 'rgba(196,162,53,0.05)',
                          border: '1px solid rgba(196,162,53,0.1)',
                        }}
                      >
                        <p className="text-[12px] uppercase tracking-wider text-[#C4A235]/80 font-medium mb-2 flex items-center gap-2">
                          <Sparkles size={11} className="text-[#C4A235]/60" />
                          {memory.title}
                        </p>
                        {parsed.paragraphs.map((p, i) => (
                          <p
                            key={i}
                            className="text-[#E8DCC4]/85 text-[15px] leading-[1.8] text-pretty"
                            style={{ fontFamily: SERIF }}
                          >
                            {p}
                          </p>
                        ))}
                      </div>
                    )}
                    {/* Plain paragraphs when title isn't a question */}
                    {(!memory.title || !memory.title.includes('?')) && parsed.paragraphs.map((p, i) => (
                      <p
                        key={i}
                        className="text-[#E8DCC4]/85 text-[15px] leading-[1.8] text-pretty"
                        style={{ fontFamily: SERIF }}
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {/* People card — right column on desktop */}
            {people.length > 0 && (
              <SectionCard title="People" icon={Users} className="sm:w-[180px]">
                <div className="flex flex-row sm:flex-col flex-wrap gap-4 sm:gap-5 items-center">
                  {people.map((p) => {
                    const initial = (p.full_name || '?').trim().charAt(0).toUpperCase()
                    return (
                      <div key={p.contact_id} className="flex flex-col items-center gap-2">
                        {p.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.avatar_url}
                            alt={p.full_name}
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-[#C4A235]/25"
                            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
                          />
                        ) : (
                          <span
                            className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C4A235]/25 to-[#8B7320]/20 text-[#E8D84A] text-lg font-semibold flex items-center justify-center ring-2 ring-[#C4A235]/25"
                            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
                          >
                            {initial}
                          </span>
                        )}
                        <span className="text-[12px] text-[#D4C8A0]/80 text-center max-w-[80px] truncate">
                          {p.full_name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* Sights card — photo grid of all images */}
        {sightsGallery.length > 0 && (
          <SectionCard title="Sights" icon={ImageIcon}>
            <SightsGrid items={sightsGallery} title={memory.title || ''} />
          </SectionCard>
        )}

        {/* Audio / Voice Recordings card */}
        {audioClips.length > 0 && (
          <SectionCard title="Voice Recordings" icon={Headphones}>
            <div className="space-y-3">
              {audioClips.map((clip, i) => (
                <div
                  key={clip.id}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(196,162,53,0.08) 0%, rgba(42,32,26,0.5) 100%)',
                    border: '1px solid rgba(196,162,53,0.12)',
                  }}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-full bg-[#C4A235]/15 flex items-center justify-center flex-shrink-0">
                      <Play size={14} className="text-[#C4A235]/70 ml-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#D4C8A0] font-medium">
                        Recording {audioClips.length > 1 ? i + 1 : ''}
                      </p>
                      <p className="text-[11px] text-[#D4C8A0]/50">Tap to play</p>
                    </div>
                  </div>
                  <div className="px-4 pb-3">
                    <audio
                      src={clip.file_url}
                      controls
                      className="w-full h-10"
                      style={{ filter: 'sepia(0.3) saturate(0.6) brightness(1.1)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Collaborator quotes card */}
        {completedCollabs.length > 0 && (
          <SectionCard title="Their Voices" icon={MessageCircle}>
            <div className="space-y-6">
              {completedCollabs.map(c => (
                <blockquote
                  key={c.id}
                  className="relative pl-5 border-l-2 border-[#C4A235]/35"
                >
                  <Quote
                    size={14}
                    className="absolute -left-[9px] top-0 text-[#C4A235]/50"
                    style={{ background: 'rgba(42,32,26,0.9)', padding: '0 2px' }}
                  />
                  <p
                    className="text-[#E8DCC4]/85 text-[15px] leading-[1.75] italic"
                    style={{ fontFamily: SERIF }}
                  >
                    {c.response_text}
                  </p>
                  <footer className="mt-2 text-[11px] uppercase tracking-wider text-[#C4A235]/50">
                    — {c.contributor_name || c.contact_name}
                  </footer>
                </blockquote>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Tags */}
        {memory.ai_labels && memory.ai_labels.length > 0 && (
          <div className="pt-4 pb-2">
            <div className="flex flex-wrap gap-1.5 justify-center">
              {memory.ai_labels.slice(0, 10).map((label, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-[11px] border border-[#C4A235]/15 text-[#D4C8A0]/50"
                  style={{ background: 'rgba(196,162,53,0.06)' }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom breathing room */}
      <div className="h-14" />
    </article>
  )
}

/* ---------------------------------------------------------------------- */
/*  ConversationDisclosure — collapsible Q&A section (prestalgia style)    */
/* ---------------------------------------------------------------------- */
function ConversationDisclosure({ exchanges }: { exchanges: Exchange[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-colors text-left"
        style={{
          background: 'rgba(196,162,53,0.06)',
          border: '1px solid rgba(196,162,53,0.12)',
        }}
      >
        <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#D4C8A0]/70">
          <Sparkles size={11} className="text-[#C4A235]/60" />
          Full conversation
          <span className="text-[#D4C8A0]/40 normal-case tracking-normal">
            · {exchanges.length} {exchanges.length === 1 ? 'exchange' : 'exchanges'}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-[#C4A235]/50"
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="conversation-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-5 space-y-6">
              {exchanges.map((ex, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-[#C4A235]/70 font-medium">
                    {ex.question || `Question ${i + 1}`}
                  </p>
                  <p
                    className="text-[#E8DCC4]/85 text-[15px] leading-[1.8] text-pretty"
                    style={{ fontFamily: SERIF }}
                  >
                    {ex.answer}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------------------------------------------------------------------- */
/*  SightsGrid — masonry-style photo grid matching the reference layout    */
/* ---------------------------------------------------------------------- */
function SightsGrid({ items, title }: { items: FullMedia[]; title: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {/* Grid: 2 columns, first item spans full width if 3+ items */}
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, i) => {
          const ft = (item.file_type || '').toLowerCase()
          const isVideo = ft === 'video'
          const spanFull = i === 0 && items.length >= 3

          return (
            <div
              key={item.id || i}
              className={`relative rounded-xl overflow-hidden cursor-pointer group ${
                spanFull ? 'col-span-2 aspect-[16/9]' : 'aspect-square'
              }`}
              style={{
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                border: '1px solid rgba(196,162,53,0.12)',
              }}
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              {isVideo ? (
                <video
                  src={item.file_url}
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={item.file_url}
                  alt={title || 'Photo'}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, 400px"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )
        })}
      </div>

      {/* Expanded view overlay */}
      <AnimatePresence>
        {expandedId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="relative rounded-xl overflow-hidden"
            style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              border: '1px solid rgba(196,162,53,0.15)',
            }}
            onClick={() => setExpandedId(null)}
          >
            {(() => {
              const expanded = items.find(m => m.id === expandedId)
              if (!expanded) return null
              const ft = (expanded.file_type || '').toLowerCase()
              return ft === 'video' ? (
                <video
                  src={expanded.file_url}
                  controls
                  playsInline
                  className="w-full aspect-video object-contain bg-black/50"
                />
              ) : (
                <div className="relative w-full aspect-[4/3]">
                  <Image
                    src={expanded.file_url}
                    alt={title}
                    fill
                    unoptimized
                    className="object-contain bg-black/30"
                    sizes="(max-width: 768px) 100vw, 800px"
                  />
                </div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------------------------------------------------------------------- */
/*  MediaCarousel — swipeable photo/video deck (prestalgia style)          */
/* ---------------------------------------------------------------------- */
function MediaCarousel({ items, title }: { items: FullMedia[]; title: string }) {
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const count = items.length

  useEffect(() => {
    if (idx > count - 1) setIdx(Math.max(0, count - 1))
  }, [count, idx])

  const prev = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setIdx((i) => (i - 1 + count) % count)
  }
  const next = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setIdx((i) => (i + 1) % count)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 40) {
      if (delta < 0) next()
      else prev()
    }
    touchStartX.current = null
  }

  const current = items[idx]
  if (!current) return null
  const ft = (current.file_type || '').toLowerCase()
  const isVideo = ft === 'video'

  return (
    <div className="relative">
      {/* Main viewport */}
      <div
        className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black/30"
        style={{
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          border: '1px solid rgba(196,162,53,0.12)',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {isVideo ? (
              <video
                src={current.file_url}
                controls
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <Image
                src={current.file_url}
                alt={title}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 800px"
                priority={idx === 0}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next */}
        {count > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white/85 transition-all"
              aria-label="Previous photo"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white/85 transition-all"
              aria-label="Next photo"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-md text-[10px] text-white/75 tabular-nums">
              {idx + 1} / {count}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip below */}
      {count > 1 && (
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-hide">
          {items.map((item, i) => {
            const t = (item.file_type || '').toLowerCase()
            return (
              <button
                key={item.id || i}
                onClick={(e) => { e.stopPropagation(); setIdx(i) }}
                className={`relative flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden transition-all ${
                  i === idx
                    ? 'ring-2 ring-[#C4A235]/70 opacity-100'
                    : 'ring-1 ring-white/10 opacity-50 hover:opacity-75'
                }`}
              >
                {t === 'video' ? (
                  <div className="w-full h-full bg-[#2A201A] flex items-center justify-center">
                    <Play size={10} className="text-[#C4A235]/50" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.file_url} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
