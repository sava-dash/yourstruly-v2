'use client'

import React, { useState, useEffect } from 'react'
import {
  Send, Calendar, Clock, CheckCircle, Mail, Plus,
  User, Users, Image as ImageIcon, Mic,
  LayoutGrid, Clock3, X, ChevronDown, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import '@/styles/page-styles.css'
import { getCategoryIcon } from '@/lib/dashboard/icons'
import PostscriptTimeline from '@/components/postscripts/PostscriptTimeline'
import PostscriptCreditsCounter from '@/components/postscripts/PostscriptCreditsCounter'
import { usePostscriptCredits } from '@/hooks/usePostscriptCredits'
import EventSuggestions, { type SuggestionContact, type SuggestionProfile, type EventSuggestion } from '@/components/postscripts/EventSuggestions'
import { createClient } from '@/lib/supabase/client'

interface PostScript {
  id: string
  title: string
  message: string | null
  recipient_name: string
  recipient_email: string | null
  circle_id: string | null
  group_id: string | null
  delivery_type: 'date' | 'event' | 'after_passing'
  delivery_date: string | null
  delivery_event: string | null
  status: 'draft' | 'scheduled' | 'sent' | 'opened' | 'cancelled'
  sent_at?: string | null
  created_at: string
  audio_url?: string | null
  reply_text?: string | null
  recipient?: {
    id: string
    full_name: string
    relationship_type: string | null
    avatar_url: string | null
  } | null
  circle?: {
    id: string
    name: string
  } | null
  attachments?: {
    id: string
    file_url: string
    file_type: string
  }[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not scheduled'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

function getStatusColor(status: string): 'yellow' | 'blue' | 'green' | 'purple' {
  switch (status) {
    case 'draft': return 'purple'
    case 'scheduled': return 'yellow'
    case 'sent': return 'blue'
    case 'opened': return 'green'
    default: return 'purple'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'draft': return <Clock size={14} />
    case 'scheduled': return <Calendar size={14} />
    case 'sent': return <Send size={14} />
    case 'opened': return <CheckCircle size={14} />
    default: return <Clock size={14} />
  }
}

function getDaysUntilDelivery(dateStr: string | null): number | null {
  if (!dateStr) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const delivery = new Date(dateStr)
  delivery.setHours(0, 0, 0, 0)
  const diffMs = delivery.getTime() - now.getTime()
  if (diffMs < 0) return null
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function isCancelEligible(ps: PostScript): boolean {
  if (ps.status !== 'scheduled') return false
  if (ps.sent_at) return false
  const now = Date.now()
  const created = ps.created_at ? new Date(ps.created_at).getTime() : 0
  const delivery = ps.delivery_date ? new Date(ps.delivery_date).getTime() : Infinity
  return (now - created < 24 * 60 * 60 * 1000) || delivery > now
}

function PostScriptCard({
  postscript,
  onRequestCancel,
}: {
  postscript: PostScript
  onRequestCancel?: (ps: PostScript) => void
}) {
  const isCircle = !!postscript.circle_id
  const displayName = postscript.circle?.name || postscript.recipient_name
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const firstImage = postscript.attachments?.find(a => a.file_type?.startsWith('image/'))
  const hasAudio = postscript.audio_url
  const daysUntil = postscript.status === 'scheduled' ? getDaysUntilDelivery(postscript.delivery_date) : null

  // Editorial status palette — keeps the four-color cycle consistent.
  const STATUS_STYLE: Record<string, { bg: string; ink: string }> = {
    draft:     { bg: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' },
    scheduled: { bg: 'var(--ed-blue, #2A5CD3)',   ink: '#fff' },
    sent:      { bg: 'var(--ed-ink, #111)',       ink: '#fff' },
    opened:    { bg: 'var(--ed-red, #E23B2E)',    ink: '#fff' },
    cancelled: { bg: 'var(--ed-muted, #6F6B61)',  ink: '#fff' },
  }
  const statusColor = STATUS_STYLE[postscript.status] || STATUS_STYLE.draft

  return (
    <Link href={`/dashboard/postscripts/${postscript.id}`}>
      <div
        className="group cursor-pointer h-full flex flex-col p-4 transition-transform hover:-translate-y-0.5 relative overflow-hidden"
        style={{
          background: 'var(--ed-paper, #FFFBF1)',
          border: '2px solid var(--ed-ink, #111)',
          borderRadius: 2,
        }}
      >
        {/* Triangular flag — status color */}
        <span
          aria-hidden
          className="absolute top-0 left-0"
          style={{
            width: 28,
            height: 28,
            background: statusColor.bg,
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
            borderRight: '2px solid var(--ed-ink, #111)',
          }}
        />

        {firstImage && (
          <div
            className="relative h-28 -mx-4 -mt-4 mb-3 overflow-hidden"
            style={{ borderBottom: '2px solid var(--ed-ink, #111)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={firstImage.file_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-start gap-3 flex-1 mt-2">
          <div className="flex-shrink-0">
            {isCircle ? (
              <span
                className="flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  background: 'var(--ed-blue, #2A5CD3)',
                  color: '#fff',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                }}
              >
                <Users size={16} />
              </span>
            ) : postscript.recipient?.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={postscript.recipient.avatar_url}
                alt={postscript.recipient_name}
                className="w-10 h-10 object-cover"
                style={{ border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
              />
            ) : (
              <span
                className="flex items-center justify-center text-sm font-bold"
                style={{
                  width: 40,
                  height: 40,
                  background: 'var(--ed-red, #E23B2E)',
                  color: '#fff',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {initials}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className="text-[14px] sm:text-[15px] text-[var(--ed-ink,#111)] leading-tight truncate"
              style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)' }}
            >
              {postscript.title.toUpperCase()}
            </h3>
            <p
              className="text-[10px] tracking-[0.16em] text-[var(--ed-muted,#6F6B61)] truncate mt-1"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              TO {displayName.toUpperCase()}{isCircle ? ' · CIRCLE' : ''}
            </p>
          </div>
        </div>

        <div
          className="flex items-center justify-between mt-3 pt-3"
          style={{ borderTop: '2px solid var(--ed-ink, #111)' }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] tracking-[0.16em]"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: statusColor.bg,
                color: statusColor.ink,
                border: '1.5px solid var(--ed-ink, #111)',
                borderRadius: 999,
              }}
            >
              {getStatusIcon(postscript.status)}
              {postscript.status.toUpperCase()}
            </span>
            {daysUntil !== null && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] tracking-[0.16em]"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  background: 'var(--ed-cream, #F3ECDC)',
                  color: 'var(--ed-ink, #111)',
                  border: '1.5px solid var(--ed-ink, #111)',
                  borderRadius: 999,
                }}
              >
                <Calendar size={9} />
                {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? '1D' : `${daysUntil}D`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[var(--ed-muted,#6F6B61)]">
            {postscript.reply_text && (
              <span
                className="flex items-center gap-0.5 text-[10px] tracking-[0.16em] text-[var(--ed-blue,#2A5CD3)]"
                style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
              >
                <Send size={10} /> REPLIED
              </span>
            )}
            {hasAudio && <Mic size={12} />}
            {postscript.attachments && postscript.attachments.length > 0 && (
              <span
                className="flex items-center gap-0.5 text-[10px]"
                style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
              >
                <ImageIcon size={12} />
                {postscript.attachments.length}
              </span>
            )}
            {isCancelEligible(postscript) && onRequestCancel && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onRequestCancel(postscript)
                }}
                className="ml-1 px-2 py-1 text-[10px] tracking-[0.16em] min-h-[28px]"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  background: 'var(--ed-paper, #FFFBF1)',
                  color: 'var(--ed-red, #E23B2E)',
                  border: '1.5px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                }}
                title="Cancel this scheduled message"
              >
                <X size={11} className="inline -mt-0.5" /> CANCEL
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

/** Group-row for F5: collapses N postscripts that share group_id into one summary tile. */
function GroupRow({
  group,
  onRequestCancel,
}: {
  group: { groupId: string; items: PostScript[] }
  onRequestCancel?: (ps: PostScript) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [showAll, setShowAll] = React.useState(false)
  const first = group.items[0]
  const total = group.items.length
  // Cap expanded lists at 5 by default to avoid a wall of cards on big groups.
  const visible = showAll ? group.items : group.items.slice(0, 5)
  const remaining = Math.max(0, total - visible.length)
  return (
    <div
      className="p-4 col-span-1 sm:col-span-2 lg:col-span-3"
      style={{
        background: 'var(--ed-paper, #FFFBF1)',
        border: '2px solid var(--ed-ink, #111)',
        borderRadius: 2,
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 text-left min-h-[44px]"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span
            className="flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              background: 'var(--ed-blue, #2A5CD3)',
              color: '#fff',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            <Users size={16} />
          </span>
          <div className="flex-1 min-w-0">
            <p
              className="text-[15px] text-[var(--ed-ink,#111)] truncate leading-tight"
              style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)' }}
            >
              {first.title.toUpperCase()}
            </p>
            <p
              className="text-[10px] tracking-[0.16em] text-[var(--ed-muted,#6F6B61)] mt-1"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              {total} RECIPIENTS · GROUP SEND
            </p>
          </div>
        </div>
        {open ? <ChevronDown size={18} className="text-[var(--ed-ink,#111)]" /> : <ChevronRight size={18} className="text-[var(--ed-ink,#111)]" />}
      </button>
      {open && (
        <>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map(ps => (
              <PostScriptCard key={ps.id} postscript={ps} onRequestCancel={onRequestCancel} />
            ))}
          </div>
          {total > 5 && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="mt-3 text-[10px] tracking-[0.18em] underline min-h-[44px] px-2"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--ed-ink, #111)' }}
            >
              {showAll ? 'SHOW LESS' : `SHOW ${remaining} MORE`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function PostScriptsPage() {
  const router = useRouter()
  const [postscripts, setPostscripts] = useState<PostScript[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [stats, setStats] = useState({ total: 0, scheduled: 0, sent: 0, opened: 0 })
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [suggestionContacts, setSuggestionContacts] = useState<SuggestionContact[]>([])
  const [suggestionProfile, setSuggestionProfile] = useState<SuggestionProfile | null>(null)
  const { canCreatePostscript, credits } = usePostscriptCredits()

  // Bug 3: load contacts + profile so EventSuggestions can render on this page.
  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: contacts }, { data: profile }] = await Promise.all([
        supabase
          .from('contacts')
          // Bug: holiday suggestions (Mother's/Father's/Valentine's Day) use
          // relationship_type to auto-pick the intended recipient. We also
          // need all contacts — not just those with a DOB — so holidays can
          // resolve even when the user hasn't entered a birthday.
          .select('id, full_name, date_of_birth, relationship_type')
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('date_of_birth')
          .eq('id', user.id)
          .maybeSingle(),
      ])
      if (contacts) setSuggestionContacts(contacts as SuggestionContact[])
      if (profile) setSuggestionProfile({ date_of_birth: (profile as any).date_of_birth || null })
    })()
  }, [])

  function handleSuggestionSelect(s: EventSuggestion) {
    // Bug 3: deep-link into /new with a pre-filled recipient + event + date.
    const iso = `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, '0')}-${String(s.date.getDate()).padStart(2, '0')}`
    const params = new URLSearchParams()
    if (s.contactId) params.set('contact_id', s.contactId)
    params.set('event_type', s.eventKey)
    params.set('delivery_date', iso)
    router.push(`/dashboard/postscripts/new?${params.toString()}`)
  }

  // F2: cancel modal lifted out of Link wrapper. Lives at page root so the
  // Link never sees its click events.
  const [cancelTarget, setCancelTarget] = useState<{ id: string; title: string } | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const confirmCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    setCancelError(null)
    try {
      const res = await fetch(`/api/postscripts/${cancelTarget.id}/cancel`, { method: 'POST' })
      if (!res.ok) {
        setCancelError("Couldn't cancel right now. Please try again.")
        return
      }
      setCancelTarget(null)
      fetchPostScripts()
    } catch {
      setCancelError("Couldn't cancel right now. Please try again.")
    } finally {
      setCancelling(false)
    }
  }

  async function fetchPostScripts() {
    setLoading(true)
    try {
      const url = filter === 'all' 
        ? '/api/postscripts' 
        : `/api/postscripts?status=${filter}`
      
      const res = await fetch(url)
      
      // Handle unauthorized - reset state to prevent data leakage
      if (res.status === 401) {
        setPostscripts([])
        setStats({ total: 0, scheduled: 0, sent: 0, opened: 0 })
        setLoading(false)
        return
      }
      
      const data = await res.json()
      
      if (data.postscripts) {
        setPostscripts(data.postscripts)
        
        // Calculate stats from all data
        if (filter === 'all') {
          const s = data.postscripts.reduce((acc: any, ps: PostScript) => {
            acc.total++
            acc[ps.status] = (acc[ps.status] || 0) + 1
            return acc
          }, { total: 0, draft: 0, scheduled: 0, sent: 0, opened: 0 })
          setStats(s)
        }
      }
    } catch (error) {
      console.error('Error fetching postscripts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPostScripts()
  }, [filter])

  // Editorial color cycle for the filter pills — same idiom as my-story.
  const filters: { key: string; label: string; bg: string; ink: string }[] = [
    { key: 'all',       label: 'ALL',       bg: 'var(--ed-red, #E23B2E)',    ink: '#fff' },
    { key: 'draft',     label: 'DRAFTS',    bg: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' },
    { key: 'scheduled', label: 'SCHEDULED', bg: 'var(--ed-blue, #2A5CD3)',   ink: '#fff' },
    { key: 'sent',      label: 'SENT',      bg: 'var(--ed-ink, #111)',       ink: '#fff' },
    { key: 'opened',    label: 'OPENED',    bg: 'var(--ed-blue, #2A5CD3)',   ink: '#fff' },
    { key: 'cancelled', label: 'CANCELLED', bg: 'var(--ed-muted, #6F6B61)',  ink: '#fff' },
  ]

  return (
    <div
      className="relative min-h-screen"
      style={{
        background: 'var(--ed-cream, #F3ECDC)',
        paddingTop: 80,
        paddingBottom: 100,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* ───── Editorial header ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start mb-6">
          <div>
            <h1
              className="text-[var(--ed-ink,#111)] leading-[0.85] tracking-[-0.02em] flex items-start gap-4"
              style={{
                fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                fontSize: 'clamp(56px, 9vw, 116px)',
              }}
            >
              <span>FUTURE<br />MESSAGES</span>
              <span
                aria-hidden
                className="shrink-0"
                style={{ width: 36, height: 36, background: 'var(--ed-red, #E23B2E)', borderRadius: 999, marginTop: 12 }}
              />
            </h1>
            <p className="mt-4 text-[14px] text-[var(--ed-muted,#6F6B61)] max-w-md">
              Words that will arrive exactly when they're needed most.
            </p>
            {!loading && stats.total > 0 && (
              <div
                className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[11px] sm:text-[12px] tracking-[0.18em]"
                style={{ fontFamily: 'var(--font-mono, monospace)' }}
              >
                <span>
                  <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-red, #E23B2E)', fontWeight: 700 }}>
                    {stats.total}
                  </span>
                  <span className="text-[var(--ed-ink,#111)]">{stats.total === 1 ? 'MESSAGE' : 'MESSAGES'}</span>
                </span>
                {(stats.scheduled || 0) > 0 && (
                  <>
                    <span aria-hidden className="text-[var(--ed-muted,#6F6B61)]">·</span>
                    <span>
                      <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-blue, #2A5CD3)', fontWeight: 700 }}>
                        {stats.scheduled || 0}
                      </span>
                      <span className="text-[var(--ed-ink,#111)]">SCHEDULED</span>
                    </span>
                  </>
                )}
                {(stats.sent || 0) > 0 && (
                  <>
                    <span aria-hidden className="text-[var(--ed-muted,#6F6B61)]">·</span>
                    <span>
                      <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-ink, #111)', fontWeight: 700 }}>
                        {stats.sent || 0}
                      </span>
                      <span className="text-[var(--ed-ink,#111)]">SENT</span>
                    </span>
                  </>
                )}
                {(stats.opened || 0) > 0 && (
                  <>
                    <span aria-hidden className="text-[var(--ed-muted,#6F6B61)]">·</span>
                    <span>
                      <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-yellow, #F2C84B)', fontWeight: 700, WebkitTextStroke: '1px var(--ed-ink, #111)' }}>
                        {stats.opened || 0}
                      </span>
                      <span className="text-[var(--ed-ink,#111)]">OPENED</span>
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <PostscriptCreditsCounter variant="compact" />
              {canCreatePostscript ? (
                <Link
                  href="/dashboard/postscripts/new"
                  className="flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-[0.18em]"
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    background: 'var(--ed-red, #E23B2E)',
                    color: '#fff',
                    border: '2px solid var(--ed-ink, #111)',
                    borderRadius: 2,
                  }}
                >
                  <Plus size={13} strokeWidth={3} />
                  ADD POSTSCRIPT
                </Link>
              ) : (
                <button
                  onClick={() => {
                    const counter = document.querySelector('[data-credits-counter]') as HTMLButtonElement
                    counter?.click()
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-[0.18em] cursor-not-allowed"
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    background: 'var(--ed-muted, #6F6B61)',
                    color: '#fff',
                    border: '2px solid var(--ed-ink, #111)',
                    borderRadius: 2,
                  }}
                  title="You need postscript credits to create a new message"
                >
                  <Plus size={13} strokeWidth={3} />
                  NO CREDITS
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Suggested events — keep behaviour, wrap in editorial frame. */}
        {(suggestionContacts.length > 0 || suggestionProfile?.date_of_birth) && (
          <div className="mb-6">
            <EventSuggestions
              contacts={suggestionContacts}
              profile={suggestionProfile}
              onSelect={handleSuggestionSelect}
            />
          </div>
        )}

        {/* Coming Up panel — yellow editorial accent. */}
        {(() => {
          const upcoming = postscripts
            .filter(ps => ps.status === 'scheduled' && ps.delivery_date)
            .sort((a, b) => new Date(a.delivery_date!).getTime() - new Date(b.delivery_date!).getTime())
            .slice(0, 3)
          if (upcoming.length === 0) return null
          return (
            <div
              className="mb-6 p-4"
              style={{
                background: 'var(--ed-yellow, #F2C84B)',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock3 size={14} className="text-[var(--ed-ink,#111)]" />
                <h3
                  className="text-[10px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                >
                  COMING UP
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {upcoming.map(ps => {
                  const days = getDaysUntilDelivery(ps.delivery_date)
                  return (
                    <Link
                      key={ps.id}
                      href={`/dashboard/postscripts/${ps.id}`}
                      className="flex items-center justify-between p-3"
                      style={{ background: 'var(--ed-paper, #FFFBF1)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="flex items-center justify-center shrink-0"
                          style={{
                            width: 32,
                            height: 32,
                            background: 'var(--ed-blue, #2A5CD3)',
                            color: '#fff',
                            border: '1.5px solid var(--ed-ink, #111)',
                            borderRadius: 999,
                          }}
                        >
                          <Send size={13} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[14px] text-[var(--ed-ink,#111)] font-semibold truncate">{ps.title}</p>
                          <p
                            className="text-[10px] tracking-[0.16em] text-[var(--ed-muted,#6F6B61)] mt-0.5"
                            style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                          >
                            TO {ps.recipient_name?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[10px] tracking-[0.18em] text-[var(--ed-red,#E23B2E)] shrink-0"
                        style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                      >
                        {days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : `${days} DAYS`}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Filter pills + view toggle */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {filters.map(f => {
              const isActive = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="px-4 py-2 text-[11px] tracking-[0.18em] transition-transform hover:-translate-y-0.5"
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    background: isActive ? f.bg : 'var(--ed-paper, #FFFBF1)',
                    color: isActive ? f.ink : 'var(--ed-ink, #111)',
                    border: '2px solid var(--ed-ink, #111)',
                    borderRadius: 999,
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          <div
            className="flex items-stretch"
            style={{ border: '2px solid var(--ed-ink, #111)', borderRadius: 2, background: 'var(--ed-paper, #FFFBF1)' }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.18em]"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: viewMode === 'grid' ? 'var(--ed-ink, #111)' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : 'var(--ed-ink, #111)',
              }}
              aria-label="Grid view"
            >
              <LayoutGrid size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">GRID</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className="flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.18em]"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: viewMode === 'timeline' ? 'var(--ed-ink, #111)' : 'transparent',
                color: viewMode === 'timeline' ? '#fff' : 'var(--ed-ink, #111)',
                borderLeft: '2px solid var(--ed-ink, #111)',
              }}
              aria-label="Timeline view"
            >
              <Clock3 size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">TIMELINE</span>
            </button>
          </div>
        </div>

        {/* PostScript list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="w-8 h-8 rounded-full animate-spin"
              style={{ border: '3px solid var(--ed-ink, #111)', borderTopColor: 'transparent' }}
            />
            <p
              className="text-[10px] tracking-[0.22em] text-[var(--ed-muted,#6F6B61)] mt-4"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              LOADING YOUR MESSAGES…
            </p>
          </div>
        ) : postscripts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center py-20 px-6"
            style={{ background: 'var(--ed-paper, #FFFBF1)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
          >
            <div
              className="flex items-center justify-center mb-4"
              style={{
                width: 56,
                height: 56,
                background: 'var(--ed-red, #E23B2E)',
                color: '#fff',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 999,
              }}
            >
              <Mail size={24} />
            </div>
            <p
              className="text-xl text-[var(--ed-ink,#111)] mb-2 leading-tight"
              style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)' }}
            >
              NO MESSAGES YET
            </p>
            <p className="text-sm text-[var(--ed-muted,#6F6B61)] mb-6 max-w-sm">
              Create your first future message to send to a loved one.
            </p>
            <Link
              href="/dashboard/postscripts/new"
              className="flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-[0.18em]"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: 'var(--ed-red, #E23B2E)',
                color: '#fff',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              <Plus size={13} strokeWidth={3} />
              CREATE POSTSCRIPT
            </Link>
          </div>
        ) : viewMode === 'timeline' ? (
          <PostscriptTimeline postscripts={postscripts as any} />
        ) : (
          (() => {
            // F5: collapse rows sharing the same group_id into a single GroupRow.
            const groups = new Map<string, PostScript[]>()
            const singles: PostScript[] = []
            for (const ps of postscripts) {
              if (ps.group_id) {
                const list = groups.get(ps.group_id) || []
                list.push(ps)
                groups.set(ps.group_id, list)
              } else {
                singles.push(ps)
              }
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from(groups.entries()).map(([gid, items]) => (
                  <GroupRow
                    key={gid}
                    group={{ groupId: gid, items }}
                    onRequestCancel={(ps) => setCancelTarget({ id: ps.id, title: ps.title })}
                  />
                ))}
                {singles.map(ps => (
                  <PostScriptCard
                    key={ps.id}
                    postscript={ps}
                    onRequestCancel={(p) => setCancelTarget({ id: p.id, title: p.title })}
                  />
                ))}
              </div>
            )
          })()
        )}
      </div>

      {/* F2: cancel confirm modal — rendered at page root, outside any Link. */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: 'rgba(17,17,17,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={() => !cancelling && setCancelTarget(null)}
        >
          <div
            className="p-6 max-w-md w-full"
            style={{
              background: 'var(--ed-cream, #F3ECDC)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-[10px] tracking-[0.22em] text-[var(--ed-red,#E23B2E)] mb-2"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              CANCEL DELIVERY
            </p>
            <h3
              className="text-[var(--ed-ink,#111)] mb-3 leading-tight"
              style={{
                fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                fontSize: 24,
              }}
            >
              STOP THE DELIVERY?
            </h3>
            <p className="text-sm text-[var(--ed-muted,#6F6B61)] mb-5">
              You can always create a new postscript later.
            </p>
            {cancelError && (
              <div
                role="alert"
                className="mb-4 px-3 py-2 text-[12px]"
                style={{
                  background: 'var(--ed-red, #E23B2E)',
                  color: '#fff',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                  fontFamily: 'var(--font-mono, monospace)',
                  letterSpacing: '0.1em',
                }}
              >
                {cancelError.toUpperCase()}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="flex-1 min-h-[44px] px-4 py-2 text-[10px] tracking-[0.18em] disabled:opacity-50"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  background: 'transparent',
                  color: 'var(--ed-ink, #111)',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                }}
              >
                KEEP IT
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                className="flex-1 min-h-[44px] px-4 py-2 text-[10px] tracking-[0.18em] disabled:opacity-50"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  background: 'var(--ed-red, #E23B2E)',
                  color: '#fff',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                }}
              >
                {cancelling ? 'CANCELLING…' : 'YES, STOP IT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
