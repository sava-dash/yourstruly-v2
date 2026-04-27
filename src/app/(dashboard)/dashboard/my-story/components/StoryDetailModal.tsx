'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Heart, MapPin, Calendar, ChevronLeft, ChevronRight,
  Play, Pause, Square, Quote, Tag, Volume2, MessageCircle, Send,
  Lightbulb, Briefcase, Baby, Users, BookOpen, Pencil, Camera,
  Activity, Moon, Palette, Compass, Utensils, GraduationCap, HelpCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { type StoryItem, type ContentType } from './StoryCard'

const FaceTagger = dynamic(() => import('@/components/media/FaceTagger'), { ssr: false })

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
interface StoryDetailModalProps {
  item: StoryItem
  onClose: () => void
  /**
   * Opens the "Continue this memory" cardchain overlay. Present on memory
   * and wisdom items; omitted for photos (photos are append targets, not
   * sources).
   */
  onContinue?: (item: StoryItem) => void
  /**
   * Opens an edit flow for this memory. For now wired to the same append
   * overlay (the closest existing surface), but isolated as its own prop
   * so a true editor can replace it without touching the modal.
   */
  onEdit?: (item: StoryItem) => void
}

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

/**
 * Regex for the append-delimiter wrapper written by
 * /api/memories/[id]/append. Format:
 *   <!--APPEND id="<uuid>" at="<iso>" by="<userId>-->...<!--/APPEND-->
 * Keeping it in one place so strip + extract can't drift out of sync.
 */
const APPEND_BLOCK_RE =
  /\n*<!--APPEND id="([^"]+)" at="([^"]+)" by="([^"]*)"-->([\s\S]*?)<!--\/APPEND-->/g

export interface AppendSegment {
  id: string
  at: string
  by: string
  content: string
}

/** Returns the text with all APPEND blocks removed (base memory only). */
function stripAppendBlocks(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(APPEND_BLOCK_RE, '').trim()
}

