'use client'

import { useEffect, useState, useMemo } from 'react'
import { Clock, MapPin, Heart, Brain, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface HistoryWidgetProps {
  onNavigate?: () => void
  maxHeight?: number
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
 * Inline history widget for the dashboard sidebar. Renders a scrollable,
 * chronological list of every card the user has answered (memories +
 * knowledge entries). Tapping a row jumps to that item on the My Story page.
 */
export function HistoryWidget({ onNavigate, maxHeight = 320 }: HistoryWidgetProps) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) setLoading(false); return }
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
        // Filter out non-display memory types (wisdom, onboarding_gallery,
        // media_upload, interview). Can't use PostgREST .or('is.null, not.in.(...)')
        // — commas inside the IN list confuse the OR parser.
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
        console.error('[HistoryWidget] load failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

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

  return (
    <section
      aria-label="Your history"
      style={{
        background: '#FFFFFF',
        border: '1px solid #DDE3DF',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          padding: '12px 14px 10px',
          borderBottom: '1px solid #EEF2EF',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Clock size={14} color="#2D5A3D" />
        <h3
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 700,
            color: '#1A1F1C',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Your history
        </h3>
      </header>

      <div
        className="history-widget-scroll"
        style={{
          maxHeight: `${maxHeight}px`,
          overflowY: 'auto',
          padding: '10px 12px 14px',
        }}
      >
        {loading && items.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '28px 0', color: '#94A09A' }}>
            <Loader2 size={18} className="animate-spin" />
            <p style={{ fontSize: '12px', margin: 0 }}>Loading…</p>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 10px', color: '#5A6660' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>🌱</div>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#1A1F1C' }}>Nothing yet</p>
            <p style={{ margin: '4px 0 0', fontSize: '11px' }}>Answer a prompt to start your history.</p>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.label} style={{ marginBottom: '12px' }}>
            <p
              style={{
                margin: '0 2px 6px',
                fontSize: '9.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#94A09A',
              }}
            >
              {group.label}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {group.items.map((item) => (
                <HistoryRow key={`${item.kind}-${item.id}`} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .history-widget-scroll::-webkit-scrollbar { width: 4px; }
        .history-widget-scroll::-webkit-scrollbar-track { background: transparent; }
        .history-widget-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 2px; }
      `}</style>
    </section>
  )
}

function HistoryRow({ item, onNavigate }: { item: HistoryItem; onNavigate?: () => void }) {
  const Icon = item.kind === 'memory' ? Heart : Brain
  const accent = item.kind === 'memory' ? '#2D5A3D' : '#B8562E'
  const href =
    item.kind === 'memory'
      ? `/dashboard/my-story?openMemory=${item.id}`
      : `/dashboard/my-story?openWisdom=${item.id}`
  return (
    <Link
      href={href}
      onClick={onNavigate}
      style={{
        display: 'flex',
        gap: '10px',
        padding: '8px',
        borderRadius: '10px',
        background: '#FAFAF7',
        border: '1px solid #EEF2EF',
        textDecoration: 'none',
        color: '#1A1F1C',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#F2F7F4'
        e.currentTarget.style.borderColor = '#C8D4CC'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#FAFAF7'
        e.currentTarget.style.borderColor = '#EEF2EF'
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '8px',
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
          <Icon size={18} color={accent} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
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
              margin: '2px 0 3px',
              fontSize: '10.5px',
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
            gap: '6px',
            fontSize: '9.5px',
            color: '#94A09A',
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
                  maxWidth: '120px',
                }}
              >
                <MapPin size={8} /> {item.locationName}
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
