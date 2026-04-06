'use client'

import React, { useState, useEffect } from 'react'
import { 
  Send, Calendar, Clock, CheckCircle, Mail, Plus,
  User, Users, Image as ImageIcon, Mic,
  LayoutGrid, Clock3
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
  delivery_type: 'date' | 'event' | 'after_passing'
  delivery_date: string | null
  delivery_event: string | null
  status: 'draft' | 'scheduled' | 'sent' | 'opened'
  created_at: string
  audio_url?: string | null
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

function PostScriptCard({ postscript }: { postscript: PostScript }) {
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
            {hasAudio && <Mic size={12} />}
            {postscript.attachments && postscript.attachments.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs">
                <ImageIcon size={12} />
                {postscript.attachments.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function PostScriptsPage() {
  const [postscripts, setPostscripts] = useState<PostScript[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [stats, setStats] = useState({ total: 0, scheduled: 0, sent: 0, opened: 0 })
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const { canCreatePostscript, credits } = usePostscriptCredits()

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
    { key: 'opened', label: 'Opened' }
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
          Schedule messages for your loved ones
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-[#DDE3DF] rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-[#1A1F1C]">{stats.total}</div>
            <div className="text-xs text-[#94A09A]">Total</div>
          </div>
          <div className="bg-white border border-[#DDE3DF] rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-[#2D5A3D]">{stats.scheduled || 0}</div>
            <div className="text-xs text-[#94A09A]">Scheduled</div>
          </div>
          <div className="bg-white border border-[#DDE3DF] rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.sent || 0}</div>
            <div className="text-xs text-[#94A09A]">Sent</div>
          </div>
          <div className="bg-white border border-[#DDE3DF] rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-green-600">{stats.opened || 0}</div>
            <div className="text-xs text-[#94A09A]">Opened</div>
          </div>
        </div>

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
          <PostscriptTimeline postscripts={postscripts} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {postscripts.map(ps => (
              <PostScriptCard key={ps.id} postscript={ps} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
