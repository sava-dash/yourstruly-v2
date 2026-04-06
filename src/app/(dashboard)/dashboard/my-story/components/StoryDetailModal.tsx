'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Heart, MapPin, Calendar, Sparkles, ChevronLeft, ChevronRight,
  Play, Pause, Square, Quote, Tag, Volume2, MessageCircle, Send,
  Lightbulb, Briefcase, Baby, Users,
  Activity, Moon, Palette, Compass, Utensils, GraduationCap, HelpCircle
} from 'lucide-react'
import { type StoryItem, type ContentType } from './StoryCard'

/* ------------------------------------------------------------------ */
/*  Wisdom categories                                                  */
/* ------------------------------------------------------------------ */
const WISDOM_CATEGORIES = [
  { key: 'life_lessons', label: 'Life Lessons', icon: Lightbulb, color: '#C4A235', bgColor: '#FDF9E3' },
  { key: 'relationships', label: 'Relationships', icon: Heart, color: '#B8562E', bgColor: '#FCEEE8' },
  { key: 'family', label: 'Family', icon: Users, color: '#2D5A3D', bgColor: '#E8F2ED' },
  { key: 'career', label: 'Career', icon: Briefcase, color: '#4A3552', bgColor: '#EDE8F0' },
  { key: 'parenting', label: 'Parenting', icon: Baby, color: '#8DACAB', bgColor: '#EBF2F1' },
  { key: 'health', label: 'Health', icon: Activity, color: '#5B8A72', bgColor: '#E6F0EB' },
  { key: 'spirituality', label: 'Spirituality', icon: Moon, color: '#6B5B95', bgColor: '#EFEAF5' },
  { key: 'creativity', label: 'Creativity', icon: Palette, color: '#E07C52', bgColor: '#FCF0EA' },
  { key: 'values', label: 'Values', icon: Compass, color: '#3D7068', bgColor: '#E4EDEC' },
  { key: 'recipes', label: 'Recipes', icon: Utensils, color: '#B8562E', bgColor: '#FCEEE8' },
  { key: 'advice', label: 'Advice', icon: GraduationCap, color: '#C4A235', bgColor: '#FDF9E3' },
  { key: 'other', label: 'Other', icon: HelpCircle, color: '#888888', bgColor: '#F5F5F5' },
]
const getCategoryConfig = (key: string) =>
  WISDOM_CATEGORIES.find(c => c.key === key) || WISDOM_CATEGORIES[WISDOM_CATEGORIES.length - 1]

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FullMemory {
  id: string; title: string; description: string | null; memory_date: string | null
  memory_type: string | null; location_name: string | null; location_lat: number | null; location_lng: number | null
  ai_summary: string | null; ai_mood: string | null; ai_category: string | null
  ai_labels: string[] | null; is_favorite: boolean; mood: string | null; created_at: string
}
interface FullMedia {
  id: string; file_url: string; file_type: string; mime_type: string | null; is_cover: boolean
  exif_lat?: number | null; exif_lng?: number | null
}
interface FullWisdom {
  id: string; prompt_text: string; response_text: string | null
  audio_url: string | null; tags: string[] | null; category: string | null; created_at: string
}
interface ParsedExchange {
  question: string; answer: string; audioUrl?: string; questionAudioUrl?: string
}
interface StoryDetailModalProps { item: StoryItem; onClose: () => void }

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatDateJournal(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
  const month = d.toLocaleDateString('en-US', { month: 'long' })
  const day = d.getDate()
  const year = d.getFullYear()
  return `${weekday}, ${month} ${day}, ${year}`
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days < 1) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years > 1 ? 's' : ''} ago`
}

function parseConversation(text: string): { summary: string; exchanges: ParsedExchange[] } {
  if (!text) return { summary: '', exchanges: [] }

  // Format 1: Markdown ## Conversation with **Q1:**/**A1:** pairs
  if (text.includes('## Conversation') && text.includes('**Q')) {
    const parts = text.split('## Conversation')
    const summary = (parts[0] || '').replace('## Summary', '').trim()
    const qaSection = parts[1] || ''
    const exchanges: ParsedExchange[] = []
    const qaPairs = qaSection.split(/\n\n---\n\n/).filter(s => s.trim())
    for (const pair of qaPairs) {
      const qMatch = pair.match(/\*\*Q\d+:\*\*\s*(.+?)(?=\n\n\*\*A)/s)
      const aMatch = pair.match(/\*\*A\d+:\*\*\s*(.+?)(?=\n\n🔊|\n\n🎙️|$)/s)
      const audioMatch = pair.match(/🎙️ \[Audio\]\((.+?)\)/)
      const questionAudioMatch = pair.match(/🔊 \[Question Audio\]\((.+?)\)/)
      if (qMatch && aMatch) {
        exchanges.push({
          question: qMatch[1]?.trim() || '', answer: aMatch[1]?.trim() || '',
          audioUrl: audioMatch?.[1]?.trim(), questionAudioUrl: questionAudioMatch?.[1]?.trim(),
        })
      }
    }
    return { summary, exchanges }
  }

  // Format 2: Plain text with repeated lines (Q then A on consecutive lines)
  // Many voice-recorded memories produce lines where odd = question, even = answer
  // or simply duplicate lines. Detect repeated consecutive pairs.
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length >= 2) {
    const exchanges: ParsedExchange[] = []
    // Check if lines come in repeated pairs (line[i] === line[i+1])
    let isRepeatedPairs = true
    if (lines.length % 2 === 0 && lines.length >= 4) {
      for (let i = 0; i < lines.length; i += 2) {
        if (lines[i] !== lines[i + 1]) { isRepeatedPairs = false; break }
      }
    } else {
      isRepeatedPairs = false
    }

    if (isRepeatedPairs) {
      // Deduplicate: take every other line as a unique statement
      const unique = lines.filter((_, i) => i % 2 === 0)
      // Return as simple text paragraphs (not Q&A since there are no questions)
      return { summary: '', exchanges: [] }
    }
  }

  return { summary: '', exchanges: [] }
}

/** For plain descriptions, deduplicate repeated consecutive lines and return clean paragraphs */
function cleanDescription(text: string | null): string[] {
  if (!text) return []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  // Remove consecutive duplicate lines
  const deduped: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (i === 0 || lines[i] !== lines[i - 1]) {
      deduped.push(lines[i])
    }
  }
  return deduped
}

/** Build a static Mapbox image URL */
function staticMapUrl(lat: number, lng: number, zoom = 8, w = 600, h = 180): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
  if (!token) return ''
  const pin = `pin-l+2D5A3D(${lng},${lat})`
  return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${pin}/${lng},${lat},${zoom},0/${w}x${h}@2x?access_token=${token}`
}

