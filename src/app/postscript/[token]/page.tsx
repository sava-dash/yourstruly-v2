'use client'

import { useState, useEffect, use } from 'react'
import { Heart, Calendar, User, Gift, Video, Paperclip, ArrowLeft } from 'lucide-react'
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
      <div className="min-h-screen bg-[#FDF8F3] relative overflow-hidden flex items-center justify-center">
        <div className="home-background" />
        <div className="animate-pulse text-[#406A56]">
          <Heart className="w-12 h-12 mx-auto mb-4 animate-bounce" />
          <p className="text-lg">Loading your special message...</p>
        </div>
      </div>
    )
  }

  if (error || !postscript) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #F2F1E5 0%, #E8E4D6 50%, #DED8C8 100%)'
      }}>
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 max-w-md text-center shadow-xl border border-white/50">
          <Heart className="w-12 h-12 mx-auto mb-4 text-[#C35F33]" />
          <h1 className="text-xl font-semibold text-[#2d2d2d] mb-2">Oops!</h1>
          <p className="text-gray-600 mb-6">{error || 'This PostScript was not found.'}</p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#406A56] text-white rounded-xl hover:bg-[#4a7a64] transition-colors"
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
    <div className="min-h-screen bg-[#FDF8F3] relative overflow-hidden">
      <div className="home-background" />
      <div className="home-blob home-blob-1" />
      <div className="home-blob home-blob-2" />
      
      <div className="relative z-10 max-w-2xl mx-auto p-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#406A56]/20 flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {postscript.sender_avatar ? (
              <img src={postscript.sender_avatar}
                alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-[#406A56]" />
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
                <Video className="w-5 h-5 text-[#406A56]" />
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
                <Paperclip className="w-5 h-5 text-[#406A56]" />
                Attachments
              </h3>
              <div className="space-y-2">
                {postscript.attachments.map(att => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-[#406A56]/5 rounded-lg hover:bg-[#406A56]/10 transition-colors"
                  >
                    {att.file_name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Gift */}
          {postscript.has_gift && (
            <div className="mt-8 p-6 bg-gradient-to-r from-[#D9C61A]/10 to-[#406A56]/10 rounded-xl">
              <h3 className="text-lg font-medium text-[#2d2d2d] mb-2 flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#D9C61A]" />
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
          <div className="mt-8 pt-6 border-t border-[#406A56]/10 text-center">
            <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              Delivered on {new Date(postscript.delivery_date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
            <p className="text-[#406A56]/50 text-xs mt-3 italic tracking-wide">Live on.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <p className="text-gray-500 mb-4">Want to create your own PostScripts?</p>
          <Link 
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#406A56] text-white rounded-xl font-medium hover:bg-[#355a48] transition-colors"
          >
            <Heart className="w-4 h-4" />
            Start Your Legacy
          </Link>
        </div>
      </div>
    </div>
  )
}
