'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ChevronLeft, Send, Calendar, Clock, CheckCircle, 
  Edit2, Trash2, Eye, User, Mail, Phone, Gift, Users,
  Video, Paperclip, RefreshCw, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import '@/styles/page-styles.css'
import Modal from '@/components/ui/Modal'
import { EVENT_LABELS, getEventIcon } from '@/lib/postscripts/events'
import { GiftSelectorModal } from '@/components/postscripts'

interface PostScript {
  id: string
  title: string
  message: string | null
  recipient_name: string
  recipient_email: string | null
  recipient_phone: string | null
  delivery_type: 'date' | 'event' | 'after_passing'
  delivery_date: string | null
  delivery_event: string | null
  delivery_recurring: boolean
  requires_confirmation: boolean
  confirmation_contacts: string[] | null
  has_gift: boolean
  gift_type: string | null
  gift_details: string | null
  gift_budget: number | null
  video_url: string | null
  status: 'draft' | 'scheduled' | 'sent' | 'opened'
  created_at: string
  sent_at: string | null
  opened_at: string | null
  access_token: string | null
  recipient?: {
    id: string
    full_name: string
    relationship_type: string | null
    avatar_url: string | null
  } | null
  attachments?: Array<{
    id: string
    file_url: string
    file_type: string
    file_name: string
  }>
}

// EVENT_LABELS imported from @/lib/postscripts/events

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not set'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return 'Not set'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

// Status configuration with PostScript coral accent
const STATUS_CONFIG = {
  draft: { 
    bg: 'bg-gray-100', 
    text: 'text-gray-600', 
    border: 'border-gray-200',
    icon: Clock,
    label: 'Draft'
  },
  scheduled: { 
    bg: 'bg-amber-50', 
    text: 'text-amber-700', 
    border: 'border-amber-200',
    icon: Calendar,
    label: 'Scheduled'
  },
  sent: { 
    bg: 'bg-blue-50', 
    text: 'text-blue-700', 
    border: 'border-blue-200',
    icon: Send,
    label: 'Sent'
  },
  opened: { 
    bg: 'bg-green-50', 
    text: 'text-green-700', 
    border: 'border-green-200',
    icon: CheckCircle,
    label: 'Opened'
  }
}

