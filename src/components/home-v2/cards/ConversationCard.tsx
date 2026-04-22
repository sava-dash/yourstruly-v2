'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Video as VideoIcon, Type, Send, Sparkles, Square, Loader2, Check, Trash2, Play } from 'lucide-react'

type Mode = 'voice' | 'video' | 'text'

interface Turn {
  role: 'assistant' | 'user'
  content: string
  kind?: 'prompt' | 'suggestion' | 'transcript'
}

export interface ConversationCardData {
  mode?: Mode
  text?: string
  audioUrl?: string
  videoUrl?: string
  messages?: Turn[]
  // Raw captures — blob is kept so the parent can upload on Submit.
  // url is the in-memory object URL (local preview only). On saved load,
  // blob may be absent; url/transcript still describe the recording.
  mediaBlobs?: { kind: 'audio' | 'video'; blob?: Blob; url: string; transcript?: string }[]
}

interface ConversationCardProps {
  data: ConversationCardData
  promptText: string
  accentColor: string
  onSave: (data: ConversationCardData) => void
  saved: boolean
}

export function ConversationCard({ data, promptText, accentColor, onSave, saved }: ConversationCardProps) {
  // Unified conversation view. Video is ON by default — user can toggle
  // the camera off or switch to text. Text mode hides record+camera and
  // swaps in a text input bar sliding up from the bottom.
  const [videoEnabled, setVideoEnabled] = useState<boolean>(data.mode === 'text' ? false : true)
  const [textMode, setTextMode] = useState<boolean>(data.mode === 'text')
  const derivedMode: Mode = textMode ? 'text' : videoEnabled ? 'video' : 'voice'
  const [mode, setMode] = useState<Mode | null>(data.mode || derivedMode)
  // Keep `mode` in sync with the toggles so downstream effects + save
  // continue to work. `setMode` is retained for the saved-state lookup.
  useEffect(() => { setMode(derivedMode) }, [derivedMode])
  const [messages, setMessages] = useState<Turn[]>(
    data.messages && data.messages.length > 0 ? data.messages : []
  )
  const [textValue, setTextValue] = useState(data.text || '')
  const [isRecording, setIsRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [followupLoading, setFollowupLoading] = useState(false)
  const [streamReady, setStreamReady] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const transcriptRunningRef = useRef('')
  const mediaBlobsRef = useRef<{ kind: 'audio' | 'video'; blob?: Blob; url: string; transcript?: string }[]>(
    data.mediaBlobs || []
  )

  // Video-mode overlays: slide up from the bottom of the video. After 5s
  // they fade to 30% opacity but stay pinned — they only disappear when
  // the user speaks their next response (next user turn arrives).
  const [videoOverlays, setVideoOverlays] = useState<{ id: string; turn: Turn; faded: boolean }[]>([])
  const OVERLAY_FADE_MS = 5000
  const pushOverlay = (turn: Turn) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setVideoOverlays((prev) => [...prev, { id, turn, faded: false }])
    setTimeout(() => {
      setVideoOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, faded: true } : o)))
    }, OVERLAY_FADE_MS)
  }
  const clearSuggestionOverlays = () => {
    setVideoOverlays((prev) => prev.filter((o) => o.turn.kind !== 'suggestion'))
  }

  // Voice + text modes: suggestion bubbles in the chat fade to 30% after
  // 5s but remain until the user sends a response (which removes them).
  const [fadedSuggestionIndices, setFadedSuggestionIndices] = useState<Set<number>>(new Set())
  const [hiddenSuggestionIndices, setHiddenSuggestionIndices] = useState<Set<number>>(new Set())
  useEffect(() => {
    // When a new assistant suggestion lands, schedule it to fade at 5s
    messages.forEach((m, idx) => {
      if (m.kind === 'suggestion' && !fadedSuggestionIndices.has(idx) && !hiddenSuggestionIndices.has(idx)) {
        const timer = setTimeout(() => {
          setFadedSuggestionIndices((prev) => {
            const next = new Set(prev)
            next.add(idx)
            return next
          })
        }, 5000)
        return () => clearTimeout(timer)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  const hideOpenSuggestions = () => {
    setHiddenSuggestionIndices((prev) => {
      const next = new Set(prev)
      messages.forEach((m, idx) => { if (m.kind === 'suggestion') next.add(idx) })
      return next
    })
  }

  // On mount, fetch starter ideas (ways to approach this prompt) so the
  // user sees 3 angles to talk about instead of the prompt echoed back.
  const starterFetchedRef = useRef(false)
  useEffect(() => {
    if (starterFetchedRef.current) return
    if (messages.some((m) => m.kind === 'suggestion' || m.role === 'user')) return
    starterFetchedRef.current = true
    generateFollowups('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Prime/refresh media stream based on toggles. Text mode tears down;
  // voice mode uses audio-only; video mode uses audio+video.
  useEffect(() => {
    let cancelled = false

    if (textMode) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        setStreamReady(false)
      }
      return
    }

    const existing = streamRef.current
    const hasVideoTrack = !!existing && existing.getVideoTracks().length > 0
    if (existing && hasVideoTrack === videoEnabled) return

    if (existing) {
      existing.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setStreamReady(false)
    }

    ;(async () => {
      try {
        const constraints = videoEnabled ? { audio: true, video: true } : { audio: true }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        for (const t of stream.getAudioTracks()) t.enabled = false
        if (videoEnabled && videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream
          await videoPreviewRef.current.play().catch(() => {})
        }
        setStreamReady(true)
      } catch (err) {
        console.error('[ConversationCard] getUserMedia failed', err)
      }
    })()

    return () => { cancelled = true }
  }, [videoEnabled, textMode])

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, transcribing, followupLoading])

  const startRecord = async () => {
    const stream = streamRef.current
    if (!stream || isRecording) return
    try {
      for (const t of stream.getAudioTracks()) t.enabled = true
      const mimeType = mode === 'voice' ? 'audio/webm' : 'video/webm'
      const rec = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        for (const t of stream.getAudioTracks()) t.enabled = false
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)

        setTranscribing(true)
        let transcript = ''
        try {
          const fd = new FormData()
          fd.append('audio', blob, mode === 'voice' ? 'rec.webm' : 'rec.webm')
          const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
          const d = await res.json()
          transcript = d.transcription || d.text || ''
        } catch (err) {
          console.error('[ConversationCard] transcribe failed', err)
        }
        setTranscribing(false)

        const entry: { kind: 'audio' | 'video'; blob: Blob; url: string; transcript?: string } = {
          kind: mode === 'voice' ? 'audio' : 'video',
          blob,
          url,
          transcript: transcript.trim() || undefined,
        }
        mediaBlobsRef.current.push(entry)

        if (transcript.trim()) {
          const turn: Turn = { role: 'user', content: transcript, kind: 'transcript' }
          hideOpenSuggestions()
          setMessages((prev) => [...prev, turn])
          if (mode === 'video') {
            // New user response — stale suggestions go away, the new
            // transcript rises as an overlay.
            clearSuggestionOverlays()
            pushOverlay(turn)
          }
          transcriptRunningRef.current = (transcriptRunningRef.current + ' ' + transcript).trim()
          await generateFollowups(transcriptRunningRef.current)
        }
      }
      rec.start()
      mediaRecorderRef.current = rec
      setIsRecording(true)
    } catch (err) {
      console.error('[ConversationCard] record start failed', err)
    }
  }

  const stopRecord = () => {
    if (!mediaRecorderRef.current || !isRecording) return
    try { mediaRecorderRef.current.stop() } catch {}
    setIsRecording(false)
  }

  const generateFollowups = async (cumulative: string) => {
    setFollowupLoading(true)
    try {
      const res = await fetch('/api/memory/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText, transcript: cumulative }),
      })
      const d = await res.json()
      const suggestions: string[] = Array.isArray(d.suggestions) ? d.suggestions : []
      if (suggestions.length > 0) {
        const turn: Turn = { role: 'assistant', content: suggestions.join('\n'), kind: 'suggestion' }
        setMessages((prev) => [...prev, turn])
        if (mode === 'video') pushOverlay(turn)
      }
    } catch (err) {
      console.error('[ConversationCard] followups failed', err)
    } finally {
      setFollowupLoading(false)
    }
  }

  const handleSubmit = () => {
    const fullTranscript = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n\n')
      .trim()
    if (!fullTranscript) return
    // Save with whichever mode is currently active (derived from toggles),
    // so the saved-state view renders the right layout.
    const saveMode: Mode = mediaBlobsRef.current.some((b) => b.kind === 'video')
      ? 'video'
      : mediaBlobsRef.current.length > 0
        ? 'voice'
        : derivedMode
    onSave({
      mode: saveMode,
      text: fullTranscript,
      messages,
      mediaBlobs: mediaBlobsRef.current.length > 0 ? mediaBlobsRef.current : undefined,
    })
  }

  const handleTextSend = async () => {
    const value = textValue.trim()
    if (!value) return
    const turn: Turn = { role: 'user', content: value, kind: 'transcript' }
    hideOpenSuggestions()
    setMessages((prev) => [...prev, turn])
    setTextValue('')
    clearSuggestionOverlays()
    transcriptRunningRef.current = (transcriptRunningRef.current + ' ' + value).trim()
    await generateFollowups(transcriptRunningRef.current)
  }

  const hasUserTurn = messages.some((m) => m.role === 'user')

  // ─── Saved state — polished "your story" with playable takes ───
  if (saved) {
    const modeIcon = data.mode === 'voice' ? Mic : data.mode === 'video' ? VideoIcon : Type
    const ModeIcon = modeIcon
    const wordCount = (data.text || '').trim() ? (data.text as string).trim().split(/\s+/).filter(Boolean).length : 0
    const recordings = data.mediaBlobs || []
    const isTextMode = data.mode === 'text' || recordings.length === 0

    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column', height: '100%',
          padding: '18px 18px 14px',
          background: `linear-gradient(180deg, ${accentColor}08 0%, transparent 30%)`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '22px', height: '22px', borderRadius: '50%',
                background: accentColor, color: '#FFFFFF',
                boxShadow: `0 2px 8px ${accentColor}55`,
              }}
            >
              <Check size={12} strokeWidth={3} />
            </span>
            <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: accentColor }}>
              Your story
            </span>
          </div>
          {data.mode && (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 9px', borderRadius: '999px',
                background: `${accentColor}12`, color: accentColor,
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}
            >
              <ModeIcon size={10} /> {data.mode}
            </span>
          )}
        </div>

        {/* Body — scrollable stack of take cards */}
        <div className="story-saved-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '2px' }}>
          {/* Text-mode or no-recording story */}
          {isTextMode && data.text && (
            <div
              style={{
                position: 'relative',
                background: '#FFFFFF',
                border: '1px solid #EEF2EF',
                borderRadius: '14px',
                padding: '14px 14px 14px 32px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <span
                aria-hidden
                style={{
                  position: 'absolute', top: '-4px', left: '8px',
                  fontSize: '54px', lineHeight: 1,
                  color: `${accentColor}25`,
                  fontFamily: 'var(--font-playfair, Playfair Display, serif)',
                  fontWeight: 700,
                  pointerEvents: 'none', userSelect: 'none',
                }}
              >
                &ldquo;
              </span>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px', lineHeight: 1.6,
                  color: '#2A302D',
                  fontFamily: 'var(--font-playfair, Playfair Display, serif)',
                  fontWeight: 400,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {data.text}
              </p>
            </div>
          )}

          {/* Per-recording timeline — each take prefixed with the prompt
              that triggered it, so the user sees why they changed direction
              partway through the story. */}
          {!isTextMode && recordings.map((rec, i) => {
            // Find the prompt or suggestion that preceded the Nth user turn
            // in `data.messages` — that's the context for this take.
            const msgs = data.messages || []
            let userTurnIdx = -1
            let contextTurn: Turn | null = null
            for (let m = 0; m < msgs.length; m++) {
              if (msgs[m].role === 'user') {
                userTurnIdx++
                if (userTurnIdx === i) {
                  // Walk back to the nearest assistant turn (prompt or suggestion)
                  for (let k = m - 1; k >= 0; k--) {
                    if (msgs[k].role === 'assistant') {
                      contextTurn = msgs[k]
                      break
                    }
                  }
                  break
                }
              }
            }
            return (
              <TakeBox
                key={i}
                take={rec}
                index={i}
                accent={accentColor}
                context={contextTurn}
                onDelete={() => {
                  const next = recordings.filter((_, j) => j !== i)
                  const rebuiltText = next.map((r) => r.transcript || '').filter(Boolean).join('\n\n')
                  onSave({ ...data, mediaBlobs: next, text: rebuiltText })
                }}
              />
            )
          })}
        </div>

        {/* Footer meta */}
        <div
          style={{
            flexShrink: 0,
            marginTop: '10px', paddingTop: '10px',
            borderTop: `1px solid ${accentColor}18`,
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '10.5px', color: '#94A09A',
          }}
        >
          <span style={{ fontWeight: 600, color: '#5A6660' }}>Saved</span>
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#DDE3DF' }} />
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          {recordings.length > 0 && (
            <>
              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#DDE3DF' }} />
              <span>{recordings.length} {recordings.length === 1 ? 'take' : 'takes'}</span>
            </>
          )}
        </div>

        <style jsx>{`
          .story-saved-scroll::-webkit-scrollbar { width: 4px; }
          .story-saved-scroll::-webkit-scrollbar-track { background: transparent; }
          .story-saved-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 2px; }
        `}</style>
      </div>
    )
  }

  // ─── Unified active view: video-on-demand, text-mode toggle ───
  const isVideoActive = videoEnabled && !textMode
  const dockLabel = isRecording ? 'Release to stop' : transcribing ? 'Transcribing…' : hasUserTurn ? 'Hold to add more' : 'Hold to record'

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden', background: '#FAFAF7' }}>
      {/* Background: live video preview OR soft category gradient */}
      {isVideoActive ? (
        <>
          <video
            ref={videoPreviewRef}
            muted
            playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
          />
          {!streamReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'rgba(0,0,0,0.6)' }}>
              <Loader2 size={22} className="animate-spin" />
            </div>
          )}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)', pointerEvents: 'none' }} />
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${accentColor}10 0%, #FAFAF7 60%)`, pointerEvents: 'none' }} />
      )}

      {/* REC/Ready badge (only when recording capability shown) */}
      {!textMode && (
        <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 3 }}>
          {isRecording ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(239,68,68,0.95)', color: '#fff', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fff', animation: 'cconv-pulse 1s infinite' }} />
              REC
            </div>
          ) : isVideoActive && streamReady ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: '10px', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8DACAB' }} />
              Ready
            </div>
          ) : null}
        </div>
      )}

      {/* Chat body — overlaid bubbles rising from the bottom, above the dock */}
      <div
        style={{
          position: 'absolute',
          left: '14px',
          right: '14px',
          bottom: textMode ? '120px' : '108px',
          top: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          overflowY: 'auto',
          gap: '8px',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            if (m.kind === 'suggestion' && hiddenSuggestionIndices.has(i)) return null
            const faded = m.kind === 'suggestion' && fadedSuggestionIndices.has(i)
            return (
              <motion.div
                key={`msg-${i}`}
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: faded ? 0.3 : 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                style={{ pointerEvents: 'auto', display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                {isVideoActive
                  ? <OverlayBubble turn={m} accent={accentColor} />
                  : <Bubble turn={m} accent={accentColor} index={i} />}
              </motion.div>
            )
          })}
          {transcribing && (
            <motion.div key="typing-transcribe" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ pointerEvents: 'auto' }}>
              {isVideoActive ? <OverlayTyping label="Transcribing…" /> : <Typing label="Transcribing…" />}
            </motion.div>
          )}
          {followupLoading && (
            <motion.div key="typing-followup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ pointerEvents: 'auto' }}>
              {isVideoActive ? <OverlayTyping label="Thinking of follow-ups…" /> : <Typing label="Thinking of follow-ups…" />}
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Bottom dock — record + toggles OR text input bar */}
      <AnimatePresence mode="wait">
        {textMode ? (
          <motion.div
            key="text-dock"
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            style={{
              position: 'absolute',
              left: 0, right: 0, bottom: 0,
              padding: '10px 14px 12px',
              background: isVideoActive ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(10px)',
              borderTop: `1px solid ${isVideoActive ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
              zIndex: 4,
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setTextMode(false)}
                aria-label="Back to voice"
                style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: isVideoActive ? 'rgba(0,0,0,0.5)' : '#FFFFFF',
                  border: `1px solid ${isVideoActive ? 'rgba(255,255,255,0.2)' : '#DDE3DF'}`,
                  color: isVideoActive ? '#FFFFFF' : '#5A6660',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Mic size={15} />
              </button>
              <textarea
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!followupLoading) handleTextSend()
                  }
                }}
                placeholder={hasUserTurn ? 'Keep going — or Submit when done' : 'Share what comes to mind…'}
                rows={2}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '12px',
                  border: '1px solid #DDE3DF', background: '#FFFFFF',
                  fontSize: '13.5px', lineHeight: 1.45, color: '#1A1F1C',
                  resize: 'none', outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleTextSend}
                disabled={!textValue.trim() || followupLoading}
                aria-label="Send"
                style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: textValue.trim() && !followupLoading ? accentColor : '#C8D4CC',
                  color: '#FFFFFF', border: 'none',
                  cursor: textValue.trim() && !followupLoading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: textValue.trim() && !followupLoading ? `0 4px 12px ${accentColor}44` : 'none',
                }}
              >
                {followupLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
            <div style={{ textAlign: 'center', fontSize: '10.5px', color: isVideoActive ? 'rgba(255,255,255,0.7)' : '#94A09A' }}>
              Enter to send • Mic to go back
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="voice-dock"
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            style={{
              position: 'absolute',
              left: 0, right: 0, bottom: 0,
              padding: '14px 16px 18px',
              zIndex: 4,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {/* Camera toggle */}
            <button
              onClick={() => setVideoEnabled((v) => !v)}
              aria-label={videoEnabled ? 'Turn camera off' : 'Turn camera on'}
              style={{
                width: '46px', height: '46px', borderRadius: '50%',
                background: videoEnabled ? accentColor : (isVideoActive ? 'rgba(0,0,0,0.5)' : '#FFFFFF'),
                color: videoEnabled ? '#FFFFFF' : (isVideoActive ? '#FFFFFF' : '#5A6660'),
                border: `1px solid ${videoEnabled ? accentColor : (isVideoActive ? 'rgba(255,255,255,0.2)' : '#DDE3DF')}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: videoEnabled ? `0 4px 14px ${accentColor}55` : '0 2px 8px rgba(0,0,0,0.08)',
                position: 'relative',
              }}
            >
              <VideoIcon size={18} />
              {!videoEnabled && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: '28px', height: '2px', background: 'currentColor', transform: 'rotate(-35deg)', borderRadius: '2px' }} />
                </span>
              )}
            </button>

            {/* Record button (large, center) + status text */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <RecordButton mode={derivedMode === 'video' ? 'video' : 'voice'} isRecording={isRecording} accent={accentColor} onStart={startRecord} onStop={stopRecord} />
              <span
                style={{
                  fontSize: '10.5px',
                  color: isVideoActive ? 'rgba(255,255,255,0.85)' : '#5A6660',
                  textShadow: isVideoActive ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
                  fontWeight: 500,
                }}
              >
                {dockLabel}
              </span>
            </div>

            {/* Text-switch button */}
            <button
              onClick={() => {
                // Switching to text: turn off video so the card doesn't
                // keep capturing camera in the background.
                setVideoEnabled(false)
                setTextMode(true)
              }}
              aria-label="Switch to text"
              style={{
                width: '46px', height: '46px', borderRadius: '50%',
                background: isVideoActive ? 'rgba(0,0,0,0.5)' : '#FFFFFF',
                border: `1px solid ${isVideoActive ? 'rgba(255,255,255,0.2)' : '#DDE3DF'}`,
                color: isVideoActive ? '#FFFFFF' : '#5A6660',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <Type size={18} />
            </button>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit — fixed to the card's top-right corner, never overlaps
          the bubble stack or the dock. Only shown when the user has at
          least one turn so it doesn't crowd the empty state. */}
      {hasUserTurn && (
        <button
          onClick={handleSubmit}
          disabled={!hasUserTurn || transcribing || isRecording}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 5,
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '7px 12px', borderRadius: '999px',
            background: !transcribing && !isRecording ? accentColor : 'rgba(200,212,204,0.7)',
            color: '#FFFFFF', border: 'none',
            cursor: !transcribing && !isRecording ? 'pointer' : 'not-allowed',
            fontSize: '11.5px', fontWeight: 700, whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)',
            boxShadow: !transcribing && !isRecording ? `0 4px 14px ${accentColor}55` : 'none',
          }}
        >
          <Send size={11} />
          Submit
        </button>
      )}

      <style jsx>{`
        @keyframes cconv-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>
    </div>
  )
}

/* ─────────────── Saved take box (playback + delete) ─────────────── */

function TakeBox({ take, index, accent, context, onDelete }: {
  take: { kind: 'audio' | 'video'; blob?: Blob; url: string; transcript?: string }
  index: number
  accent: string
  context?: Turn | null
  onDelete: () => void
}) {
  const isVideo = take.kind === 'video'
  const contextIsSuggestion = context?.kind === 'suggestion'
  const contextText = context
    ? (contextIsSuggestion ? context.content.split('\n')[0] : context.content)
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: '1px solid #EEF2EF',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Take # + delete */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px',
          background: `${accent}0A`,
          borderBottom: '1px solid #EEF2EF',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent }}>
          {isVideo ? <VideoIcon size={11} /> : <Mic size={11} />}
          Take {index + 1}
        </span>
        <button
          onClick={onDelete}
          aria-label="Delete this take"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '24px', height: '24px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.04)', border: '1px solid #DDE3DF',
            color: '#B8562E', cursor: 'pointer',
          }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Prompt / follow-up context for this take — helps the user see
          which question triggered this direction of the story. */}
      {contextText && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            padding: '8px 12px',
            background: contextIsSuggestion ? '#F5F1EA' : `${accent}08`,
            borderBottom: '1px solid #EEF2EF',
          }}
        >
          {contextIsSuggestion ? <Sparkles size={10} color={accent} style={{ marginTop: '3px', flexShrink: 0 }} /> : null}
          <p
            style={{
              margin: 0,
              fontSize: '11.5px',
              lineHeight: 1.4,
              color: contextIsSuggestion ? '#6B5A3A' : accent,
              fontStyle: contextIsSuggestion ? 'italic' : 'normal',
              fontFamily: contextIsSuggestion ? 'inherit' : 'var(--font-playfair, Playfair Display, serif)',
              fontWeight: contextIsSuggestion ? 500 : 600,
            }}
          >
            {contextText}
          </p>
        </div>
      )}

      {/* Player */}
      {isVideo ? (
        <video
          src={take.url}
          controls
          style={{ width: '100%', display: 'block', aspectRatio: '4/3', background: '#000', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ padding: '10px 12px', background: '#FAFAF7' }}>
          <audio src={take.url} controls style={{ width: '100%', height: '32px' }} />
        </div>
      )}

      {/* Transcript */}
      {take.transcript && (
        <div
          style={{
            padding: '10px 14px',
            fontSize: '12.5px',
            lineHeight: 1.55,
            color: '#2A302D',
            fontFamily: 'var(--font-playfair, Playfair Display, serif)',
            whiteSpace: 'pre-wrap',
          }}
        >
          <Play size={9} color={accent} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', marginTop: '-2px', opacity: 0.6 }} />
          {take.transcript}
        </div>
      )}
    </motion.div>
  )
}

/* ─────────────── Mode picker ─────────────── */

function ModePicker({ accent, onPick, promptText }: { accent: string; onPick: (m: Mode) => void; promptText: string }) {
  const options: { mode: Mode; Icon: any; label: string }[] = [
    { mode: 'voice', Icon: Mic, label: 'Voice' },
    { mode: 'video', Icon: VideoIcon, label: 'Video' },
    { mode: 'text', Icon: Type, label: 'Type' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '22px 20px', gap: '18px' }}>
      <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent }}>
        Answer this
      </p>
      <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: '#1A1F1C', fontFamily: 'var(--font-playfair, Playfair Display, serif)', fontWeight: 600 }}>
        {promptText.split('\n---\n')[0]}
      </p>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
        {options.map(({ mode, Icon, label }) => (
          <button
            key={mode}
            onClick={() => onPick(mode)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px', borderRadius: '14px',
              background: '#FFFFFF', border: '1px solid #EEF2EF',
              cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${accent}14`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} />
            </span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A1F1C' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── Bubble + Typing + Record ─────────────── */