/* ------------------------------------------------------------------ */
/*  Slideshow hook — auto-advances photos with crossfade               */
/* ------------------------------------------------------------------ */
function useSlideshow(count: number, intervalMs = 5000) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (count <= 1 || paused) return
    timerRef.current = setInterval(() => {
      setIndex(prev => (prev + 1) % count)
    }, intervalMs)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [count, paused, intervalMs])

  const goTo = (i: number) => { setIndex(i); setPaused(true); setTimeout(() => setPaused(false), 8000) }
  const prev = () => goTo((index - 1 + count) % count)
  const next = () => goTo((index + 1) % count)
  return { index, goTo, prev, next, paused, setPaused }
}

/* ================================================================== */
/*  COMPONENT                                                          */
/* ================================================================== */
export default function StoryDetailModal({ item, onClose }: StoryDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [memory, setMemory] = useState<FullMemory | null>(null)
  const [memoryMedia, setMemoryMedia] = useState<FullMedia[]>([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [wisdom, setWisdom] = useState<FullWisdom | null>(null)
  const [photoMedia, setPhotoMedia] = useState<FullMedia | null>(null)
  const [photoParentLoc, setPhotoParentLoc] = useState<{ location_name: string | null; location_lat: number | null; location_lng: number | null } | null>(null)
  const [collaborators, setCollaborators] = useState<{ id: string; contact_name: string; contributor_name: string | null; response_text: string | null; status: string; completed_at: string | null }[]>([])
  const [slideshowMode, setSlideshowMode] = useState(false)

  // Audio
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentExchangeIdx, setCurrentExchangeIdx] = useState(-1)
  const [playingPart, setPlayingPart] = useState<'question' | 'answer' | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playingRef = useRef(false)
  const exchangesRef = useRef<ParsedExchange[]>([])

  const supabase = createClient()

  // Photos for slideshow
  const photos = memoryMedia.filter(m =>
    m.file_type?.startsWith('image') || (!m.file_type?.startsWith('audio') && m.file_url)
  )
  const slideshow = useSlideshow(photos.length)

  // Lock body scroll
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])
  // Cleanup audio
  useEffect(() => () => { stopPlayback() }, [])

  // Fetch data
  useEffect(() => { fetchFullData() }, [item.id, item.type])

  async function fetchFullData() {
    setLoading(true)
    if (item.type === 'memory') {
      const [memRes, mediaRes] = await Promise.all([
        supabase.from('memories').select('*').eq('id', item.id).single(),
        supabase.from('memory_media').select('*').eq('memory_id', item.id).order('sort_order'),
      ])
      if (memRes.data) { setMemory(memRes.data as FullMemory); setIsFavorite(memRes.data.is_favorite) }
      setMemoryMedia((mediaRes.data as FullMedia[]) || [])
      // Fetch collaborator contributions
      const { data: collabData } = await supabase
        .from('memory_collaborators')
        .select('id, contact_name, contributor_name, response_text, status, completed_at')
        .eq('memory_id', item.id)
        .order('completed_at', { ascending: true })
      if (collabData) setCollaborators(collabData)
    } else if (item.type === 'wisdom') {
      const { data } = await supabase.from('knowledge_entries')
        .select('id, prompt_text, response_text, audio_url, tags, category, created_at')
        .eq('id', item.id).single()
      if (data) setWisdom(data as FullWisdom)
    } else if (item.type === 'photo') {
      const { data } = await supabase.from('memory_media').select('*').eq('id', item.id).single()
      if (data) {
        setPhotoMedia(data as FullMedia)
        // Fetch parent memory for user-specified location (takes priority over EXIF)
        if (data.memory_id) {
          const { data: parentMem } = await supabase.from('memories')
            .select('location_name, location_lat, location_lng')
            .eq('id', data.memory_id).single()
          if (parentMem) setPhotoParentLoc(parentMem)
        }
      }
    }
    setLoading(false)
  }

  const toggleFavorite = async () => {
    if (!memory) return
    const next = !isFavorite; setIsFavorite(next)
    await supabase.from('memories').update({ is_favorite: next }).eq('id', memory.id)
  }

  // ---- Audio ----
  const stopPlayback = useCallback(() => {
    playingRef.current = false
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setIsPlaying(false); setCurrentExchangeIdx(-1); setPlayingPart(null)
  }, [])

  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) { resolve(); return }
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text); u.rate = 0.95
      const voices = window.speechSynthesis.getVoices()
      const pref = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English') || (v.lang.startsWith('en') && v.localService)) || voices.find(v => v.lang.startsWith('en-US'))
      if (pref) u.voice = pref
      u.onend = () => resolve(); u.onerror = () => resolve()
      window.speechSynthesis.speak(u)
    })
  }, [])

  const playAudioUrl = useCallback((url: string): Promise<void> => {
    return new Promise((resolve) => {
      const audio = new Audio(url); audioRef.current = audio
      audio.onended = () => { audioRef.current = null; resolve() }
      audio.onerror = () => { audioRef.current = null; resolve() }
      audio.play().catch(() => resolve())
    })
  }, [])

  const playAllExchanges = useCallback(async () => {
    if (playingRef.current) { stopPlayback(); return }
    const exchanges = exchangesRef.current; if (!exchanges.length) return
    playingRef.current = true; setIsPlaying(true)
    try {
      for (let i = 0; i < exchanges.length; i++) {
        if (!playingRef.current) break
        const ex = exchanges[i]; setCurrentExchangeIdx(i)
        setPlayingPart('question')
        if (ex.questionAudioUrl) { try { await playAudioUrl(ex.questionAudioUrl) } catch { try { await speakText(ex.question) } catch {} } }
        else { try { await speakText(ex.question) } catch {} }
        await new Promise(r => setTimeout(r, 400))
        if (!playingRef.current) break
        setPlayingPart('answer')
        if (ex.audioUrl) { try { await playAudioUrl(ex.audioUrl) } catch { try { await speakText(ex.answer) } catch {} } }
        else { try { await speakText(ex.answer) } catch {} }
        if (i < exchanges.length - 1) await new Promise(r => setTimeout(r, 600))
      }
    } finally { playingRef.current = false; setIsPlaying(false); setCurrentExchangeIdx(-1); setPlayingPart(null) }
  }, [stopPlayback, speakText, playAudioUrl])

  // ---- Parsed content ----
  const parsed = (memory?.description || wisdom?.response_text)
    ? parseConversation(memory?.description || wisdom?.response_text || '')
    : null
  if (parsed) exchangesRef.current = parsed.exchanges

  // Location for mini map
  const loc = memory ? { lat: memory.location_lat, lng: memory.location_lng, name: memory.location_name } : null
  const hasLocation = loc && loc.lat && loc.lng

  const typeAccent: Record<ContentType, string> = { memory: '#2D5A3D', wisdom: '#C4A235', photo: '#4A7FB5' }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Scroll container */}
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.96 }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl mx-4 mt-20 mb-10 sm:mt-24"
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 z-20 p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-xl hover:bg-white transition-colors group"
            aria-label="Close"
          >
            <X size={18} className="text-[#5A6660] group-hover:text-[#1A1F1C]" />
          </button>

          {/* ========== CARD ========== */}
          <div className="rounded-3xl shadow-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #FDFCF9 0%, #F8F4EE 100%)' }}>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-32">
                <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: typeAccent[item.type], borderTopColor: 'transparent' }} />
              </div>
            )}

            {/* ========================================================= */}
            {/*  MEMORY                                                     */}
            {/* ========================================================= */}
            {!loading && item.type === 'memory' && memory && (
              <>
                {/* Hero slideshow */}
                {photos.length > 0 && (
                  <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-[#1A1F1C] overflow-hidden">
                    {/* Crossfade images */}
                    {photos.map((photo, i) => (
                      <motion.div
                        key={photo.id}
                        initial={false}
                        animate={{ opacity: i === slideshow.index ? 1 : 0, scale: i === slideshow.index ? 1 : 1.05 }}
                        transition={{ duration: 1.2, ease: 'easeInOut' }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={photo.file_url}
                          alt={memory.title}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 672px"
                          priority={i === 0}
                        />
                      </motion.div>
                    ))}

                    {/* Warm vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30 pointer-events-none" />
                    {/* Sepia warmth overlay */}
                    <div className="absolute inset-0 bg-[#D4A574]/[0.06] mix-blend-multiply pointer-events-none" />

                    {/* Title + meta */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                      <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl sm:text-3xl font-bold text-white leading-tight drop-shadow-lg mb-2"
                        style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
                      >
                        {memory.title}
                      </motion.h1>
                      <div className="flex items-center gap-2 text-white/70 text-sm flex-wrap">
                        {memory.location_name && (
                          <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                            <MapPin size={13} />
                            {memory.location_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-white/60 text-xs">
                          {timeAgo(memory.memory_date || memory.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Slideshow arrows */}
                    {photos.length > 1 && (
                      <>
                        <button onClick={slideshow.prev} className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full text-white/80 hover:text-white transition-all">
                          <ChevronLeft size={20} />
                        </button>
                        <button onClick={slideshow.next} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full text-white/80 hover:text-white transition-all">
                          <ChevronRight size={20} />
                        </button>
                        {/* Progress dots */}
                        <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 flex gap-1.5">
                          {photos.map((_, i) => (
                            <button key={i} onClick={() => slideshow.goTo(i)} className={`rounded-full transition-all duration-500 ${i === slideshow.index ? 'bg-white w-6 h-1.5' : 'bg-white/40 w-1.5 h-1.5 hover:bg-white/60'}`} />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Favorite */}
                    <button onClick={toggleFavorite} className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-sm transition-all ${isFavorite ? 'bg-white/90 text-[#B8562E] shadow-lg' : 'bg-black/20 text-white/70 hover:text-white hover:bg-black/40'}`}>
                      <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>

                    {/* Photo counter */}
                    {photos.length > 1 && (
                      <div className="absolute top-4 left-4 px-3 py-1 bg-black/30 backdrop-blur-sm rounded-full text-white/80 text-xs font-medium">
                        {slideshow.index + 1} / {photos.length}
                      </div>
                    )}
                  </div>
                )}

                {/* No-photo header */}
                {photos.length === 0 && (
                  <div className="px-7 pt-8 pb-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#2D5A3D]/10 flex items-center justify-center mb-4">
                      <Sparkles size={22} className="text-[#2D5A3D]" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1F1C] leading-tight" style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}>
                      {memory.title}
                    </h1>
                    <div className="flex items-center gap-3 mt-3 text-[#94A09A] text-sm">
                      <span className="flex items-center gap-1"><Calendar size={14} />{formatDateJournal(memory.memory_date || memory.created_at)}</span>
                      {memory.location_name && <span className="flex items-center gap-1"><MapPin size={14} />{memory.location_name}</span>}
                    </div>
                  </div>
                )}

                {/* Film-strip thumbnails */}
                {photos.length > 1 && (
                  <div className="px-5 pt-4">
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {photos.map((m, i) => (
                        <button
                          key={m.id}
                          onClick={() => slideshow.goTo(i)}
                          className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all duration-300 ${i === slideshow.index ? 'ring-2 ring-[#2D5A3D] ring-offset-2 ring-offset-[#FDFCF9] opacity-100' : 'opacity-40 hover:opacity-70'}`}
                        >
                          <Image src={m.file_url} alt="" fill unoptimized className="object-cover" sizes="56px" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mood + labels row */}
                {(memory.mood || memory.ai_category) && (
                  <div className="px-7 pt-4 flex flex-wrap items-center gap-2">
                    {memory.mood && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'linear-gradient(135deg, rgba(45,90,61,0.08), rgba(196,162,53,0.08))', color: '#2D5A3D' }}>
                        <Sparkles size={12} /> {memory.mood}
                      </span>
                    )}
                    {memory.ai_category && (
                      <span className="px-3 py-1.5 rounded-full bg-[#C4A235]/10 text-[#C4A235] text-xs font-medium">{memory.ai_category}</span>
                    )}
                    {(memory.ai_labels || []).slice(0, 3).map(label => (
                      <span key={label} className="px-2.5 py-1 rounded-full bg-[#F0F0EC] text-[#5A6660] text-xs">{label}</span>
                    ))}
                  </div>
                )}

                {/* AI Summary — warm quote card */}
                {memory.ai_summary && (
                  <div className="mx-5 sm:mx-7 mt-5">
                    <div className="relative p-5 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #F8F0E3 0%, #EDE8DD 100%)' }}>
                      <Quote size={40} className="absolute top-3 right-4 text-[#C4A235]/15" />
                      <p className="text-[#3A3228] leading-relaxed italic text-[15px] relative z-10">{memory.ai_summary}</p>
                    </div>
                  </div>
                )}

                {/* Description / Conversation */}
                <div className="px-5 sm:px-7 py-5">
                  {parsed && parsed.exchanges.length > 0 ? (
                    <>
                      {/* Play button */}
                      <button
                        onClick={playAllExchanges}
                        className="flex items-center gap-3 w-full px-5 py-4 mb-5 rounded-2xl transition-all border"
                        style={{ background: 'linear-gradient(135deg, rgba(45,90,61,0.04), rgba(196,162,53,0.04))', borderColor: 'rgba(45,90,61,0.12)' }}
                      >
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${isPlaying ? 'bg-[#2D5A3D]' : 'bg-[#2D5A3D]/12'}`}>
                          {isPlaying ? <Square size={16} className="text-white" fill="white" /> : <Play size={18} className="text-[#2D5A3D] ml-0.5" />}
                        </div>
                        <div className="text-left flex-1">
                          <span className="text-[#1A1F1C] font-medium text-sm">{isPlaying ? `Playing ${playingPart === 'question' ? 'Q' : 'A'}${currentExchangeIdx + 1} of ${parsed.exchanges.length}` : 'Listen to this Conversation'}</span>
                          <p className="text-xs text-[#94A09A]">{isPlaying ? 'Tap to stop' : `${parsed.exchanges.length} exchanges`}</p>
                        </div>
                      </button>

                      {/* Summary */}
                      {parsed.summary && (
                        <div className="mb-6 p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, #F8F0E3 0%, transparent 100%)' }}>
                          <div className="flex items-start gap-3">
                            <Quote size={18} className="text-[#C4A235] flex-shrink-0 mt-0.5" />
                            <p className="text-[#3A3228] leading-relaxed italic">{parsed.summary}</p>
                          </div>
                        </div>
                      )}

                      {/* Exchanges */}
                      <div className="space-y-5">
                        {parsed.exchanges.map((ex, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: currentExchangeIdx >= 0 && currentExchangeIdx !== i ? 0.35 : 1, y: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.3 }}
                          >
                            <div className="flex items-start gap-2.5 mb-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${currentExchangeIdx === i && playingPart === 'question' ? 'bg-[#2D5A3D] text-white' : 'bg-[#2D5A3D]/10 text-[#2D5A3D]'}`}>Q</div>
                              <p className="text-sm text-[#5A6660] pt-1 font-medium">{ex.question}</p>
                            </div>
                            <div className={`ml-9 rounded-2xl p-4 transition-all duration-300 ${currentExchangeIdx === i && playingPart === 'answer' ? 'bg-[#2D5A3D]/8 border border-[#2D5A3D]/15 shadow-sm' : 'bg-[#F5F0EA]'}`}>
                              <p className="text-[#3A3228] text-sm leading-relaxed">{ex.answer}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  ) : memory.description ? (() => {
                    const paragraphs = cleanDescription(memory.description)
                    return (
                      <div className="space-y-4">
                        {paragraphs.map((para, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.06 }}
                            className="flex items-start gap-3"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#C4A235]/40 mt-2.5 flex-shrink-0" />
                            <p className="text-[#3A3228] leading-[1.8] text-[15px]">{para}</p>
                          </motion.div>
                        ))}
                      </div>
                    )
                  })() : null}
                </div>

                {/* Mini map */}
                {hasLocation && (
                  <div className="mx-5 sm:mx-7 mb-5">
                    <div className="rounded-2xl overflow-hidden border border-[#E8E2D8]">
                      <div className="relative h-[140px] bg-[#F0EDE6]">
                        <Image
                          src={staticMapUrl(loc.lat!, loc.lng!)}
                          alt={loc.name || 'Location'}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="600px"
                        />
                      </div>
                      {loc.name && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FAF8F4]">
                          <MapPin size={14} className="text-[#2D5A3D] flex-shrink-0" />
                          <span className="text-xs text-[#5A6660] font-medium truncate">{loc.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Collaborator contributions */}
                {collaborators.filter(c => c.status === 'completed' && c.response_text).length > 0 && (
                  <div className="px-5 sm:px-7 pb-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-[#E8E2D8]" />
                      <span className="text-[10px] text-[#B8B0A4] uppercase tracking-widest font-semibold">Others&apos; Perspectives</span>
                      <div className="flex-1 h-px bg-[#E8E2D8]" />
                    </div>
                    <div className="space-y-4">
                      {collaborators.filter(c => c.status === 'completed' && c.response_text).map(collab => (
                        <motion.div
                          key={collab.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl p-5 border border-[#E8E2D8]"
                          style={{ background: 'linear-gradient(135deg, #FAFAF7 0%, #F5F0EA 100%)' }}
                        >
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center text-xs font-bold text-[#2D5A3D]">
                              {(collab.contributor_name || collab.contact_name).charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#1A1F1C]">{collab.contributor_name || collab.contact_name}</p>
                              {collab.completed_at && (
                                <p className="text-[10px] text-[#94A09A]">{timeAgo(collab.completed_at)}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-[#3A3228] leading-[1.8] text-[15px] italic">{collab.response_text}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Slideshow play button */}
                {(photos.length > 0 || (parsed && parsed.exchanges.length > 0)) && (
                  <div className="px-5 sm:px-7 pb-4">
                    <button
                      onClick={() => setSlideshowMode(true)}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-[#2D5A3D]/15 hover:border-[#2D5A3D]/30 transition-all"
                      style={{ background: 'linear-gradient(135deg, rgba(45,90,61,0.03), rgba(196,162,53,0.03))' }}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#2D5A3D] flex items-center justify-center">
                        <Play size={16} className="text-white ml-0.5" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-semibold text-[#1A1F1C]">Play Slideshow</span>
                        <p className="text-xs text-[#94A09A]">Auto-play through this memory</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* Journal-style date footer */}
                <div className="px-7 pb-6 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[#E8E2D8]" />
                    <span className="text-[11px] text-[#B8B0A4] tracking-wide italic">{formatDateJournal(memory.memory_date || memory.created_at)}</span>
                    <div className="flex-1 h-px bg-[#E8E2D8]" />
                  </div>
                </div>
              </>
            )}

            {/* ========================================================= */}
            {/*  WISDOM                                                     */}
            {/* ========================================================= */}
            {!loading && item.type === 'wisdom' && wisdom && (() => {
              const catKey = (wisdom.category || 'life_lessons').toLowerCase().replace(/\s+/g, '_')
              const catConfig = getCategoryConfig(catKey)
              const CatIcon = catConfig.icon
              const wisdomParsed = parseConversation(wisdom.response_text || '')
              exchangesRef.current = wisdomParsed.exchanges
              const displayTags = (wisdom.tags || []).filter(t => !['conversation', 'wisdom', 'knowledge'].includes(t))

              return (
                <>
                  {/* Warm header band */}
                  <div className="relative p-6 sm:p-8 overflow-hidden" style={{ background: `linear-gradient(135deg, ${catConfig.bgColor} 0%, #FDFCF9 100%)` }}>
                    <Quote size={80} className="absolute -top-2 -right-2 opacity-[0.06]" style={{ color: catConfig.color }} />
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: 'white' }}>
                        <CatIcon size={26} style={{ color: catConfig.color }} />
                      </div>
                      <div className="flex-1">
                        <h1 className="text-xl sm:text-2xl font-semibold text-[#1A1F1C] leading-snug" style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}>
                          {wisdom.prompt_text}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-[#94A09A]">
                          <span className="flex items-center gap-1"><Calendar size={14} />{formatDateShort(wisdom.created_at)}</span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/80" style={{ color: catConfig.color }}>
                            <Tag size={11} />{catConfig.label}
                          </span>
                          <span className="text-[#B8B0A4] text-xs ml-auto">{timeAgo(wisdom.created_at)}</span>
                        </div>
                        {displayTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {displayTags.map(tag => <span key={tag} className="px-2.5 py-0.5 bg-white/60 text-[#5A6660] rounded-full text-xs">{tag}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Audio player */}
                  {wisdom.audio_url && (
                    <div className="px-6 sm:px-8 pt-5">
                      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border" style={{ background: 'linear-gradient(135deg, rgba(74,53,82,0.04), rgba(196,162,53,0.04))', borderColor: 'rgba(74,53,82,0.1)' }}>
                        <div className="w-11 h-11 rounded-full bg-[#4A3552]/15 flex items-center justify-center flex-shrink-0">
                          <Volume2 size={18} className="text-[#4A3552]" />
                        </div>
                        <div className="flex-1">
                          <span className="text-[#1A1F1C] font-medium text-sm block mb-1.5">Voice Recording</span>
                          <audio controls className="w-full h-9" src={wisdom.audio_url} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conversation player */}
                  {wisdomParsed.exchanges.length > 0 && (
                    <div className="px-6 sm:px-8 pt-4">
                      <button
                        onClick={playAllExchanges}
                        className="flex items-center gap-3 w-full px-5 py-4 rounded-2xl transition-all border"
                        style={{ background: 'linear-gradient(135deg, rgba(74,53,82,0.04), rgba(196,162,53,0.04))', borderColor: 'rgba(74,53,82,0.1)' }}
                      >
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${isPlaying ? 'bg-[#4A3552]' : 'bg-[#4A3552]/15'}`}>
                          {isPlaying ? <Square size={16} className="text-white" fill="white" /> : <Play size={18} className="text-[#4A3552] ml-0.5" />}
                        </div>
                        <div className="text-left flex-1">
                          <span className="text-[#1A1F1C] font-medium text-sm">
                            {isPlaying ? `Playing ${playingPart === 'question' ? 'Question' : 'Response'} ${currentExchangeIdx + 1}/${wisdomParsed.exchanges.length}` : 'Listen to the Conversation'}
                          </span>
                          <p className="text-xs text-[#94A09A]">{isPlaying ? 'Tap to stop' : `${wisdomParsed.exchanges.length} exchanges`}</p>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Summary */}
                  {wisdomParsed.summary && (
                    <div className="mx-6 sm:mx-8 mt-5">
                      <div className="relative p-5 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #F8F0E3 0%, #EDE8DD 100%)' }}>
                        <Quote size={40} className="absolute top-3 right-4 text-[#C4A235]/15" />
                        <p className="text-[#3A3228] leading-relaxed text-lg italic relative z-10">{wisdomParsed.summary}</p>
                      </div>
                    </div>
                  )}

                  {/* Exchanges */}
                  {wisdomParsed.exchanges.length > 0 && (
                    <div className="px-6 sm:px-8 py-5 space-y-5">
                      <h2 className="text-xs font-semibold text-[#B8B0A4] uppercase tracking-wider flex items-center gap-2">
                        <Volume2 size={13} /> The Conversation
                      </h2>
                      {wisdomParsed.exchanges.map((ex, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: currentExchangeIdx >= 0 && currentExchangeIdx !== i ? 0.35 : 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                          <div className="flex items-start gap-2.5 mb-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${currentExchangeIdx === i && playingPart === 'question' ? 'bg-[#4A3552] text-white' : 'bg-[#4A3552]/10 text-[#4A3552]'}`}>Q</div>
                            <p className="text-sm text-[#5A6660] pt-1 font-medium">{ex.question}</p>
                          </div>
                          <div className={`ml-9 rounded-2xl p-4 transition-all duration-300 ${currentExchangeIdx === i && playingPart === 'answer' ? 'bg-[#4A3552]/8 border border-[#4A3552]/15 shadow-sm' : 'bg-[#F5F0EA]'}`}>
                            <p className="text-[#3A3228] text-sm leading-relaxed">{ex.answer}</p>
                            {ex.audioUrl && (
                              <button onClick={() => playAudioUrl(ex.audioUrl!)} className="mt-2.5 flex items-center gap-1.5 text-xs text-[#4A3552] hover:text-[#6a4572] transition-colors font-medium">
                                <Play size={12} fill="currentColor" /> Play this response
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Fallback text */}
                  {!wisdomParsed.summary && wisdomParsed.exchanges.length === 0 && wisdom.response_text && (
                    <div className="px-6 sm:px-8 py-5">
                      <p className="text-[#3A3228] leading-[1.8] whitespace-pre-wrap text-[15px]">{wisdom.response_text}</p>
                    </div>
                  )}

                  {/* Date footer */}
                  <div className="px-7 pb-6 pt-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-[#E8E2D8]" />
                      <span className="text-[11px] text-[#B8B0A4] tracking-wide italic">{formatDateJournal(wisdom.created_at)}</span>
                      <div className="flex-1 h-px bg-[#E8E2D8]" />
                    </div>
                  </div>
                </>
              )
            })()}

            {/* ========================================================= */}
            {/*  PHOTO (lightbox)                                           */}
            {/* ========================================================= */}
            {!loading && item.type === 'photo' && (
              <>
                <div className="relative bg-[#1A1F1C] flex items-center justify-center overflow-hidden" style={{ minHeight: 340, maxHeight: '75vh' }}>
                  {/* Warm film overlay */}
                  <div className="absolute inset-0 bg-[#D4A574]/[0.04] mix-blend-multiply pointer-events-none z-10" />
                  <Image
                    src={photoMedia?.file_url || item.imageUrl || ''}
                    alt={item.title}
                    width={672}
                    height={700}
                    unoptimized
                    className="object-contain w-full h-full relative z-0"
                    style={{ maxHeight: '75vh' }}
                  />
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-3 text-sm text-[#94A09A]">
                    <span className="flex items-center gap-1.5 bg-[#F5F0EA] rounded-full px-3 py-1.5">
                      <Calendar size={13} />{formatDateShort(item.date)}
                    </span>
                    {item.locationName && (
                      <span className="flex items-center gap-1.5 bg-[#F5F0EA] rounded-full px-3 py-1.5">
                        <MapPin size={13} />{item.locationName}
                      </span>
                    )}
                    <span className="text-[#B8B0A4] text-xs ml-auto">{timeAgo(item.date)}</span>
                  </div>
                </div>

                {/* Mini map — prefer user-specified location over EXIF metadata */}
                {(() => {
                  const mapLat = photoParentLoc?.location_lat || photoMedia?.exif_lat
                  const mapLng = photoParentLoc?.location_lng || photoMedia?.exif_lng
                  if (!mapLat || !mapLng) return null
                  return (
                  <div className="mx-5 sm:mx-6 mb-5">
                    <div className="rounded-2xl overflow-hidden border border-[#E8E2D8]">
                      <div className="relative h-[120px] bg-[#F0EDE6]">
                        <Image src={staticMapUrl(mapLat, mapLng)} alt="Location" fill unoptimized className="object-cover" sizes="600px" />
                      </div>
                    </div>
                  </div>
                  )
                })()}
              </>
            )}

            {/* Not found */}
            {!loading && !memory && !wisdom && !photoMedia && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <p className="text-[#94A09A] text-sm">This item could not be loaded.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ================================================================ */}
      {/*  SLIDESHOW OVERLAY — fullscreen auto-play                         */}
      {/* ================================================================ */}
      {slideshowMode && memory && (
        <SlideshowOverlay
          memory={memory}
          photos={photos}
          exchanges={parsed?.exchanges || []}
          collaborators={collaborators.filter(c => c.status === 'completed' && c.response_text)}
          onClose={() => setSlideshowMode(false)}
        />
      )}
    </AnimatePresence>
  )
}

/* ================================================================== */
/*  COLLAGE SLIDESHOW — memory spread as scattered pieces              */
/* ================================================================== */
const SERIF_FONT = 'var(--font-dm-serif, "DM Serif Display", serif)'

type PieceKind = 'photo' | 'title' | 'quote' | 'conversation' | 'location' | 'date' | 'people' | 'song' | 'collaborator'

interface Piece {
  id: string
  kind: PieceKind
  // Content (depends on kind)
  title?: string
  subtitle?: string
  photoUrl?: string
  question?: string
  answer?: string
  text?: string
  mapUrl?: string
  locationName?: string
  people?: string[]
  songTitle?: string
  songArt?: string
  collaboratorName?: string
  // Layout
  x: number // percentage of canvas width
  y: number // percentage of canvas height
  width: number // px
  height: number // px
  rotation: number // degrees
  z: number
}

// Seeded pseudo-random for stable layouts
function seededRandom(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5
    return ((h >>> 0) / 4294967296)
  }
}

// Horizontal layout — places pieces in a scrollable row like memorylane.so
// Each piece flows left-to-right with slight rotation; all visible at once
function layoutPieces(pieces: Omit<Piece, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'z'>[], seed: string, isMobile: boolean): Piece[] {
  const rng = seededRandom(seed)

  if (isMobile) {
    // Vertical stack on mobile
    return pieces.map((p, i) => {
      const { w, h } = sizeFor(p.kind)
      return {
        ...p,
        x: 50, y: (i * 18) + 10,
        width: w * 1.1, height: h * 1.1,
        rotation: (seededRandom(p.id)() - 0.5) * 4,
        z: i,
      }
    })
  }

  // Desktop: horizontal flow — pieces placed left-to-right with vertical offset
  // Sort by importance: title first, then photos interspersed with text
  const priority: Record<PieceKind, number> = {
    title: 0, date: 1, photo: 2, quote: 3, conversation: 4, location: 5, people: 6, song: 7, collaborator: 8,
  }
  const sorted = [...pieces].sort((a, b) => priority[a.kind] - priority[b.kind])

  // Calculate positions — pieces flow left-to-right
  // Each piece gets an x position based on cumulative width + spacing
  const placed: Piece[] = []
  const gap = 60 // px between pieces
  let currentX = 80 // start offset from left edge

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    const { w, h } = sizeFor(p.kind)

    // Vertical position: alternate above/below center line with slight jitter
    const rowOffset = (i % 3) - 1 // -1, 0, 1 (staggered rows)
    const jitter = (rng() - 0.5) * 40
    const y = 50 + (rowOffset * 15) + (jitter / 10)

    // Rotation: photos get more, text less
    const rotAmplitude = p.kind === 'photo' ? 6 : p.kind === 'title' ? 1 : 3
    const rotation = (rng() - 0.5) * 2 * rotAmplitude

    placed.push({
      ...p,
      x: currentX + w / 2, // store center x in px (not percentage for horizontal flow)
      y, // y still as percentage
      width: w,
      height: h,
      rotation,
      z: i,
    })

    currentX += w + gap
  }

  return placed
}

function sizeFor(kind: PieceKind): { w: number; h: number } {
  switch (kind) {
    case 'title':        return { w: 320, h: 120 }
    case 'photo':        return { w: 240, h: 280 }  // polaroid-ish
    case 'quote':        return { w: 240, h: 140 }
    case 'conversation': return { w: 260, h: 160 }
    case 'location':     return { w: 200, h: 160 }
    case 'date':         return { w: 140, h: 110 }
    case 'people':       return { w: 220, h: 100 }
    case 'song':         return { w: 180, h: 200 }
    case 'collaborator': return { w: 240, h: 170 }
  }
}

function SlideshowOverlay({
  memory, photos, exchanges, collaborators, onClose,
}: {
  memory: FullMemory
  photos: FullMedia[]
  exchanges: ParsedExchange[]
  collaborators: { contact_name: string; response_text: string | null }[]
  onClose: () => void
}) {
  const [zoomedId, setZoomedId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Build raw pieces from memory data
  const pieces = useMemo<Piece[]>(() => {
    const raw: Omit<Piece, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'z'>[] = []

    // Title
    raw.push({
      id: `title-${memory.id}`,
      kind: 'title',
      title: memory.title,
      subtitle: memory.mood || memory.ai_mood || undefined,
    })

    // Date
    raw.push({
      id: `date-${memory.id}`,
      kind: 'date',
      text: formatDateJournal(memory.memory_date || memory.created_at),
    })

    // Photos
    photos.forEach((p, i) => {
      raw.push({
        id: `photo-${p.id}`,
        kind: 'photo',
        photoUrl: p.file_url,
      })
    })

    // AI Summary as quote
    if (memory.ai_summary) {
      raw.push({
        id: `quote-${memory.id}`,
        kind: 'quote',
        text: memory.ai_summary,
      })
    }

    // Conversation exchanges — if parsed exchanges exist, use them
    if (exchanges.length > 0) {
      exchanges.forEach((ex, i) => {
        raw.push({
          id: `conv-${memory.id}-${i}`,
          kind: 'conversation',
          question: ex.question,
          answer: ex.answer,
        })
      })
    } else if (memory.description) {
      // Fallback: split description into paragraphs and show each as a conversation card
      const paragraphs = cleanDescription(memory.description)
      paragraphs.slice(0, 4).forEach((para, i) => {
        raw.push({
          id: `desc-${memory.id}-${i}`,
          kind: 'conversation',
          question: i === 0 ? 'The Story' : 'Continued',
          answer: para,
        })
      })
    }

    // Location — try memory location first, fall back to first photo's EXIF
    let locLat = memory.location_lat
    let locLng = memory.location_lng
    let locName = memory.location_name
    if ((locLat == null || locLng == null) && photos.length > 0) {
      const photoWithLoc = photos.find(p => p.exif_lat != null && p.exif_lng != null)
      if (photoWithLoc) {
        locLat = photoWithLoc.exif_lat ?? null
        locLng = photoWithLoc.exif_lng ?? null
      }
    }
    if (locLat != null && locLng != null) {
      raw.push({
        id: `loc-${memory.id}`,
        kind: 'location',
        mapUrl: staticMapUrl(locLat, locLng, 11, 400, 300),
        locationName: locName || undefined,
      })
    }

    // Collaborators
    collaborators.forEach((c, i) => {
      if (c.response_text) {
        raw.push({
          id: `collab-${memory.id}-${i}`,
          kind: 'collaborator',
          collaboratorName: c.contact_name,
          text: c.response_text,
        })
      }
    })

    // Debug: log what pieces got built so we can see what's missing
    console.log('[Slideshow] Built pieces:', raw.map(p => p.kind), {
      exchanges: exchanges.length,
      hasLocation: memory.location_lat != null,
      hasDescription: !!memory.description,
      photosCount: photos.length,
      collaboratorsCount: collaborators.length,
    })

    // Stable layout using memory ID as seed
    return layoutPieces(raw, memory.id, isMobile)
  }, [memory, photos, exchanges, collaborators, isMobile])

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedId) setZoomedId(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomedId, onClose])

  const zoomedPiece = zoomedId ? pieces.find(p => p.id === zoomedId) : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed left-0 right-0 bottom-0 z-[60] overflow-hidden"
      style={{
        top: '56px',
        background: '#1A1F1C',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[70] w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition-all"
      >
        <X size={18} />
      </button>

      {/* Canvas with pieces — horizontal scroll on desktop */}
      <div
        className={`relative w-full h-full ${isMobile ? 'overflow-y-auto' : 'overflow-x-auto overflow-y-hidden'}`}
        style={{ scrollbarWidth: 'thin' }}
      >
        <div
          className="relative h-full"
          style={{
            // Calculate total width needed so pieces don't clip
            width: isMobile ? '100%' : `${Math.max(1200, pieces.reduce((acc, p) => Math.max(acc, p.x + p.width / 2 + 100), 0))}px`,
            minWidth: '100%',
          }}
        >
          {pieces.map((piece, idx) => (
            <CollagePiece
              key={piece.id}
              piece={piece}
              isMobile={isMobile}
              onZoom={() => setZoomedId(piece.id)}
              entryDelay={idx * 60}
              dimmed={!!zoomedId}
            />
          ))}
        </div>
      </div>

      {/* Zoom overlay */}
      <AnimatePresence>
        {zoomedPiece && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[65] flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer"
            onClick={() => setZoomedId(null)}
          >
            <motion.div
              layoutId={`piece-${zoomedPiece.id}`}
              onClick={(e) => e.stopPropagation()}
              className="cursor-default"
              style={{ width: isMobile ? '92%' : '60%', maxWidth: 720, maxHeight: '80%' }}
            >
              <ZoomedPiece piece={zoomedPiece} onClose={() => setZoomedId(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Individual Piece ─── */
function CollagePiece({ piece, isMobile, onZoom, entryDelay, dimmed }: {
  piece: Piece
  isMobile: boolean
  onZoom: () => void
  entryDelay: number
  dimmed: boolean
}) {
  const baseStyle: React.CSSProperties = isMobile
    ? {
        position: 'relative',
        width: piece.width,
        maxWidth: '90vw',
        margin: '0 auto 24px',
      }
    : {
        position: 'absolute',
        left: `${piece.x}px`, // px for horizontal flow
        top: `${piece.y}%`,
        width: piece.width,
        transform: `translate(-50%, -50%) rotate(${piece.rotation}deg)`,
        zIndex: piece.z,
      }

  return (
    <motion.div
      layoutId={`piece-${piece.id}`}
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: dimmed ? 0.3 : 1, scale: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 180,
        damping: 20,
        delay: entryDelay / 1000,
      }}
      whileHover={!isMobile ? { scale: 1.04, rotate: 0, zIndex: 100, transition: { type: 'spring', stiffness: 400, damping: 25 } } : {}}
      style={{ ...baseStyle, cursor: 'pointer' }}
      onClick={onZoom}
    >
      <PieceContent piece={piece} zoomed={false} />
    </motion.div>
  )
}

/* ─── Zoomed Piece ─── */
function ZoomedPiece({ piece, onClose }: { piece: Piece; onClose: () => void }) {
  return (
    <div className="relative">
      <button
        onClick={onClose}
        className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white/90"
      >
        <X size={14} />
      </button>
      <PieceContent piece={piece} zoomed={true} />
    </div>
  )
}

/* ─── Piece Content (shared between collage + zoom) ─── */
function PieceContent({ piece, zoomed }: { piece: Piece; zoomed: boolean }) {
  const scale = zoomed ? 2.5 : 1

  switch (piece.kind) {
    case 'title':
      return (
        <div className="bg-[#FAF5E4] px-6 py-5 rounded-xl shadow-2xl" style={{ minHeight: zoomed ? 200 : undefined }}>
          <h1 className="text-[#1A1F1C] leading-tight font-bold" style={{
            fontFamily: SERIF_FONT,
            fontSize: zoomed ? 42 : 22,
          }}>
            {piece.title}
          </h1>
          {piece.subtitle && (
            <p className="text-[#5A6660] mt-2" style={{ fontSize: zoomed ? 16 : 11 }}>
              {piece.subtitle}
            </p>
          )}
        </div>
      )

    case 'photo':
      // Polaroid style
      return (
        <div className="bg-white shadow-2xl" style={{ padding: zoomed ? '16px 16px 48px' : '10px 10px 32px' }}>
          <div className="relative overflow-hidden bg-[#F0EDE6]" style={{ aspectRatio: '3 / 4' }}>
            {piece.photoUrl && (
              <img
                src={piece.photoUrl}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            )}
          </div>
        </div>
      )

    case 'quote':
      return (
        <div className="bg-[#F8F0E3] px-5 py-4 shadow-xl" style={{
          clipPath: 'polygon(0 0, 100% 2%, 98% 100%, 2% 98%)',
        }}>
          <Quote size={zoomed ? 24 : 14} className="text-[#C4A235]/40 mb-2" />
          <p className="text-[#3A3228] italic leading-relaxed" style={{
            fontFamily: SERIF_FONT,
            fontSize: zoomed ? 22 : 13,
          }}>
            {piece.text}
          </p>
        </div>
      )

    case 'conversation':
      return (
        <div className="bg-white rounded-lg shadow-xl px-4 py-3 border border-[#E8E2D8]">
          <p className="text-[#94A09A] uppercase tracking-wider" style={{ fontSize: zoomed ? 11 : 9 }}>
            {piece.question}
          </p>
          <p className="text-[#3A3228] mt-2 leading-relaxed" style={{
            fontFamily: SERIF_FONT,
            fontSize: zoomed ? 20 : 13,
          }}>
            {piece.answer}
          </p>
        </div>
      )

    case 'location':
      return (
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {piece.mapUrl && (
            <img src={piece.mapUrl} alt={piece.locationName} className="w-full object-cover" style={{ height: zoomed ? 300 : 120 }} />
          )}
          {piece.locationName && (
            <div className="px-3 py-2 flex items-center gap-1.5 bg-[#FAF8F4]">
              <MapPin size={zoomed ? 14 : 11} className="text-[#2D5A3D]" />
              <span className="text-[#5A6660] truncate" style={{ fontSize: zoomed ? 14 : 11 }}>
                {piece.locationName}
              </span>
            </div>
          )}
        </div>
      )

    case 'date':
      return (
        <div className="bg-white rounded shadow-lg overflow-hidden border border-[#E8E2D8]" style={{ minWidth: zoomed ? 200 : 120 }}>
          <div className="bg-[#B8562E] text-white text-center py-1" style={{ fontSize: zoomed ? 12 : 9 }}>
            {piece.text?.split(', ')[0] /* weekday */}
          </div>
          <div className="py-3 px-4 text-center">
            <p className="text-[#1A1F1C]" style={{
              fontFamily: SERIF_FONT,
              fontSize: zoomed ? 24 : 14,
            }}>
              {piece.text?.split(', ').slice(1).join(', ')}
            </p>
          </div>
        </div>
      )

    case 'collaborator':
      return (
        <div className="bg-[#FAFAF7] border border-[#E8E2D8] rounded-lg shadow-xl p-4">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#E8E2D8]">
            <div className="w-6 h-6 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center text-[10px] font-bold text-[#2D5A3D]">
              {piece.collaboratorName?.charAt(0)}
            </div>
            <span className="text-[#5A6660]" style={{ fontSize: zoomed ? 13 : 10 }}>
              {piece.collaboratorName}
            </span>
          </div>
          <p className="text-[#3A3228] italic leading-relaxed" style={{
            fontFamily: SERIF_FONT,
            fontSize: zoomed ? 18 : 12,
          }}>
            {piece.text}
          </p>
        </div>
      )

    default:
      return null
  }
}
