'use client'

import { useState, useEffect, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, ChevronRight, X, Mail, Loader2, Check } from 'lucide-react'
import { InterviewConversation } from '@/components/interview/InterviewConversation'
import { InterviewMicroFeedback } from '@/components/interview/InterviewMicroFeedback'
import { VerificationGate } from '@/components/interview/VerificationGate'
import ClaimAccountFlow from '@/components/interview/ClaimAccountFlow'
import '@/styles/interview.css'

interface SessionQuestion {
  id: string
  question_text: string
  status: string
  sort_order: number
}

interface VideoResponse {
  id: string
  session_question_id: string
  transcript: string | null
  text_response: string | null
}

interface Session {
  id: string
  title: string
  status: string
  user_id: string
  contact: {
    full_name: string
    id: string
  }
  owner?: {
    full_name?: string | null
    display_name?: string | null
    avatar_url?: string | null
  }
  sender_note?: string | null
  session_questions: SessionQuestion[]
  video_responses?: VideoResponse[]
  progress_data?: {
    exchanges?: { question: string; response: string }[]
    currentQuestion?: string
    mode?: 'voice' | 'text'
  } | null
}

type PageState = 'loading' | 'welcome' | 'answering' | 'completed' | 'error'

function firstName(value?: string | null, fallback = 'your loved one') {
  if (!value) return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.split(/\s+/)[0]
}

