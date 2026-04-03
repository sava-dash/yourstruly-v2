'use client'

import { useState, useEffect, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, User, Copy, Check, Volume2,
  MessageSquare, FileText, Sparkles, Clock, 
  ExternalLink, Trash2, Plus, X, CheckCircle, RefreshCw, Send,
  Mic, Play, Pause, ChevronDown, ChevronUp, Tag
} from 'lucide-react'
import Link from 'next/link'

interface Session {
  id: string
  title: string
  status: string
  access_token: string
  created_at: string
  interview_group_id: string | null
  contact: {
    id: string
    full_name: string
    phone: string
    email: string
  }
}

interface SessionQuestion {
  id: string
  question_text: string
  sort_order: number
  status: string
}

interface VideoResponse {
  id: string
  session_question_id: string
  video_url: string | null
  audio_url: string | null
  text_response: string | null
  transcript: string | null
  duration: number
  ai_summary: string | null
  ai_category: string | null
  ai_labels: unknown
  created_at: string
}

interface QuestionBankItem {
  id: string
  question_text: string
  category: string
}

const CATEGORIES = [
  { id: 'childhood', label: 'Childhood', emoji: '🌱' },
  { id: 'relationships', label: 'Relationships', emoji: '❤️' },
  { id: 'career', label: 'Career', emoji: '💼' },
  { id: 'wisdom', label: 'Wisdom', emoji: '🦉' },
  { id: 'adversity', label: 'Challenges', emoji: '💪' },
  { id: 'fun', label: 'Fun', emoji: '🎉' },
  { id: 'custom', label: 'My Questions', emoji: '✨' },
]

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const [session, setSession] = useState<Session | null>(null)
  const [questions, setQuestions] = useState<SessionQuestion[]>([])
  const [responses, setResponses] = useState<VideoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set())
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  // Follow-up modal
  const [showFollowupModal, setShowFollowupModal] = useState(false)
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([])
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [customQuestion, setCustomQuestion] = useState('')
  const [sendingFollowup, setSendingFollowup] = useState(false)

  const supabase = createClient()

  useEffect(() => { loadSession() }, [id])

  useEffect(() => {
    if (searchParams.get('followup') === 'true' && session) openFollowupModal()
  }, [searchParams, session])

  const loadSession = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: sessionData } = await supabase
      .from('interview_sessions')
      .select('*, contact:contacts(id, full_name, phone, email)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!sessionData) { setLoading(false); return }
    setSession(sessionData)

    const { data: questionsData } = await supabase
      .from('session_questions')
      .select('*')
      .eq('session_id', id)
      .order('sort_order')
    setQuestions(questionsData || [])

    // Use correct column name: session_question_id
    const { data: responsesData } = await supabase
      .from('video_responses')
      .select('*')
      .eq('session_id', id)
      .order('created_at')
    setResponses(responsesData || [])

    // Auto-expand all responses
    const ids = new Set((responsesData || []).map((r: VideoResponse) => r.session_question_id))
    setExpandedResponses(ids)

    setLoading(false)
  }

  const loadQuestionBank = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('interview_questions')
      .select('id, question_text, category')
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .order('use_count', { ascending: false })
    if (data) {
      const existing = new Set(questions.map(q => q.question_text))
      setQuestionBank(data.filter((q: QuestionBankItem) => !existing.has(q.question_text)))
    }
  }

  const openFollowupModal = () => { loadQuestionBank(); setShowFollowupModal(true) }

  const sendFollowupQuestion = async () => {
    if (!session || (!selectedQuestion && !customQuestion.trim())) return
    setSendingFollowup(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const questionText = selectedQuestion
        ? questionBank.find(q => q.id === selectedQuestion)?.question_text
        : customQuestion.trim()

      let questionId = selectedQuestion
      if (!selectedQuestion && customQuestion.trim()) {
        const { data: saved } = await supabase
          .from('interview_questions')
          .insert({ user_id: user.id, question_text: customQuestion.trim(), category: 'custom', is_system: false })
          .select().single()
        questionId = saved?.id
      }

      await supabase.from('session_questions').insert({
        session_id: session.id,
        question_id: questionId,
        question_text: questionText,
        sort_order: questions.length,
        status: 'pending',
      })

      // Re-send invite with new question
      await fetch('/api/interviews/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: session.contact?.full_name,
          phone: session.contact?.phone || null,
          email: session.contact?.email || null,
          sessionId: session.id,
          message: `You have a new question waiting for you!`,
        }),
      })

      setShowFollowupModal(false)
      setSelectedQuestion(null)
      setCustomQuestion('')
      loadSession()
    } catch (e) {
      console.error('Error sending followup:', e)
    } finally {
      setSendingFollowup(false)
    }
  }

  const getInterviewLink = () =>
    typeof window !== 'undefined' ? `${window.location.origin}/interview/${session?.access_token}` : ''

  const copyLink = () => {
    navigator.clipboard.writeText(getInterviewLink())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getResponse = (questionId: string) =>
    responses.find(r => r.session_question_id === questionId)

  const toggleExpanded = (questionId: string) => {
    setExpandedResponses(prev => {
      const next = new Set(prev)
      next.has(questionId) ? next.delete(questionId) : next.add(questionId)
      return next
    })
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '—'
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const handleDelete = async () => {
    if (!confirm('Delete this interview? All responses will be lost.')) return
    await supabase.from('interview_sessions').delete().eq('id', id)
    window.location.href = '/dashboard/journalist'
  }

  const answeredCount = responses.length
  const totalDuration = responses.reduce((s, r) => s + (r.duration || 0), 0)

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-background"><div className="page-blob page-blob-1"/><div className="page-blob page-blob-2"/></div>
        <div className="loading-container"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A3D]"/></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="page-container">
        <div className="page-background"><div className="page-blob page-blob-1"/></div>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-gray-500 mb-4">Interview not found</p>
          <Link href="/dashboard/journalist" className="text-[#2D5A3D] hover:underline">← Back</Link>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    completed: 'bg-[#2D5A3D]/10 text-[#2D5A3D]',
    sent: 'bg-[#C4A235]/10 text-[#9a8c12]',
    pending: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="page-container">
      <div className="page-background">
        <div className="page-blob page-blob-1"/>
        <div className="page-blob page-blob-2"/>
        <div className="page-blob page-blob-3"/>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/journalist" className="page-header-back">
                <ChevronLeft size={20}/>
              </Link>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="page-header-title">
                    {session.contact?.full_name || session.title}
                  </h1>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColors[session.status] || statusColors.pending}`}>
                    {session.status}
                  </span>
                </div>
                <p className="page-header-subtitle">{formatDate(session.created_at)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={openFollowupModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#2D5A3D] hover:bg-[#234A31] text-white rounded-xl transition-all text-sm font-medium">
                <Plus size={16}/> Ask More
              </button>
              <button onClick={copyLink}
                className="flex items-center gap-2 px-4 py-2.5 glass-card-page hover:shadow-md text-[#2D5A3D] rounded-xl transition-all text-sm font-medium">
                {copied ? <Check size={16}/> : <Copy size={16}/>}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button onClick={handleDelete}
                className="p-2.5 glass-card-page text-gray-400 hover:text-red-500 rounded-xl transition-all">
                <Trash2 size={18}/>
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: 'Answered', value: `${answeredCount}/${questions.length}` },
              { label: 'Duration', value: formatDuration(totalDuration) },
              { label: 'Created', value: formatDate(session.created_at) },
            ].map(s => (
              <div key={s.label} className="glass-card-page p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className="font-semibold text-[#2d2d2d]">{s.value}</p>
              </div>
            ))}
          </div>
        </header>

        {/* Transcript — Q&A back-and-forth */}
        <div className="space-y-6">
          {questions.length === 0 && (
            <div className="glass-card-page p-10 text-center text-gray-400">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-30"/>
              <p>No questions yet.</p>
            </div>
          )}

          {questions.map((question, index) => {
            const response = getResponse(question.id)
            const isExpanded = expandedResponses.has(question.id)

            return (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="space-y-3"
              >
                {/* Question bubble */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#4A3552]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <MessageSquare size={14} className="text-[#4A3552]"/>
                  </div>
                  <div className="flex-1">
                    <div className="glass-card-page px-5 py-4 rounded-2xl rounded-tl-sm">
                      <p className="text-[#2d2d2d] leading-relaxed">{question.question_text}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 ml-1">Question {index + 1}</p>
                  </div>
                </div>

                {/* Response bubble */}
                {response ? (
                  <div className="flex items-start gap-3 pl-8">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#5A8A72] flex items-center justify-center flex-shrink-0 mt-1 text-white text-sm font-semibold">
                      {session.contact?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 overflow-hidden">
                        
                        {/* Audio player */}
                        {response.audio_url && (
                          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#2D5A3D]/5 to-transparent">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
                                <Volume2 size={14} className="text-[#2D5A3D]"/>
                              </div>
                              <audio controls src={response.audio_url} className="flex-1 h-8" style={{ accentColor: '#2D5A3D' }}/>
                              {response.duration > 0 && (
                                <span className="text-xs text-gray-400 whitespace-nowrap">{formatDuration(response.duration)}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Video player */}
                        {response.video_url && (
                          <div className="p-4 border-b border-gray-100">
                            <video src={response.video_url} controls className="w-full rounded-lg max-h-64 bg-black"/>
                          </div>
                        )}

                        {/* Transcript */}
                        {(response.transcript || response.text_response) && (
                          <div className="px-5 py-4">
                            <p className="text-[#2d2d2d] leading-relaxed text-sm">
                              {response.transcript || response.text_response}
                            </p>
                          </div>
                        )}

                        {/* Smart Tags + AI Summary */}
                        {(response.ai_summary || response.ai_category) && (
                          <div className="px-5 py-3 bg-[#F5F3EE]/60 border-t border-gray-100 flex flex-wrap items-center gap-2">
                            <Sparkles size={12} className="text-[#C4A235]"/>
                            {response.ai_category && (
                              <span className="px-2.5 py-1 bg-[#2D5A3D]/10 text-[#2D5A3D] rounded-full text-xs capitalize">
                                {response.ai_category}
                              </span>
                            )}
                            {response.ai_summary && (
                              <span className="text-xs text-gray-400 italic">{response.ai_summary}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 ml-1">
                        {session.contact?.full_name} · {formatDate(response.created_at)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 pl-8">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Clock size={14} className="text-gray-400"/>
                    </div>
                    <p className="text-sm text-gray-400 italic">Waiting for response…</p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Interview link at bottom */}
        <div className="glass-card-page p-4 mt-8 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">Interview Link</p>
            <p className="text-sm text-gray-600 font-mono truncate">{getInterviewLink()}</p>
          </div>
          <a href={getInterviewLink()} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#2D5A3D]/10 text-[#2D5A3D] rounded-lg text-sm flex-shrink-0 hover:bg-[#2D5A3D]/20 transition-colors">
            <ExternalLink size={14}/> Open
          </a>
        </div>
      </div>

      {/* Follow-up Modal */}
      <AnimatePresence>
        {showFollowupModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowFollowupModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#F5F3EE] rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center px-6 py-4 border-b border-[#E8E7DC]">
                <h3 className="text-lg font-semibold text-[#2d2d2d]">Ask a Follow-up</h3>
                <button onClick={() => setShowFollowupModal(false)} className="p-2 hover:bg-white/50 rounded-lg transition-all">
                  <X size={20} className="text-gray-500"/>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <textarea value={customQuestion}
                  onChange={e => { setCustomQuestion(e.target.value); setSelectedQuestion(null) }}
                  placeholder="Write your own question…"
                  rows={2}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] resize-none mb-4"/>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-200"/><span className="text-gray-400 text-xs">or browse</span><div className="flex-1 h-px bg-gray-200"/>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setCustomQuestion('') }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap text-sm transition-all ${selectedCategory === cat.id ? 'bg-[#2D5A3D] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
                {selectedCategory && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {questionBank.filter(q => q.category === selectedCategory).slice(0, 8).map(q => (
                      <button key={q.id} onClick={() => { setSelectedQuestion(q.id); setCustomQuestion('') }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${selectedQuestion === q.id ? 'bg-[#2D5A3D]/10 ring-2 ring-[#2D5A3D] text-[#2d2d2d]' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                        {q.question_text}
                      </button>
                    ))}
                    {questionBank.filter(q => q.category === selectedCategory).length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-4">No questions in this category</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E8E7DC]">
                <button onClick={() => setShowFollowupModal(false)} className="px-4 py-2.5 text-gray-500 hover:text-gray-700">Cancel</button>
                <button onClick={sendFollowupQuestion} disabled={sendingFollowup || (!selectedQuestion && !customQuestion.trim())}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2D5A3D] hover:bg-[#234A31] disabled:opacity-50 text-white rounded-xl transition-all">
                  {sendingFollowup ? <><RefreshCw size={16} className="animate-spin"/> Sending…</> : <><Send size={16}/> Send</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
