'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Video, Plus, Clock, CheckCircle, ChevronLeft, User, Play,
  Sparkles, ExternalLink, X, Search, Heart, Users, Check,
  Copy, Mail, MessageSquare, Inbox
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import '@/styles/page-styles.css'
import { SMSConsentInline } from '@/components/ui/SMSConsentCheckbox'

interface Contact {
  id: string
  full_name: string
  phone: string
  email: string
}

interface Circle {
  id: string
  name: string
  color?: string  // not in DB schema - kept for UI compatibility
  members: { user_id: string }[]
}

// Note: Circles are for user collaboration, not contact grouping
// Contact groups feature could be added later for interview targeting

interface Question {
  id: string
  question_text: string
  category: string
  is_system: boolean
  is_favorite: boolean
}

interface Session {
  id: string
  title: string
  status: string
  access_token: string
  created_at: string
  opened_at?: string | null
  started_at?: string | null
  last_response_at?: string | null
  interview_group_id?: string
  group_question?: string
  contact: {
    id: string
    full_name: string
  }
  session_questions: {
    id: string
    question_text: string
    status: string
  }[]
  video_responses: {
    id: string
    duration: number
    ai_summary: string
    transcript?: string
    session_question_id?: string
  }[]
}

interface GroupedSession {
  group_id: string
  question: string
  sessions: Session[]
  created_at: string
}

const CATEGORIES = [
  { id: 'childhood', label: 'Childhood', emoji: '👒' },
  { id: 'relationships', label: 'Relationships', emoji: '❤️' },
  { id: 'career', label: 'Career', emoji: '💼' },
  { id: 'wisdom', label: 'Wisdom', emoji: '🦉' },
  { id: 'adversity', label: 'Challenges', emoji: '💪' },
  { id: 'fun', label: 'Fun', emoji: '🎉' },
  { id: 'history', label: 'History', emoji: '📜' },
  { id: 'spirituality', label: 'Faith', emoji: '🙏' },
  { id: 'custom', label: 'My Questions', emoji: '✨' },
]

type RecipientMode = 'single' | 'multiple' | 'circle'