function truncate(text: string, max = 140) {
  if (!text) return ''
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

export default function InterviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [session, setSession] = useState<Session | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [error, setError] = useState<string | null>(null)

  // Recap email modal state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Verification gate (no-op when session does not require verify)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    loadSession()
  }, [token])

  const loadSession = async (started = false) => {
    try {
      const url = `/api/interviews/load?token=${token}${started ? '&started=true' : ''}`
      const res = await fetch(url)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Interview not found or link expired')
        setPageState('error')
        return
      }

      const sessionData = data.session as Session
      setSession(sessionData)

      if (sessionData.status === 'completed') {
        setPageState('completed')
        return
      }

      const firstUnanswered = sessionData.session_questions.findIndex(
        (q) => q.status !== 'answered'
      )
      if (firstUnanswered === -1) {
        setPageState('completed')
      } else {
        setPageState('welcome')
      }
    } catch (err) {
      console.error('Error loading session:', err)
      setError('Failed to load interview')
      setPageState('error')
    }
  }

  const handleStart = async () => {
    // Mark started_at on the server
    await loadSession(true)
    setPageState('answering')
  }

  const handleQuestionComplete = () => {
    completeSession()
  }

  const completeSession = async () => {
    if (!session) return
    await fetch('/api/interviews/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, accessToken: token }),
    })
    // Reload to fetch transcripts for the recap
    await loadSession()
    setPageState('completed')
  }

  const handleClose = () => {
    if (pageState === 'answering') {
      setPageState('welcome')
    } else {
      window.close()
    }
  }

  const handleSendEmail = async () => {
    setEmailError(null)
    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailSending(true)
    try {
      const res = await fetch('/api/interviews/email-recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: emailValue }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEmailError(data.error || 'Could not send email. Please try again.')
      } else {
        setEmailSent(true)
      }
    } catch {
      setEmailError('Could not send email. Please try again.')
    } finally {
      setEmailSending(false)
    }
  }

  // Loading
  if (pageState === 'loading') {
    return (
      <div className="interview-page">
        <div className="interview-loading">
          <div className="interview-spinner" />
          <p>Loading interview...</p>
        </div>
      </div>
    )
  }

  // Error
  if (pageState === 'error') {
    return (
      <div className="interview-page">
        <div className="interview-error-container">
          <AlertCircle size={48} className="text-red-500" />
          <h1>Unable to Load Interview</h1>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  // Completed — keepsake recap
  if (pageState === 'completed' && session) {
    const recipientFirst = firstName(session.contact?.full_name, 'friend')
    const senderFirst = firstName(
      session.owner?.display_name || session.owner?.full_name,
      'your loved one'
    )

    const responsesByQ = new Map<string, string>()
    for (const r of session.video_responses || []) {
      const txt = r.transcript || r.text_response || ''
      if (r.session_question_id) responsesByQ.set(r.session_question_id, txt)
    }
    const orderedQs = [...session.session_questions].sort(
      (a, b) => a.sort_order - b.sort_order
    )

    return (
      <div className="interview-page">
        <div
          style={{
            maxWidth: 640,
            margin: '0 auto',
            padding: '32px 20px 64px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ textAlign: 'center', marginBottom: 24 }}
          >
            <h1
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(28px, 6vw, 40px)',
                color: '#406A56',
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              Thank you, {recipientFirst}.
            </h1>
            <p
              style={{
                color: '#666',
                fontSize: 17,
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              Here&rsquo;s what we&rsquo;ll send to {senderFirst}.
            </p>
          </motion.div>

          {/* Card stack of Q&A */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
            {orderedQs.map((q, i) => {
              const answer = responsesByQ.get(q.id)
              if (!answer) return null
              const bg = i % 2 === 0 ? '#F2F1E5' : '#D3E1DF'
              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  style={{
                    background: bg,
                    borderRadius: 14,
                    padding: '18px 20px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      color: '#406A56',
                      fontSize: 16,
                      fontWeight: 600,
                      marginBottom: 8,
                      lineHeight: 1.35,
                    }}
                  >
                    {q.question_text}
                  </div>
                  <div style={{ color: '#2d2d2d', fontSize: 15, lineHeight: 1.55 }}>
                    {truncate(answer)}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* CTAs */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <button
              onClick={() => {
                setEmailSent(false)
                setEmailError(null)
                setShowEmailModal(true)
              }}
              style={{
                background: '#C35F33',
                color: '#fff',
                border: 'none',
                padding: '18px 24px',
                borderRadius: 12,
                fontSize: 17,
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 56,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Mail size={18} />
              Email me a copy of my answers
            </button>
            <a
              href="/signup"
              style={{
                background: 'transparent',
                color: '#406A56',
                border: '2px solid #406A56',
                padding: '16px 24px',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                textDecoration: 'none',
                minHeight: 56,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Want to start your own?
            </a>
          </div>

          {/* F4: claim your free account and keep a private copy */}
          <div style={{ marginTop: 20 }}>
            <ClaimAccountFlow
              token={token}
              defaultName={session.contact?.full_name || null}
              defaultEmail={null}
            />
          </div>

          <p
            style={{
              textAlign: 'center',
              color: '#666',
              fontSize: 14,
              lineHeight: 1.5,
              marginTop: 8,
            }}
          >
            Your story will be safely kept by {senderFirst} on YoursTruly.
          </p>
        </div>

        {/* Email modal */}
        <AnimatePresence>
          {showEmailModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !emailSending && setShowEmailModal(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                zIndex: 50,
              }}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 24,
                  maxWidth: 420,
                  width: '100%',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 20, color: '#2d2d2d', fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Send me my answers
                  </h3>
                  <button
                    onClick={() => !emailSending && setShowEmailModal(false)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666' }}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {emailSent ? (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: '#D3E1DF',
                        color: '#406A56',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <Check size={28} />
                    </div>
                    <p style={{ color: '#2d2d2d', margin: 0, fontSize: 16 }}>
                      Sent! Check your inbox in a moment.
                    </p>
                  </div>
                ) : (
                  <>
                    <p style={{ color: '#666', fontSize: 14, marginTop: 0, marginBottom: 14 }}>
                      We&rsquo;ll send a clean copy of your answers to your email.
                    </p>
                    <input
                      type="email"
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      placeholder="you@example.com"
                      disabled={emailSending}
                      style={{
                        width: '100%',
                        padding: '14px 14px',
                        fontSize: 16,
                        borderRadius: 10,
                        border: '1px solid #DDE3DF',
                        marginBottom: 12,
                        boxSizing: 'border-box',
                      }}
                    />
                    {emailError && (
                      <p style={{ color: '#C35F33', fontSize: 14, marginTop: 0, marginBottom: 12 }}>
                        {emailError}
                      </p>
                    )}
                    <button
                      onClick={handleSendEmail}
                      disabled={emailSending}
                      style={{
                        width: '100%',
                        background: '#C35F33',
                        color: '#fff',
                        border: 'none',
                        padding: '14px 18px',
                        borderRadius: 10,
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: emailSending ? 'wait' : 'pointer',
                        minHeight: 50,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      {emailSending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                      {emailSending ? 'Sending...' : 'Send to my email'}
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Welcome — personalized marketing-grade cold open
  if (pageState === 'welcome' && session) {
    const senderFirst = firstName(
      session.owner?.display_name || session.owner?.full_name,
      'Someone special'
    )
    const avatarUrl = session.owner?.avatar_url || null
    const noteRaw = (session.sender_note || '').trim()
    const note =
      noteRaw.length > 0
        ? noteRaw.slice(0, 280)
        : "I'd love to hear your story when you have a moment."

    return (
      <div
        className="interview-page"
        style={{ background: '#F2F1E5', minHeight: '100vh' }}
      >
        <div
          style={{
            maxWidth: 560,
            margin: '0 auto',
            padding: '40px 20px 56px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {avatarUrl ? (
            <motion.img
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              src={avatarUrl}
              alt={senderFirst}
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                objectFit: 'cover',
                marginBottom: 18,
                boxShadow: '0 2px 8px rgba(45,77,62,0.15)',
                border: '3px solid #fff',
              }}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                marginBottom: 18,
                background: '#D3E1DF',
                color: '#2d4d3e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 32,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(45,77,62,0.15)',
                border: '3px solid #fff',
              }}
            >
              {senderFirst.charAt(0).toUpperCase()}
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: '#2d4d3e',
              fontSize: 'clamp(28px, 7vw, 38px)',
              lineHeight: 1.15,
              margin: '0 0 18px 0',
              fontWeight: 600,
            }}
          >
            {senderFirst} wants to remember this with you.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{
              fontFamily: "'Caveat', 'Patrick Hand', cursive",
              color: '#406A56',
              fontSize: 'clamp(20px, 4.5vw, 24px)',
              lineHeight: 1.35,
              margin: '0 0 32px 0',
              maxWidth: 460,
            }}
          >
            &ldquo;{note}&rdquo;
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            onClick={handleStart}
            style={{
              background: '#C35F33',
              color: '#fff',
              border: 'none',
              padding: '20px 36px',
              borderRadius: 14,
              fontSize: 18,
              fontWeight: 600,
              fontFamily: "'Inter Tight', -apple-system, sans-serif",
              cursor: 'pointer',
              minHeight: 60,
              minWidth: 240,
              boxShadow: '0 3px 10px rgba(195,95,51,0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            Begin when you&rsquo;re ready
            <ChevronRight size={20} />
          </motion.button>

          <p
            style={{
              fontFamily: "'Inter Tight', -apple-system, sans-serif",
              color: '#666',
              fontSize: 13,
              lineHeight: 1.5,
              margin: '14px 0 28px 0',
            }}
          >
            Take your time. Your answers save automatically.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 14,
              width: '100%',
              maxWidth: 480,
              marginBottom: 36,
            }}
          >
            {[
              { icon: '📱', text: 'Speak or type — your choice' },
              { icon: '💾', text: "Pause and come back — we'll remember" },
              { icon: '💌', text: 'Get a copy of your answers when you’re done' },
            ].map((item) => (
              <div
                key={item.text}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '14px 10px',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(45,77,62,0.06)',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }} aria-hidden>
                  {item.icon}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter Tight', -apple-system, sans-serif",
                    fontSize: 12,
                    lineHeight: 1.35,
                    color: '#2d2d2d',
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>

          <p
            style={{
              fontFamily: "'Inter Tight', -apple-system, sans-serif",
              color: '#94a3b8',
              fontSize: 12,
              lineHeight: 1.5,
              margin: 0,
              maxWidth: 380,
            }}
          >
            Made by YoursTruly — built so families can keep what matters.
          </p>
        </div>
      </div>
    )
  }

  // Answering
  if (pageState === 'answering' && session) {
    const currentQuestion = session.session_questions.find((q) => q.status !== 'answered')
    if (!currentQuestion) {
      completeSession()
      return null
    }

    const initialProgress = session.progress_data && session.progress_data.exchanges
      ? {
          exchanges: session.progress_data.exchanges,
          currentQuestion: session.progress_data.currentQuestion,
          mode: session.progress_data.mode,
        }
      : null

    return (
      <div className="interview-page">
        <VerificationGate token={token} onVerified={() => setVerified(true)} />
        {verified && (
          <>
            <InterviewMicroFeedback />
            <InterviewConversation
              sessionId={session.id}
              accessToken={token}
              userId={session.user_id}
              question={currentQuestion}
              contactName={session.contact?.full_name || 'Unknown'}
              onComplete={handleQuestionComplete}
              onClose={handleClose}
              initialProgress={initialProgress}
            />
          </>
        )}
      </div>
    )
  }

  return null
}
