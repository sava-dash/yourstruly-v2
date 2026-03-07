'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Calendar, Mic } from 'lucide-react'
import { MoodType } from '@/lib/ai/moodAnalysis'

interface Memory {
  id: string
  title: string
  description: string
  memory_date: string
  memory_type: string
  location_name: string
  ai_summary: string
  ai_mood: string
  ai_category: string
  ai_labels: string[]
  is_favorite: boolean
  mood?: MoodType | null
  memory_media?: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Strip common markdown syntax so AI-generated text renders cleanly */
export function stripMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/^#{1,6}\s+/gm, '')         // ## headers
    .replace(/\*\*(.+?)\*\*/g, '$1')     // **bold** (complete)
    .replace(/\*(.+?)\*/g, '$1')         // *italic* (complete)
    .replace(/__(.+?)__/g, '$1')         // __bold__
    .replace(/_(.+?)_/g, '$1')           // _italic_
    .replace(/^[\s]*[-*+]\s+/gm, '')     // - bullet / * bullet
    .replace(/^[\s]*\d+\.\s+/gm, '')     // 1. numbered list
    .replace(/```[\s\S]*?```/g, '')      // ```code blocks```
    .replace(/`(.+?)`/g, '$1')           // `inline code`
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [link](url)
    .replace(/^[-*_]{3,}$/gm, '')        // --- horizontal rules
    .replace(/^>\s+/gm, '')              // > blockquotes
    // Final pass — remove any dangling/unclosed markdown characters
    .replace(/[*_#`~]/g, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Only treat URLs pointing to external storage as real photos (not local /images/ paths) */
function isRealImageUrl(url?: string): boolean {
  if (!url) return false
  return url.startsWith('http://') || url.startsWith('https://')
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// ── Themes ─────────────────────────────────────────────────────────────────────

const TEXT_CARD_THEMES: Record<string, { bg: string; accent: string; text: string }> = {
  family:      { bg: 'linear-gradient(135deg, #FDF8F3 0%, #F5EDE4 100%)', accent: '#C35F33', text: '#3d2d20' },
  travel:      { bg: 'linear-gradient(135deg, #EDF6F4 0%, #D4EDE8 100%)', accent: '#406A56', text: '#1d3028' },
  celebration: { bg: 'linear-gradient(135deg, #FFFBEA 0%, #FFF3B0 100%)', accent: '#8a7c08', text: '#3d3000' },
  career:      { bg: 'linear-gradient(135deg, #F0EDF8 0%, #E4DCF0 100%)', accent: '#4A3552', text: '#241a30' },
  nature:      { bg: 'linear-gradient(135deg, #EDF6EE 0%, #D4EBDA 100%)', accent: '#2d6a34', text: '#1a3a1e' },
  food:        { bg: 'linear-gradient(135deg, #FFF0EA 0%, #FFE0D0 100%)', accent: '#C35F33', text: '#4d2010' },
  friends:     { bg: 'linear-gradient(135deg, #FFF0F8 0%, #FFD9EE 100%)', accent: '#9b3569', text: '#4d1535' },
  everyday:    { bg: 'linear-gradient(135deg, #F5F5F0 0%, #EAEAE0 100%)', accent: '#555545', text: '#333320' },
  default:     { bg: 'linear-gradient(135deg, #FDF8F3 0%, #F0EBE2 100%)', accent: '#C35F33', text: '#3d2d20' },
}

const MOOD_THEMES: Record<string, { bg: string; accent: string; text: string }> = {
  joyful:      { bg: 'linear-gradient(135deg, #FFFBEA 0%, #FFF3B0 100%)', accent: '#D9A000', text: '#4d3800' },
  loving:      { bg: 'linear-gradient(135deg, #FFF0F5 0%, #FFD9E8 100%)', accent: '#C03070', text: '#4d1535' },
  grateful:    { bg: 'linear-gradient(135deg, #F0F8EE 0%, #DCF0D5 100%)', accent: '#3d7a30', text: '#1a3515' },
  peaceful:    { bg: 'linear-gradient(135deg, #EDF4FB 0%, #D5E8F5 100%)', accent: '#2d6090', text: '#0d2535' },
  nostalgic:   { bg: 'linear-gradient(135deg, #F5F0FA 0%, #E8DCFA 100%)', accent: '#6040a0', text: '#281545' },
  proud:       { bg: 'linear-gradient(135deg, #FFFBEA 0%, #FFE9A0 100%)', accent: '#9a7800', text: '#4d3a00' },
  bittersweet: { bg: 'linear-gradient(135deg, #F5F0EA 0%, #E8DDD0 100%)', accent: '#906040', text: '#3d2510' },
  reflective:  { bg: 'linear-gradient(135deg, #F0EDF8 0%, #E0DBF0 100%)', accent: '#504070', text: '#20163a' },
}

const INTERVIEW_THEME = {
  bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 80%, #0f3460 100%)',
  accent: '#D9C61A',
  text: '#ffffff',
  sub: 'rgba(255,255,255,0.55)',
}

function getTheme(memory: Memory) {
  if (memory.mood && MOOD_THEMES[memory.mood]) return MOOD_THEMES[memory.mood]
  if (memory.ai_category && TEXT_CARD_THEMES[memory.ai_category]) return TEXT_CARD_THEMES[memory.ai_category]
  return TEXT_CARD_THEMES.default
}

// ── Interview Card ─────────────────────────────────────────────────────────────
function InterviewCard({ memory }: { memory: Memory }) {
  const raw = memory.ai_summary || memory.description || ''
  const displayText = stripMarkdown(raw)
  const snippet = displayText.length > 90 ? displayText.slice(0, 87) + '…' : displayText

  return (
    <Link href={`/dashboard/memories/${memory.id}`} className="block group">
      <div
        className="relative aspect-square rounded-xl overflow-hidden flex flex-col justify-between p-3 transition-transform duration-200 group-hover:scale-[1.02]"
        style={{ background: INTERVIEW_THEME.bg }}
      >
        {/* Stars */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{ left: `${15 + i * 15}%`, top: `${10 + (i % 3) * 20}%`, opacity: 0.3 + (i % 3) * 0.2 }}
          />
        ))}

        {/* Mic badge */}
        <div className="relative z-10 flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-[#D9C61A]/20 flex items-center justify-center">
            <Mic size={10} className="text-[#D9C61A]" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: INTERVIEW_THEME.accent }}>
            Interview
          </span>
        </div>

