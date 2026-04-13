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
        attachments: ps.attachments
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

  // Show full content after envelope is opened
  return (
    <div className="min-h-screen bg-[#FAFAF7] relative overflow-hidden">
      <div className="home-background" />
      <div className="home-blob home-blob-1" />
      <div className="home-blob home-blob-2" />
      
      <div className="relative z-10 max-w-2xl mx-auto p-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#2D5A3D]/20 flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {postscript.sender_avatar ? (
              <img src={postscript.sender_avatar}
                alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-[#2D5A3D]" />
            )}
          </div>
          <p className="text-gray-500">A PostScript from</p>
          <h1 className="text-2xl font-semibold text-[#2d2d2d]">{postscript.sender_name}</h1>
        </div>

        {/* Letter Card */}
        <div className="glass-card glass-card-strong p-8 paper-texture-cream">
          <h2 className="text-2xl font-semibold text-[#2d2d2d] mb-6 font-playfair">
            {postscript.title}
          </h2>
          
          <div className="prose prose-lg text-gray-700 whitespace-pre-wrap">
            {postscript.message}
          </div>

          {/* Video */}
          {postscript.video_url && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-[#2d2d2d] mb-3 flex items-center gap-2">
                <Video className="w-5 h-5 text-[#2D5A3D]" />
                Video Message
              </h3>
              <video 
                src={postscript.video_url} 
                controls 
                className="w-full rounded-xl"
              />
            </div>
          )}

          {/* Attachments */}
          {postscript.attachments && postscript.attachments.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-[#2d2d2d] mb-3 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-[#2D5A3D]" />
                Attachments
              </h3>
              <div className="space-y-2">
                {postscript.attachments.map(att => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-[#2D5A3D]/5 rounded-lg hover:bg-[#2D5A3D]/10 transition-colors"
                  >
                    {att.file_name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Gift */}
          {postscript.has_gift && (
            <div className="mt-8 p-6 bg-gradient-to-r from-[#C4A235]/10 to-[#2D5A3D]/10 rounded-xl">
              <h3 className="text-lg font-medium text-[#2d2d2d] mb-2 flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#C4A235]" />
                A Gift For You
              </h3>
              {postscript.gift_type && (
                <p className="text-gray-600">{postscript.gift_type}</p>
              )}
              {postscript.gift_details && (
                <p className="text-gray-500 text-sm mt-2">{postscript.gift_details}</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#2D5A3D]/10 text-center">
            <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              Delivered on {new Date(postscript.delivery_date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
            <p className="text-[#2D5A3D]/50 text-xs mt-3 italic tracking-wide">Live on.</p>
          </div>
        </div>

        {/* Reply Section */}
        <RecipientReply token={token} senderName={postscript.sender_name} />

        {/* CTA */}
        <div className="text-center mt-8">
          <p className="text-gray-500 mb-4">Want to create your own PostScripts?</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#355a48] transition-colors"
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
      <div className="mt-8 p-6 bg-[#2D5A3D]/5 rounded-2xl text-center border border-[#2D5A3D]/10">
        <Check className="w-8 h-8 text-[#2D5A3D] mx-auto mb-2" />
        <p className="text-[#2D5A3D] font-medium">Your reply has been sent</p>
        <p className="text-sm text-gray-500 mt-1">{senderName} will receive your words.</p>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className="mt-8 text-center">
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#2D5A3D]/20 text-[#2D5A3D] rounded-xl font-medium hover:bg-[#2D5A3D]/5 transition-colors"
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
    <div className="mt-8 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800 mb-1">Write Back</h3>
      <p className="text-sm text-gray-500 mb-4">Your reply will be delivered to {senderName}.</p>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="What would you like to say back?"
        rows={4}
        maxLength={2000}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D] resize-none"
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400">{reply.length}/2000</span>
        <div className="flex gap-2">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!reply.trim() || sending}
            className="flex items-center gap-2 px-5 py-2 bg-[#2D5A3D] text-white rounded-xl text-sm font-medium hover:bg-[#244B32] disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send Reply
          </button>
        </div>
      </div>
    </div>
  )
}
