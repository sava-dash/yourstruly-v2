'use client'

import { motion } from 'framer-motion'
import { Sparkles, Camera, BookOpen, Brain, Heart, MessageSquare, Users, Gift, ArrowRight } from 'lucide-react'
import { TYPE_CONFIG } from '../constants'
import { getChapterStyle } from '@/lib/engagement/chapter-styles'

interface EngagementTileProps {
  nextPrompt: any | null
  totalWaiting: number
  onOpen: () => void
}

const TYPE_ICONS: Record<string, any> = {
  photo_backstory: Camera,
  memory_prompt: BookOpen,
  knowledge: Brain,
  connect_dots: Heart,
  quick_question: MessageSquare,
  missing_info: Users,
  tag_person: Users,
  postscript: Gift,
  favorites_firsts: Sparkles,
  recipes_wisdom: BookOpen,
  highlight: Sparkles,
  contact_info: Users,
}

const TYPE_COLORS: Record<string, string> = {
  yellow: '#C4A235',
  green: '#2D5A3D',
  red: '#B8562E',
  blue: '#8DACAB',
  purple: '#4A3552',
}

export function EngagementTile({ nextPrompt, totalWaiting, onOpen }: EngagementTileProps) {
  // Always use light theme
  const isDark = false

  if (!nextPrompt && totalWaiting === 0) return null

  const config = nextPrompt ? TYPE_CONFIG[nextPrompt.type] : null
  const Icon = nextPrompt ? (TYPE_ICONS[nextPrompt.type] || Sparkles) : Sparkles
  const chapterStyle = getChapterStyle(nextPrompt?.category || nextPrompt?.dbCategory || nextPrompt?.lifeChapter)
  const promptText = nextPrompt?.promptText || 'Continue your story'

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      style={{
        cursor: 'pointer',
        borderRadius: '20px',
        padding: '20px',
        background: chapterStyle.gradient,
        backgroundSize: '300% 300%',
        animation: 'gradientFloat 12s ease-in-out infinite',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: chapterStyle.accentColor,
          }}>
            <Icon size={16} />
          </div>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: chapterStyle.accentColor,
          }}>
            {chapterStyle.label}
          </span>
        </div>
        {totalWaiting > 0 && (
          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            color: isDark ? 'rgba(255,255,255,0.5)' : '#888',
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            padding: '3px 10px',
            borderRadius: '10px',
          }}>
            {totalWaiting} waiting
          </span>
        )}
      </div>

      {/* Prompt Preview — show only the question header */}
      <p style={{
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        color: isDark ? 'rgba(255,255,255,0.85)' : '#2d2d2d',
        margin: 0,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {promptText.split('\n---\n')[0]}
      </p>

      {/* Photo preview */}
      {nextPrompt?.photoUrl && (
        <div style={{
          width: '100%',
          height: '80px',
          borderRadius: '10px',
          backgroundImage: `url(${nextPrompt.photoUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: isDark ? '2px solid rgba(255,255,255,0.1)' : '2px solid rgba(255,255,255,0.3)',
        }} />
      )}

      {/* CTA */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: '600',
        color: chapterStyle.accentColor,
      }}>
        <span>Continue Your Story</span>
        <ArrowRight size={14} />
      </div>
    </motion.div>
  )
}
