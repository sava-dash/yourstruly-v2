'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Mic } from 'lucide-react'
import { useConversationBus } from './conversation-bus'

interface TranscriptCardProps {
  /** The id of the sibling ConversationCard so we can subscribe to its bus channel. */
  conversationCardId: string
  promptText: string
  accentColor: string
  saved: boolean
}

export function TranscriptCard({ conversationCardId, promptText, accentColor, saved }: TranscriptCardProps) {
  const { messages, currentSuggestion, transcribing, followupLoading, interimTranscript } = useConversationBus(conversationCardId)
  const userTurns = messages.filter((m) => m.role === 'user')
  const hasInterim = !!(interimTranscript && interimTranscript.trim())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to newest turn
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [userTurns.length, currentSuggestion, transcribing])

  if (saved) {
    // Once the story has been submitted, the transcript card collapses into
    // nothing — the saved composite lives on the Story card's saved state.
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '18px', color: '#8D9993', fontSize: '13px' }}>
        Merged into your story
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        padding: '16px 14px 14px',
        background: `linear-gradient(180deg, ${accentColor}06 0%, transparent 40%)`,
        position: 'relative',
      }}
    >
      {/* Header — the prompt itself sits here once we migrate it off the Story card. */}
      <div style={{ marginBottom: '10px', flexShrink: 0 }}>
        <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, marginBottom: '4px' }}>
          The prompt
        </div>
        <div style={{ fontSize: '14px', lineHeight: '1.45', color: '#2d2d2d', fontWeight: 500 }}>
          {promptText || '—'}
        </div>
      </div>

      <div
        style={{
          height: '1px',
          background: 'rgba(0,0,0,0.06)',
          margin: '4px 0 10px',
          flexShrink: 0,
        }}
      />

      <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5A6660', marginBottom: '6px', flexShrink: 0 }}>
        Your story ({userTurns.length} {userTurns.length === 1 ? 'take' : 'takes'})
      </div>

      {/* Transcript list */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '8px',
          paddingRight: '4px',
          minHeight: 0,
        }}
      >
        {userTurns.length === 0 && !transcribing && !hasInterim && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '8px',
            padding: '24px 16px',
            color: '#94A09A',
            textAlign: 'center',
            fontSize: '13px',
            lineHeight: '1.5',
            flex: 1,
          }}>
            <Mic size={20} style={{ opacity: 0.5 }} />
            <div>When you speak, your words show up here.</div>
          </div>
        )}

        {/* Live (interim) transcript — streams in while the user is still speaking */}
        {hasInterim && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: `${accentColor}10`,
              border: `1px dashed ${accentColor}40`,
              fontSize: '13.5px',
              lineHeight: '1.5',
              color: '#2d2d2d',
            }}
          >
            <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '2px', letterSpacing: '0.05em', textTransform: 'uppercase', color: accentColor }}>
              Listening…
            </div>
            {interimTranscript}
          </div>
        )}

        <AnimatePresence initial={false}>
          {userTurns.map((m, i) => (
            <motion.div
              key={`t-${m.createdAt}-${i}`}
              initial={{ opacity: 0, x: 20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28 }}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.03)',
                fontSize: '13.5px',
                lineHeight: '1.5',
                color: '#2d2d2d',
              }}
            >
              <div style={{ fontSize: '10px', opacity: 0.5, marginBottom: '2px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Take {i + 1}{i === userTurns.length - 1 ? ' — latest' : ''}
              </div>
              {m.content}
            </motion.div>
          ))}
          {transcribing && (
            <motion.div
              key="t-transcribing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '8px 12px', fontSize: '12px', color: '#94A09A', fontStyle: 'italic' }}
            >
              Transcribing…
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Current follow-up suggestion */}
      <AnimatePresence>
        {(currentSuggestion || followupLoading) && (
          <motion.div
            key="t-followup"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            style={{
              marginTop: '10px',
              padding: '10px 12px',
              borderRadius: '12px',
              background: `${accentColor}10`,
              border: `1px solid ${accentColor}28`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <Sparkles size={14} color={accentColor} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12.5px', lineHeight: '1.5', color: '#2d2d2d' }}>
              {followupLoading && !currentSuggestion
                ? <span style={{ color: '#94A09A', fontStyle: 'italic' }}>Thinking of a follow-up…</span>
                : currentSuggestion?.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
