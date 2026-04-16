'use client'

import React, { useState, useEffect, useRef, use } from 'react'
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
  reply_text: string | null
  reply_at: string | null
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
  const [showCheckoutPrompt, setShowCheckoutPrompt] = useState(searchParams.get('checkout') === 'true')
  const [giftMessage, setGiftMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  // Bug 2: track every attached postscript_gift row so we can render each one
  // as its own card with its own Pay CTA. Users who attach multiple gifts
  // (e.g., wine + chocolates) expect to see all of them on the details page.
  const [giftRows, setGiftRows] = useState<Array<{
    id: string
    payment_status: string | null
    amount_paid: number | null
    price: number | null
    name: string | null
    image_url: string | null
    gift_type: string | null
    product_id: string | null
    flex_gift_amount: number | null
    quantity: number | null
    provider_data: { brand_name?: string } | null
    description: string | null
  }>>([])
  // Per-gift payment-in-progress id (null when idle). Keeps the right card's
  // button spinning while leaving the others clickable.
  const [payingGiftId, setPayingGiftId] = useState<string | null>(null)
  const payingGift = payingGiftId !== null
  const [removingGiftId, setRemovingGiftId] = useState<string | null>(null)
  // Guard: only auto-trigger checkout once per page load.
  const autoCheckoutTriggered = useRef(false)

  // Handle gift payment callback from Stripe
  useEffect(() => {
    const giftPayment = searchParams.get('gift_payment')
    if (giftPayment === 'success') {
      setGiftMessage({ type: 'success', text: 'Gift added. Payment complete.' })
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
      const ms = giftMessage.text.includes('added') ? 1500 : 5000
      const timer = setTimeout(() => setGiftMessage(null), ms)
      return () => clearTimeout(timer)
    }
  }, [giftMessage])

  useEffect(() => {
    fetchPostScript()
  }, [id])

  // Auto-trigger Stripe checkout when arriving with ?checkout=true and an
  // unpaid gift. This fires once after the postscript + gift rows finish
  // loading so `giftUnpaid` is reliable. If the checkout call fails the
  // modal stays visible as a manual fallback.
  useEffect(() => {
    if (
      autoCheckoutTriggered.current ||
      loading ||
      !showCheckoutPrompt ||
      !postscript?.has_gift ||
      payingGift
    ) return

    // Derive unpaid status inline (mirrors `giftUnpaid` computed below but
    // we can't reference it before its declaration).
    const unpaid =
      giftRows.length === 0
        ? true
        : giftRows.some(g => (g.payment_status || 'pending') !== 'paid')

    if (!unpaid) {
      // Gift already paid — dismiss the prompt silently.
      setShowCheckoutPrompt(false)
      return
    }

    autoCheckoutTriggered.current = true
    // Kick off the checkout redirect. On failure handlePayForGift sets a
    // toast and the modal remains so the user can retry manually.
    handlePayForGift()
  }, [loading, showCheckoutPrompt, postscript, giftRows, payingGift])

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
        // Bug 2: pull the gift rows to know if payment is still pending.
        if (data.postscript.has_gift) {
          try {
            const gRes = await fetch(`/api/postscripts/${id}/gifts`)
            if (gRes.ok) {
              const gData = await gRes.json()
              setGiftRows(Array.isArray(gData.gifts) ? gData.gifts : [])
            } else {
              setGiftRows([])
            }
          } catch {
            setGiftRows([])
          }
        } else {
          setGiftRows([])
        }
      }
    } catch (err) {
      console.error('Error fetching postscript:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  // Bug 2: shared Pay-for-Gift flow. When a specific gift row is passed in
  // (multi-gift case), the payload is built from that row. Otherwise we fall
  // back to the legacy single-gift snapshot on `postscript.gift_details`.
  async function handlePayForGift(row?: {
    id: string
    name: string | null
    price: number | null
    image_url: string | null
    gift_type: string | null
    product_id: string | null
    flex_gift_amount: number | null
  }) {
    if (!postscript || payingGift) return
    // Tag the in-flight payment with the row id (or 'legacy') so only the
    // clicked card shows a spinner.
    setPayingGiftId(row?.id ?? 'legacy')
    try {
      const payload: Record<string, unknown> = {}
      if (row) {
        const isChoice =
          row.gift_type === 'choice' ||
          (typeof row.flex_gift_amount === 'number' && row.flex_gift_amount > 0)
        payload.giftType = isChoice ? 'choice' : 'product'
        if (isChoice) {
          // flex_gift_amount is in cents per checkout endpoint; convert back.
          payload.flexGiftAmount =
            (row.flex_gift_amount != null ? row.flex_gift_amount / 100 : null) ||
            row.price ||
            50
        } else {
          payload.productId = row.product_id || postscript.id
          payload.productName = row.name || 'Gift'
          payload.productImage = row.image_url || undefined
          payload.productPrice = row.price || 50
        }
      } else {
        let parsedGift: { name?: string; price?: number; image_url?: string; product_id?: string } = {}
        try { parsedGift = JSON.parse(postscript.gift_details || '{}') } catch {}
        const giftType = postscript.gift_type === 'choice' ? 'choice' : 'product'
        payload.giftType = giftType
        if (giftType === 'choice') {
          payload.flexGiftAmount = postscript.gift_budget || parsedGift.price || 50
        } else {
          payload.productId = parsedGift.product_id || postscript.id
          payload.productName = parsedGift.name || 'Gift'
          payload.productImage = parsedGift.image_url
          payload.productPrice = parsedGift.price || postscript.gift_budget || 50
        }
      }
      const res = await fetch(`/api/postscripts/${postscript.id}/gifts/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
          return
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        setGiftMessage({
          type: 'error',
          text: errData.error || "We couldn't start checkout. Please try again.",
        })
      }
    } catch {
      setGiftMessage({
        type: 'error',
        text: "We couldn't reach the payment service. Please try again.",
      })
    } finally {
      setPayingGiftId(null)
    }
  }

  async function handleRemoveGift(giftId: string) {
    if (!postscript || removingGiftId) return
    if (!window.confirm('Remove this gift? This can\'t be undone.')) return
    setRemovingGiftId(giftId)
    try {
      const res = await fetch(`/api/postscripts/${postscript.id}/gifts/${giftId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setGiftMessage({ type: 'error', text: data.error || 'Failed to remove gift' })
        return
      }
      const remaining = giftRows.filter(g => g.id !== giftId)
      setGiftRows(remaining)
      if (remaining.length === 0) {
        setPostscript(prev => prev ? { ...prev, has_gift: false } : prev)
      }
      setGiftMessage({ type: 'success', text: 'Gift removed.' })
    } catch {
      setGiftMessage({ type: 'error', text: 'Failed to remove gift. Please try again.' })
    } finally {
      setRemovingGiftId(null)
    }
  }

  // Bug 2: derive a single source of truth for whether a gift is unpaid.
  const giftUnpaid = !!postscript?.has_gift && (
    giftRows.length === 0
      ? true // legacy record with has_gift flag but no checkout row yet → needs payment
      : giftRows.some(g => (g.payment_status || 'pending') !== 'paid')
  )
  // Best-effort amount for the CTA label.
  const giftAmount: number | null = (() => {
    if (!postscript) return null
    if (postscript.gift_budget) return Number(postscript.gift_budget)
    try {
      const parsed = JSON.parse(postscript.gift_details || '{}') as { price?: number }
      if (typeof parsed.price === 'number') return parsed.price
    } catch {}
    const row = giftRows.find(g => typeof g.price === 'number')
    return row?.price ?? null
  })()

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
            <div className="w-10 h-10 border-3 border-[#B8562E] border-t-transparent rounded-full animate-spin" />
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#B8562E]/10 flex items-center justify-center">
              <AlertCircle size={32} className="text-[#B8562E]" />
            </div>
            <h2 className="text-xl font-bold text-[#2d2d2d] mb-2">PostScript Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'This PostScript may have been deleted or you don\'t have access to it.'}</p>
            <Link 
              href="/dashboard/postscripts" 
              className="btn-primary inline-flex"
              style={{ background: '#B8562E' }}
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
    <div
      className="min-h-screen px-4 py-6"
      style={{ background: 'radial-gradient(ellipse at top, #2A201A 0%, #1A1410 60%, #0F0B08 100%)' }}
    >
      {/* Warm dark background — matches slideshow */}
      <div>
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
            className="p-2 rounded-lg text-[#D4C8A0]/70 hover:text-[#C4A235] hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/dashboard/postscripts/new?edit=${id}`)}
              className="p-2.5 bg-white/10 backdrop-blur-sm text-[#D4C8A0]/70 hover:text-[#C4A235]
                       rounded-xl transition-all border border-[#C4A235]/15 hover:border-[#C4A235]/30"
              title="Edit PostScript"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2.5 bg-white/10 backdrop-blur-sm text-[#D4C8A0]/70 hover:text-red-400
                       rounded-xl transition-all border border-[#C4A235]/15 hover:border-red-400/30"
              title="Delete PostScript"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        {/* Hero — warm dark style matching slideshow */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: 'linear-gradient(165deg, rgba(62,48,35,0.92) 0%, rgba(42,32,26,0.96) 100%)',
            border: '1px solid rgba(196,162,53,0.15)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
          }}
        >
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              {/* Recipient Avatar */}
              {postscript.recipient?.avatar_url ? (
                <img
                  src={postscript.recipient.avatar_url}
                  alt={postscript.recipient_name}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-[#C4A235]/30"
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C4A235]/30 to-[#8B7320]/20 text-[#E8D84A] text-lg font-semibold flex items-center justify-center ring-2 ring-[#C4A235]/30"
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
                >
                  {initials}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h1
                  className="text-2xl sm:text-3xl text-[#F5F0E8] leading-tight mb-1"
                  style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
                >
                  {postscript.title}
                </h1>
                <p className="text-[#D4C8A0]/80 text-sm flex items-center gap-2">
                  <span>To {postscript.recipient_name}</span>
                  {postscript.recipient?.relationship_type && (
                    <>
                      <span className="text-[#D4C8A0]/40">·</span>
                      <span>{postscript.recipient.relationship_type}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Status Badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${status.bg} ${status.text} border ${status.border}`}>
                <StatusIcon size={12} />
                <span>{status.label}</span>
              </div>
            </div>

            {/* Delivery info — inline */}
            <div className="mt-5 pt-4 border-t border-[#C4A235]/10 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-[#D4C8A0]/80 text-sm">
                <DeliveryIcon size={14} className="text-[#C4A235]/60" />
                <span>{getDeliveryText()}</span>
              </div>
              {postscript.delivery_recurring && (
                <div className="flex items-center gap-1.5 text-[#C4A235]/70 text-sm">
                  <RefreshCw size={12} />
                  <span>Repeats annually</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content — single column, full width */}
        <div className="space-y-4">
            {/* Message Card */}
            <div
              className="rounded-2xl p-6 sm:p-8"
              style={{
                background: 'linear-gradient(165deg, rgba(62,48,35,0.85) 0%, rgba(42,32,26,0.92) 100%)',
                border: '1px solid rgba(196,162,53,0.12)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-semibold tracking-wide text-[#D4C8A0] flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
                >
                  <Mail size={13} className="text-[#C4A235]/60" />
                  Your Message
                </h3>
                {(postscript.status === 'draft' || postscript.status === 'scheduled') && (
                  <button
                    onClick={() => router.push(`/dashboard/postscripts/new?edit=${postscript.id}`)}
                    className="text-xs text-[#C4A235]/70 hover:text-[#C4A235] flex items-center gap-1 transition-colors"
                  >
                    <Edit2 size={11} /> Edit
                  </button>
                )}
              </div>
              {postscript.message ? (
                <p
                  className="text-[#E8DCC4] text-[15px] sm:text-[16px] leading-[1.8] whitespace-pre-wrap"
                  style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
                >
                  {postscript.message}
                </p>
              ) : (
                <p className="text-[#D4C8A0]/40 italic text-sm">No message content yet</p>
              )}
            </div>

            {/* Video Preview */}
            {postscript.video_url && (
              <SectionCard title="Video Message" icon={Video}>
                <video
                  src={postscript.video_url}
                  controls
                  className="w-full rounded-xl bg-black"
                />
              </SectionCard>
            )}

            {/* Attachments / Photos Grid */}
            {postscript.attachments && postscript.attachments.length > 0 && (
              <SectionCard title={`Attachments (${postscript.attachments.length})`} icon={Paperclip}>
                <div className="grid grid-cols-2 gap-2">
                  {postscript.attachments.map(att => {
                    const isImage = att.file_type?.startsWith('image/')
                    return (
                      <a
                        key={att.id}
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative rounded-xl overflow-hidden group"
                        style={{ border: '1px solid rgba(196,162,53,0.12)' }}
                      >
                        {isImage ? (
                          <img
                            src={att.file_url}
                            alt={att.file_name || ''}
                            className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="aspect-square flex flex-col items-center justify-center bg-[#3E3023]/50">
                            <Paperclip size={20} className="text-[#C4A235]/50 mb-2" />
                            <span className="text-[11px] text-[#D4C8A0]/60 text-center truncate w-full px-2">
                              {att.file_name || 'File'}
                            </span>
                          </div>
                        )}
                      </a>
                    )
                  })}
                </div>
              </SectionCard>
            )}

            {/* Gift Details — Bug 2: loop every attached postscript_gift row.
                Each card has its own Pay CTA when unpaid; the checkout
                endpoint creates a separate Stripe session per gift so one CTA
                per row is the simplest, matching behavior. */}
            {postscript.has_gift && (() => {
              // Compose the list of gifts to render. Prefer real rows; if the
              // record is a legacy one (has_gift=true but zero rows yet) fall
              // back to a single synthetic card derived from gift_details.
              let legacy: { name?: string; price?: number; image_url?: string } = {}
              try { legacy = JSON.parse(postscript.gift_details || '{}') } catch {}
              const renderRows: Array<{
                key: string
                row: typeof giftRows[number] | null
                name: string
                brand: string | null
                price: number | null
                image_url: string | null
                quantity: number
                paid: boolean
              }> = giftRows.length > 0
                ? giftRows.map(r => ({
                    key: r.id,
                    row: r,
                    name: r.name || postscript.gift_type || 'Gift',
                    brand: r.provider_data?.brand_name || null,
                    price: r.price,
                    image_url: r.image_url,
                    quantity: r.quantity ?? 1,
                    paid: (r.payment_status || 'pending') === 'paid',
                  }))
                : [{
                    key: 'legacy',
                    row: null,
                    name: legacy.name || postscript.gift_type || 'Gift',
                    brand: null,
                    price: postscript.gift_budget ?? legacy.price ?? null,
                    image_url: legacy.image_url || null,
                    quantity: 1,
                    paid: false,
                  }]
              const grandTotal = renderRows.reduce((a, r) => a + ((r.price || 0) * r.quantity), 0)
              return (
                <section>
                  <div className="flex items-baseline justify-between mb-3">
                    <h2
                      className="text-[#E8DCC4] text-[22px]"
                      style={{ fontFamily: 'var(--font-playfair, "Playfair Display", serif)' }}
                    >
                      Your gifts
                    </h2>
                    <span className="text-[13px] text-[#D4C8A0]/70" style={{ fontFamily: 'var(--font-inter-tight, "Inter Tight", sans-serif)' }}>
                      Total: ${grandTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {renderRows.map(rr => {
                      const unitPrice = typeof rr.price === 'number' && !Number.isNaN(rr.price) ? rr.price : null
                      const lineTotal = unitPrice !== null ? unitPrice * rr.quantity : null
                      const amountLabel = lineTotal !== null ? `$${lineTotal.toFixed(2)}` : ''
                      const thisPaying = payingGiftId === (rr.row?.id ?? 'legacy')
                      const thisRemoving = removingGiftId === (rr.row?.id ?? 'legacy')
                      const brandQty = [rr.brand, rr.quantity > 1 ? `Qty: ${rr.quantity}` : null].filter(Boolean).join(' \u00b7 ')
                      return (
                        <div
                          key={rr.key}
                          className="rounded-2xl p-4"
                          style={{
                            background: 'linear-gradient(165deg, rgba(62,48,35,0.85) 0%, rgba(42,32,26,0.92) 100%)',
                            border: '1px solid rgba(196,162,53,0.12)',
                          }}
                        >
                          {/* Top row: image + name/brand + price + badge */}
                          <div className="flex items-start gap-3">
                            {rr.image_url && (
                              <img
                                src={rr.image_url}
                                alt=""
                                className="w-[60px] h-[60px] rounded-xl object-cover ring-1 ring-[#C4A235]/20 flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[#E8DCC4] text-sm font-medium truncate" style={{ fontFamily: 'var(--font-inter-tight, "Inter Tight", sans-serif)' }}>
                                  {rr.name}
                                </p>
                                <span className="text-[#C4A235] font-semibold text-sm whitespace-nowrap flex-shrink-0">
                                  {amountLabel}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                {brandQty && (
                                  <p className="text-[11px] text-[#D4C8A0]/60" style={{ fontFamily: 'var(--font-inter-tight, "Inter Tight", sans-serif)' }}>
                                    {brandQty}
                                  </p>
                                )}
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                    rr.paid
                                      ? 'bg-[#406A56]/20 text-[#4ADE80]'
                                      : 'bg-[#C35F33]/15 text-[#C35F33]'
                                  }`}
                                >
                                  {rr.paid ? 'Paid \u2713' : 'Unpaid'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom row: pay button (if unpaid) + remove button */}
                          <div className="flex items-center gap-2 mt-3">
                            {!rr.paid && (
                              <button
                                onClick={() => handlePayForGift(rr.row ?? undefined)}
                                disabled={payingGift}
                                className="flex-1 rounded-xl bg-[#C35F33] hover:bg-[#A85128] text-white font-semibold
                                           px-4 flex items-center justify-center gap-2 transition-colors
                                           disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{ minHeight: 44 }}
                              >
                                {thisPaying ? (
                                  <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Starting checkout...
                                  </>
                                ) : (
                                  <>
                                    <Gift size={18} />
                                    {amountLabel ? `Pay for this gift \u2014 ${amountLabel}` : 'Pay for this gift'}
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveGift(rr.row?.id ?? rr.key)}
                              disabled={!!removingGiftId}
                              className="text-[#C35F33] hover:text-[#A85128] text-[13px] font-medium
                                         transition-colors disabled:opacity-50 flex-shrink-0"
                              style={{ minHeight: 44, minWidth: 44, fontFamily: 'var(--font-inter-tight, "Inter Tight", sans-serif)' }}
                            >
                              {thisRemoving ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* "+ Add a gift" button — only for draft/scheduled postscripts */}
                  {(postscript.status === 'draft' || postscript.status === 'scheduled') && (
                    <button
                      onClick={() => setShowGiftModal(true)}
                      className="mt-3 w-full rounded-full border border-[#406A56] text-[#406A56] font-semibold
                                 text-sm hover:bg-[#406A56]/10 transition-colors flex items-center justify-center gap-2"
                      style={{ minHeight: 44, fontFamily: 'var(--font-inter-tight, "Inter Tight", sans-serif)' }}
                    >
                      <Gift size={16} />
                      + Add a gift
                    </button>
                  )}
                </section>
              )
            })()}
            {/* No gifts yet — larger CTA for draft/scheduled */}
            {!postscript.has_gift && (postscript.status === 'draft' || postscript.status === 'scheduled') && (
              <section>
                <button
                  onClick={() => setShowGiftModal(true)}
                  className="w-full rounded-2xl p-5 text-left transition-colors group"
                  style={{
                    background: 'linear-gradient(165deg, rgba(62,48,35,0.85) 0%, rgba(42,32,26,0.92) 100%)',
                    border: '1px dashed rgba(64,106,86,0.4)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#406A56]/15 flex items-center justify-center group-hover:bg-[#406A56]/25 transition-colors">
                      <Gift size={20} className="text-[#406A56]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#E8DCC4]">Attach a gift to this PostScript</h3>
                      <p className="text-sm text-[#D4C8A0]/50">Surprise them with something special</p>
                    </div>
                  </div>
                </button>
              </section>
            )}
          {/* Recipient + Gift + Timeline — horizontal row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Recipient */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(165deg, rgba(62,48,35,0.85) 0%, rgba(42,32,26,0.92) 100%)',
                border: '1px solid rgba(196,162,53,0.12)',
              }}
            >
              <h3 className="text-[13px] font-semibold tracking-wide text-[#D4C8A0] mb-4"
                style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
              >Recipient</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#C4A235]/10 flex items-center justify-center">
                    <User size={14} className="text-[#C4A235]/60" />
                  </div>
                  <span className="text-[#E8DCC4] font-medium text-sm">{postscript.recipient_name}</span>
                </div>
                {postscript.recipient_email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#C4A235]/10 flex items-center justify-center">
                      <Mail size={14} className="text-[#C4A235]/60" />
                    </div>
                    <span className="text-[#D4C8A0]/70 text-sm">{postscript.recipient_email}</span>
                  </div>
                )}
                {postscript.recipient_phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Phone size={14} className="text-[#C4A235]/60" />
                    </div>
                    <span className="text-[#D4C8A0]/70 text-sm">{postscript.recipient_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Gift Info Card — compact summary. Detailed per-gift cards with
                their own Pay CTAs live in the "Your gifts" section above. */}
            {postscript.has_gift ? (
              <GiftInfoCard
                postscript={postscript}
                giftCount={giftRows.length}
                unpaidCount={giftRows.filter(g => (g.payment_status || 'pending') !== 'paid').length || (giftUnpaid ? 1 : 0)}
                amount={giftAmount}
              />
            ) : (postscript.status === 'draft' || postscript.status === 'scheduled') ? (
              <button
                onClick={() => setShowGiftModal(true)}
                className="w-full rounded-2xl p-5 text-left transition-colors group"
                style={{
                  background: 'linear-gradient(165deg, rgba(62,48,35,0.85) 0%, rgba(42,32,26,0.92) 100%)',
                  border: '1px solid rgba(196,162,53,0.15)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C4A235]/15 flex items-center justify-center group-hover:bg-[#C4A235]/25 transition-colors">
                    <Gift size={20} className="text-[#C4A235]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#E8DCC4]">Add a Gift</h3>
                    <p className="text-sm text-[#D4C8A0]/50">Surprise them with something special</p>
                  </div>
                </div>
              </button>
            ) : null}

            {/* Timestamps Card */}
            <SectionCard title="Timeline" icon={Clock}>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#D4C8A0]/60">Created</span>
                  <span className="text-[#E8DCC4]">{formatShortDate(postscript.created_at)}</span>
                </div>
                {postscript.sent_at && (
                  <div className="flex justify-between">
                    <span className="text-[#D4C8A0]/60">Sent</span>
                    <span className="text-[#E8DCC4]">{formatShortDate(postscript.sent_at)}</span>
                  </div>
                )}
                {postscript.opened_at && (
                  <div className="flex justify-between">
                    <span className="text-[#D4C8A0]/60">Opened</span>
                    <span className="text-green-400 font-medium">{formatShortDate(postscript.opened_at)}</span>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* Recipient Reply */}
          {(postscript.reply_text || (() => { try { return JSON.parse(postscript.gift_details || '{}')._reply } catch { return null } })()) && (
            <SectionCard title="Reply from Recipient" icon={Send}>
              <blockquote
                className="text-[#E8DCC4] text-[15px] leading-[1.8] italic"
                style={{ fontFamily: '"Georgia", serif' }}
              >
                &ldquo;{postscript.reply_text || (() => { try { return JSON.parse(postscript.gift_details || '{}')._reply } catch { return '' } })()}&rdquo;
              </blockquote>
              <p className="text-[11px] text-[#D4C8A0]/40 mt-3">
                — {postscript.recipient_name}, {postscript.reply_at
                  ? new Date(postscript.reply_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : (() => { try { const d = JSON.parse(postscript.gift_details || '{}')._reply_at; return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '' } catch { return '' } })()
                }
              </p>
            </SectionCard>
          )}

          {/* Preview Button — full width */}
          <button
            onClick={async () => {
              let token = postscript.access_token
              if (!token) {
                try {
                  const res = await fetch(`/api/postscripts/${postscript.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ generate_access_token: true }),
                  })
                  if (res.ok) {
                    const data = await res.json()
                    token = data.access_token
                    if (token) setPostscript({ ...postscript, access_token: token })
                  }
                } catch {}
              }
              if (token) {
                window.open(`/postscript/${token}`, '_blank')
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-5 py-3
                       text-[#C4A235] rounded-xl font-medium transition-all
                       border border-[#C4A235]/25 hover:border-[#C4A235]/40 hover:bg-[#C4A235]/5"
          >
            <Eye size={18} />
            Preview as Recipient
          </button>
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
          fetchPostScript()
          setGiftMessage({ type: 'success', text: 'Gift added \u2713' })
          setPostscript(prev => prev ? { ...prev, has_gift: true } : prev)
        }}
      />

      {/* Checkout prompt — shown after saving a PostScript with gifts.
          Auto-checkout fires via useEffect; this modal is the fallback if it
          fails or while redirecting. */}
      {showCheckoutPrompt && postscript.has_gift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full mx-4 p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center mx-auto mb-4">
              <Gift size={28} className="text-[#2D5A3D]" />
            </div>
            {payingGift ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Redirecting to checkout...</h2>
                <p className="text-gray-600 mb-6">
                  Taking you to Stripe to complete your gift payment.
                </p>
                <div className="flex justify-center">
                  <div className="w-8 h-8 border-3 border-[#406A56] border-t-transparent rounded-full animate-spin" />
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">PostScript Saved!</h2>
                <p className="text-gray-600 mb-6">
                  Your message is scheduled. Complete the gift payment to include your gift.
                </p>
                {(() => {
                  let giftInfo: { name?: string; price?: number } = {}
                  try { giftInfo = JSON.parse(postscript.gift_details || '{}') } catch {}
                  return giftInfo.name ? (
                    <div className="bg-gray-50 rounded-xl p-3 mb-6 text-left flex items-center gap-3">
                      <Gift size={16} className="text-[#C4A235] flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{giftInfo.name}</p>
                        {postscript.gift_budget && <p className="text-xs text-[#2D5A3D] font-semibold">${postscript.gift_budget}</p>}
                      </div>
                    </div>
                  ) : null
                })()}
                {giftMessage && (
                  <div className={`mb-4 p-3 rounded-xl text-sm ${
                    giftMessage.type === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {giftMessage.text}
                  </div>
                )}
                <div className="space-y-2">
                  <button
                    onClick={() => handlePayForGift()}
                    className="w-full py-3 bg-[#406A56] text-white rounded-xl font-medium hover:bg-[#345747] transition-colors"
                  >
                    Pay for Gift Now
                  </button>
                  <button
                    onClick={() => {
                      setShowCheckoutPrompt(false)
                      router.replace(`/dashboard/postscripts/${id}`, { scroll: false })
                    }}
                    className="w-full py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                  >
                    Finish payment later
                  </button>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    Your message will still be delivered at your scheduled time without gifts if payment is incomplete.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function GiftInfoCard({
  postscript,
  giftCount,
  unpaidCount,
  amount,
}: {
  postscript: PostScript
  giftCount: number
  unpaidCount: number
  amount: number | null
}) {
  let giftInfo: { name?: string; price?: number; image_url?: string } = {}
  try { giftInfo = JSON.parse(postscript.gift_details || '{}') } catch {}
  const amountLabel = typeof amount === 'number' && !Number.isNaN(amount) ? `$${amount.toFixed(2)}` : ''
  const multi = giftCount > 1
  return (
    <SectionCard title={multi ? `${giftCount} Gifts Attached` : 'Gift Attached'} icon={Gift}>
      <div className="flex items-center gap-3">
        {giftInfo.image_url && !multi && (
          <img src={giftInfo.image_url} alt="" className="w-14 h-14 rounded-xl object-cover ring-1 ring-[#C4A235]/20" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[#E8DCC4] text-sm font-medium truncate">
            {multi ? `${giftCount} gifts` : (giftInfo.name || postscript.gift_type || 'Gift')}
          </p>
          <p className="text-[#C4A235] font-semibold text-sm">
            {multi
              ? (unpaidCount > 0 ? `${unpaidCount} unpaid` : 'All paid')
              : (postscript.gift_budget ? `$${postscript.gift_budget}` : giftInfo.price ? `$${giftInfo.price}` : amountLabel)}
          </p>
        </div>
      </div>
      {unpaidCount > 0 ? (
        <p className="text-[11px] text-[#C4A235]/80 mt-3">
          {multi ? 'See "Your gifts" above to complete payment.' : 'Payment pending — see Gift section above.'}
        </p>
      ) : (
        <p className="text-[11px] text-[#4ADE80]/80 mt-2">Payment complete</p>
      )}
    </SectionCard>
  )
}

/** Reusable section card — matches slideshow SectionCard style */
function SectionCard({ title, icon: Icon, children }: { title: string; icon: typeof Gift; children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(165deg, rgba(62,48,35,0.85) 0%, rgba(42,32,26,0.92) 100%)',
        border: '1px solid rgba(196,162,53,0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,245,220,0.06)',
      }}
    >
      <div className="px-5 pt-4 pb-2 flex items-center gap-2.5">
        <Icon size={14} className="text-[#C4A235]/70" />
        <h3
          className="text-[13px] font-semibold tracking-wide text-[#D4C8A0]"
          style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
        >
          {title}
        </h3>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  )
}
