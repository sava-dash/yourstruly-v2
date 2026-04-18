'use client'

import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Clock, MapPin, Heart, Brain, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface HistoryPanelProps {
  open: boolean
  onClose: () => void
}

interface HistoryItem {
  id: string
  kind: 'memory' | 'wisdom'
  title: string
  summary: string | null
  date: string
  locationName: string | null
  imageUrl: string | null
}

/**
 * Right slide-out panel: chronological history of every card the user
 * has answered (memories + knowledge entries), rendered as a vertical
 * list of thumbnail cards. Tap any row to jump to that item on the
 * My Story page. Opens from the right side where the toggle button sits.
 */
export function HistoryPanel({ open, onClose }: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open || items.length > 0) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const [memRes, knowRes] = await Promise.all([
          supabase
            .from('memories')
            .select('id, title, description, memory_date, created_at, location_name, memory_type, memory_media(file_url, is_cover)')
            .eq('user_id', user.id)
            .order('memory_date', { ascending: false, nullsFirst: false })
            .limit(100),
          supabase
            .from('knowledge_entries')
            .select('id, prompt_text, response_text, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100),
        ])
        if (cancelled) return
        // Client-side filter out non-display memory types (wisdom,
        // onboarding_gallery, media_upload, interview). Can't use
        // PostgREST .or('is.null, not.in.(...)') — commas inside the IN
        // list confuse the OR parser.
        const HIDDEN_TYPES = new Set(['wisdom', 'onboarding_gallery', 'media_upload', 'interview'])
        const memItems: HistoryItem[] = (memRes.data || [])
          .filter((m: any) => !m.memory_type || !HIDDEN_TYPES.has(m.memory_type))
          .map((m: any) => {
          const cover = (m.memory_media || []).find((mm: any) => mm.is_cover) || (m.memory_media || [])[0]
          return {
            id: m.id,
            kind: 'memory' as const,
            title: m.title || 'Untitled Memory',
            summary: (m.description || '').replace(/\s+/g, ' ').trim().slice(0, 80) || null,
            date: m.memory_date || m.created_at,
            locationName: m.location_name || null,
            imageUrl: cover?.file_url || null,
          }
        })
        const knowItems: HistoryItem[] = (knowRes.data || []).map((k: any) => ({
          id: k.id,
          kind: 'wisdom' as const,
          title: k.prompt_text || 'Untitled Wisdom',
          summary: (k.response_text || '').replace(/\s+/g, ' ').trim().slice(0, 80) || null,
          date: k.created_at,
          locationName: null,
          imageUrl: null,
        }))
        const merged = [...memItems, ...knowItems].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        setItems(merged)
      } catch (err) {
        console.error('[HistoryPanel] load failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, items.length])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const grouped = useMemo(() => {
    const groups: { label: string; items: HistoryItem[] }[] = []
    let currentLabel = ''
    for (const item of items) {
      const label = formatGroupLabel(item.date)
      if (label !== currentLabel) {
        groups.push({ label, items: [item] })
        currentLabel = label
      } else {
        groups[groups.length - 1].items.push(item)
      }
    }
    return groups
  }, [items])

  if (!mounted) return null

  const panel = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(26, 31, 28, 0.45)',
              backdropFilter: 'blur(4px)',
              zIndex: 60,
            }}
          />
          {/* Panel */}
          <motion.aside
            key="history-panel"
            role="dialog"
            aria-label="Memory history"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 'min(360px, 92vw)',
              background: '#FAFAF7',
              zIndex: 70,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-12px 0 48px rgba(0,0,0,0.22)',
              borderLeft: '1px solid #DDE3DF',
            }}
          >
            {/* Header */}
            <header
              style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid #DDE3DF',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="#2D5A3D" />
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#1A1F1C',
                      fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)',
                    }}
                  >
                    Your history
                  </h2>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A09A' }}>
                  Everything you've answered, newest first
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close history"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid #DDE3DF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5A6660',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </header>

            {/* Scroll body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
              {loading && items.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '48px 0', color: '#94A09A' }}>
                  <Loader2 size={22} className="animate-spin" />
                  <p style={{ fontSize: '13px', margin: 0 }}>Loading your history…</p>
                </div>
              )}

              {!loading && items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '56px 20px', color: '#5A6660' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🌱</div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1A1F1C' }}>Nothing here yet</p>
                  <p style={{ margin: '6px 0 0', fontSize: '12px' }}>Answer a memory or wisdom prompt to start your history.</p>
                </div>
              )}

              {grouped.map((group) => (
                <section key={group.label} style={{ marginBottom: '18px' }}>
                  <p
                    style={{
                      margin: '0 4px 8px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: '#94A09A',
                    }}
                  >
                    {group.label}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {group.items.map((item) => (
                      <HistoryRow key={`${item.kind}-${item.id}`} item={item} onClose={onClose} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(panel, document.body)
}

function HistoryRow({ item, onClose }: { item: HistoryItem; onClose: () => void }) {
  const Icon = item.kind === 'memory' ? Heart : Brain
  const accent = item.kind === 'memory' ? '#2D5A3D' : '#B8562E'
  const href =
    item.kind === 'memory'
      ? `/dashboard/my-story?openMemory=${item.id}`
      : `/dashboard/my-story?openWisdom=${item.id}`
  return (
    <Link
      href={href}
      onClick={onClose}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '10px',
        borderRadius: '14px',
        background: '#FFFFFF',
        border: '1px solid #DDE3DF',
        textDecoration: 'none',
        color: '#1A1F1C',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#F7FAF8'
        e.currentTarget.style.borderColor = '#C8D4CC'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#FFFFFF'
        e.currentTarget.style.borderColor = '#DDE3DF'
      }}
    >
      {/* Thumb */}
      <div
        style={{
          width: '58px',
          height: '58px',
          borderRadius: '10px',
          flexShrink: 0,
          overflow: 'hidden',
          background: item.imageUrl ? '#1A1F1C' : '#F5F1EA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${accent}20`,
        }}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
        ) : (
          <Icon size={22} color={accent} />
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            lineHeight: 1.3,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {item.title}
        </p>
        {item.summary && (
          <p
            style={{
              margin: '3px 0 4px',
              fontSize: '11.5px',
              color: '#5A6660',
              lineHeight: 1.35,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.summary}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '10px',
            color: '#94A09A',
            marginTop: '2px',
          }}
        >
          <span>{formatShortDate(item.date)}</span>
          {item.locationName && (
            <>
              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#DDE3DF' }} />
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '140px',
                }}
              >
                <MapPin size={9} /> {item.locationName}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

function formatShortDate(s: string): string {
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatGroupLabel(s: string): string {
  const d = new Date(s)
  if (isNaN(d.getTime())) return 'Undated'
  const now = new Date()
  const sameYear = d.getFullYear() === now.getFullYear()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 1) return 'Today'
  if (diffDays < 2) return 'Yesterday'
  if (diffDays < 7) return 'This week'
  if (diffDays < 30) return 'This month'
  if (sameYear) return d.toLocaleDateString('en-US', { month: 'long' })
  return `${d.getFullYear()}`
}