export default function PostScriptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [postscript, setPostscript] = useState<PostScript | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [giftMessage, setGiftMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Handle gift payment callback from Stripe
  useEffect(() => {
    const giftPayment = searchParams.get('gift_payment')
    if (giftPayment === 'success') {
      setGiftMessage({ type: 'success', text: 'Gift added successfully! Payment complete.' })
      // Clear URL params
      router.replace(`/dashboard/postscripts/${id}`, { scroll: false })
    } else if (giftPayment === 'cancelled') {
      setGiftMessage({ type: 'error', text: 'Gift payment was cancelled.' })
      router.replace(`/dashboard/postscripts/${id}`, { scroll: false })
    }
  }, [searchParams, id, router])

  // Auto-dismiss gift message
  useEffect(() => {
    if (giftMessage) {
      const timer = setTimeout(() => setGiftMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [giftMessage])

  useEffect(() => {
    fetchPostScript()
  }, [id])

  async function fetchPostScript() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/postscripts/${id}`)
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Failed to load PostScript')
        return
      }
      
      if (data.postscript) {
        setPostscript(data.postscript)
      }
    } catch (err) {
      console.error('Error fetching postscript:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/postscripts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/dashboard/postscripts')
      }
    } catch (error) {
      console.error('Error deleting postscript:', error)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[#C35F33] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600">Loading PostScript...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !postscript) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="glass-card-page p-8 text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#C35F33]/10 flex items-center justify-center">
              <AlertCircle size={32} className="text-[#C35F33]" />
            </div>
            <h2 className="text-xl font-bold text-[#2d2d2d] mb-2">PostScript Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'This PostScript may have been deleted or you don\'t have access to it.'}</p>
            <Link 
              href="/dashboard/postscripts" 
              className="btn-primary inline-flex"
              style={{ background: '#C35F33' }}
            >
              <ChevronLeft size={18} />
              Back to PostScripts
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const status = STATUS_CONFIG[postscript.status] || STATUS_CONFIG.draft
  const StatusIcon = status.icon

  const initials = postscript.recipient_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const getDeliveryText = () => {
    if (postscript.delivery_type === 'date') {
      return formatDate(postscript.delivery_date)
    } else if (postscript.delivery_type === 'after_passing') {
      return "After I'm gone"
    } else {
      return EVENT_LABELS[postscript.delivery_event || ''] || postscript.delivery_event
    }
  }
  
  const DeliveryIcon = postscript.delivery_type === 'event' 
    ? getEventIcon(postscript.delivery_event) 
    : Calendar

  return (
    <div className="page-container">
      {/* Warm background */}
      <div className="page-background">
        <div className="page-blob page-blob-1" style={{ background: 'linear-gradient(135deg, #C35F3340, #D9C61A30)' }} />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      {/* Gift payment toast */}
      {giftMessage && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 ${
          giftMessage.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {giftMessage.type === 'success' ? (
            <CheckCircle size={20} className="text-green-500" />
          ) : (
            <AlertCircle size={20} className="text-red-500" />
          )}
          <span className="font-medium">{giftMessage.text}</span>
          <button 
            onClick={() => setGiftMessage(null)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      )}

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <Link 
            href="/dashboard/postscripts" 
            className="page-header-back"
          >
            <ChevronLeft size={20} />
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/dashboard/postscripts/new?edit=${id}`)}
              className="p-2.5 bg-white/80 backdrop-blur-sm text-gray-500 hover:text-[#C35F33] 
                       rounded-xl transition-all border border-gray-200 shadow-sm hover:border-[#C35F33]/30"
              title="Edit PostScript"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2.5 bg-white/80 backdrop-blur-sm text-gray-500 hover:text-red-500 
                       rounded-xl transition-all border border-gray-200 shadow-sm hover:border-red-200"
              title="Delete PostScript"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        {/* Hero Card with Recipient Info */}
        <div className="glass-card-page-strong overflow-hidden mb-6">
          {/* Coral gradient header */}
          <div className="bg-gradient-to-br from-[#C35F33] via-[#D97B4A] to-[#D9C61A] p-6 text-white">
            <div className="flex items-start gap-4">
              {/* Recipient Avatar */}
              {postscript.recipient?.avatar_url ? (
                <img 
                  src={postscript.recipient.avatar_url} 
                  alt={postscript.recipient_name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center 
                              text-white font-bold text-xl border-2 border-white/30 shadow-lg">
                  {initials}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-1 truncate">{postscript.title}</h1>
                <p className="text-white/90 flex items-center gap-2">
                  <span>To: {postscript.recipient_name}</span>
                  {postscript.recipient?.relationship_type && (
                    <>
                      <span className="text-white/50">•</span>
                      <span className="text-white/70">{postscript.recipient.relationship_type}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Status Badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.bg} ${status.text} border ${status.border}`}>
                <StatusIcon size={14} />
                <span>{status.label}</span>
              </div>
            </div>
          </div>

          {/* Delivery Info Bar */}
          <div className="px-6 py-4 bg-[#F2F1E5]/50 border-b border-gray-100 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <DeliveryIcon size={16} className="text-[#C35F33]" />
              <span className="text-sm font-medium">{getDeliveryText()}</span>
            </div>
            
            {postscript.delivery_recurring && (
              <div className="flex items-center gap-1.5 text-amber-600 text-sm">
                <RefreshCw size={14} />
                <span>Repeats annually</span>
              </div>
            )}
            
            {postscript.requires_confirmation && (
              <div className="flex items-center gap-1.5 text-[#406A56] text-sm">
                <Users size={14} />
                <span>Requires confirmation</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content - Message */}
          <div className="md:col-span-2 space-y-6">
            {/* Message Card */}
            <div className="glass-card-page p-6">
              <h3 className="text-xs font-semibold text-[#C35F33] uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#C35F33]/10 flex items-center justify-center">
                  <Mail size={12} className="text-[#C35F33]" />
                </div>
                Message
              </h3>
              <div className="prose prose-sm max-w-none">
                {postscript.message ? (
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{postscript.message}</p>
                ) : (
                  <p className="text-gray-400 italic">No message content yet</p>
                )}
              </div>
            </div>

            {/* Video Preview */}
            {postscript.video_url && (
              <div className="glass-card-page p-6">
                <h3 className="text-xs font-semibold text-[#C35F33] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#C35F33]/10 flex items-center justify-center">
                    <Video size={12} className="text-[#C35F33]" />
                  </div>
                  Video Message
                </h3>
                <video 
                  src={postscript.video_url} 
                  controls 
                  className="w-full rounded-xl bg-black"
                  poster="/video-poster.jpg"
                />
              </div>
            )}

            {/* Attachments Grid */}
            {postscript.attachments && postscript.attachments.length > 0 && (
              <div className="glass-card-page p-6">
                <h3 className="text-xs font-semibold text-[#C35F33] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#C35F33]/10 flex items-center justify-center">
                    <Paperclip size={12} className="text-[#C35F33]" />
                  </div>
                  Attachments ({postscript.attachments.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {postscript.attachments.map(att => {
                    const isImage = att.file_type?.startsWith('image/')
                    return (
                      <a 
                        key={att.id}
                        href={att.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group relative bg-[#F2F1E5] hover:bg-[#E8E7D8] rounded-xl p-3 transition-all border border-transparent hover:border-[#C35F33]/20"
                      >
                        {isImage ? (
                          <img 
                            src={att.file_url} 
                            alt={att.file_name}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                        ) : (
                          <div className="aspect-square flex flex-col items-center justify-center">
                            <Paperclip size={24} className="text-[#C35F33]/50 mb-2" />
                            <span className="text-xs text-gray-600 text-center truncate w-full px-2">
                              {att.file_name || 'File'}
                            </span>
                          </div>
                        )}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recipient Details Card */}
            <div className="glass-card-page p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Recipient</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#C35F33]/10 flex items-center justify-center">
                    <User size={14} className="text-[#C35F33]" />
                  </div>
                  <span className="text-gray-800 font-medium">{postscript.recipient_name}</span>
                </div>
                {postscript.recipient_email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Mail size={14} className="text-gray-500" />
                    </div>
                    <span className="text-gray-600 text-sm">{postscript.recipient_email}</span>
                  </div>
                )}
                {postscript.recipient_phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Phone size={14} className="text-gray-500" />
                    </div>
                    <span className="text-gray-600 text-sm">{postscript.recipient_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Gift Info Card */}
            {postscript.has_gift ? (
              <div className="glass-card-page p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Gift size={12} className="text-[#D9C61A]" />
                  Gift Included
                </h3>
                <div className="space-y-2 text-sm">
                  {postscript.gift_type && (
                    <p className="text-gray-700">
                      <span className="text-gray-500">Type:</span> {postscript.gift_type}
                    </p>
                  )}
                  {postscript.gift_budget && (
                    <p className="text-gray-700">
                      <span className="text-gray-500">Budget:</span> ${postscript.gift_budget}
                    </p>
                  )}
                  {postscript.gift_details && (
                    <p className="text-gray-600 mt-2">{postscript.gift_details}</p>
                  )}
                </div>
              </div>
            ) : (postscript.status === 'draft' || postscript.status === 'scheduled') && (
              <button
                onClick={() => setShowGiftModal(true)}
                className="w-full glass-card-page p-5 text-left hover:bg-rose-50/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Gift size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Add a Gift</h3>
                    <p className="text-sm text-gray-500">Surprise them with something special</p>
                  </div>
                </div>
              </button>
            )}

            {/* Timestamps Card */}
            <div className="glass-card-page p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Timeline</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-700">{formatShortDate(postscript.created_at)}</span>
                </div>
                {postscript.sent_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sent</span>
                    <span className="text-gray-700">{formatShortDate(postscript.sent_at)}</span>
                  </div>
                )}
                {postscript.opened_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Opened</span>
                    <span className="text-green-600 font-medium">{formatShortDate(postscript.opened_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Button */}
            <button 
              onClick={() => {
                if (postscript.access_token) {
                  window.open(`/postscript/${postscript.access_token}`, '_blank')
                } else {
                  alert('Preview not available - access token missing')
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white/90 backdrop-blur-sm 
                         text-[#C35F33] rounded-xl font-medium hover:bg-white transition-all
                         border border-[#C35F33]/20 hover:border-[#C35F33]/40 shadow-sm"
            >
              <Eye size={18} />
              Preview as Recipient
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)} 
        title="Delete PostScript"
        showDone={false}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
            <p className="text-gray-700">
              Are you sure you want to delete "<span className="font-semibold">{postscript.title}</span>"? 
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Gift Selector Modal */}
      <GiftSelectorModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        postscriptId={postscript.id}
        deliveryDate={postscript.delivery_date ? new Date(postscript.delivery_date) : null}
        deliveryType={postscript.delivery_type === 'after_passing' ? 'passing' : postscript.delivery_type}
        onGiftAdded={(gift) => {
          // Refresh postscript data after gift is added
          fetchPostScript()
        }}
      />
    </div>
  )
}
