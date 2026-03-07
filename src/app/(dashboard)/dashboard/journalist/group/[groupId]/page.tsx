'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { 
  ChevronLeft, ChevronRight, X, Play, Users, Check, Copy,
  ExternalLink, Smile, Mail, MessageSquare
} from 'lucide-react'

interface Session {
  id: string
  contact: { id: string; full_name: string } | { id: string; full_name: string }[] | null
  status: string
  access_token: string
  video_responses: {
    id: string
    video_url: string | null
    audio_url: string | null
    transcript: string | null
    text_response: string | null
    ai_summary: string | null
    ai_category: string | null
    duration: number
    created_at: string
  }[]
}

// Helper to get contact from session (handles array vs single object)
const getContact = (session: Session) => {
  if (!session.contact) return { id: '', full_name: 'Unknown' }
  if (Array.isArray(session.contact)) return session.contact[0] || { id: '', full_name: 'Unknown' }
  return session.contact
}

interface GroupData {
  group_id: string
  question: string
  sessions: Session[]
}

const REACTIONS = ['❤️', '😊', '😢', '😮', '🎉', '👏']

export default function GroupStoryTimePage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params)
  const router = useRouter()
  const [data, setData] = useState<GroupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showReactions, setShowReactions] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [groupId])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: sessions, error } = await supabase
        .from('interview_sessions')
        .select(`
          id, status, access_token, group_question,
          contact:contacts(id, full_name),
          video_responses(id, video_url, audio_url, transcript, text_response, ai_summary, ai_category, duration, created_at)
        `)
        .eq('interview_group_id', groupId)
        .eq('user_id', user.id)
        .order('created_at')

      if (error) throw error

      if (sessions && sessions.length > 0) {
        setData({
          group_id: groupId,
          question: sessions[0].group_question || 'Group Interview',
          sessions: sessions as Session[],
        })
      }
    } catch (error) {
      console.error('Error loading group:', error)
      router.push('/dashboard/journalist')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = (token: string, sessionId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/interview/${token}`)
    setCopied(sessionId)
    setTimeout(() => setCopied(null), 2000)
  }

  const shareViaEmail = (token: string, recipientName: string) => {
    const url = `${window.location.origin}/interview/${token}`
    const subject = encodeURIComponent(`I'd love to hear your story`)
    const body = encodeURIComponent(
      `Hi ${recipientName},\n\n` +
      `I'd love to hear your story! Please click the link below to record your responses:\n\n` +
      `${url}\n\n` +
      `Thank you!`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const shareViaSMS = async (sessionId: string, token: string, recipientPhone?: string, recipientName?: string) => {
    const url = `${window.location.origin}/interview/${token}`
    if (recipientPhone) {
      try {
        const res = await fetch('/api/interviews/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: recipientName || 'there', phone: recipientPhone, sessionId }),
        })
        const d = await res.json()
        if (!d.success) throw new Error('failed')
      } catch {
        window.open(`sms:${recipientPhone}?body=${encodeURIComponent(url)}`)
      }
    } else {
      window.open(`sms:?body=${encodeURIComponent(url)}`)
    }
  }

  // Get responses with completed sessions
  const responsesWithParticipant = data?.sessions
    .filter(s => s.video_responses?.length > 0)
    .map(s => ({
      session: s,
      response: s.video_responses[0], // First response
      participant: getContact(s),
    })) || []

  const goNext = () => {
    if (currentIndex < responsesWithParticipant.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'Escape') router.push('/dashboard/journalist')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, responsesWithParticipant.length])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#2d2d2d] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-[#2d2d2d] flex items-center justify-center">
        <div className="text-center text-white">
          <p className="mb-4">Group not found</p>
          <Link href="/dashboard/journalist" className="text-[#8DACAB] hover:underline">
            Go back
          </Link>
        </div>
      </div>
    )
  }

  const completedCount = data.sessions.filter(s => s.status === 'completed').length
  const pendingCount = data.sessions.length - completedCount

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#2d2d2d] to-[#1a1a1a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 text-white">
        <Link
          href="/dashboard/journalist"
          className="flex items-center gap-2 text-white/70 hover:text-white"
        >
          <X size={24} />
        </Link>

        <div className="text-center">
          <h1 className="font-semibold">Story Time</h1>
          <p className="text-sm text-white/60">
            {responsesWithParticipant.length > 0 
              ? `${currentIndex + 1} of ${responsesWithParticipant.length} responses`
              : `${completedCount} of ${data.sessions.length} completed`
            }
          </p>
        </div>

        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Question Banner */}
      <div className="px-4 pb-4">
        <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <p className="text-white/60 text-xs mb-1">Question</p>
          <p className="text-white font-medium">{data.question}</p>
        </div>
      </div>

      {/* Main Content */}
      {responsesWithParticipant.length === 0 ? (
        // No responses yet - show participant status
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center text-white/60 mb-6">
              <Users size={48} className="mx-auto mb-3 opacity-50" />
              <p>Waiting for responses...</p>
            </div>

            <div className="space-y-3">
              {data.sessions.map(session => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                      {getContact(session).full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{getContact(session).full_name}</p>
                      <p className={`text-xs ${
                        session.status === 'completed' ? 'text-green-400' : 'text-white/50'
                      }`}>
                        {session.status === 'completed' ? 'Completed' : 'Pending'}
                      </p>
                    </div>
                  </div>

                  {session.status !== 'completed' && (
                    <div className="flex flex-col items-end gap-2">
                      {/* Shareable URL */}
                      <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                        <span className="text-sm text-white/70 truncate max-w-[180px] sm:max-w-[240px]">
                          {`${typeof window !== 'undefined' ? window.location.origin : ''}/interview/${session.access_token}`}
                        </span>
                        <button
                          onClick={() => copyLink(session.access_token, session.id)}
                          className="p-1.5 hover:bg-white/20 rounded-md transition-all text-white/80"
                          title="Copy link"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      {/* Share Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => shareViaEmail(session.access_token, getContact(session).full_name || 'there')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#406A56]/80 hover:bg-[#406A56] text-white text-sm rounded-lg transition-all"
                          title="Share via Email"
                        >
                          <Mail size={14} />
                          <span className="hidden sm:inline">Email</span>
                        </button>
                        <button
                          onClick={() => shareViaSMS(session.id, session.access_token, (getContact(session) as any)?.phone, getContact(session)?.full_name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#406A56]/80 hover:bg-[#406A56] text-white text-sm rounded-lg transition-all"
                          title="Share via SMS"
                        >
                          <MessageSquare size={14} />
                          <span className="hidden sm:inline">SMS</span>
                        </button>
                        {copied === session.id && (
                          <span className="text-xs text-green-400 font-medium">Copied!</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Show responses carousel
        <div className="flex-1 flex items-center justify-center px-4 relative">
          {/* Prev Button */}
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="absolute left-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed z-10"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Response Card */}
          <div className="max-w-2xl w-full">
            {responsesWithParticipant[currentIndex] && (
              <ResponseCard
                response={responsesWithParticipant[currentIndex].response}
                participant={responsesWithParticipant[currentIndex].participant}
                showReactions={showReactions}
                setShowReactions={setShowReactions}
              />
            )}
          </div>

          {/* Next Button */}
          <button
            onClick={goNext}
            disabled={currentIndex === responsesWithParticipant.length - 1}
            className="absolute right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed z-10"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      )}

      {/* Progress Dots */}
      {responsesWithParticipant.length > 0 && (
        <div className="p-4">
          <div className="flex gap-1 max-w-2xl mx-auto">
            {responsesWithParticipant.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`flex-1 h-1 rounded-full transition-all ${
                  i === currentIndex ? 'bg-[#406A56]' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Participants Bar */}
      {responsesWithParticipant.length > 0 && (
        <div className="p-4 border-t border-white/10">
          <div className="max-w-2xl mx-auto flex items-center gap-2 overflow-x-auto">
            {responsesWithParticipant.map((item, i) => (
              <button
                key={item.session.id}
                onClick={() => setCurrentIndex(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap transition-all ${
                  i === currentIndex 
                    ? 'bg-[#406A56] text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  {item.participant?.full_name?.charAt(0) || '?'}
                </div>
                <span className="text-sm">{item.participant?.full_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Response Card Component
function ResponseCard({ 
  response, 
  participant,
  showReactions,
  setShowReactions
}: { 
  response: any
  participant: any
  showReactions: boolean
  setShowReactions: (show: boolean) => void
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-3xl overflow-hidden">
      {/* Video */}
      {response.video_url && (
        <div className="aspect-video bg-black">
          <video
            src={response.video_url}
            controls
            className="w-full h-full"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Participant */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#406A56]/30 flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {participant?.full_name?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <div className="text-white font-medium">{participant?.full_name}</div>
            <div className="text-white/50 text-sm">
              {new Date(response.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Transcription/Summary */}
        {(response.transcript || response.text_response || response.ai_summary) && (
          <div className="mb-4">
            {response.ai_summary && (
              <p className="text-white/90 text-lg leading-relaxed">
                &ldquo;{response.ai_summary}&rdquo;
              </p>
            )}
            {response.transcript || response.text_response && !response.ai_summary && (
              <p className="text-white/70 text-sm">
                {response.transcript || response.text_response}
              </p>
            )}
          </div>
        )}

        {/* Reactions */}
        <div className="flex items-center justify-end relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <Smile size={20} />
          </button>

          {showReactions && (
            <div className="absolute bottom-full right-0 mb-2 flex gap-1 bg-white/20 backdrop-blur-sm rounded-full p-2">
              {REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setShowReactions(false)}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
