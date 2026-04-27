'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Video as VideoIcon, Type, Send, Sparkles, Square, Loader2, Check, Trash2, Play, ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-react'
import { conversationBus, useConversationBus } from './conversation-bus'

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
  /** Bus key so the sibling TranscriptCard can subscribe to this card's messages. */
  cardId?: string
}

export function ConversationCard({ data, promptText, accentColor, onSave, saved, cardId }: ConversationCardProps) {
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
  // Live timer + post-stop success flash ("Captured ✓")
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [showCaptureFlash, setShowCaptureFlash] = useState(false)
  // Subscribe to the bus so the sibling Transcript card re-renders on
  // interim transcript changes. The story card itself no longer renders
  // the chat panel — see IdeasFAB instead.
  useConversationBus(cardId ?? null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)

  // ─── TTS — speaks the prompt and each AI follow-up in alloy. ───
  // De-duped via spokenRef so re-renders don't replay; cancels any
  // in-flight playback when a new line arrives.
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const spokenRef = useRef<Set<string>>(new Set())
  const speakLine = (text: string | null | undefined) => {
    if (!text) return
    const trimmed = text.trim()
    if (!trimmed) return
    if (spokenRef.current.has(trimmed)) return
    spokenRef.current.add(trimmed)
    // Don't compete with the user mic: while they're recording or
    // transcribing we shouldn't talk over them.
    if (isRecording || transcribing) return
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause() } catch {}
      ttsAudioRef.current = null
    }
    const url = `/api/tts?text=${encodeURIComponent(trimmed)}&voice=alloy`
    const audio = new Audio(url)
    audio.preload = 'auto'
    ttsAudioRef.current = audio
    audio.play().catch((err) => {
      // Browser autoplay policies may block until first user gesture.
      console.warn('[ConversationCard] TTS playback blocked:', err?.message || err)
    })
  }
  // Live transcription infra (Deepgram WS). Runs in parallel with MediaRecorder
  // so the blob is still captured for storage while we stream the transcript live.
  const dgSocketRef = useRef<WebSocket | null>(null)
  const dgAudioContextRef = useRef<AudioContext | null>(null)
  const dgProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const dgFinalRef = useRef<string>('')
  const dgAvailableRef = useRef<boolean | null>(null) // unknown until we probe

  // Video burn-in compositing. We draw the live video + prompt + current
  // follow-up onto a hidden canvas, then feed the canvas's captureStream
  // into MediaRecorder so the saved file contains the text overlay.
  const burnPromptRef = useRef<string>('')
  const burnSuggestionRef = useRef<string>('')
  const burnCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const burnVideoRef = useRef<HTMLVideoElement | null>(null)
  const burnRafRef = useRef<number | null>(null)
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

  // Suggestions flash on the Story card for 5 seconds then hide — they live
  // persistently on the sibling Transcript card (read from the bus).
  const [fadedSuggestionIndices, setFadedSuggestionIndices] = useState<Set<number>>(new Set())
  const [hiddenSuggestionIndices, setHiddenSuggestionIndices] = useState<Set<number>>(new Set())
  useEffect(() => {
    messages.forEach((m, idx) => {
      if (m.kind === 'suggestion' && !hiddenSuggestionIndices.has(idx)) {
        const timer = setTimeout(() => {
          setHiddenSuggestionIndices((prev) => {
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

  // Voice rules:
  //   1. Read the MAIN question (promptText) once when the card mounts.
  //   2. Read each subsequent AI follow-up question — but NOT the
  //      initial starter angle (the one fired before the user has said
  //      anything). Heuristic: a suggestion is a real follow-up only if
  //      it arrives after at least one user turn.
  useEffect(() => {
    if (promptText) speakLine(promptText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptText])
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant' || last.kind !== 'suggestion') return
    const hasPriorUserTurn = messages
      .slice(0, -1)
      .some((m) => m.role === 'user')
    if (!hasPriorUserTurn) return
    speakLine(last.content)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  // Stop any in-flight TTS when the user starts recording / transcribing
  // so the AI voice doesn't bleed into the captured audio.
  useEffect(() => {
    if ((isRecording || transcribing) && ttsAudioRef.current) {
      try { ttsAudioRef.current.pause() } catch {}
      ttsAudioRef.current = null
    }
  }, [isRecording, transcribing])
  // Cleanup TTS on unmount.
  useEffect(() => () => {
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause() } catch {}
      ttsAudioRef.current = null
    }
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
      // Belt-and-braces: stop burn-in RAF + Deepgram socket if recording was
      // interrupted by the user navigating away mid-take.
      if (burnRafRef.current != null) cancelAnimationFrame(burnRafRef.current)
      try { dgSocketRef.current?.close() } catch {}
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, transcribing, followupLoading])

  // Tick a once-per-second recording timer while recording is live.
  useEffect(() => {
    if (!isRecording) return
    const id = setInterval(() => setRecordSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isRecording])

  // Keep burn-in refs in sync with the latest prompt + visible follow-up so
  // the canvas draw loop always renders the current overlay text.
  useEffect(() => { burnPromptRef.current = promptText || '' }, [promptText])
  useEffect(() => {
    const active = [...messages].reverse().find(
      (m, idx) => m.kind === 'suggestion' && !hiddenSuggestionIndices.has(messages.length - 1 - idx)
    )
    burnSuggestionRef.current = active?.content || ''
  }, [messages, hiddenSuggestionIndices])

  // Mirror in-flight state into the sibling Transcript card's bus channel.
  useEffect(() => { if (cardId) conversationBus.setTranscribing(cardId, transcribing) }, [cardId, transcribing])
  useEffect(() => { if (cardId) conversationBus.setFollowupLoading(cardId, followupLoading) }, [cardId, followupLoading])

  // Seed the bus from any pre-existing messages (e.g. resuming a saved card
  // or restoring from localStorage). Runs once on mount.
  const seededRef = useRef(false)
  useEffect(() => {
    if (!cardId || seededRef.current) return
    seededRef.current = true
    for (const m of messages) {
      if (m.role === 'user' && m.kind === 'transcript') {
        conversationBus.pushUserTurn(cardId, m.content)
      }
    }
  }, [cardId, messages])

  // Convert Float32Array → Int16Array PCM for Deepgram's linear16 encoding.
  const floatTo16BitPCM = (f32: Float32Array): ArrayBuffer => {
    const buf = new ArrayBuffer(f32.length * 2)
    const view = new DataView(buf)
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]))
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
    return buf
  }

  // Spin up an OpenAI Realtime transcription-only session and stream PCM16
  // audio frames into it while recording. Runs in parallel with MediaRecorder
  // — blob capture is unaffected.
  //
  // dg* ref names are kept for diff hygiene but back the OpenAI socket now.
  const startLiveTranscription = async (stream: MediaStream) => {
    try {
      const tokenRes = await fetch('/api/realtime/transcribe-session', { method: 'POST' })
      if (!tokenRes.ok) {
        console.warn('[ConversationCard] live transcription disabled — /api/realtime/transcribe-session returned', tokenRes.status)
        dgAvailableRef.current = false
        return
      }
      const { clientSecret, wsUrl } = await tokenRes.json()
      if (!clientSecret) {
        console.warn('[ConversationCard] live transcription disabled — no clientSecret')
        dgAvailableRef.current = false
        return
      }
      dgAvailableRef.current = true
      console.log('[ConversationCard] OpenAI Realtime transcription online')

      const audioContext = new AudioContext({ sampleRate: 16000 })
      dgAudioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)

      // Browsers can't set Authorization headers on WebSocket — OpenAI accepts
      // the ephemeral key via subprotocol.
      const ws = new WebSocket(wsUrl || 'wss://api.openai.com/v1/realtime?intent=transcription', [
        'realtime',
        `openai-insecure-api-key.${clientSecret}`,
        'openai-beta.realtime-v1',
      ])
      dgSocketRef.current = ws
      dgFinalRef.current = ''

      ws.onopen = () => {
        const processor = audioContext.createScriptProcessor(4096, 1, 1)
        dgProcessorRef.current = processor
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return
          const pcm = floatTo16BitPCM(e.inputBuffer.getChannelData(0))
          // OpenAI Realtime expects base64-encoded PCM16 in
          // input_audio_buffer.append events.
          let binary = ''
          const bytes = new Uint8Array(pcm)
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
          const b64 = btoa(binary)
          ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: b64 }))
        }
        source.connect(processor)
        processor.connect(audioContext.destination)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'conversation.item.input_audio_transcription.delta') {
            const delta: string = data.delta || ''
            if (!delta) return
            const display = (dgFinalRef.current + ' ' + delta).trim()
            if (cardId) conversationBus.setInterimTranscript(cardId, display)
          } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
            const transcript: string = data.transcript || ''
            if (!transcript) return
            dgFinalRef.current = (dgFinalRef.current + ' ' + transcript).trim()
            if (cardId) conversationBus.setInterimTranscript(cardId, dgFinalRef.current)
          } else if (data.type === 'error') {
            console.warn('[ConversationCard] realtime error', data.error)
          }
        } catch { /* ignore parse errors */ }
      }

      ws.onerror = () => { dgAvailableRef.current = false }
    } catch (err) {
      console.debug('[ConversationCard] live transcription unavailable', err)
      dgAvailableRef.current = false
    }
  }

  const stopLiveTranscription = (): string => {
    const final = dgFinalRef.current.trim()
    try { dgProcessorRef.current?.disconnect() } catch {}
    dgProcessorRef.current = null
    try { dgSocketRef.current?.close() } catch {}
    dgSocketRef.current = null
    try { dgAudioContextRef.current?.close() } catch {}
    dgAudioContextRef.current = null
    dgFinalRef.current = ''
    return final
  }

  // Build a composite MediaStream that contains the live video with the
  // prompt + current follow-up text drawn on top. The composite audio track
  // is the same one the MediaRecorder would have used on the raw stream.
  // Returns null if the raw stream has no video track.
  const buildBurnedVideoStream = async (raw: MediaStream): Promise<MediaStream | null> => {
    const videoTrack = raw.getVideoTracks()[0]
    if (!videoTrack) return null

    const settings = videoTrack.getSettings()
    const W = settings.width || 1280
    const H = settings.height || 720

    // Hidden <video> driven by the raw video track
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.autoplay = true
    v.srcObject = new MediaStream([videoTrack])
    try { await v.play() } catch { /* ignored — may still produce frames */ }
    burnVideoRef.current = v

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    burnCanvasRef.current = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Word-wrap helper that draws a rounded-rect backdrop + text.
    // Returns the Y coordinate just below the drawn block.
    const drawBlock = (
      text: string,
      topY: number,
      opts: { fontSize: number; bg: string; fg: string; pad: number; maxW: number; sidePad: number; prefix?: string }
    ): number => {
      ctx.font = `500 ${opts.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
      const full = (opts.prefix ? opts.prefix + ' ' : '') + text
      const words = full.split(/\s+/)
      const lines: string[] = []
      let line = ''
      for (const word of words) {
        const test = line ? line + ' ' + word : word
        if (ctx.measureText(test).width > opts.maxW) {
          if (line) lines.push(line)
          line = word
        } else {
          line = test
        }
      }
      if (line) lines.push(line)

      const lineH = Math.round(opts.fontSize * 1.35)
      const blockH = lines.length * lineH + opts.pad * 2
      const x = opts.sidePad
      const w = W - opts.sidePad * 2

      // Rounded rect
      const r = 14
      ctx.fillStyle = opts.bg
      ctx.beginPath()
      ctx.moveTo(x + r, topY)
      ctx.lineTo(x + w - r, topY)
      ctx.quadraticCurveTo(x + w, topY, x + w, topY + r)
      ctx.lineTo(x + w, topY + blockH - r)
      ctx.quadraticCurveTo(x + w, topY + blockH, x + w - r, topY + blockH)
      ctx.lineTo(x + r, topY + blockH)
      ctx.quadraticCurveTo(x, topY + blockH, x, topY + blockH - r)
      ctx.lineTo(x, topY + r)
      ctx.quadraticCurveTo(x, topY, x + r, topY)
      ctx.closePath()
      ctx.fill()

      // Text
      ctx.fillStyle = opts.fg
      ctx.textBaseline = 'top'
      let y = topY + opts.pad
      for (const l of lines) {
        ctx.fillText(l, x + opts.pad, y)
        y += lineH
      }
      return topY + blockH
    }

    const SIDE_PAD = Math.max(24, Math.round(W * 0.04))
    const MAX_W = W - SIDE_PAD * 2 - 32 // inner text width minus horizontal padding

    const draw = () => {
      const c = burnCanvasRef.current
      const vid = burnVideoRef.current
      if (!c || !vid) return
      try {
        ctx.drawImage(vid, 0, 0, W, H)
      } catch { /* initial frame may not be ready */ }

      // Prompt lives in the card's bottom panel (not the video overlay),
      // so we only burn the active follow-up into the recorded frame.
      const suggestion = burnSuggestionRef.current.trim()
      const nextY = Math.max(28, Math.round(H * 0.04))
      if (suggestion) {
        drawBlock(suggestion, nextY, {
          fontSize: Math.round(W * 0.019),
          bg: 'rgba(196,162,53,0.55)',
          fg: '#ffffff',
          pad: 12,
          maxW: MAX_W,
          sidePad: SIDE_PAD,
          prefix: '💡',
        })
      }
      burnRafRef.current = requestAnimationFrame(draw)
    }
    draw()

    // captureStream at 30fps; splice in the original audio track.
    const composite = (canvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }).captureStream?.(30)
    if (!composite) return null
    const audioTrack = raw.getAudioTracks()[0]
    const tracks: MediaStreamTrack[] = [composite.getVideoTracks()[0]]
    if (audioTrack) tracks.push(audioTrack)
    return new MediaStream(tracks)
  }

  const teardownBurnedVideo = () => {
    if (burnRafRef.current != null) cancelAnimationFrame(burnRafRef.current)
    burnRafRef.current = null
    try { burnVideoRef.current?.pause() } catch {}
    if (burnVideoRef.current) {
      try { (burnVideoRef.current.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop()) } catch {}
      burnVideoRef.current.srcObject = null
      burnVideoRef.current = null
    }
    burnCanvasRef.current = null
  }

  const startRecord = async () => {
    const stream = streamRef.current
    if (!stream || isRecording) return
    try {
      for (const t of stream.getAudioTracks()) t.enabled = true
      const mimeType = mode === 'voice' ? 'audio/webm' : 'video/webm'

      // Video mode: record a canvas composite with the prompt + follow-up
      // burned in so the saved file shows the question. Audio is unchanged.
      let recordStream: MediaStream = stream
      if (mode === 'video') {
        const burned = await buildBurnedVideoStream(stream)
        if (burned) recordStream = burned
      }

      const rec = new MediaRecorder(recordStream, { mimeType })
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }

      // Fire live transcription in parallel — if Deepgram is unavailable we
      // fall back to the post-stop /api/transcribe call.
      startLiveTranscription(stream)

      rec.onstop = async () => {
        for (const t of stream.getAudioTracks()) t.enabled = false
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)

        // Tear down the burn-in pipeline (if any) and the Deepgram socket.
        teardownBurnedVideo()
        const liveTranscript = stopLiveTranscription()
        if (cardId) conversationBus.clearInterimTranscript(cardId)

        let transcript = liveTranscript
        if (!transcript) {
          setTranscribing(true)
          try {
            const fd = new FormData()
            fd.append('audio', blob, mode === 'voice' ? 'rec.webm' : 'rec.webm')
            const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
            const d = await res.json()
            transcript = d.transcription || d.text || ''
          } catch (err) {
            console.error('[ConversationCard] transcribe failed', err)
          }
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
          if (cardId) conversationBus.pushUserTurn(cardId, transcript)
          if (mode === 'video') {
            // New user response — stale suggestions go away.
            clearSuggestionOverlays()
          }
          transcriptRunningRef.current = (transcriptRunningRef.current + ' ' + transcript).trim()
          // Brief "Captured ✓" celebration so each recording feels like a win.
          setShowCaptureFlash(true)
          setTimeout(() => setShowCaptureFlash(false), 1200)
          await generateFollowups(transcriptRunningRef.current)
        }
      }
      rec.start()
      mediaRecorderRef.current = rec
      setIsRecording(true)
      setRecordSeconds(0)
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
    // Hard cap: at most 2 AI suggestions per card so we don't pile up
    // "what about your hands" style probes. Once we've shown 2, stop.
    const existingSuggestions = messages.filter((m) => m.kind === 'suggestion').length
    if (existingSuggestions >= 2) {
      console.log('[ConversationCard] suggestion cap reached (2), skipping')
      return
    }
    setFollowupLoading(true)
    // Read "recent follow-up history" from localStorage so the server can apply its
    // "don't beat a dead horse" cooldown. Keep last 5 booleans.
    let recentHadFollowups: boolean[] = []
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('yt_recent_followups') : null
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) recentHadFollowups = parsed.filter((v) => typeof v === 'boolean').slice(-5)
      }
    } catch {}
    try {
      const res = await fetch('/api/memory/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText, transcript: cumulative, force: false, recentHadFollowups }),
      })
      const d = await res.json()
      const suggestions: string[] = Array.isArray(d.suggestions) ? d.suggestions.slice(0, 1) : []
      console.log('[ConversationCard] followups result', {
        transcriptChars: cumulative.length,
        isStarter: !cumulative.trim(),
        suggestionCount: suggestions.length,
        preview: suggestions[0]?.slice(0, 80) || null,
      })
      if (suggestions.length > 0) {
        // Only one follow-up open at a time — retire any prior suggestion bubbles
        // before adding the new one.
        hideOpenSuggestions()
        if (mode === 'video') clearSuggestionOverlays()
        const turn: Turn = { role: 'assistant', content: suggestions[0], kind: 'suggestion' }
        setMessages((prev) => [...prev, turn])
        if (mode === 'video') pushOverlay(turn)
        // Publish to the sibling TranscriptCard so the follow-up also appears
        // there (the Story card keeps a brief flash; Transcript is persistent).
        if (cardId) conversationBus.setSuggestion(cardId, suggestions[0])
      }
      // Record whether this memory yielded a follow-up, keeping the last 5 entries.
      try {
        if (typeof window !== 'undefined') {
          const next = [...recentHadFollowups, suggestions.length > 0].slice(-5)
          window.localStorage.setItem('yt_recent_followups', JSON.stringify(next))
        }
      } catch {}
    } catch (err) {
      console.error('[ConversationCard] followups failed', err)
    } finally {
      setFollowupLoading(false)
    }
  }

  const handleSubmit = () => {
    const userTurns = messages.filter((m) => m.role === 'user')
    const fullTranscript = userTurns.map((m) => m.content).join('\n\n').trim()
    console.log('[ConversationCard] handleSubmit', {
      userTurnCount: userTurns.length,
      transcriptLength: fullTranscript.length,
      preview: fullTranscript.slice(0, 80),
      mediaBlobs: mediaBlobsRef.current.length,
    })
    if (!fullTranscript) {
      console.warn('[ConversationCard] submit skipped — empty transcript')
      return
    }
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
  // If the user deleted everything (no text and no takes left), fall back
  // to the active recording view so they can start over instead of being
  // stuck on an empty saved card.
  const savedHasContent =
    !!(data.text && data.text.trim()) || (data.mediaBlobs?.length || 0) > 0
  if (saved && savedHasContent) {
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
                onTranscriptChange={(nextTranscript) => {
                  const nextBlobs = recordings.map((r, j) =>
                    j === i ? { ...r, transcript: nextTranscript } : r,
                  )
                  const rebuiltText = nextBlobs
                    .map((r) => r.transcript || '')
                    .filter(Boolean)
                    .join('\n\n')
                  onSave({ ...data, mediaBlobs: nextBlobs, text: rebuiltText })
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

  // Dock height. The story card is now full-height video above the dock —
  // we no longer reserve space for a chat panel. Suggestions surface on
  // the sibling Transcript card; on this card they show up via the small
  // Ideas popover below.
  const DOCK_PX = textMode ? 120 : 108
  const BOTTOM_PANEL_PX = 0

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden', background: 'transparent' }}>
      {/* Background: live video preview OR soft category gradient. The
          video now occupies the TOP portion only — the bottom panel hosts
          takes + follow-up underneath. */}
      {isVideoActive ? (
        <>
          <video
            ref={videoPreviewRef}
            muted
            playsInline
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              bottom: `${BOTTOM_PANEL_PX + DOCK_PX}px`,
              width: '100%', objectFit: 'cover', background: '#000',
              transition: 'bottom 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          />
          {!streamReady && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              bottom: `${BOTTOM_PANEL_PX + DOCK_PX}px`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', background: 'rgba(0,0,0,0.6)',
            }}>
              <Loader2 size={22} className="animate-spin" />
            </div>
          )}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: Math.min(180, Math.round((1 - (BOTTOM_PANEL_PX + DOCK_PX) / 600) * 600 * 0.45)),
            background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
          }} />
        </>
      ) : (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          bottom: `${BOTTOM_PANEL_PX + DOCK_PX}px`,
          background: `linear-gradient(180deg, ${accentColor}10 0%, ${accentColor}05 60%)`,
          pointerEvents: 'none',
          transition: 'bottom 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }} />
      )}

      {/* REC/Ready badge (only when recording capability shown) */}
      {!textMode && (
        <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 3 }}>
          {isRecording ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(239,68,68,0.95)', color: '#fff', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fff', animation: 'cconv-pulse 1s infinite' }} />
              REC {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')}
            </div>
          ) : isVideoActive && streamReady ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: '10px', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8DACAB' }} />
              Ready
            </div>
          ) : null}
        </div>
      )}

      {/* Floating Ideas button — opens a small popover with 3 broad
          angles to speak about. The story card is otherwise full-height
          video; suggestions live in the sibling Transcript card. */}
      <IdeasFAB
        promptText={promptText}
        accentColor={accentColor}
        isVideoActive={isVideoActive}
        bottomOffset={DOCK_PX + 12}
      />

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

      {/* Capture flash — brief "Captured ✓" celebration after each recording stops
          so every capture feels like a small win before any review step. */}
      <AnimatePresence>
        {showCaptureFlash && (
          <motion.div
            key="capture-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: 'linear-gradient(180deg, rgba(45,90,61,0.85) 0%, rgba(45,90,61,0.75) 100%)',
              backdropFilter: 'blur(6px)',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 1.2, 1], rotate: 0 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: '#fff', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              }}
            >
              <Check size={28} color="#2D5A3D" strokeWidth={3} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.3 }}
              style={{ color: '#fff', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}
            >
              Captured
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ delay: 0.28, duration: 0.3 }}
              style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px' }}
            >
              Saved to your story
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes cconv-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        .conv-scroll::-webkit-scrollbar { width: 6px; }
        .conv-scroll::-webkit-scrollbar-track { background: transparent; }
        .conv-scroll::-webkit-scrollbar-thumb {
          background: ${accentColor}40;
          border-radius: 3px;
        }
        .conv-scroll::-webkit-scrollbar-thumb:hover {
          background: ${accentColor}60;
        }
      `}</style>
    </div>
  )
}