function Bubble({ turn, accent, index, faded = false }: { turn: Turn; accent: string; index: number; faded?: boolean }) {
  const isUser = turn.role === 'user'
  const isSuggestion = turn.kind === 'suggestion'

  if (isSuggestion) {
    const lines = turn.content.split('\n').filter(Boolean)
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: faded ? 0.3 : 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ alignSelf: 'flex-start', maxWidth: '94%', display: 'flex', flexDirection: 'column', gap: '5px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94A09A', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <Sparkles size={10} /> Go deeper
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{
            padding: '8px 12px', background: '#F5F1EA', border: '1px solid #E6DDCC',
            borderRadius: '14px 14px 14px 4px', fontSize: '12.5px', lineHeight: 1.4,
            color: '#1A1F1C', fontStyle: 'italic',
          }}>
            {l}
          </div>
        ))}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, delay: index === 0 ? 0.08 : 0.03 }}
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '86%',
        padding: '9px 13px',
        background: isUser ? accent : '#FFFFFF',
        border: isUser ? 'none' : '1px solid #EEF2EF',
        color: isUser ? '#FFFFFF' : '#1A1F1C',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        fontSize: '13px',
        lineHeight: 1.45,
        boxShadow: isUser ? `0 3px 10px ${accent}35` : '0 1px 4px rgba(0,0,0,0.04)',
        whiteSpace: 'pre-wrap',
        fontFamily: turn.kind === 'prompt' ? 'var(--font-playfair, Playfair Display, serif)' : 'inherit',
        fontWeight: turn.kind === 'prompt' ? 600 : 400,
      }}
    >
      {turn.content}
    </motion.div>
  )
}

