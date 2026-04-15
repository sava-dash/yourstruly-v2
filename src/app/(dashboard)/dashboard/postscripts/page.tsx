'use client'

import React, { useState, useEffect } from 'react'
import {
  Send, Calendar, Clock, CheckCircle, Mail, Plus,
  User, Users, Image as ImageIcon, Mic,
  LayoutGrid, Clock3, X, ChevronDown, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import '@/styles/page-styles.css'
import { getCategoryIcon } from '@/lib/dashboard/icons'
import PostscriptTimeline from '@/components/postscripts/PostscriptTimeline'
import PostscriptCreditsCounter from '@/components/postscripts/PostscriptCreditsCounter'
import { usePostscriptCredits } from '@/hooks/usePostscriptCredits'

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

  return (
    <Link href={`/dashboard/postscripts/${postscript.id}`}>
      <div className="bg-white border border-[#DDE3DF] rounded-xl shadow-sm group cursor-pointer h-full flex flex-col p-4">
        {/* Image Preview */}
        {firstImage && (
          <div className="relative h-28 -mx-4 -mt-4 mb-3 rounded-t-xl overflow-hidden">
            <img src={firstImage.file_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        )}

        <div className="flex items-start gap-3 flex-1">
          {/* Recipient Avatar */}
          <div className="flex-shrink-0">
            {isCircle ? (
              <div className="w-10 h-10 rounded-full bg-[#8DACAB]
                              flex items-center justify-center text-white">
                <Users size={18} />
              </div>
            ) : postscript.recipient?.avatar_url ? (
              <img
                src={postscript.recipient.avatar_url}
                alt={postscript.recipient_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B8562E] to-[#C4A235]
                              flex items-center justify-center text-white text-sm font-medium">
                {initials}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#1A1F1C] text-sm truncate group-hover:text-[#2D5A3D] transition-colors">
              {postscript.title}
            </h3>
            <p className="text-xs text-[#94A09A] truncate">
              To: {displayName} {isCircle && <span className="text-[#8DACAB]">(Circle)</span>}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#DDE3DF]">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
              ${postscript.status === 'draft' ? 'bg-purple-50 text-purple-600' : ''}
              ${postscript.status === 'scheduled' ? 'bg-yellow-50 text-yellow-700' : ''}
              ${postscript.status === 'sent' ? 'bg-blue-50 text-blue-600' : ''}
              ${postscript.status === 'opened' ? 'bg-green-50 text-green-600' : ''}
            `}>
              {getStatusIcon(postscript.status)}
              <span className="capitalize">{postscript.status}</span>
            </span>
            {daysUntil !== null && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#2D5A3D]/10 text-[#2D5A3D] text-[10px] font-medium">
                <Calendar size={10} />
                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? '1 day' : `${daysUntil}d`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[#94A09A]">
            {postscript.reply_text && (
              <span className="flex items-center gap-0.5 text-xs text-[#2D5A3D] font-medium">
                <Send size={10} /> replied
              </span>
            )}
            {hasAudio && <Mic size={12} />}
            {postscript.attachments && postscript.attachments.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs">
                <ImageIcon size={12} />
                {postscript.attachments.length}
              </span>
            )}
            {isCancelEligible(postscript) && onRequestCancel && (
              <button
                onClick={(e) => {
                  // Block Link navigation AND stop the event from bubbling
                  // up into the <Link>'s click handler.
                  e.preventDefault()
                  e.stopPropagation()
                  onRequestCancel(postscript)
                }}
                className="ml-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#C35F33] border border-[#C35F33]/30 hover:bg-[#C35F33]/10 min-h-[28px]"
                title="Cancel this scheduled message"
              >
                <X size={12} className="inline -mt-0.5" /> Cancel
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
    <div className="bg-white border border-[#406A56]/30 rounded-xl shadow-sm p-4 col-span-1 sm:col-span-2 lg:col-span-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 text-left min-h-[44px]"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#406A56]/10 text-[#406A56] flex items-center justify-center">
            <Users size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#2d2d2d] truncate">{first.title}</p>
            <p className="text-xs text-[#666]">{total} recipients · group send</p>
          </div>
        </div>
        {open ? <ChevronDown size={18} className="text-[#666]" /> : <ChevronRight size={18} className="text-[#666]" />}
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
              className="mt-3 text-sm font-medium text-[#406A56] hover:underline min-h-[44px] px-2"
            >
              {showAll ? 'Show less' : `Show ${remaining} more`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function PostScriptsPage() {
  const [postscripts, setPostscripts] = useState<PostScript[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [stats, setStats] = useState({ total: 0, scheduled: 0, sent: 0, opened: 0 })
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const { canCreatePostscript, credits } = usePostscriptCredits()

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

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Drafts' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'sent', label: 'Sent' },
    { key: 'opened', label: 'Opened' },
    { key: 'cancelled', label: 'Cancelled' }
  ]

  return (
    <div className="page-container">
      <div className="page-background" />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-2xl font-bold text-[#1A1F1C]"
            style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
          >
            Future Messages
          </h1>

          <div className="flex items-center gap-3">
            {/* Credits Counter */}
            <PostscriptCreditsCounter variant="compact" />

            {/* Add Button */}
            {canCreatePostscript ? (
              <Link
                href="/dashboard/postscripts/new"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D5A3D] text-white text-sm font-medium hover:bg-[#244B32] transition-colors"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add a PostScript</span>
              </Link>
            ) : (
              <button
                onClick={() => {
                  const counter = document.querySelector('[data-credits-counter]') as HTMLButtonElement
                  counter?.click()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-300 text-gray-600 text-sm font-medium cursor-not-allowed"
                title="You need postscript credits to create a new message"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">No Credits</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-[#94A09A] mb-4">
          Words that will arrive exactly when they're needed most
        </p>

        {/* Stats Row — compact */}
        <div className="flex items-center gap-4 mb-6 text-sm">
          <span className="text-[#1A1F1C] font-semibold">{stats.total} messages</span>
          <span className="text-[#94A09A]">&middot;</span>
          <span className="text-[#2D5A3D]">{stats.scheduled || 0} scheduled</span>
          <span className="text-[#94A09A]">&middot;</span>
          <span className="text-blue-600">{stats.sent || 0} sent</span>
          <span className="text-[#94A09A]">&middot;</span>
          <span className="text-green-600">{stats.opened || 0} opened</span>
        </div>

        {/* Upcoming Deliveries */}
        {(() => {
          const upcoming = postscripts
            .filter(ps => ps.status === 'scheduled' && ps.delivery_date)
            .sort((a, b) => new Date(a.delivery_date!).getTime() - new Date(b.delivery_date!).getTime())
            .slice(0, 3)
          if (upcoming.length === 0) return null
          return (
            <div className="mb-6 p-4 bg-gradient-to-r from-[#2D5A3D]/5 to-[#C4A235]/5 rounded-xl border border-[#2D5A3D]/10">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] mb-3">Coming Up</h3>
              <div className="space-y-2">
                {upcoming.map(ps => {
                  const days = getDaysUntilDelivery(ps.delivery_date)
                  return (
                    <Link key={ps.id} href={`/dashboard/postscripts/${ps.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center text-[#2D5A3D]">
                          <Send size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1A1F1C]">{ps.title}</p>
                          <p className="text-xs text-[#94A09A]">To {ps.recipient_name}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-[#2D5A3D]">
                        {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Filter Tabs & View Toggle */}
        <div className="flex items-center justify-between mb-5 gap-2">
          {/* Filter Tabs */}
          <div className="flex gap-1 bg-white rounded-lg border border-[#DDE3DF] p-0.5">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${filter === f.key
                    ? 'bg-[#2D5A3D] text-white'
                    : 'text-[#5A6660] hover:bg-[#F0F0EC]'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex gap-0.5 bg-white rounded-lg border border-[#DDE3DF] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-sm
                ${viewMode === 'grid'
                  ? 'bg-[#2D5A3D] text-white'
                  : 'text-[#5A6660] hover:bg-[#F0F0EC]'
                }`}
              title="Grid view"
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-sm
                ${viewMode === 'timeline'
                  ? 'bg-[#2D5A3D] text-white'
                  : 'text-[#5A6660] hover:bg-[#F0F0EC]'
                }`}
              title="Timeline view"
            >
              <Clock3 size={16} />
              <span className="hidden sm:inline">Timeline</span>
            </button>
          </div>
        </div>

        {/* PostScript List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2D5A3D] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#94A09A] mt-3">Loading your messages...</p>
          </div>
        ) : postscripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-[#2D5A3D]" />
            </div>
            <p
              className="text-lg text-[#5A6660] mb-6 max-w-sm"
              style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
            >
              No messages yet. Create your first future message to send to a loved one.
            </p>
            <Link
              href="/dashboard/postscripts/new"
              className="px-4 py-2 rounded-lg bg-[#2D5A3D] text-white text-sm font-medium hover:bg-[#244B32] transition-colors inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Create PostScript
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
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !cancelling && setCancelTarget(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg font-semibold text-[#2d2d2d] mb-2"
              style={{ fontFamily: 'var(--font-playfair, "Playfair Display", serif)' }}
            >
              Stop the delivery?
            </h3>
            <p className="text-sm text-[#666] mb-5">
              You can always create a new postscript later.
            </p>
            {cancelError && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-[#C35F33]/30 bg-[#C35F33]/10 px-3 py-2 text-sm text-[#C35F33]"
              >
                {cancelError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="flex-1 min-h-[44px] py-2 px-4 rounded-xl bg-[#F2F1E5] text-[#2d2d2d] font-medium hover:bg-[#E8E4D6] disabled:opacity-50"
              >
                Keep it
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                className="flex-1 min-h-[44px] py-2 px-4 rounded-xl bg-[#C35F33] text-white font-medium hover:bg-[#A85128] disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Yes, stop it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
