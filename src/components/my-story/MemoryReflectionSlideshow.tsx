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
  ai_labels: string[] | null
  mood: string | null
  created_at: string
}

interface FullMedia {
  id: string
  file_url: string
  file_type: string
  mime_type: string | null
  is_cover: boolean
}

interface Collaborator {
  id: string
  contact_name: string
  contributor_name: string | null
  response_text: string | null
  status: string
  completed_at: string | null
}

interface SlideData {
  memory: FullMemory
  media: FullMedia[]
  collaborators: Collaborator[]
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

  // Format 2: plain prose — strip artifacts, dedupe, return paragraphs
  const cleaned = text
    .replace(/🎙️ \[Audio\]\([^)]+\)/g, '')
    .replace(/🔊 \[Question Audio\]\([^)]+\)/g, '')
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean)
  const deduped: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (i === 0 || lines[i] !== lines[i - 1]) deduped.push(lines[i])
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

  // 2) Compose from first exchange answer(s) if we have Q&A
  let source = ''
  if (exchanges.length > 0) {
    source = exchanges.slice(0, 2).map(e => e.answer).join(' ')
  } else if (description) {
    source = description
  }
  source = source
    .replace(/##\s*\w+/g, '')
    .replace(/\*\*Q\d+:\*\*/g, '')
    .replace(/\*\*A\d+:\*\*/g, '')
    .replace(/🎙️ \[Audio\]\([^)]+\)/g, '')
    .replace(/🔊 \[Question Audio\]\([^)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!source) return ''

  // Grab first 1-3 sentences
  const sentences = source.match(/[^.!?]+[.!?]+/g) || [source]
  const snippet = sentences.slice(0, 3).join(' ').trim()

  // Gentle first-person → neutral-you rewrites so the synopsis reads like a
  // guided recollection from the user's own perspective. Purely lexical —
  // doesn't require an LLM round-trip.
  return snippet
    .replace(/\bI am\b/gi, 'you are')
    .replace(/\bI was\b/gi, 'you were')
    .replace(/\bI have\b/gi, 'you have')
    .replace(/\bI had\b/gi, 'you had')
    .replace(/\bI will\b/gi, 'you will')
    .replace(/\bI'd\b/gi, "you'd")
    .replace(/\bI'll\b/gi, "you'll")
    .replace(/\bI'm\b/gi, "you're")
    .replace(/\bI've\b/gi, "you've")
    .replace(/\bI\b/g, 'you')
    .replace(/\bme\b/gi, 'you')
    .replace(/\bmy\b/gi, 'your')
    .replace(/\bmine\b/gi, 'yours')
    .replace(/\bmyself\b/gi, 'yourself')
    .replace(/\s+/g, ' ')
    .replace(/\byou\b/i, m => m.charAt(0).toUpperCase() + m.slice(1)) // capitalize first "you"
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
        .select('id, title, description, memory_date, location_name, location_lat, location_lng, ai_summary, ai_mood, ai_labels, mood, created_at')
        .eq('id', memoryId)
        .single(),
      supabase
        .from('memory_media')
        .select('id, file_url, file_type, mime_type, is_cover')
        .eq('memory_id', memoryId)
        .order('sort_order'),
      supabase
        .from('memory_collaborators')
        .select('id, contact_name, contributor_name, response_text, status, completed_at')
        .eq('memory_id', memoryId)
        .order('completed_at', { ascending: true }),
    ])
    if (!memRes.data) return null
    return {
      memory: memRes.data as FullMemory,
      media: (mediaRes.data || []) as FullMedia[],
      collaborators: (collabRes.data || []) as Collaborator[],
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
/*  Slide content — one memory laid out for reflection                     */
/* ---------------------------------------------------------------------- */
function SlideContent({ data }: { data: SlideData }) {
  const { memory, media, collaborators } = data

  const photos = useMemo(
    () => media.filter(m => (m.mime_type || m.file_type || '').startsWith('image')),
    [media]
  )
  const cover = photos.find(p => p.is_cover) || photos[0] || null
  const otherPhotos = photos.filter(p => p.id !== cover?.id)

  const parsed = useMemo(() => parseStory(memory.description), [memory.description])
  const synopsis = useMemo(
    () => buildSynopsis(memory.ai_summary, memory.description, parsed.exchanges, memory.title),
    [memory.ai_summary, memory.description, parsed.exchanges, memory.title]
  )

  const completedCollabs = collaborators.filter(c => c.status === 'completed' && c.response_text)

  const hasMap = memory.location_lat != null && memory.location_lng != null
  const dateText = formatDateLong(memory.memory_date || memory.created_at)

  return (
    <article className="text-[#F5F0E8]">
      {/* Date + Location pill row */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-5 text-[11px] uppercase tracking-[0.18em]">
        {dateText && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/70">
            <Calendar size={12} /> {dateText}
          </span>
        )}
        {memory.location_name && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/70">
            <MapPin size={12} /> {memory.location_name}
          </span>
        )}
      </div>

      {/* Title */}
      <h1
        className="text-center text-3xl sm:text-5xl leading-[1.1] mb-6 text-[#FAF5E4]"
        style={{ fontFamily: SERIF }}
      >
        {memory.title || 'Untitled Memory'}
      </h1>

      {/* Cover photo */}
      {cover && (
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)] mb-8">
          <Image
            src={cover.file_url}
            alt={memory.title || ''}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
        </div>
      )}

      {/* Synopsis — short, neutral, from the user's point of view */}
      {synopsis && (
        <section className="my-10 px-2 sm:px-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 text-center mb-3">
            In brief
          </p>
          <p
            className="text-[#E8DCC4] text-lg sm:text-xl leading-[1.7] text-center text-balance"
            style={{ fontFamily: SERIF }}
          >
            {synopsis}
          </p>
        </section>
      )}

      {/* Q&A exchanges — the actual conversation */}
      {parsed.exchanges.length > 0 && (
        <section className="my-10 space-y-7">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 text-center flex items-center justify-center gap-2">
            <Sparkles size={11} /> The conversation
          </h3>
          {parsed.exchanges.map((ex, i) => (
            <div key={i} className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-[#C4A235]/80 font-medium">
                {ex.question}
              </p>
              <p
                className="text-[#E8DCC4]/90 text-[17px] sm:text-[19px] leading-[1.85] text-pretty"
                style={{ fontFamily: SERIF }}
              >
                {ex.answer}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Plain story body (when there were no Q&A exchanges) */}
      {parsed.exchanges.length === 0 && parsed.paragraphs.length > 0 && (
        <section className="my-10 space-y-5">
          {parsed.paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-[#E8DCC4]/90 text-[17px] sm:text-[19px] leading-[1.85] text-pretty"
              style={{ fontFamily: SERIF }}
            >
              {p}
            </p>
          ))}
        </section>
      )}

      {/* Photo grid */}
      {otherPhotos.length > 0 && (
        <section className="my-10">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4 flex items-center gap-2">
            <Sparkles size={11} /> More from this moment
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {otherPhotos.map(p => (
              <div
                key={p.id}
                className="relative aspect-square rounded-xl overflow-hidden ring-1 ring-white/10"
              >
                <Image
                  src={p.file_url}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 280px"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Map */}
      {hasMap && memory.location_lat != null && memory.location_lng != null && staticMapUrl(memory.location_lat, memory.location_lng) && (
        <section className="my-10">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4 flex items-center gap-2">
            <MapPin size={11} /> Where it happened
          </h3>
          <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={staticMapUrl(memory.location_lat, memory.location_lng, 10, 800, 280)}
              alt={memory.location_name || 'Location'}
              className="w-full h-auto block"
            />
            {memory.location_name && (
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm font-medium">{memory.location_name}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Collaborator quotes */}
      {completedCollabs.length > 0 && (
        <section className="my-12">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-5 flex items-center gap-2">
            <MessageCircle size={11} /> Their voices
          </h3>
          <div className="space-y-7">
            {completedCollabs.map(c => (
              <blockquote
                key={c.id}
                className="relative pl-6 border-l-2 border-[#C4A235]/40"
              >
                <Quote
                  size={16}
                  className="absolute -left-[10px] top-0 bg-[#1A1410] text-[#C4A235]/60 px-[2px]"
                />
                <p
                  className="text-[#E8DCC4]/90 text-[17px] leading-[1.75] italic"
                  style={{ fontFamily: SERIF }}
                >
                  {c.response_text}
                </p>
                <footer className="mt-2 text-[11px] uppercase tracking-wider text-white/40">
                  — {c.contributor_name || c.contact_name}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Tags */}
      {memory.ai_labels && memory.ai_labels.length > 0 && (
        <section className="mt-10 pt-6 border-t border-white/10">
          <div className="flex flex-wrap gap-1.5 justify-center">
            {memory.ai_labels.slice(0, 10).map((label, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-[11px] bg-white/5 text-white/50"
              >
                {label}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Bottom breathing room */}
      <div className="h-12" />
    </article>
  )
}
