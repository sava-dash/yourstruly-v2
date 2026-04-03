'use client'

import { useState } from 'react'
import { Heart, Calendar, User, Gift, Video, Paperclip, ArrowLeft, RefreshCw, Sparkles, Image as ImageIcon } from 'lucide-react'
import { EnvelopeMessage } from '@/components/postscripts'
import Link from 'next/link'
import '@/styles/page-styles.css'
import '@/styles/ui-enhancements.css'

// Sample postscript data for demo
const SAMPLE_POSTSCRIPTS = [
  {
    id: '1',
    title: 'To My Dearest Daughter',
    message: `My darling Sarah,

If you're reading this, I've passed on from this world, but know that my love for you continues beyond all boundaries.

I remember the day you were born — how tiny you were, how perfect. From that moment, you became my entire world. Watching you grow into the remarkable woman you are today has been the greatest privilege of my life.

I know life hasn't always been easy, and I wish I could have been there for every triumph and every tear. But please know that in every moment, even now, I am proud of you. So incredibly proud.

Remember what I always told you: "Be brave, be kind, and never stop reaching for the stars." You have all the courage you need inside you.

Take care of your mother. She loves you more than you know. And please, don't mourn for too long — live your beautiful life to the fullest. That's all I ever wanted for you.

Until we meet again, my sweet girl.

All my love, always and forever,
Dad`,
    sender_name: 'Michael Patterson',
    sender_avatar: null,
    delivery_date: '2026-03-15',
    has_gift: true,
    gift_type: 'Family Heirloom',
    gift_details: 'Grandma\'s antique locket — she wanted you to have it. It\'s been in our family for 5 generations.',
    video_url: null,
    attachments: [
      { id: '1', file_url: '/demo/family-photo.jpg', file_type: 'image/jpeg', file_name: 'Family Photo - Christmas 2019.jpg' },
      { id: '2', file_url: '/demo/letter-scan.pdf', file_type: 'application/pdf', file_name: 'Handwritten Letter.pdf' },
    ]
  },
  {
    id: '2', 
    title: 'Happy 30th Birthday!',
    message: `Dear Emma,

Happy 30th Birthday, sweetheart! 🎂

I recorded this PostScript last year when I turned 60, wanting to make sure I could celebrate this milestone with you no matter what life brings.

Thirty years ago today, you came into our lives and made everything better. You taught me what it means to love unconditionally. You showed me strength I didn't know I had.

I want you to know:
- You are more capable than you realize
- Your kindness makes the world better
- Every challenge you've faced has made you stronger
- I believe in you completely

This year, promise me you'll take that trip you've been dreaming about. Life is short — chase your adventures!

Here's to 30 more years of laughter, love, and beautiful memories.

With all my heart,
Mom

P.S. Check your mailbox — I arranged for a little surprise! 🎁`,
    sender_name: 'Rachel Chen',
    sender_avatar: null,
    delivery_date: '2026-06-15',
    has_gift: true,
    gift_type: 'Travel Voucher',
    gift_details: '$5,000 travel fund for your dream vacation. Go see the Northern Lights like we always talked about!',
    video_url: null,
    attachments: []
  },
  {
    id: '3',
    title: 'A Note About Our Story',
    message: `My love,

Remember that rainy Tuesday in the coffee shop? You were reading a book, I was pretending to work on my laptop while stealing glances at you. You caught me looking. I blushed. You smiled.

That was the moment everything changed.

I'm writing this on our 15th wedding anniversary, just in case I ever forget to tell you how much you mean to me. Twenty years together, and you still make my heart skip.

Thank you for:
- Laughing at my terrible jokes
- Being patient with my quirks  
- Building this beautiful life with me
- Being my best friend

No matter what tomorrow brings, know that loving you has been the greatest adventure of my life.

Forever yours,
James

P.S. The hidden box in my desk drawer? It's yours now. You'll understand when you see what's inside.`,
    sender_name: 'James Morrison',
    sender_avatar: null,
    delivery_date: '2026-09-22',
    has_gift: false,
    gift_type: null,
    gift_details: null,
    video_url: null,
    attachments: [
      { id: '1', file_url: '/demo/wedding.jpg', file_type: 'image/jpeg', file_name: 'Our Wedding Day.jpg' },
    ]
  }
]

