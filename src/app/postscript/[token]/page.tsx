'use client'

import { useState, useEffect, use } from 'react'
import { Heart, Calendar, User, Gift, Video, Paperclip, ArrowLeft, Send, Loader2, Check } from 'lucide-react'
import { EnvelopeMessage } from '@/components/postscripts'
import Link from 'next/link'
import '@/styles/page-styles.css'

interface PostScriptData {
  id: string
  title: string
  message: string
  sender_name: string
  sender_avatar?: string
  delivery_date: string
  has_gift: boolean
  gift_type?: string
  gift_details?: string
  video_url?: string
  attachments?: Array<{
    id: string
    file_url: string
    file_type: string
    file_name: string
  }>
  memories?: Array<{
    id: string
    title: string
    imageUrl?: string
  }>
  wisdom?: Array<{
    id: string
    title: string
    category?: string
  }>
}

export default function PostScriptRecipientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [postscript, setPostscript] = useState<PostScriptData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [envelopeOpened, setEnvelopeOpened] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)

  useEffect(() => {
    loadPostScript()
  }, [token])

  const loadPostScript = async () => {
    try {
      // Fetch postscript via API (bypasses RLS for public access)
      const res = await fetch(`/api/postscripts/view/${token}`)
      const data = await res.json()

      if (!res.ok || !data.postscript) {
        setError(data.error || 'This PostScript was not found or the link has expired.')
        setLoading(false)
        return
      }

      const ps = data.postscript

      // Check if already opened
      if (ps.opened_at) {
        setEnvelopeOpened(true)
        setShowFullContent(true)
      }

      setPostscript({
        id: ps.id,
        title: ps.title,
        message: ps.message || '',
        sender_name: ps.sender_name,
        sender_avatar: ps.sender_avatar,
        delivery_date: ps.delivery_date,
        has_gift: ps.has_gift,
        gift_type: ps.gift_type,
        gift_details: ps.gift_details,
        video_url: ps.video_url,
        attachments: ps.attachments,
        memories: ps.memories,
        wisdom: ps.wisdom,
      })
    } catch (err) {
      console.error('Error loading postscript:', err)
      setError('Something went wrong loading this PostScript.')
    } finally {
      setLoading(false)
    }
  }

  const handleEnvelopeOpen = async () => {
    setEnvelopeOpened(true)
    
    // Mark as opened via API
    if (postscript) {
      try {
        await fetch(`/api/postscripts/view/${token}`, { method: 'POST' })
      } catch (err) {
        console.error('Error marking as opened:', err)
      }
    }
    
    // Show full content after animation
    setTimeout(() => {
      setShowFullContent(true)
    }, 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] relative overflow-hidden flex items-center justify-center">
        <div className="home-background" />
        <div className="animate-pulse text-[#2D5A3D]">
          <Heart className="w-12 h-12 mx-auto mb-4 animate-bounce" />
          <p className="text-lg">Gathering your message...</p>
        </div>
      </div>
    )
  }

  if (error || !postscript) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #F5F3EE 0%, #E8E4D6 50%, #DED8C8 100%)'
      }}>
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 max-w-md text-center shadow-xl border border-white/50">
          <Heart className="w-12 h-12 mx-auto mb-4 text-[#B8562E]" />
          <h1 className="text-xl font-semibold text-[#2d2d2d] mb-2">We couldn&apos;t load this message</h1>
          <p className="text-gray-600 mb-6">{error || 'This PostScript was not found.'}</p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#234A31] transition-colors"
          >
            Go to YoursTruly
          </Link>
        </div>
      </div>
    )
  }

  // Show envelope if not yet opened
  if (!envelopeOpened) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }}>
        <div className="text-center">
          <p className="text-white/70 mb-6 text-lg">You have a special message from</p>
          <h1 className="text-3xl font-semibold text-white mb-8">{postscript.sender_name}</h1>
          
          <EnvelopeMessage
            senderName={postscript.sender_name}
            message={postscript.message}
            onOpen={handleEnvelopeOpen}
            isOpenable={true}
          />
          
          <p className="text-white/50 mt-8 text-sm">Click the envelope to open</p>
        </div>
      </div>
    )
  }

  // Parse gift details
  const giftInfo = (() => {
    if (!postscript.has_gift || !postscript.gift_details) return null
    try { return JSON.parse(postscript.gift_details) as { name?: string; price?: number; image_url?: string; gift_paid?: boolean } }
    catch { return null }
  })()

  // Show full content — letter unfolds from envelope
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #2A201A 0%, #1A1410 60%, #0F0B08 100%)' }}
    >
      <div className="relative z-10 max-w-2xl mx-auto p-4 py-12">
        {/* Sender header */}
        <div className="text-center mb-8 animate-in fade-in duration-700">
          <p className="text-[#D4C8A0]/60 text-sm">A PostScript from</p>
          <h1
            className="text-2xl text-[#F5F0E8] mt-1"
            style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
          >
            {postscript.sender_name}
          </h1>
        </div>

        {/* Letter card — warm parchment style */}
        <div
          className="rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-1000"
          style={{
            background: 'linear-gradient(165deg, #FDF8F0 0%, #F8F2E6 50%, #F5EFE0 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
            border: '1px solid rgba(196,162,53,0.15)',
          }}
        >
          <div className="p-8 sm:p-10">
            {/* Title */}
            <h2
              className="text-2xl sm:text-3xl text-[#3D3428] mb-6 leading-tight"
              style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
            >
              {postscript.title}
            </h2>

            {/* Message body */}
            <div
              className="text-[#4A3F33] text-[16px] leading-[1.85] whitespace-pre-wrap"
              style={{ fontFamily: '"Georgia", serif' }}
            >
              {postscript.message}
            </div>

            {/* Video */}
            {postscript.video_url && (
              <div className="mt-8">
                <p className="text-xs uppercase tracking-wider text-[#8B7355] mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4" /> Video Message
                </p>
                <video src={postscript.video_url} controls className="w-full rounded-xl" />
              </div>
            )}

            {/* Attachments */}
            {postscript.attachments && postscript.attachments.length > 0 && (
              <div className="mt-8">
                <p className="text-xs uppercase tracking-wider text-[#8B7355] mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" /> Attachments
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {postscript.attachments.map(att => {
                    const isImage = att.file_type?.startsWith('image/')
                    return (
                      <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                        className="rounded-xl overflow-hidden border border-[#D4C8A0]/30 hover:border-[#C4A235]/50 transition-colors">
                        {isImage ? (
                          <img src={att.file_url} alt="" className="w-full aspect-square object-cover" />
                        ) : (
                          <div className="p-3 text-sm text-[#8B7355]">{att.file_name}</div>
                        )}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Linked Memories */}
            {postscript.memories && postscript.memories.length > 0 && (
              <div className="mt-8">
                <p className="text-xs uppercase tracking-wider text-[#8B7355] mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4" /> Shared Memories
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {postscript.memories.map(mem => (
                    <div key={mem.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#D4C8A0]/20 bg-[#F8F2E6]/50">
                      {mem.imageUrl && (
                        <img src={mem.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <p className="text-sm text-[#3D3428] font-medium line-clamp-2">{mem.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Wisdom */}
            {postscript.wisdom && postscript.wisdom.length > 0 && (
              <div className="mt-8">
                <p className="text-xs uppercase tracking-wider text-[#8B7355] mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  Words of Wisdom
                </p>
                <div className="space-y-2">
                  {postscript.wisdom.map(w => (
                    <div key={w.id} className="p-3 rounded-xl border border-[#D4C8A0]/20 bg-[#F8F2E6]/50">
                      <p className="text-sm text-[#3D3428] italic" style={{ fontFamily: '"Georgia", serif' }}>
                        &ldquo;{w.title}&rdquo;
                      </p>
                      {w.category && (
                        <p className="text-[10px] text-[#8B7355] mt-1 uppercase tracking-wider">{w.category}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gift — only show if payment was completed (gift_paid flag in details) */}
            {postscript.has_gift && giftInfo?.gift_paid && (
              <div className="mt-8 p-5 rounded-xl text-center" style={{ background: 'linear-gradient(135deg, rgba(196,162,53,0.08), rgba(45,90,61,0.06))' }}>
                <Gift className="w-8 h-8 text-[#C4A235] mx-auto mb-3" />
                <p
                  className="text-[#3D3428] font-medium text-lg"
                  style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
                >
                  A gift is on its way to you
                </p>
                <p className="text-[#8B7355] text-sm mt-1">
                  {postscript.sender_name} included something special with this message.
                </p>
              </div>
            )}

            {/* Footer / sign-off */}
            <div className="mt-10 pt-6 border-t border-[#D4C8A0]/20 text-center">
              <p className="text-[#8B7355] text-sm flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                {postscript.delivery_date
                  ? `Delivered ${new Date(postscript.delivery_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                  : 'A message written with love'}
              </p>
              <p
                className="text-[#C4A235]/40 text-xs mt-4 italic tracking-[0.2em]"
                style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
              >
                Live on.
              </p>
            </div>
          </div>
        </div>

        {/* Reply Section */}
        <RecipientReply token={token} senderName={postscript.sender_name} />

        {/* CTA */}
        <div className="text-center mt-10">
          <p className="text-[#D4C8A0]/40 mb-4 text-sm">Want to create your own PostScripts?</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C4A235]/20 text-[#C4A235] rounded-xl font-medium hover:bg-[#C4A235]/30 transition-colors border border-[#C4A235]/25"
          >
            <Heart className="w-4 h-4" />
            Start Your Legacy
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Inline reply form for recipients */
function RecipientReply({ token, senderName }: { token: string; senderName: string }) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  if (sent) {
    return (
      <div className="mt-8 p-6 rounded-2xl text-center" style={{ background: 'rgba(45,90,61,0.15)', border: '1px solid rgba(45,90,61,0.2)' }}>
        <Check className="w-8 h-8 text-[#8DACAB] mx-auto mb-2" />
        <p className="text-[#D4C8A0] font-medium">Your reply has been sent</p>
        <p className="text-sm text-[#D4C8A0]/50 mt-1">{senderName} will receive your words.</p>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className="mt-8 text-center">
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 border border-[#C4A235]/25 text-[#C4A235] rounded-xl font-medium hover:bg-[#C4A235]/5 transition-colors"
        >
          <Send className="w-4 h-4" />
          Write Back to {senderName}
        </button>
      </div>
    )
  }

  const handleSend = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/postscripts/view/${token}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: reply.trim() }),
      })
      if (res.ok) {
        setSent(true)
      }
    } catch {}
    setSending(false)
  }

  return (
    <div
      className="mt-8 p-6 rounded-2xl"
      style={{
        background: 'linear-gradient(165deg, rgba(62,48,35,0.85) 0%, rgba(42,32,26,0.92) 100%)',
        border: '1px solid rgba(196,162,53,0.15)',
      }}
    >
      <h3 className="text-base font-semibold text-[#E8DCC4] mb-1"
        style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
      >Write Back</h3>
      <p className="text-sm text-[#D4C8A0]/50 mb-4">Your reply will be delivered to {senderName}.</p>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="What would you like to say back?"
        rows={4}
        maxLength={2000}
        className="w-full px-4 py-3 border border-[#C4A235]/15 rounded-xl bg-[#2A201A] text-[#E8DCC4] placeholder:text-[#D4C8A0]/30 focus:outline-none focus:ring-2 focus:ring-[#C4A235]/20 focus:border-[#C4A235]/30 resize-none"
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-[#D4C8A0]/30">{reply.length}/2000</span>
        <div className="flex gap-2">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm text-[#D4C8A0]/50 hover:text-[#D4C8A0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!reply.trim() || sending}
            className="flex items-center gap-2 px-5 py-2 bg-[#2D5A3D] text-white rounded-xl text-sm font-medium hover:bg-[#355A48] disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send Reply
          </button>
        </div>
      </div>
    </div>
  )
}
