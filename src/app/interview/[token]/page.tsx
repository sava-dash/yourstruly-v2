'use client'

import { useState, useEffect, use } from 'react'
import { motion } from 'framer-motion'
import { Clock, Heart, AlertCircle, Check, ChevronRight } from 'lucide-react'
import { InterviewConversation } from '@/components/interview/InterviewConversation'
import '@/styles/interview.css'

interface SessionQuestion {
  id: string
  question_text: string
  status: string
  sort_order: number
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
  session_questions: SessionQuestion[]
}

type PageState = 'loading' | 'welcome' | 'answering' | 'completed' | 'error'

export default function InterviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [session, setSession] = useState<Session | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  useEffect(() => {
    loadSession()
  }, [token])

  const loadSession = async () => {
    try {
      // Use API route to bypass RLS (interviewees aren't authenticated)
      const res = await fetch(`/api/interviews/load?token=${token}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Interview not found or link expired')
        setPageState('error')
        return
      }

      const sessionData = data.session
      
      // Find first unanswered question
      const firstUnanswered = sessionData.session_questions.findIndex(
        (q: SessionQuestion) => q.status !== 'answered'
      )
      
      setSession(sessionData as Session)
      setCurrentQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0)
      
      // Check if all questions are answered
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

  const handleStart = () => {
    setPageState('answering')
  }

  const handleQuestionComplete = () => {
    // Single question per session with multiple exchanges
    // When the conversation is complete, the interview is done
    completeSession()
  }

  const completeSession = async () => {
    if (!session) return
    
    // Mark session as completed
    await fetch('/api/interviews/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, accessToken: token }),
    })
    
    setPageState('completed')
  }

  const handleClose = () => {
    // Go back to welcome or close window
    if (pageState === 'answering') {
      setPageState('welcome')
    } else {
      window.close()
    }
  }

  // Loading state
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

  // Error state
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

  // Completed state
  if (pageState === 'completed') {
    return (
      <div className="interview-page">
        <div className="interview-completed">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="interview-completed-icon"
          >
            <Check size={48} />
          </motion.div>
          <h1>Thank You!</h1>
          <p>Your responses have been saved and shared with {
            (session as any)?.owner?.display_name || 
            (session as any)?.owner?.full_name || 
            'your loved one'
          }.</p>
          <div className="interview-completed-heart">
            <Heart size={24} className="text-red-400" fill="currentColor" />
          </div>
          
          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="interview-completed-cta"
          >
            <p className="interview-cta-text">
              Want to capture your own family stories?
            </p>
            <a href="/signup" className="interview-signup-btn">
              Create Your Free Account
            </a>
            <a href="/" className="interview-learn-more">
              Learn more about YoursTruly
            </a>
          </motion.div>
        </div>
      </div>
    )
  }

  // Welcome state
  if (pageState === 'welcome' && session) {
    const currentQuestion = session.session_questions.find(q => q.status !== 'answered')
    
    return (
      <div className="interview-page">
        <div className="interview-welcome">
          <div className="interview-welcome-header">
            <h1>{session.title}</h1>
            <p className="interview-welcome-subtitle">
              {session.contact?.full_name || 'Someone special'} would love to hear your story
            </p>
          </div>

          <div className="interview-welcome-info">
            <div className="interview-info-item">
              <Clock size={20} />
              <span>~5-10 minutes</span>
            </div>
            <div className="interview-info-item">
              <span>1 topic, multiple follow-ups</span>
            </div>
          </div>

          <div className="interview-welcome-instructions">
            <h3>How it works:</h3>
            <ul>
              <li>Answer each question in your own words</li>
              <li>You can speak or type your response</li>
              <li>Review and edit your responses</li>
              <li>AI asks follow-up questions to capture your full story</li>
              <li>Save when you're ready</li>
            </ul>
          </div>

          <button onClick={handleStart} className="interview-start-btn">
            <span>Begin Interview</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    )
  }

  // Answering state
  if (pageState === 'answering' && session) {
    // Find the first unanswered question
    const currentQuestion = session.session_questions.find(q => q.status !== 'answered')
    
    if (!currentQuestion) {
      completeSession()
      return null
    }

    return (
      <div className="interview-page">
        <InterviewConversation
          sessionId={session.id}
          accessToken={token}
          userId={session.user_id}
          question={currentQuestion}
          contactName={session.contact?.full_name || 'Unknown'}
          onComplete={handleQuestionComplete}
          onClose={handleClose}
        />
      </div>
    )
  }

  return null
}
