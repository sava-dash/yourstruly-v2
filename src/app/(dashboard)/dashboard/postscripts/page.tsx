'use client'

import React, { useState, useEffect } from 'react'
import { 
  Send, Calendar, Clock, CheckCircle, Mail, Plus,
  User, Users, Image as ImageIcon, Mic,
  LayoutGrid, Clock3
} from 'lucide-react'
import Link from 'next/link'
import '@/styles/page-styles.css'
import '@/styles/engagement.css'
import '@/styles/home.css'
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

  return (
    <Link href={`/dashboard/postscripts/${postscript.id}`}>
      <div className="bubble-tile glass-card group cursor-pointer h-full flex flex-col">
        <div className="bubble-content flex flex-col h-full">
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
              <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-[#B8562E] transition-colors">
                {postscript.title}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                To: {displayName} {isCircle && <span className="text-[#8DACAB]">(Circle)</span>}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className={`bubble-type bubble-type-${getStatusColor(postscript.status)} text-[10px] flex items-center gap-1`}>
              {getStatusIcon(postscript.status)}
              <span className="capitalize">{postscript.status}</span>
            </span>
            
            <div className="flex items-center gap-2 text-gray-400">
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
      {/* Warm gradient background with blobs */}
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B8562E] to-[#C4A235] 
                              flex items-center justify-center shadow-lg">
                <Send size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Future Messages</h1>
                <p className="text-gray-600 text-sm">Schedule messages for your loved ones</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Credits Counter */}
              <PostscriptCreditsCounter variant="compact" />
              
              {/* Add Button */}
              {canCreatePostscript ? (
                <Link
                  href="/dashboard/postscripts/new"
                  className="flex items-center gap-2 bg-[#B8562E] text-white px-4 py-2 rounded-xl 
                             font-medium hover:bg-[#A84E2A] transition-colors shadow-sm"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Add a PostScript</span>
                </Link>
              ) : (
                <button
                  onClick={() => {
                    // Trigger the credits modal by clicking the counter
                    const counter = document.querySelector('[data-credits-counter]') as HTMLButtonElement
                    counter?.click()
                  }}
                  className="flex items-center gap-2 bg-gray-300 text-gray-600 px-4 py-2 rounded-xl 
                             font-medium cursor-not-allowed"
                  title="You need postscript credits to create a new message"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">No Credits</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-[#2D5A3D]">{stats.scheduled || 0}</div>
            <div className="text-xs text-gray-500">Scheduled</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.sent || 0}</div>
            <div className="text-xs text-gray-500">Sent</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-green-600">{stats.opened || 0}</div>
            <div className="text-xs text-gray-500">Opened</div>
          </div>
        </div>

        {/* Filter Tabs & View Toggle */}
        <div className="flex items-center justify-between gap-4 mb-6">
          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                  ${filter === f.key
                    ? 'bg-[#B8562E] text-white'
                    : 'glass-card text-gray-600 hover:bg-white/90'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          {/* View Toggle */}
          <div className="flex-shrink-0 flex bg-white/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200/50 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-sm
                ${viewMode === 'grid'
                  ? 'bg-[#B8562E] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
              title="Grid view"
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-sm
                ${viewMode === 'timeline'
                  ? 'bg-[#B8562E] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
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
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#B8562E] border-t-transparent" />
          </div>
        ) : postscripts.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#B8562E]/10 flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-[#B8562E]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first future message to send to a loved one.
            </p>
            <Link
              href="/dashboard/postscripts/new"
              className="inline-flex items-center gap-2 bg-[#B8562E] text-white px-6 py-3 rounded-full
                         font-medium hover:bg-[#A84E2A] transition-colors"
            >
              <Plus size={20} />
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