export default function JournalistPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal state
  const [showNewSession, setShowNewSession] = useState(false)
  const [step, setStep] = useState<'recipients' | 'question'>('recipients')
  
  // Recipient selection
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('single')
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null)
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  
  // Question selection
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [customQuestion, setCustomQuestion] = useState('')
  
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [smsConsent, setSmsConsent] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'draft'>('all')
  // F1: unread inbox count for sidebar badge
  const [unreadInbox, setUnreadInbox] = useState<number>(0)

  // Optional sender-controlled email verification for the recipient
  const [requireVerification, setRequireVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')

  // Optional sender note shown on recipient welcome screen (≤280 chars)
  const [senderNote, setSenderNote] = useState('')

  // Optional follow-up branch rules attached to the chosen question (≤3)
  type BranchRuleDraft = { if_answer_contains: string; then_ask: string }
  const [showBranchComposer, setShowBranchComposer] = useState(false)
  const [branchRules, setBranchRules] = useState<BranchRuleDraft[]>([])
  const addBranchRule = () => {
    setBranchRules(prev => prev.length >= 3 ? prev : [...prev, { if_answer_contains: '', then_ask: '' }])
  }
  const updateBranchRule = (idx: number, patch: Partial<BranchRuleDraft>) => {
    setBranchRules(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }
  const removeBranchRule = (idx: number) => {
    setBranchRules(prev => prev.filter((_, i) => i !== idx))
  }

  // Group view toggle: per-card pivoted view, persisted in localStorage
  const [groupViewIds, setGroupViewIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('journalist:groupViewIds') || '[]')
      if (Array.isArray(stored)) setGroupViewIds(new Set(stored))
    } catch { /* ignore */ }
  }, [])
  const toggleGroupView = (groupId: string) => {
    setGroupViewIds(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId)
      try { localStorage.setItem('journalist:groupViewIds', JSON.stringify(Array.from(next))) } catch { /* ignore */ }
      return next
    })
  }

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('No user found')
      setLoading(false)
      return
    }

    const [sessionsRes, contactsRes, questionsRes, circlesRes] = await Promise.all([
      supabase
        .from('interview_sessions')
        .select(`
          *, contact:contacts!contact_id(id, full_name, phone, email),
          session_questions(id, question_text, status),
          video_responses(id, duration, ai_summary, transcript, session_question_id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('contacts')
        .select('id, full_name, phone, email')
        .eq('user_id', user.id)
        .order('full_name'),
      supabase
        .from('interview_questions')
        .select('*')
        .or(`user_id.eq.${user.id},is_system.eq.true`)
        .order('category'),
      supabase
        .from('circles')
        .select('id, name, members:circle_members(user_id)')
        .eq('created_by', user.id)
        .order('name'),
    ])

    // Log any errors for debugging
    if (sessionsRes.error) {
      console.error('Error fetching interview sessions:', sessionsRes.error)
    }
    if (contactsRes.error) {
      console.error('Error fetching contacts:', contactsRes.error)
    }
    if (questionsRes.error) {
      console.error('Error fetching questions:', questionsRes.error)
    }
    if (circlesRes.error) {
      console.error('Error fetching circles:', circlesRes.error)
    }

    // Process sessions - normalize contact (might be array or single object)
    const processedSessions = (sessionsRes.data || []).map((session: any) => ({
      ...session,
      contact: Array.isArray(session.contact) ? session.contact[0] : session.contact
    }))

    setSessions(processedSessions)
    setContacts(contactsRes.data || [])
    setQuestions(questionsRes.data || [])
    setCircles(circlesRes.data || [])

    // F1: unread inbox badge
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { count } = await supabase
          .from('video_responses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('seen_at', null)
        setUnreadInbox(count || 0)
      }
    } catch { /* non-blocking */ }

    setLoading(false)
  }

  // Group sessions by interview_group_id for display
  const groupedSessions = sessions.reduce((acc, session) => {
    if (session.interview_group_id) {
      const existing = acc.find(g => g.group_id === session.interview_group_id)
      if (existing) {
        existing.sessions.push(session)
      } else {
        acc.push({
          group_id: session.interview_group_id,
          question: session.group_question || session.session_questions?.[0]?.question_text || 'Group Interview',
          sessions: [session],
          created_at: session.created_at,
        })
      }
    }
    return acc
  }, [] as GroupedSession[])

  // Individual sessions (not part of a group)
  const individualSessions = sessions.filter(s => !s.interview_group_id)

  // Search and status filtering
  const filteredGroupedSessions = useMemo(() => {
    return groupedSessions.filter(group => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q ||
        group.question.toLowerCase().includes(q) ||
        group.sessions.some(s =>
          s.contact?.full_name?.toLowerCase().includes(q) ||
          s.status.toLowerCase().includes(q)
        )
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'completed' && group.sessions.every(s => s.status === 'completed')) ||
        (statusFilter === 'active' && group.sessions.some(s => s.status === 'sent' || s.status === 'recording')) ||
        (statusFilter === 'draft' && group.sessions.some(s => s.status === 'pending'))
      return matchesSearch && matchesStatus
    })
  }, [groupedSessions, searchQuery, statusFilter])

  const filteredIndividualSessions = useMemo(() => {
    return individualSessions.filter(session => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q ||
        session.contact?.full_name?.toLowerCase().includes(q) ||
        session.title?.toLowerCase().includes(q) ||
        session.session_questions?.some(sq => sq.question_text.toLowerCase().includes(q)) ||
        session.status.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'completed' && session.status === 'completed') ||
        (statusFilter === 'active' && (session.status === 'sent' || session.status === 'recording')) ||
        (statusFilter === 'draft' && session.status === 'pending')
      return matchesSearch && matchesStatus
    })
  }, [individualSessions, searchQuery, statusFilter])

  const hasFilteredResults = filteredGroupedSessions.length > 0 || filteredIndividualSessions.length > 0

  const filteredQuestions = selectedCategory
    ? questions.filter(q => 
        selectedCategory === 'custom' ? !q.is_system : q.category === selectedCategory
      )
    : []

  const toggleContactSelection = (contact: Contact) => {
    if (recipientMode === 'single') {
      setSelectedContacts([contact])
      setStep('question')
    } else {
      setSelectedContacts(prev => {
        const exists = prev.find(c => c.id === contact.id)
        if (exists) {
          return prev.filter(c => c.id !== contact.id)
        } else {
          return [...prev, contact]
        }
      })
    }
  }

  const getSelectedRecipients = (): Contact[] => {
    return selectedContacts
  }

  const handleCreateSession = async () => {
    const recipients = getSelectedRecipients()
    if (recipients.length === 0 || (!selectedQuestion && !customQuestion.trim())) return

    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // Determine question text
      let questionText = ''
      let questionId = selectedQuestion
      
      if (customQuestion.trim()) {
        const { data: savedQuestion } = await supabase
          .from('interview_questions')
          .insert({
            user_id: user.id,
            question_text: customQuestion.trim(),
            category: 'custom',
            is_system: false
          })
          .select()
          .single()
        
        questionId = savedQuestion?.id || null
        questionText = customQuestion.trim()
      } else {
        const question = questions.find(q => q.id === selectedQuestion)
        questionText = question?.question_text || ''
      }

      // Generate group ID if multiple recipients
      const groupId = recipients.length > 1 ? crypto.randomUUID() : null

      // Create interview session for each recipient
      for (const recipient of recipients) {
        const { data: session, error: sessionError } = await supabase
          .from('interview_sessions')
          .insert({
            user_id: user.id,
            contact_id: recipient.id,
            title: recipients.length > 1 
              ? `${questionText.slice(0, 50)}...` 
              : `Interview with ${recipient.full_name}`,
            status: 'pending',
            interview_group_id: groupId,
            group_question: groupId ? questionText : null,
            verification_required: requireVerification,
            verification_email: requireVerification && verificationEmail.trim()
              ? verificationEmail.trim().toLowerCase()
              : (requireVerification ? (recipient.email || null) : null),
            sender_note: senderNote.trim() ? senderNote.trim().slice(0, 280) : null,
          })
          .select()
          .single()

        if (sessionError) throw sessionError

        // Normalize branch rules — drop empties, cap at 3, split keywords.
        const cleanBranchRules = branchRules
          .map(r => ({
            if_answer_contains: r.if_answer_contains
              .split(',')
              .map(s => s.trim().toLowerCase())
              .filter(Boolean),
            then_ask: r.then_ask.trim(),
          }))
          .filter(r => r.if_answer_contains.length > 0 && r.then_ask.length > 0)
          .slice(0, 3)

        // Add question to session
        await supabase.from('session_questions').insert({
          session_id: session.id,
          question_id: questionId,
          question_text: questionText,
          sort_order: 0,
          branch_rules: cleanBranchRules.length > 0 ? cleanBranchRules : null,
        })

        // Auto-send invite via SMS and/or email
        if (recipient.phone || recipient.email) {
          try {
            await fetch('/api/interviews/invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: recipient.full_name,
                phone: recipient.phone || null,
                email: recipient.email || null,
                sessionId: session.id,
              }),
            })
          } catch (inviteErr) {
            console.error('Failed to send invite for', recipient.full_name, inviteErr)
            // Don't block session creation if invite fails
          }
        }
      }

      closeModal()
      loadData()
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Failed to create interview')
    } finally {
      setCreating(false)
    }
  }

  const closeModal = () => {
    setShowNewSession(false)
    setStep('recipients')
    setRecipientMode('single')
    setSelectedContacts([])
    setSelectedCircle(null)
    setSelectedQuestion(null)
    setSelectedCategory(null)
    setCustomQuestion('')
    setRequireVerification(false)
    setVerificationEmail('')
    setSenderNote('')
    setBranchRules([])
    setShowBranchComposer(false)
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
    
    // If we have a phone number, send via Telnyx
    if (recipientPhone) {
      try {
        const res = await fetch('/api/interviews/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: recipientName || 'there',
            phone: recipientPhone,
            sessionId,
          }),
        })
        const data = await res.json()
        if (data.success) {
          alert(`SMS sent to ${recipientPhone}!`)
        } else {
          // Fallback to native SMS
          window.open(`sms:${recipientPhone}?body=${encodeURIComponent(url)}`)
        }
      } catch {
        window.open(`sms:${recipientPhone}?body=${encodeURIComponent(url)}`)
      }
    } else {
      // No phone stored - open native SMS to let user choose
      window.open(`sms:?body=${encodeURIComponent(url)}`)
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[#2D5A3D]/10 text-[#2D5A3D]'
      case 'recording': return 'bg-blue-50 text-blue-600'
      case 'sent': return 'bg-[#C4A235]/10 text-[#9a8c12]'
      default: return 'bg-gray-100 text-gray-500'
    }
  }

  // Derived analytics state for sender dashboard
  type DerivedKind = 'not_opened' | 'opened_no_response' | 'in_progress' | 'stalled' | 'completed'
  const getDerivedState = (s: Session): { kind: DerivedKind; label: string; className: string } => {
    const now = Date.now()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    if (s.status === 'completed') {
      const ago = s.last_response_at ? formatDistanceToNow(new Date(s.last_response_at), { addSuffix: true }) : 'recently'
      return {
        kind: 'completed',
        label: `Completed ${ago}`,
        className: 'bg-[#2D5A3D]/10 text-[#2D5A3D]',
      }
    }
    if (s.last_response_at) {
      const stalled = now - new Date(s.last_response_at).getTime() > sevenDaysMs
      const ago = formatDistanceToNow(new Date(s.last_response_at), { addSuffix: true })
      if (stalled) {
        return {
          kind: 'stalled',
          label: 'Stalled — could use a nudge',
          className: 'bg-[#C35F33]/10 text-[#C35F33]',
        }
      }
      return {
        kind: 'in_progress',
        label: `In progress · last answer ${ago}`,
        className: 'bg-[#2D5A3D]/10 text-[#2D5A3D]',
      }
    }
    if (s.opened_at) {
      const ago = formatDistanceToNow(new Date(s.opened_at), { addSuffix: true })
      return {
        kind: 'opened_no_response',
        label: `Opened ${ago}, no answer yet`,
        className: 'bg-[#C4A235]/10 text-[#9a8c12]',
      }
    }
    return {
      kind: 'not_opened',
      label: 'Sent — not opened yet',
      className: 'bg-gray-100 text-gray-600',
    }
  }

  // Nudge modal state
  const [nudgeSession, setNudgeSession] = useState<Session | null>(null)
  const buildNudgeText = (s: Session): string => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/interview/${s.access_token}`
    const name = s.contact?.full_name?.split(' ')[0] || 'there'
    return `Hi ${name}, just bumping our conversation up — no rush, but I'd love to hear from you when you have a moment. Here's the link again: ${url}`
  }

  const proceedToQuestion = () => {
    const recipients = getSelectedRecipients()
    if (recipients.length > 0) {
      setStep('question')
    }
  }

  return (
    <div className="page-container">
      {/* Warm gradient background with blobs */}
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="page-header-back">
                <ChevronLeft size={20} />
              </Link>
              <div>
                <h1
                  className="text-2xl font-bold text-[#1A1F1C]"
                  style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
                >
                  Interviews
                </h1>
                <p className="page-header-subtitle">Capture family stories remotely</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/journalist/inbox"
                aria-label={unreadInbox > 0 ? `Inbox, ${unreadInbox} unread` : 'Inbox'}
                className="relative flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#D3E1DF] text-[#2D5A3D] text-sm font-medium rounded-xl transition-colors min-h-[44px]"
              >
                <Inbox size={18} />
                <span className="hidden sm:inline">Inbox</span>
                {unreadInbox > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#C35F33] text-white text-xs font-semibold rounded-full flex items-center justify-center">
                    {unreadInbox > 99 ? '99+' : unreadInbox}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setShowNewSession(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] hover:bg-[#244B32] text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">New Interview</span>
              </button>
            </div>
          </div>
        </header>

        {/* Search and Filter */}
        {!loading && sessions.length > 0 && (
          <div className="mb-5 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A09A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by contact name, question, or status..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#DDE3DF] bg-white text-sm text-[#1A1F1C] placeholder-[#94A09A] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A09A] hover:text-[#5A6660]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status filter pills */}
            <div className="flex gap-2">
              {(['all', 'active', 'completed', 'draft'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-[#2D5A3D] text-white'
                      : 'bg-white border border-[#DDE3DF] text-[#5A6660] hover:bg-[#F0F0EC]'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="pb-12">
          <div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[#666]">Loading...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white border border-[#DDE3DF] rounded-xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#2D5A3D]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video size={32} className="text-[#2D5A3D]" />
              </div>
              <h3 className="text-lg font-semibold text-[#2d2d2d] mb-2">No interviews yet</h3>
              <p className="text-[#666] mb-6 max-w-md mx-auto">
                Send a question to family or friends, and they can record a video response from anywhere.
              </p>
              <button
                onClick={() => setShowNewSession(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2D5A3D] hover:bg-[#244B32] text-white rounded-xl transition-colors"
              >
                <Plus size={18} />
                Start your first interview
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* No results after filtering */}
              {!hasFilteredResults && (
                <div className="bg-white border border-[#DDE3DF] rounded-xl p-8 text-center shadow-sm">
                  <p className="text-[#5A6660] text-sm">No interviews match your search or filter.</p>
                </div>
              )}

              {/* Grouped Interviews */}
              {filteredGroupedSessions.map((group) => (
                <motion.div
                  key={group.group_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-[#DDE3DF] rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#5a8a70] flex items-center justify-center text-white">
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="text-[#2d2d2d] font-semibold">Group Interview</h3>
                        <p className="text-[#888] text-sm">{group.sessions.length} people</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#2D5A3D]">
                            {group.sessions.filter(s => s.status === 'completed').length} of {group.sessions.length} completed
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleGroupView(group.group_id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          groupViewIds.has(group.group_id)
                            ? 'bg-[#C35F33] hover:bg-[#a64f29] text-white'
                            : 'bg-[#D3E1DF] hover:bg-[#bfd3cf] text-[#406A56]'
                        }`}
                        title="Toggle side-by-side group view"
                      >
                        <Users size={14} />
                        {groupViewIds.has(group.group_id) ? 'Per-recipient' : 'Group view'}
                      </button>
                      <Link
                        href={`/dashboard/journalist/group/${group.group_id}`}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#2D5A3D] hover:bg-[#244B32] text-white text-sm rounded-lg transition-colors"
                      >
                        <Play size={14} />
                        Story Time
                      </Link>
                    </div>
                  </div>

                  {groupViewIds.has(group.group_id) ? (
                    /* Pivoted Group View: question -> recipient quotes */
                    <div className="pt-3 border-t border-gray-100 space-y-4">
                      {(() => {
                        // Collect all unique questions across this group's sessions
                        const allQuestions: { id: string; text: string }[] = []
                        const seen = new Set<string>()
                        for (const s of group.sessions) {
                          for (const sq of (s.session_questions || [])) {
                            if (!seen.has(sq.question_text)) {
                              seen.add(sq.question_text)
                              allQuestions.push({ id: sq.id, text: sq.question_text })
                            }
                          }
                        }
                        if (allQuestions.length === 0) {
                          allQuestions.push({ id: 'group-q', text: group.question })
                        }
                        return allQuestions.map((q) => (
                          <div key={q.id}>
                            <h4
                              className="text-sm font-semibold text-[#406A56] mb-2"
                              style={{ fontFamily: 'Playfair Display, serif' }}
                            >
                              {q.text}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {group.sessions.map(s => {
                                // Find the matching session_question id within this session
                                const localSq = (s.session_questions || []).find(
                                  sq => sq.question_text === q.text
                                )
                                const response = localSq
                                  ? (s.video_responses || []).find(
                                      vr => vr.session_question_id === localSq.id
                                    )
                                  : undefined
                                const text = (response?.transcript || response?.ai_summary || '').trim()
                                return (
                                  <div
                                    key={s.id}
                                    className="rounded-lg p-3 border"
                                    style={{
                                      background: text ? '#F2F1E5' : '#D3E1DF',
                                      borderColor: '#E8E7DC',
                                    }}
                                  >
                                    <div className="text-xs font-medium text-[#406A56] mb-1">
                                      {s.contact?.full_name || 'Recipient'}
                                    </div>
                                    {text ? (
                                      <>
                                        <p
                                          className="text-sm text-[#2d2d2d] italic line-clamp-3"
                                          style={{ fontFamily: 'Caveat, cursive', fontSize: 16 }}
                                        >
                                          “{text}”
                                        </p>
                                        <Link
                                          href={`/dashboard/journalist/${s.id}`}
                                          className="inline-block mt-1 text-xs text-[#C35F33] hover:underline"
                                        >
                                          View full
                                        </Link>
                                      </>
                                    ) : (
                                      <p className="text-xs text-[#666] italic">No answer yet</p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm text-[#666] italic mb-3">"{group.question}"</p>
                      <div className="flex flex-wrap gap-2">
                        {group.sessions.map(session => (
                          <div
                            key={session.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                              session.status === 'completed'
                                ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {session.status === 'completed' && <Check size={12} />}
                            {session.contact?.full_name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Individual Interviews */}
              {filteredIndividualSessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-[#DDE3DF] rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#5a8a70] flex items-center justify-center text-white font-semibold">
                        {session.contact?.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h3 className="text-[#2d2d2d] font-semibold">{session.title}</h3>
                        <p className="text-[#888] text-sm">with {session.contact?.full_name}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {(() => {
                            const derived = getDerivedState(session)
                            return (
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${derived.className}`}>
                                {derived.label}
                              </span>
                            )
                          })()}
                          {getDerivedState(session).kind === 'stalled' && (
                            <button
                              onClick={() => setNudgeSession(session)}
                              className="text-xs px-2.5 py-1 rounded-full font-medium bg-[#C35F33] text-white hover:bg-[#a64f29] transition-colors"
                            >
                              Send a friendly nudge
                            </button>
                          )}
                          {session.video_responses?.length > 0 && (
                            <span className="text-[#2D5A3D] text-xs flex items-center gap-1">
                              <CheckCircle size={12} />
                              Answered
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {session.status === 'pending' && (
                        <div className="flex flex-col items-end gap-2">
                          {/* Shareable URL */}
                          <div className="flex items-center gap-2 bg-[#F5F3EE] rounded-lg px-3 py-2 border border-[#E8E7DC]">
                            <span className="text-sm text-[#666] truncate max-w-[200px] sm:max-w-[280px]">
                              {`${typeof window !== 'undefined' ? window.location.origin : ''}/interview/${session.access_token}`}
                            </span>
                            <button
                              onClick={() => copyLink(session.access_token, session.id)}
                              className="p-1.5 hover:bg-[#2D5A3D]/10 rounded-md transition-all text-[#2D5A3D]"
                              title="Copy link"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          {/* Share Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => shareViaEmail(session.access_token, session.contact?.full_name || 'there')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D5A3D]/10 hover:bg-[#2D5A3D]/20 text-[#2D5A3D] text-sm rounded-lg transition-all"
                              title="Share via Email"
                            >
                              <Mail size={14} />
                              <span className="hidden sm:inline">Email</span>
                            </button>
                            <button
                              onClick={() => shareViaSMS(session.id, session.access_token, (session.contact as any)?.phone, (session.contact as any)?.full_name)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D5A3D]/10 hover:bg-[#2D5A3D]/20 text-[#2D5A3D] text-sm rounded-lg transition-all"
                              title="Share via SMS"
                            >
                              <MessageSquare size={14} />
                              <span className="hidden sm:inline">SMS</span>
                            </button>
                            {copied === session.id && (
                              <span className="text-xs text-[#2D5A3D] font-medium">Copied!</span>
                            )}
                          </div>
                        </div>
                      )}
                      {(session.status === 'sent' || session.status === 'completed') && (
                        <Link
                          href={`/dashboard/journalist/${session.id}?followup=true`}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[#2D5A3D] hover:bg-[#244B32] text-white text-sm rounded-lg transition-colors"
                        >
                          <Plus size={14} />
                          Ask More
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/journalist/${session.id}`}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#2D5A3D]/10 hover:bg-[#2D5A3D]/20 text-[#2D5A3D] text-sm rounded-lg transition-all"
                      >
                        View
                      </Link>
                    </div>
                  </div>

                  {session.session_questions?.[0] && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-[#666] italic">
                        "{session.session_questions[0].question_text}"
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New Interview Modal */}
      <AnimatePresence>
        {showNewSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#F5F3EE] rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E7DC]">
                <div>
                  <h2 className="text-lg font-semibold text-[#2d2d2d]">New Interview</h2>
                  <p className="text-sm text-[#888]">
                    {step === 'recipients' ? 'Choose who to interview' : 'Pick a question to ask'}
                  </p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-white/50 rounded-lg transition-all">
                  <X size={20} className="text-[#666]" />
                </button>
              </div>

              {/* Step 1: Select Recipients */}
              {step === 'recipients' && (
                <div className="flex flex-col h-[calc(85vh-80px)]">
                  {/* Mode Selector */}
                  <div className="flex gap-2 p-4 border-b border-[#E8E7DC]">
                    <button
                      onClick={() => { setRecipientMode('single'); setSelectedContacts([]); setSelectedCircle(null) }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        recipientMode === 'single' ? 'bg-[#2D5A3D] text-white' : 'bg-white/70 text-[#666]'
                      }`}
                    >
                      <User size={16} />
                      One Person
                    </button>
                    <button
                      onClick={() => { setRecipientMode('multiple'); setSelectedContacts([]); setSelectedCircle(null) }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        recipientMode === 'multiple' ? 'bg-[#2D5A3D] text-white' : 'bg-white/70 text-[#666]'
                      }`}
                    >
                      <Users size={16} />
                      Multiple
                    </button>
                    <button
                      onClick={() => { setRecipientMode('circle'); setSelectedContacts([]); setSelectedCircle(null) }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        recipientMode === 'circle' ? 'bg-[#2D5A3D] text-white' : 'bg-white/70 text-[#666]'
                      }`}
                    >
                      <Heart size={16} />
                      Circle
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {/* Circle Selection */}
                    {recipientMode === 'circle' && (
                      <div className="space-y-4">
                        {circles.length === 0 ? (
                          <div className="text-center py-8">
                            <Heart size={40} className="text-[#888] mx-auto mb-3" />
                            <p className="text-[#666] mb-4">Create a circle first to get started</p>
                            <Link href="/dashboard/circles" className="text-[#2D5A3D] hover:underline">
                              Create a circle first →
                            </Link>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-[#666] mb-2">Select a circle:</p>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                              {circles.map((circle) => (
                                <button
                                  key={circle.id}
                                  onClick={() => {
                                    setSelectedCircle(circle)
                                    // Auto-select all members in the circle
                                    const memberContacts = contacts.filter(c => 
                                      // Note: circles have user members, not contacts - this filter may not match
                                      circle.members.some(m => m.user_id === c.id)
                                    )
                                    setSelectedContacts(memberContacts)
                                  }}
                                  className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                                    selectedCircle?.id === circle.id 
                                      ? 'bg-[#2D5A3D]/10 ring-2 ring-[#2D5A3D]' 
                                      : 'bg-white/70 hover:bg-white'
                                  }`}
                                >
                                  <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: '#2D5A3D20', color: '#2D5A3D' }}
                                  >
                                    <Heart size={16} />
                                  </div>
                                  <div>
                                    <p className="font-medium text-[#2d2d2d]">{circle.name}</p>
                                    <p className="text-xs text-[#888]">{circle.members.length} members</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                            
                            {/* Show selected circle members */}
                            {selectedCircle && selectedContacts.length > 0 && (
                              <div className="border-t border-[#E8E7DC] pt-4">
                                <p className="text-sm text-[#666] mb-2">Members to interview ({selectedContacts.length}):</p>
                                <div className="space-y-2">
                                  {selectedContacts.map((contact) => (
                                    <div
                                      key={contact.id}
                                      className="flex items-center gap-3 p-3 bg-white/70 rounded-xl"
                                    >
                                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center border-[#2D5A3D] bg-[#2D5A3D]`}>
                                        <Check size={14} className="text-white" />
                                      </div>
                                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#5a8a70] flex items-center justify-center text-white text-sm font-medium">
                                        {contact.full_name.charAt(0)}
                                      </div>
                                      <span className="text-[#2d2d2d]">{contact.full_name}</span>
                                      <button
                                        onClick={() => setSelectedContacts(prev => prev.filter(c => c.id !== contact.id))}
                                        className="ml-auto p-1 text-[#888] hover:text-red-500"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Contact Selection (single or multiple) */}
                    {recipientMode !== 'circle' && (
                      contacts.length === 0 ? (
                        <div className="text-center py-8">
                          <User size={40} className="text-[#888] mx-auto mb-3" />
                          <p className="text-[#666] mb-4">Add your first contact to get started</p>
                          <Link href="/dashboard/contacts" className="text-[#2D5A3D] hover:underline">
                            Add contacts first →
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {contacts.map((contact) => {
                            const isSelected = selectedContacts.some(c => c.id === contact.id)
                            return (
                              <button
                                key={contact.id}
                                onClick={() => toggleContactSelection(contact)}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
                                  isSelected ? 'bg-[#2D5A3D]/10 ring-2 ring-[#2D5A3D]' : 'bg-white/70 hover:bg-white'
                                }`}
                              >
                                {recipientMode === 'multiple' && (
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                    isSelected ? 'border-[#2D5A3D] bg-[#2D5A3D]' : 'border-gray-300'
                                  }`}>
                                    {isSelected && <Check size={14} className="text-white" />}
                                  </div>
                                )}
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#5a8a70] flex items-center justify-center text-white font-medium">
                                  {contact.full_name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-[#2d2d2d] font-medium">{contact.full_name}</p>
                                  <p className="text-[#888] text-sm">{contact.phone || contact.email || 'No contact info'}</p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )
                    )}
                  </div>

                  {/* Continue button for multiple mode */}
                  {recipientMode === 'multiple' && (
                    <div className="p-4 border-t border-[#E8E7DC]">
                      <button
                        onClick={proceedToQuestion}
                        disabled={getSelectedRecipients().length === 0}
                        className="w-full py-3 bg-[#2D5A3D] hover:bg-[#234A31] text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue with {getSelectedRecipients().length} {getSelectedRecipients().length === 1 ? 'person' : 'people'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Select Question */}
              {step === 'question' && (
                <div className="flex flex-col h-[calc(85vh-80px)]">
                  {/* Recipients summary + back */}
                  <div className="flex items-center justify-between px-6 py-3 bg-white/50">
                    <button
                      onClick={() => { setStep('recipients'); setSelectedCategory(null); setSelectedQuestion(null); setCustomQuestion(''); setBranchRules([]); setShowBranchComposer(false) }}
                      className="text-[#2D5A3D] text-sm hover:underline"
                    >
                      ← Change recipients
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2D5A3D]/10 rounded-full">
                      {getSelectedRecipients().length === 1 ? (
                        <>
                          <User size={14} className="text-[#2D5A3D]" />
                          <span className="text-[#2D5A3D] text-sm font-medium">{getSelectedRecipients()[0].full_name}</span>
                        </>
                      ) : (
                        <>
                          <Users size={14} className="text-[#2D5A3D]" />
                          <span className="text-[#2D5A3D] text-sm font-medium">{getSelectedRecipients().length} people</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {/* Custom Question */}
                    <div className="px-6 pt-4 pb-3">
                      <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                        Write your own question:
                      </label>
                      <textarea
                        value={customQuestion}
                        onChange={(e) => { setCustomQuestion(e.target.value); setSelectedQuestion(null); setSelectedCategory(null) }}
                        placeholder="What's a story from your childhood that shaped who you are today?"
                        rows={2}
                        className="w-full px-4 py-3 bg-white border border-[#E8E7DC] rounded-xl text-[#2d2d2d] placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] resize-none"
                      />
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 px-6 py-2">
                      <div className="flex-1 h-px bg-[#E8E7DC]" />
                      <span className="text-[#888] text-xs">or browse by category</span>
                      <div className="flex-1 h-px bg-[#E8E7DC]" />
                    </div>

                    {/* Categories */}
                    <div className="px-6 py-3">
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => { setSelectedCategory(cat.id); setCustomQuestion('') }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm transition-all ${
                              selectedCategory === cat.id
                                ? 'bg-[#2D5A3D] text-white'
                                : 'bg-white/70 text-[#666] hover:bg-white'
                            }`}
                          >
                            <span>{cat.emoji}</span>
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Questions List */}
                    {selectedCategory && (
                      <div className="px-6 pb-4 space-y-2">
                        {filteredQuestions.map(q => (
                          <button
                            key={q.id}
                            onClick={() => { setSelectedQuestion(q.id); setCustomQuestion('') }}
                            className={`w-full p-4 rounded-xl text-left transition-all ${
                              selectedQuestion === q.id
                                ? 'bg-[#2D5A3D]/10 ring-2 ring-[#2D5A3D]'
                                : 'bg-white/70 hover:bg-white'
                            }`}
                          >
                            <p className="text-[#2d2d2d]">{q.question_text}</p>
                          </button>
                        ))}
                        {filteredQuestions.length === 0 && (
                          <p className="text-center text-[#888] py-4">No questions in this category</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Branch-rule composer (optional, ≤3 rules) */}
                  {(selectedQuestion || customQuestion.trim()) && (
                    <div className="px-6 pb-3">
                      <button
                        type="button"
                        onClick={() => setShowBranchComposer(v => !v)}
                        className="text-sm text-[#406A56] hover:underline"
                      >
                        {showBranchComposer ? '− Hide follow-up rules' : '+ Add a follow-up rule (optional)'}
                      </button>
                      {showBranchComposer && (
                        <div className="mt-3 space-y-3 bg-[#F2F1E5] border border-[#E8E7DC] rounded-xl p-3">
                          <p className="text-xs text-[#666]">
                            If their answer mentions certain words, ask a follow-up. Up to 3 rules.
                          </p>
                          {branchRules.map((rule, idx) => (
                            <div key={idx} className="bg-white border border-[#E8E7DC] rounded-lg p-3 space-y-2 relative">
                              <button
                                type="button"
                                onClick={() => removeBranchRule(idx)}
                                aria-label="Remove rule"
                                className="absolute top-2 right-2 text-[#888] hover:text-[#C35F33]"
                              >
                                <X size={14} />
                              </button>
                              <div>
                                <label className="block text-xs text-[#666] mb-1">If their answer contains</label>
                                <input
                                  type="text"
                                  value={rule.if_answer_contains}
                                  onChange={(e) => updateBranchRule(idx, { if_answer_contains: e.target.value })}
                                  placeholder="comma, separated, words"
                                  className="w-full px-3 py-2 bg-white border border-[#E8E7DC] rounded-lg text-sm text-[#2d2d2d] placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#406A56]"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-[#666] mb-1">Then ask</label>
                                <textarea
                                  value={rule.then_ask}
                                  onChange={(e) => updateBranchRule(idx, { then_ask: e.target.value })}
                                  placeholder="Tell me more about that..."
                                  rows={2}
                                  className="w-full px-3 py-2 bg-white border border-[#E8E7DC] rounded-lg text-sm text-[#2d2d2d] placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#406A56] resize-none"
                                />
                              </div>
                            </div>
                          ))}
                          {branchRules.length < 3 && (
                            <button
                              type="button"
                              onClick={addBranchRule}
                              className="text-sm text-[#406A56] hover:underline"
                            >
                              + Add another rule
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SMS Consent + Create Button */}
                  <div className="p-4 border-t border-[#E8E7DC] space-y-4">
                    {/* Sender note (≤280 chars, shown on recipient welcome) */}
                    <div className="bg-[#F2F1E5] border border-[#E8E7DC] rounded-xl p-3">
                      <label className="block text-sm font-medium text-[#2d2d2d] mb-1">
                        Add a personal note (optional)
                      </label>
                      <p className="text-xs text-[#666] mb-2">
                        Shown to your recipient on the welcome screen
                      </p>
                      <textarea
                        value={senderNote}
                        onChange={(e) => setSenderNote(e.target.value.slice(0, 280))}
                        rows={3}
                        maxLength={280}
                        placeholder="I'd love to hear your story when you have a moment."
                        className="w-full px-3 py-2 bg-white border border-[#E8E7DC] rounded-lg text-sm text-[#2d2d2d] placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#406A56] resize-none"
                      />
                      <div
                        className="text-xs mt-1 text-right"
                        style={{ color: senderNote.length >= 260 ? '#C35F33' : '#888' }}
                      >
                        {senderNote.length} / 280
                      </div>
                    </div>

                    {/* Optional recipient email verification */}
                    <div className="bg-white/70 border border-[#E8E7DC] rounded-xl p-3">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requireVerification}
                          onChange={(e) => setRequireVerification(e.target.checked)}
                          className="mt-1 accent-[#406A56]"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-[#2d2d2d]">
                            Require recipient to verify their email before answering
                          </div>
                          <div className="text-xs text-[#666] mt-0.5">
                            Adds a quick check — useful for sensitive topics.
                          </div>
                        </div>
                      </label>
                      {requireVerification && getSelectedRecipients().length === 1 && (
                        <input
                          type="email"
                          value={verificationEmail}
                          onChange={(e) => setVerificationEmail(e.target.value)}
                          placeholder={getSelectedRecipients()[0]?.email || "recipient@example.com"}
                          className="mt-2 w-full px-3 py-2 bg-white border border-[#E8E7DC] rounded-lg text-sm text-[#2d2d2d] placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#406A56]"
                        />
                      )}
                      {requireVerification && getSelectedRecipients().length > 1 && (
                        <p className="text-xs text-[#666] mt-2">
                          We'll use each recipient's email on file.
                        </p>
                      )}
                    </div>

                    {/* SMS Consent - show if any recipient has a phone number */}
                    {getSelectedRecipients().some(r => r.phone) && (
                      <SMSConsentInline
                        checked={smsConsent}
                        onChange={setSmsConsent}
                      />
                    )}
                    
                    <button
                      onClick={handleCreateSession}
                      disabled={creating || (!selectedQuestion && !customQuestion.trim()) || (getSelectedRecipients().some(r => r.phone) && !smsConsent)}
                      className="w-full py-3 bg-[#2D5A3D] hover:bg-[#244B32] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {creating ? (
                        'Creating...'
                      ) : (
                        <>
                          <Sparkles size={18} />
                          {getSelectedRecipients().length > 1 
                            ? `Send to ${getSelectedRecipients().length} people`
                            : 'Create Interview'
                          }
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nudge modal — copy/paste text for the sender */}
      <AnimatePresence>
        {nudgeSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setNudgeSession(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-[#2d2d2d]">Send a friendly nudge</h3>
                <button onClick={() => setNudgeSession(null)} aria-label="Close" className="text-[#666] hover:text-[#2d2d2d]">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-[#666] mb-3">
                Copy this and send it to {nudgeSession.contact?.full_name?.split(' ')[0] || 'them'} however you usually chat (text, email, etc).
              </p>
              <textarea
                readOnly
                value={buildNudgeText(nudgeSession)}
                rows={5}
                className="w-full p-3 border border-[#DDE3DF] rounded-lg text-sm text-[#2d2d2d] mb-3 font-mono"
                onFocus={(e) => e.target.select()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(buildNudgeText(nudgeSession))
                    setCopied(nudgeSession.id)
                    setTimeout(() => setCopied(null), 1500)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2D5A3D] hover:bg-[#244B32] text-white rounded-lg font-medium transition-colors"
                >
                  <Copy size={16} />
                  {copied === nudgeSession.id ? 'Copied!' : 'Copy text'}
                </button>
                <button
                  onClick={() => setNudgeSession(null)}
                  className="px-4 py-2.5 bg-[#F5F3EE] text-[#666] rounded-lg font-medium hover:bg-[#E8E7DC] transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