/* ─────────────── Saved take box (playback + delete) ─────────────── */

function TakeBox({ take, index, accent, context, onDelete, onTranscriptChange }: {
  take: { kind: 'audio' | 'video'; blob?: Blob; url: string; transcript?: string }
  index: number
  accent: string
  context?: Turn | null
  onDelete: () => void
  /** Called when the user edits this take's transcript. Debounced inside. */
  onTranscriptChange?: (next: string) => void
}) {
  const isVideo = take.kind === 'video'
  const contextIsSuggestion = context?.kind === 'suggestion'
  const contextText = context
    ? (contextIsSuggestion ? context.content.split('\n')[0] : context.content)
    : null

  // Local editable transcript with debounced autosave back through
  // onTranscriptChange. We keep a ref to the last value pushed up so we
  // don't spam the parent with identical saves on every keystroke flush.
  const [editValue, setEditValue] = useState(take.transcript || '')
  const lastPushedRef = useRef(take.transcript || '')
  useEffect(() => {
    // If the parent re-hydrates this take with a new transcript (e.g.
    // late-arriving STT), pick it up unless the user is mid-edit.
    if ((take.transcript || '') !== lastPushedRef.current) {
      setEditValue(take.transcript || '')
      lastPushedRef.current = take.transcript || ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take.transcript])
  useEffect(() => {
    if (!onTranscriptChange) return
    if (editValue === lastPushedRef.current) return
    const handle = setTimeout(() => {
      lastPushedRef.current = editValue
      onTranscriptChange(editValue)
    }, 600)
    return () => clearTimeout(handle)
  }, [editValue, onTranscriptChange])

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
      {/* Small delete affordance, no big "Take N" label on top of the video */}
      <button
        onClick={onDelete}
        aria-label="Delete this take"
        style={{
          position: 'absolute',
          top: '8px', right: '8px',
          zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '26px', height: '26px', borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.25)',
          color: '#ffffff', cursor: 'pointer',
          backdropFilter: 'blur(6px)',
        }}
      >
        <Trash2 size={12} />
      </button>

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

      {/* Transcript — editable. Autosaves through onTranscriptChange after
          a short debounce so the user sees their edits persist without
          clicking a button. */}
      {(editValue || onTranscriptChange) && (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="Edit your transcript…"
          rows={Math.min(8, Math.max(2, editValue.split('\n').length + 1))}
          style={{
            display: 'block',
            width: '100%',
            padding: '10px 14px',
            fontSize: '12.5px',
            lineHeight: 1.55,
            color: '#2A302D',
            fontFamily: 'var(--font-playfair, Playfair Display, serif)',
            whiteSpace: 'pre-wrap',
            background: '#FFFFFF',
            border: 'none',
            borderTop: '1px solid #EEF2EF',
            outline: 'none',
            resize: 'vertical',
            minHeight: '48px',
            boxSizing: 'border-box',
          }}
        />
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

// Compact chat bubble used in the bottom panel — left for prompt / follow-up,
// right for user turns + interim transcript.
function ChatBubble({
  side, accent, tone, children,
}: {
  side: 'left' | 'right'
  accent: string
  tone: 'prompt' | 'suggestion' | 'user' | 'interim'
  children: React.ReactNode
}) {
  const palette = (() => {
    switch (tone) {
      case 'prompt':
        return { bg: '#F5F1E4', border: 'rgba(26,31,28,0.25)', color: '#1A1F1C', weight: 500 }
      case 'suggestion':
        return { bg: `${accent}14`, border: `${accent}40`, color: '#2d2d2d', weight: 500 }
      case 'user':
        return { bg: accent, border: accent, color: '#ffffff', weight: 500 }
      case 'interim':
      default:
        return { bg: `${accent}08`, border: `${accent}40`, color: '#2d2d2d', weight: 400, dashed: true }
    }
  })() as { bg: string; border: string; color: string; weight: number; dashed?: boolean }
  return (
    <div style={{ display: 'flex', justifyContent: side === 'right' ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '82%',
          padding: '8px 11px',
          borderRadius: side === 'right' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: palette.bg,
          border: `1px ${palette.dashed ? 'dashed' : 'solid'} ${palette.border}`,
          color: palette.color,
          fontSize: '13px',
          lineHeight: '1.45',
          fontWeight: palette.weight,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </div>
    </div>
  )
}

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

// Primary gesture is tap-to-toggle. Hold-to-record is kept as a secondary
// quick-capture: press and hold >400ms without moving → record; release to stop.
function RecordButton({ mode, isRecording, accent, onStart, onStop }: {
  mode: Mode
  isRecording: boolean
  accent: string
  onStart: () => void
  onStop: () => void
}) {
  const Icon = mode === 'voice' ? Mic : VideoIcon
  const HOLD_MS = 400
  const MOVE_TOLERANCE_PX = 10

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gestureRef = useRef<{ x: number; y: number; holdActive: boolean; startedRecording: boolean } | null>(null)

  const clearHoldTimer = () => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    // If already recording, wait for release and treat it as "tap to stop".
    if (isRecording) {
      gestureRef.current = { x: e.clientX, y: e.clientY, holdActive: false, startedRecording: false }
      return
    }
    // Not recording yet — arm the hold detector.
    gestureRef.current = { x: e.clientX, y: e.clientY, holdActive: false, startedRecording: false }
    clearHoldTimer()
    holdTimerRef.current = setTimeout(() => {
      const g = gestureRef.current
      if (!g) return
      g.holdActive = true
      g.startedRecording = true
      onStart()
    }, HOLD_MS)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const g = gestureRef.current
    if (!g) return
    const dx = Math.abs(e.clientX - g.x)
    const dy = Math.abs(e.clientY - g.y)
    if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) {
      // User is scrolling/dragging — cancel the hold detector.
      clearHoldTimer()
      if (!g.holdActive) gestureRef.current = null
    }
  }

  const handlePointerUp = () => {
    const g = gestureRef.current
    clearHoldTimer()
    if (!g) return
    if (g.holdActive) {
      onStop()
    } else {
      if (isRecording) onStop()
      else onStart()
    }
    gestureRef.current = null
  }

  const handlePointerCancel = () => {
    const g = gestureRef.current
    clearHoldTimer()
    if (g?.startedRecording) onStop()
    gestureRef.current = null
  }

  return (
    <motion.button
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
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
      aria-label={isRecording ? 'Tap to stop recording' : 'Tap to record'}
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

/* ─────────────── Ideas FAB + popover ───────────────
 *
 * Small floating "Ideas" button that opens a popover listing 3 short
 * angles the user could speak about for the current memory prompt.
 * Powered by /api/memory/ideas; "Shuffle" requests a fresh trio,
 * passing the previously-shown ideas in `avoid` so the model doesn't
 * repeat itself. Designed to sit above the dock without taking space
 * away from the full-height video preview. */
function IdeasFAB({
  promptText,
  accentColor,
  isVideoActive,
  bottomOffset,
}: {
  promptText: string
  accentColor: string
  isVideoActive: boolean
  bottomOffset: number
}) {
  const [open, setOpen] = useState(false)
  const [ideas, setIdeas] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seenRef = useRef<string[]>([])

  const fetchIdeas = useCallback(async (shuffle: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/memory/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText,
          avoid: shuffle ? seenRef.current.slice(-6) : [],
        }),
      })
      const d = await res.json()
      const next: string[] = Array.isArray(d.ideas)
        ? d.ideas.filter((s: unknown): s is string => typeof s === 'string').slice(0, 3)
        : []
      setIdeas(next)
      // Track shown ideas so a subsequent shuffle can avoid them.
      seenRef.current = [...seenRef.current, ...next].slice(-12)
    } catch (err) {
      console.error('[IdeasFAB] fetch failed', err)
      setError('Could not load ideas. Try again.')
    } finally {
      setLoading(false)
    }
  }, [promptText])

  // Lazy-load on first open.
  useEffect(() => {
    if (open && ideas.length === 0 && !loading) fetchIdeas(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Show ideas to speak about"
        style={{
          position: 'absolute',
          right: '12px',
          bottom: `${bottomOffset}px`,
          zIndex: 5,
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '7px 12px',
          borderRadius: '999px',
          background: isVideoActive ? 'rgba(0,0,0,0.55)' : '#FFFFFF',
          border: `1px solid ${isVideoActive ? 'rgba(255,255,255,0.25)' : '#DDE3DF'}`,
          color: isVideoActive ? '#FFFFFF' : accentColor,
          backdropFilter: 'blur(8px)',
          cursor: 'pointer',
          fontSize: '11.5px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
        }}
      >
        <Sparkles size={13} />
        Ideas
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Tap-anywhere-to-dismiss layer */}
            <motion.div
              key="ideas-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ position: 'absolute', inset: 0, background: 'transparent', zIndex: 5 }}
            />
            <motion.div
              key="ideas-popover"
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-label="Ideas to speak about"
              style={{
                position: 'absolute',
                right: '12px',
                bottom: `${bottomOffset + 44}px`,
                zIndex: 6,
                width: 'min(280px, calc(100% - 24px))',
                background: '#FFFFFF',
                border: '1px solid #EEF2EF',
                borderRadius: '14px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderBottom: '1px solid #EEF2EF',
                  background: `linear-gradient(90deg, ${accentColor}10 0%, transparent 100%)`,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: accentColor, fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  <Sparkles size={12} />
                  Ideas to speak about
                </span>
                <button
                  onClick={() => fetchIdeas(true)}
                  disabled={loading}
                  aria-label="Shuffle ideas"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 8px',
                    background: '#F5F1EA',
                    border: '1px solid #E6DCC8',
                    borderRadius: '999px',
                    color: '#6B5A3A',
                    cursor: loading ? 'progress' : 'pointer',
                    fontSize: '10.5px', fontWeight: 700,
                  }}
                >
                  {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  Shuffle
                </button>
              </div>
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {loading && ideas.length === 0 && (
                  <div style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A09A', fontSize: '12px' }}>
                    <Loader2 size={14} className="animate-spin" style={{ marginRight: '6px' }} />
                    Thinking of angles…
                  </div>
                )}
                {!loading && error && (
                  <div style={{ padding: '12px', color: '#B8562E', fontSize: '12px' }}>{error}</div>
                )}
                {ideas.map((idea, i) => (
                  <div
                    key={`${i}-${idea.slice(0, 16)}`}
                    style={{
                      padding: '10px 12px',
                      background: '#FAFAF7',
                      border: '1px solid #EEF2EF',
                      borderRadius: '10px',
                      fontSize: '13px',
                      lineHeight: 1.45,
                      color: '#2A302D',
                      fontFamily: 'var(--font-playfair, Playfair Display, serif)',
                    }}
                  >
                    {idea}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