function OverlayBubble({ turn, accent }: { turn: Turn; accent: string }) {
  const isUser = turn.role === 'user'
  const isSuggestion = turn.kind === 'suggestion'

  if (isSuggestion) {
    const lines = turn.content.split('\n').filter(Boolean)
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        style={{ alignSelf: 'flex-start', maxWidth: '94%', display: 'flex', flexDirection: 'column', gap: '5px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.85)', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.45)' }}>
          <Sparkles size={10} /> Go deeper
        </div>
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              padding: '7px 12px',
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(255,255,255,0.6)',
              borderRadius: '14px 14px 14px 4px',
              fontSize: '12.5px',
              lineHeight: 1.4,
              color: '#1A1F1C',
              fontStyle: 'italic',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            }}
          >
            {l}
          </div>
        ))}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24 }}
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '86%',
        padding: '8px 13px',
        background: isUser ? accent : 'rgba(0,0,0,0.55)',
        color: '#FFFFFF',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        fontSize: '12.5px',
        lineHeight: 1.45,
        backdropFilter: 'blur(8px)',
        boxShadow: isUser
          ? `0 4px 14px ${accent}55`
          : '0 4px 14px rgba(0,0,0,0.35)',
        whiteSpace: 'pre-wrap',
        fontFamily: turn.kind === 'prompt' ? 'var(--font-playfair, Playfair Display, serif)' : 'inherit',
        fontWeight: turn.kind === 'prompt' ? 600 : 400,
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {turn.content}
    </motion.div>
  )
}