/** Extracts each APPEND segment so the detail UI can render and delete it. */
function extractAppendSegments(text: string | null | undefined): AppendSegment[] {
  if (!text) return []
  const out: AppendSegment[] = []
  for (const match of text.matchAll(APPEND_BLOCK_RE)) {
    out.push({
      id: match[1] || '',
      at: match[2] || '',
      by: match[3] || '',
      content: (match[4] || '').trim(),
    })
  }
  return out
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
export default function StoryDetailModal({ item, onClose, onContinue, onEdit }: StoryDetailModalProps) {
  const router = useRouter()
  const [creatingBackstory, setCreatingBackstory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [memory, setMemory] = useState<FullMemory | null>(null)
  const [memoryMedia, setMemoryMedia] = useState<FullMedia[]>([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [wisdom, setWisdom] = useState<FullWisdom | null>(null)
  const [photoMedia, setPhotoMedia] = useState<FullMedia | null>(null)
  const [photoParentLoc, setPhotoParentLoc] = useState<{ location_name: string | null; location_lat: number | null; location_lng: number | null } | null>(null)
  const [collaborators, setCollaborators] = useState<{ id: string; contact_name: string; contributor_name: string | null; response_text: string | null; status: string; completed_at: string | null }[]>([])
  const [slideshowMode, setSlideshowMode] = useState(false)
  const [taggingMode, setTaggingMode] = useState(false)

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
    // EDIT MEMORY button inside MemoryReadView dispatches this event so
    // we don't have to plumb yet another prop deep into the read view.
    const onEditEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id?: string } | undefined
      if (detail?.id === item.id && onEdit) onEdit(item)
    }
    document.addEventListener('memory:edit', onEditEvent)

    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => {
      window.removeEventListener('keydown', h)
      document.removeEventListener('memory:edit', onEditEvent)
    }
  }, [onClose, onEdit, item])
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

  const speakText = useCallback((_text: string): Promise<void> => {
    // TTS disabled — pending VibeVoice integration. Resolve immediately so playback skips.
    return Promise.resolve()
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
  // Strip APPEND blocks before parsing so the main body stays clean; the
  // appended segments render in their own "Continuations" section below.
  const rawText = memory?.description || wisdom?.response_text || ''
  const baseText = stripAppendBlocks(rawText)
  const appendSegments = extractAppendSegments(rawText)
  const parsed = baseText ? parseConversation(baseText) : null
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
          className={`relative w-full ${item.type === 'memory' ? 'max-w-6xl' : 'max-w-2xl'} mx-4 mt-12 mb-10 sm:mt-16`}
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

          {/* Continue — opens the AppendMemoryChain overlay. Only shown for
              memory/wisdom; photos are not a source of continuation. */}
          {onContinue && item.type !== 'photo' && (
            <button
              onClick={() => onContinue(item)}
              className="absolute -top-3 left-4 sm:left-6 z-20 flex items-center gap-1.5 px-3 py-2 shadow-xl"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.18em',
                background: 'var(--ed-red, #E23B2E)',
                color: '#fff',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              + CONTINUE
            </button>
          )}

          {/* ========== CARD ==========
              Memory uses a flat editorial sheet; wisdom/photo keep the
              soft rounded card. */}
          <div
            className={item.type === 'memory' ? 'overflow-hidden' : 'rounded-3xl shadow-2xl overflow-hidden'}
            style={
              item.type === 'memory'
                ? { background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }
                : { background: 'linear-gradient(180deg, #FDFCF9 0%, #F8F4EE 100%)' }
            }
          >

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
              <MemoryReadView
                memory={memory}
                photos={photos}
                parsed={parsed}
                baseDescription={baseText}
                appendSegments={appendSegments}
                collaborators={collaborators}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                hasLocation={hasLocation}
                loc={loc}
                cleanDescription={cleanDescription}
              />
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
                {taggingMode && photoMedia ? (
                  <div className="relative" style={{ minHeight: 340 }}>
                    <FaceTagger
                      mediaId={photoMedia.id}
                      imageUrl={photoMedia.file_url || item.imageUrl || ''}
                    />
                  </div>
                ) : (
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
                )}
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-3 text-sm text-[#94A09A] flex-wrap">
                    <span className="flex items-center gap-1.5 bg-[#F5F0EA] rounded-full px-3 py-1.5">
                      <Calendar size={13} />{formatDateShort(item.date)}
                    </span>
                    {item.locationName && (
                      <span className="flex items-center gap-1.5 bg-[#F5F0EA] rounded-full px-3 py-1.5">
                        <MapPin size={13} />{item.locationName}
                      </span>
                    )}
                    {/* Tag People button */}
                    {photoMedia && (
                      <button
                        onClick={() => setTaggingMode(t => !t)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                          taggingMode
                            ? 'bg-[#2D5A3D] text-white'
                            : 'bg-[#F5F0EA] text-[#5A6660] hover:bg-[#E8E2D8]'
                        }`}
                      >
                        <Users size={13} />{taggingMode ? 'Done Tagging' : 'Tag People'}
                      </button>
                    )}
                    {/* Add Backstory button — creates a photo_backstory prompt and opens dashboard */}
                    {photoMedia && !taggingMode && (
                      <button
                        onClick={async () => {
                          if (creatingBackstory) return
                          setCreatingBackstory(true)
                          try {
                            const res = await fetch('/api/engagement/generate-photo-prompt', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ mediaId: photoMedia.id, photoUrl: photoMedia.file_url }),
                            })
                            if (res.ok) {
                              const data = await res.json()
                              const promptId = data.promptId || data.id
                              if (promptId) {
                                router.push(`/dashboard?expand=${promptId}`)
                                return
                              }
                            }
                            // Fallback: just go to dashboard
                            router.push('/dashboard')
                          } catch {
                            router.push('/dashboard')
                          } finally {
                            setCreatingBackstory(false)
                          }
                        }}
                        disabled={creatingBackstory}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium bg-gradient-to-r from-[#B8562E]/10 to-[#C4A235]/10 border border-[#B8562E]/30 text-[#B8562E] hover:from-[#B8562E]/15 hover:to-[#C4A235]/15 transition-all disabled:opacity-50"
                      >
                        <BookOpen size={13} />
                        {creatingBackstory ? 'Creating...' : 'Add Backstory'}
                      </button>
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

/* ------------------------------------------------------------------ */
/*  SidebarCard — editorial sidebar tile (LOCATION / DATE / MOOD …)    */
/* ------------------------------------------------------------------ */
function SidebarCard({
  label,
  accent,
  icon,
  children,
}: {
  label: string
  accent: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="p-4"
      style={{
        background: 'var(--ed-paper, #FFFBF1)',
        border: '2px solid var(--ed-ink, #111)',
        borderRadius: 2,
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span
          aria-hidden
          className="flex items-center justify-center"
          style={{
            width: 22, height: 22, borderRadius: 999,
            background: accent,
            color: accent === 'var(--ed-yellow, #F2C84B)' ? 'var(--ed-ink, #111)' : '#fff',
            border: '1.5px solid var(--ed-ink, #111)',
          }}
        >
          {icon}
        </span>
        <span
          className="text-[10px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
          style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MemoryReadView — vertical scroll "Read Mode"                       */
/* ------------------------------------------------------------------ */
function MemoryReadView({
  memory,
  photos,
  parsed,
  baseDescription,
  appendSegments,
  collaborators,
  isFavorite,
  onToggleFavorite,
  hasLocation,
  loc,
  cleanDescription,
}: {
  memory: FullMemory
  photos: FullMedia[]
  parsed: { summary: string; exchanges: ParsedExchange[] } | null
  /** memory.description with APPEND blocks removed. */
  baseDescription: string
  /** Each `<!--APPEND-->` segment extracted from description. */
  appendSegments: AppendSegment[]
  collaborators: { id: string; contact_name: string; contributor_name: string | null; response_text: string | null; status: string; completed_at: string | null }[]
  isFavorite: boolean
  onToggleFavorite: () => void
  hasLocation: unknown
  loc: { lat: number | null; lng: number | null; name: string | null } | null
  cleanDescription: (text: string | null) => string[]
}) {
  const [zoomedPhoto, setZoomedPhoto] = useState<FullMedia | null>(null)

  const imagePhotos = useMemo(
    () => photos.filter(p => (p.mime_type || p.file_type || '').startsWith('image')),
    [photos]
  )
  const coverPhoto = imagePhotos.find(p => p.is_cover) || imagePhotos[0] || null
  const otherPhotos = imagePhotos.filter(p => p.id !== coverPhoto?.id)

  const paragraphs = useMemo(() => {
    if (parsed && parsed.exchanges.length > 0) return []
    return cleanDescription(baseDescription)
  }, [parsed, baseDescription, cleanDescription])

  // Local copy so we can hide a segment immediately after a successful DELETE
  // without waiting for a full page refetch.
  const [segments, setSegments] = useState<AppendSegment[]>(appendSegments)
  useEffect(() => { setSegments(appendSegments) }, [appendSegments])

  const handleDeleteSegment = useCallback(async (segmentId: string) => {
    if (!confirm('Remove this addition? This only removes the appended content; the original memory stays.')) return
    try {
      const res = await fetch(`/api/memories/${memory.id}/append/${segmentId}`, { method: 'DELETE' })
      if (res.ok) {
        setSegments((s) => s.filter((seg) => seg.id !== segmentId))
      } else {
        console.error('[detail] delete segment failed', await res.text())
      }
    } catch (err) {
      console.error('[detail] delete segment error', err)
    }
  }, [memory.id])

  const completedCollabs = collaborators.filter(c => c.status === 'completed' && c.response_text)

  // Editorial palette cycle for the bottom tag chips.
  const TAG_PALETTE = [
    { bg: 'var(--ed-red, #E23B2E)',    fg: '#fff' },
    { bg: 'var(--ed-blue, #2A5CD3)',   fg: '#fff' },
    { bg: 'var(--ed-yellow, #F2C84B)', fg: 'var(--ed-ink, #111)' },
    { bg: 'var(--ed-ink, #111)',       fg: '#fff' },
  ]

  // Aggregate "synopsis category" tags. Prefers human-curated `tags`,
  // falls back to ai_labels, dedupes case-insensitive.
  const tagPills = useMemo(() => {
    const raw: string[] = []
    const memTags = (memory as any).tags as string[] | null
    if (Array.isArray(memTags)) raw.push(...memTags)
    if (Array.isArray(memory.ai_labels)) raw.push(...memory.ai_labels)
    const seen = new Set<string>()
    const out: string[] = []
    for (const t of raw) {
      if (typeof t !== 'string') continue
      const key = t.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(t.trim())
    }
    return out.slice(0, 6)
  }, [memory])

  const dateFormatted = (() => {
    const src = memory.memory_date || memory.created_at
    const d = new Date(src)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  })()

  const dateUpper = (() => {
    const src = memory.memory_date || memory.created_at
    const d = new Date(src)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
  })()

  const moodLabel = (memory.ai_mood || memory.mood || '').trim()

  return (
    <>
      <article className="flex flex-col">
        {/* ───── Top breadcrumb-style row ───── */}
        <div className="flex items-center justify-between px-6 sm:px-10 pt-6">
          <button
            onClick={() => onToggleFavorite() /* favorite toggle stays here visually */}
            className="opacity-0 pointer-events-none"
            aria-hidden
          />
          <button
            onClick={onToggleFavorite}
            className="ml-auto p-2 rounded-full hover:bg-black/5 transition-colors"
            aria-label="Favorite"
          >
            <Heart size={18} className={isFavorite ? 'text-[#E23B2E] fill-[#E23B2E]' : 'text-[#6F6B61]'} />
          </button>
        </div>

        {/* ───── Title block: type/date pill + big serif title + red dot ───── */}
        <header className="px-6 sm:px-10 pt-2 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <span
              aria-hidden
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: 'var(--ed-blue, #2A5CD3)' }}
            />
            <span
              className="text-[10px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              MEMORY · {dateUpper}
            </span>
          </div>
          <div className="flex items-start gap-4 sm:gap-6">
            <h1
              className="flex-1 leading-[1.05] text-[var(--ed-ink,#111)]"
              style={{
                fontFamily: 'var(--font-dm-serif, "DM Serif Display", serif)',
                fontSize: 'clamp(28px, 4.5vw, 44px)',
              }}
            >
              {memory.title}
            </h1>
            <span
              aria-hidden
              className="shrink-0"
              style={{ width: 28, height: 28, background: 'var(--ed-red, #E23B2E)', borderRadius: 999, marginTop: 8 }}
            />
          </div>
        </header>

        {/* ───── Two-column main: backstory (left) + sidebar (right) ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 px-6 sm:px-10 pb-10">
          {/* LEFT — backstory + tag chips + edit button */}
          <div className="flex flex-col gap-6 min-w-0">
            {(paragraphs.length > 0 || (parsed && parsed.exchanges.length > 0)) && (
              <section
                className="p-5 sm:p-6"
                style={{
                  background: 'var(--ed-paper, #FFFBF1)',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                }}
              >
                <h3
                  className="text-[11px] tracking-[0.22em] text-[var(--ed-ink,#111)] mb-4"
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                >
                  THE BACKSTORY
                </h3>
                {parsed && parsed.exchanges.length > 0 ? (
                  <div className="space-y-5">
                    {parsed.exchanges.map((ex, i) => (
                      <div key={i}>
                        <p
                          className="text-[10px] tracking-[0.16em] text-[var(--ed-muted,#6F6B61)] mb-1.5"
                          style={{ fontFamily: 'var(--font-mono, monospace)' }}
                        >
                          {ex.question}
                        </p>
                        <p
                          className="text-[var(--ed-ink,#111)] text-[16px] sm:text-[17px] leading-[1.7]"
                          style={{ fontFamily: 'var(--font-dm-serif, "DM Serif Display", serif)' }}
                        >
                          {ex.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paragraphs.map((p, i) => (
                      <p
                        key={i}
                        className="text-[var(--ed-ink,#111)] text-[15px] sm:text-[16px] leading-[1.65]"
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TAG PILLS — color-coded across the editorial palette */}
            {tagPills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tagPills.map((label, i) => {
                  const c = TAG_PALETTE[i % TAG_PALETTE.length]
                  return (
                    <span
                      key={label + i}
                      className="inline-flex items-center px-3 py-1.5 text-[10px] tracking-[0.18em]"
                      style={{
                        background: c.bg,
                        color: c.fg,
                        border: '2px solid var(--ed-ink, #111)',
                        borderRadius: 999,
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: 700,
                      }}
                    >
                      {label.toUpperCase()}
                    </span>
                  )
                })}
              </div>
            )}

            {/* EDIT MEMORY — opens the Continue/append flow as the closest
                existing edit path. Wire to a true editor later if needed. */}
            <button
              onClick={() => {
                // Bubble to parent via a synthesized custom event so we don't
                // have to plumb yet another prop into MemoryReadView for a
                // single button. The modal listens at the document level.
                document.dispatchEvent(new CustomEvent('memory:edit', { detail: { id: memory.id } }))
              }}
              className="self-start flex items-center gap-2 px-5 py-3"
              style={{
                background: 'var(--ed-red, #E23B2E)',
                color: '#fff',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.18em',
              }}
            >
              EDIT MEMORY
              <Pencil size={13} />
            </button>
          </div>

          {/* RIGHT — sidebar cards (location/date/mood/collaborators) + photos */}
          <aside className="flex flex-col gap-3 min-w-0">
            {memory.location_name && (
              <SidebarCard
                label="LOCATION"
                accent="var(--ed-red, #E23B2E)"
                icon={<MapPin size={13} />}
              >
                <p className="text-[15px] text-[var(--ed-ink,#111)] font-semibold">
                  {memory.location_name}
                </p>
              </SidebarCard>
            )}

            <SidebarCard
              label="DATE"
              accent="var(--ed-blue, #2A5CD3)"
              icon={<Calendar size={13} />}
            >
              <p className="text-[15px] text-[var(--ed-ink,#111)] font-semibold">
                {dateFormatted}
              </p>
            </SidebarCard>

            {moodLabel && (
              <SidebarCard
                label="MOOD"
                accent="var(--ed-yellow, #F2C84B)"
                icon={<Heart size={13} />}
              >
                <p className="text-[15px] text-[var(--ed-ink,#111)] font-semibold capitalize">
                  {moodLabel}
                </p>
              </SidebarCard>
            )}

            {completedCollabs.length > 0 && (
              <SidebarCard
                label="COLLABORATORS"
                accent="var(--ed-ink, #111)"
                icon={<MessageCircle size={13} />}
              >
                <ul className="flex flex-col gap-2.5">
                  {completedCollabs.slice(0, 4).map((c) => {
                    const name = c.contributor_name || c.contact_name
                    return (
                      <li key={c.id} className="flex items-center gap-3">
                        <span
                          className="flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{
                            width: 32, height: 32, borderRadius: 999,
                            background: 'var(--ed-blue, #2A5CD3)',
                            color: '#fff',
                            border: '2px solid var(--ed-ink, #111)',
                            fontFamily: 'var(--font-mono, monospace)',
                          }}
                        >
                          {name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] text-[var(--ed-ink,#111)] font-semibold truncate">
                            {name}
                          </p>
                          <p
                            className="text-[10px] tracking-[0.14em] text-[var(--ed-muted,#6F6B61)]"
                            style={{ fontFamily: 'var(--font-mono, monospace)' }}
                          >
                            CONTRIBUTOR
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </SidebarCard>
            )}

            {/* PHOTOS — simple grid, separate sidebar block */}
            {imagePhotos.length > 0 && (
              <SidebarCard
                label="PHOTOS"
                accent="var(--ed-yellow, #F2C84B)"
                icon={<Camera size={13} />}
              >
                <div className="grid grid-cols-3 gap-1.5">
                  {imagePhotos.slice(0, 6).map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => setZoomedPhoto(photo)}
                      className="relative aspect-square overflow-hidden focus:outline-none"
                      style={{ border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                    >
                      <Image
                        src={photo.file_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                    </button>
                  ))}
                </div>
                {imagePhotos.length > 6 && (
                  <p
                    className="text-[10px] tracking-[0.14em] text-[var(--ed-muted,#6F6B61)] mt-2"
                    style={{ fontFamily: 'var(--font-mono, monospace)' }}
                  >
                    +{imagePhotos.length - 6} MORE
                  </p>
                )}
              </SidebarCard>
            )}
          </aside>
        </div>

        {/* MAP — kept as a wide block under the two-column area */}
        {Boolean(hasLocation) && loc && loc.lat != null && loc.lng != null && staticMapUrl(loc.lat, loc.lng) && (
          <section className="px-6 sm:px-10 pb-10">
            <div
              className="relative overflow-hidden"
              style={{ border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={staticMapUrl(loc.lat, loc.lng, 10, 1200, 320)}
                alt={loc.name || 'Location'}
                className="w-full h-auto block"
              />
              {loc.name && (
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                  <p
                    className="text-white text-[11px] tracking-[0.18em]"
                    style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                  >
                    {loc.name.toUpperCase()}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* CONTINUATIONS — each appended segment with its own DELETE */}
        {segments.length > 0 && (
          <section className="px-6 sm:px-10 pb-10">
            <h3
              className="text-[11px] tracking-[0.22em] text-[var(--ed-red,#E23B2E)] mb-4"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              CONTINUATIONS · {segments.length}
            </h3>
            <div className="flex flex-col gap-3">
              {segments.map((seg) => (
                <div
                  key={seg.id}
                  className="relative p-4 pr-10"
                  style={{ background: 'var(--ed-paper, #FFFBF1)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                >
                  <p
                    className="text-[10px] tracking-[0.2em] text-[var(--ed-muted,#6F6B61)] mb-2"
                    style={{ fontFamily: 'var(--font-mono, monospace)' }}
                  >
                    ADDED {new Date(seg.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                  </p>
                  <p className="text-[14px] text-[var(--ed-ink,#111)] whitespace-pre-wrap leading-relaxed">
                    {seg.content}
                  </p>
                  <button
                    onClick={() => handleDeleteSegment(seg.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-black/5"
                    aria-label="Remove this continuation"
                    title="Remove this continuation"
                  >
                    <X size={14} className="text-[var(--ed-muted,#6F6B61)]" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FOOTER */}
        <div className="px-6 sm:px-10 pb-8">
          <div
            className="pt-4 text-center"
            style={{ borderTop: '2px solid var(--ed-ink, #111)' }}
          >
            <p
              className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)]"
              style={{ fontFamily: 'var(--font-mono, monospace)' }}
            >
              {timeAgo(memory.created_at).toUpperCase()} · SAVED TO YOUR STORY
            </p>
          </div>
        </div>
      </article>

      {/* Photo zoom overlay */}
      <AnimatePresence>
        {zoomedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setZoomedPhoto(null)}
          >
            <button
              onClick={() => setZoomedPhoto(null)}
              className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              className="relative max-w-5xl max-h-[90vh] w-full h-full"
              onClick={e => e.stopPropagation()}
            >
              <Image
                src={zoomedPhoto.file_url}
                alt=""
                fill
                className="object-contain"
                sizes="100vw"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
