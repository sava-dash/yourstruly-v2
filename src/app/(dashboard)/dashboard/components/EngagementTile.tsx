'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Camera, BookOpen, Brain, Heart, MessageSquare, Users, Gift, ArrowRight } from 'lucide-react'
import { TYPE_CONFIG } from '../constants'

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
  yellow: '#D9C61A',
  green: '#406A56',
  red: '#C35F33',
  blue: '#8DACAB',
  purple: '#4A3552',
}

export function EngagementTile({ nextPrompt, totalWaiting, onOpen }: EngagementTileProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const el = document.querySelector('.feed-page')
    if (el) setIsDark(el.getAttribute('data-theme') === 'dark')
    const observer = new MutationObserver(() => {
      const feedEl = document.querySelector('.feed-page')
      if (feedEl) setIsDark(feedEl.getAttribute('data-theme') === 'dark')
    })
    if (el) observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  if (!nextPrompt && totalWaiting === 0) return null

  const config = nextPrompt ? TYPE_CONFIG[nextPrompt.type] : null
  const Icon = nextPrompt ? (TYPE_ICONS[nextPrompt.type] || Sparkles) : Sparkles
  const color = config ? TYPE_COLORS[config.color] || '#C35F33' : '#C35F33'
  const promptText = nextPrompt?.promptText || 'Continue your story'

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      style={{
        cursor: 'pointer',
        borderRadius: '16px',
        padding: '20px',
        background: isDark
          ? `linear-gradient(135deg, ${color}20, ${color}10)`
          : `linear-gradient(135deg, ${color}15, ${color}08)`,
        border: `1px solid ${isDark ? `${color}40` : `${color}30`}`,
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
            background: `${color}${isDark ? '30' : '20'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}>
            <Icon size={16} />
          </div>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: color,
            opacity: 0.9,
          }}>
            {config?.label || 'Story Prompt'}
          </div>
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

      {/* Prompt Preview */}
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
        {promptText}
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
        color: color,
      }}>
        <span>Continue Your Story</span>
        <ArrowRight size={14} />
      </div>
    </motion.div>
  )
}