function OverlayTyping({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        alignSelf: 'flex-start',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '6px 12px',
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '14px 14px 14px 4px',
        color: 'rgba(255,255,255,0.85)',
        fontSize: '11px',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ display: 'inline-flex', gap: '3px' }}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }}
            animate={{ y: [0, -2.5, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.14 }}
          />
        ))}
      </span>
      {label}
    </motion.div>
  )
}

function Typing({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '7px',
        padding: '8px 12px', background: '#FFFFFF', border: '1px solid #EEF2EF',
        borderRadius: '14px 14px 14px 4px', color: '#94A09A', fontSize: '11.5px',
      }}
    >
      <span style={{ display: 'inline-flex', gap: '3px' }}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#94A09A' }}
            animate={{ y: [0, -2.5, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.14 }}
          />
        ))}
      </span>
      {label}
    </motion.div>
  )
}

function RecordButton({ mode, isRecording, accent, onStart, onStop }: {
  mode: Mode
  isRecording: boolean
  accent: string
  onStart: () => void
  onStop: () => void
}) {
  const Icon = mode === 'voice' ? Mic : VideoIcon
  return (
    <motion.button
      onPointerDown={(e) => { e.preventDefault(); onStart() }}
      onPointerUp={onStop}
      onPointerLeave={() => { if (isRecording) onStop() }}
      onPointerCancel={onStop}
      whileTap={{ scale: 0.93 }}
      style={{
        position: 'relative',
        width: '48px', height: '48px', borderRadius: '50%',
        background: isRecording ? '#ef4444' : accent,
        color: '#FFFFFF', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isRecording
          ? '0 0 0 6px rgba(239,68,68,0.15), 0 6px 16px rgba(239,68,68,0.35)'
          : `0 6px 16px ${accent}48`,
        transition: 'background 0.2s ease, box-shadow 0.2s ease',
        userSelect: 'none', touchAction: 'none', flexShrink: 0,
      }}
      aria-label={isRecording ? 'Release to stop' : 'Hold to record'}
    >
      {isRecording && (
        <motion.span
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(239,68,68,0.35)', pointerEvents: 'none' }}
        />
      )}
      {isRecording ? <Square size={16} fill="#FFFFFF" /> : <Icon size={18} />}
    </motion.button>
  )
}