export default function PostScriptDemoPage() {
  const [selectedDemo, setSelectedDemo] = useState(SAMPLE_POSTSCRIPTS[0])
  const [envelopeOpened, setEnvelopeOpened] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)
  const [viewMode, setViewMode] = useState<'envelope' | 'letter'>('envelope')

  const handleEnvelopeOpen = () => {
    setEnvelopeOpened(true)
    setTimeout(() => {
      setShowFullContent(true)
      setViewMode('letter')
    }, 2000)
  }

  const handleReset = () => {
    setEnvelopeOpened(false)
    setShowFullContent(false)
    setViewMode('envelope')
  }

  const handleSelectDemo = (demo: typeof SAMPLE_POSTSCRIPTS[0]) => {
    setSelectedDemo(demo)
    handleReset()
  }

  return (
    <div className="min-h-screen" style={{
      background: viewMode === 'envelope' 
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        : 'linear-gradient(135deg, #f5f0e6 0%, #e8e0d0 50%, #f5f0e6 100%)'
    }}>
      {/* Demo Controls Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="text-white" size={20} />
              </Link>
              <div>
                <h1 className="text-white font-semibold flex items-center gap-2">
                  <Sparkles size={16} className="text-yellow-400" />
                  PostScript Demo
                </h1>
                <p className="text-white/60 text-xs">Experience how recipients receive future messages</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
            >
              <RefreshCw size={14} />
              Reset
            </button>
          </div>
          
          {/* Demo Selector */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {SAMPLE_POSTSCRIPTS.map((demo) => (
              <button
                key={demo.id}
                onClick={() => handleSelectDemo(demo)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  selectedDemo.id === demo.id
                    ? 'bg-white text-gray-900'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {demo.title.slice(0, 25)}...
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-28 pb-12">
        {/* Envelope View */}
        {viewMode === 'envelope' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
            <p className="text-white/70 mb-6 text-lg text-center">You have a special message from</p>
            <h2 className="text-3xl font-semibold text-white mb-8 text-center">{selectedDemo.sender_name}</h2>
            
            <EnvelopeMessage
              senderName={selectedDemo.sender_name}
              message={selectedDemo.message}
              onOpen={handleEnvelopeOpen}
              isOpenable={!envelopeOpened}
            />
            
            {!envelopeOpened && (
              <p className="text-white/50 mt-8 text-sm">Click the envelope to open</p>
            )}
          </div>
        )}

        {/* Letter View */}
        {viewMode === 'letter' && showFullContent && (
          <div className="max-w-2xl mx-auto p-4">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-[#2D5A3D]/20 flex items-center justify-center mx-auto mb-4 overflow-hidden paper-texture-cream">
                {selectedDemo.sender_avatar ? (
                  <img src={selectedDemo.sender_avatar}
                alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-[#2D5A3D]" />
                )}
              </div>
              <p className="text-gray-500">A PostScript from</p>
              <h2 className="text-2xl font-semibold text-[#2d2d2d]">{selectedDemo.sender_name}</h2>
            </div>

            {/* Letter Card */}
            <div className="postscript-letter">
              <h3 className="text-2xl font-semibold text-[#2d2d2d] mb-6 memory-title">
                {selectedDemo.title}
              </h3>
              
              <div className="prose prose-lg text-gray-700 whitespace-pre-wrap font-playfair leading-relaxed">
                {selectedDemo.message}
              </div>

              {/* Video */}
              {selectedDemo.video_url && (
                <div className="mt-8">
                  <h4 className="text-lg font-medium text-[#2d2d2d] mb-3 flex items-center gap-2">
                    <Video className="w-5 h-5 text-[#2D5A3D]" />
                    Video Message
                  </h4>
                  <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
                    <p className="text-gray-400">[Video would play here]</p>
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedDemo.attachments && selectedDemo.attachments.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-lg font-medium text-[#2d2d2d] mb-3 flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-[#2D5A3D]" />
                    Attachments
                  </h4>
                  <div className="space-y-2">
                    {selectedDemo.attachments.map(att => (
                      <div
                        key={att.id}
                        className="flex items-center gap-3 p-3 bg-[#2D5A3D]/5 rounded-lg"
                      >
                        <div className="w-10 h-10 bg-[#2D5A3D]/10 rounded-lg flex items-center justify-center">
                          {att.file_type.startsWith('image/') ? (
                            <ImageIcon size={18} className="text-[#2D5A3D]" />
                          ) : (
                            <Paperclip size={18} className="text-[#2D5A3D]" />
                          )}
                        </div>
                        <span className="text-sm text-gray-700">{att.file_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gift */}
              {selectedDemo.has_gift && (
                <div className="mt-8 p-6 bg-gradient-to-r from-[#C4A235]/10 to-[#2D5A3D]/10 rounded-xl">
                  <h4 className="text-lg font-medium text-[#2d2d2d] mb-2 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-[#C4A235]" />
                    A Gift For You
                  </h4>
                  {selectedDemo.gift_type && (
                    <p className="text-gray-700 font-medium">{selectedDemo.gift_type}</p>
                  )}
                  {selectedDemo.gift_details && (
                    <p className="text-gray-500 text-sm mt-2">{selectedDemo.gift_details}</p>
                  )}
                </div>
              )}

              {/* Signature */}
              <div className="mt-8 pt-6 border-t border-[#2D5A3D]/10">
                <p className="signature-handwritten">With love,</p>
                <p className="signature-handwritten mt-1">{selectedDemo.sender_name}</p>
              </div>

              {/* Footer */}
              <div className="mt-6 text-center">
                <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Scheduled for delivery on {new Date(selectedDemo.delivery_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-8">
              <p className="text-gray-500 mb-4">Want to create your own PostScripts?</p>
              <Link 
                href="/dashboard/postscripts/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#355a48] transition-colors"
              >
                <Heart className="w-4 h-4" />
                Create a PostScript
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Demo Info Panel */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
        <h3 className="font-semibold text-white mb-2">🎭 Demo Mode</h3>
        <p className="text-white/70 text-sm">
          This simulates how your recipients will experience receiving a PostScript. 
          Choose different samples above to see various use cases.
        </p>
        <div className="mt-3 flex gap-2">
          <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-white/80">Envelope Animation</span>
          <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-white/80">Typewriter Effect</span>
        </div>
      </div>
    </div>
  )
}