        {/* Quote text */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-1">
          <p
            className="text-[13px] leading-snug line-clamp-3"
            style={{ color: INTERVIEW_THEME.text, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
          >
            {snippet || stripMarkdown(memory.title)}
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[10px] font-semibold line-clamp-1 mb-0.5" style={{ color: INTERVIEW_THEME.accent }}>
            {stripMarkdown(memory.title)}
          </p>
          {memory.memory_date && (
            <span className="flex items-center gap-0.5 text-[9px]" style={{ color: INTERVIEW_THEME.sub }}>
              <Calendar size={8} />
              {formatDate(memory.memory_date)}
            </span>
          )}
        </div>

        {/* Gold bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #D9C61A, #C35F33)' }} />
      </div>
    </Link>
  )
}

// ── Text Card ─────────────────────────────────────────────────────────────────
function TextCard({ memory }: { memory: Memory }) {
  const theme = getTheme(memory)
  const raw = memory.ai_summary || memory.description || ''
  const displayText = stripMarkdown(raw)
  const snippet = displayText.length > 90 ? displayText.slice(0, 87) + '…' : displayText
  const cleanTitle = stripMarkdown(memory.title)

  return (
    <Link href={`/dashboard/memories/${memory.id}`} className="block group">
      <div
        className="relative aspect-square rounded-xl overflow-hidden flex flex-col justify-between p-3 transition-transform duration-200 group-hover:scale-[1.02]"
        style={{ background: theme.bg }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
          style={{ background: `linear-gradient(90deg, ${theme.accent}99, ${theme.accent}22)` }}
        />

        {/* Large quote mark */}
        <div
          className="absolute top-1 left-2 text-5xl leading-none select-none"
          style={{ color: `${theme.accent}18`, fontFamily: 'Georgia, serif' }}
        >
          ❝
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col pt-3">
          <p
            className="text-[13px] leading-snug line-clamp-3 flex-1"
            style={{ color: theme.text, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
          >
            {snippet || cleanTitle}
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-1 space-y-0.5">
          <p className="text-[11px] font-semibold line-clamp-1" style={{ color: theme.accent }}>
            {cleanTitle}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {memory.memory_date && (
              <span className="flex items-center gap-0.5 text-[9px]" style={{ color: `${theme.text}88` }}>
                <Calendar size={8} />
                {formatDate(memory.memory_date)}
              </span>
            )}
            {memory.location_name && (
              <span className="flex items-center gap-0.5 text-[9px]" style={{ color: `${theme.text}88` }}>
                <MapPin size={8} />
                {memory.location_name.split(',')[0]}
              </span>
            )}
          </div>
        </div>

        {/* Bottom quote mark */}
        <div
          className="absolute bottom-0 right-1 text-4xl leading-none select-none"
          style={{ color: `${theme.accent}0f`, fontFamily: 'Georgia, serif' }}
        >
          ❞
        </div>
      </div>
    </Link>
  )
}

// ── Photo Card ─────────────────────────────────────────────────────────────────
function PhotoCard({ memory, coverUrl }: { memory: Memory; coverUrl: string }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (imgFailed) return <TextCard memory={memory} />

  const cleanTitle = stripMarkdown(memory.title)

  return (
    <Link href={`/dashboard/memories/${memory.id}`} className="block group">
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
        <img
          src={coverUrl}
          alt={cleanTitle}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImgFailed(true)}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="text-white text-[11px] font-medium leading-tight line-clamp-2 drop-shadow">
            {cleanTitle}
          </p>
        </div>
      </div>
    </Link>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function LifeMemoryCard({ memory }: { memory: Memory }) {
  // Interview memories → special dark editorial card
  if (memory.memory_type === 'interview') {
    return <InterviewCard memory={memory} />
  }

  // Only use media with real external URLs as photos (not local /images/ placeholders)
  const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
  const isRealPhoto = coverMedia &&
    isRealImageUrl(coverMedia.file_url) &&
    (coverMedia.file_type?.startsWith('image/') ||
     /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(coverMedia.file_url || ''))

  if (isRealPhoto && coverMedia?.file_url) {
    return <PhotoCard memory={memory} coverUrl={coverMedia.file_url} />
  }

  return <TextCard memory={memory} />
}
