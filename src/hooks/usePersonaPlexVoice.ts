'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// ============================================================================
// Types & Constants
// ============================================================================

export type PersonaPlexState =
  | 'idle'
  | 'requesting'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'aiSpeaking'
  | 'error'

// All 18 PersonaPlex voices
export type PersonaPlexVoice =
  // Custom YoursTruly voice
  | 'yourstruly-voice.mp3'
  // Natural Female (4)
  | 'NATF0' | 'NATF1' | 'NATF2' | 'NATF3'
  // Natural Male (4)
  | 'NATM0' | 'NATM1' | 'NATM2' | 'NATM3'
  // Variety Female (5)
  | 'VARF0' | 'VARF1' | 'VARF2' | 'VARF3' | 'VARF4'
  // Variety Male (5)
  | 'VARM0' | 'VARM1' | 'VARM2' | 'VARM3' | 'VARM4'

export interface TranscriptEntry {
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

export interface UsePersonaPlexOptions {
  serverUrl?: string
  systemPrompt?: string
  /** Topic/question to start with - AI will speak this first */
  initialTopic?: string
  voice?: PersonaPlexVoice | string
  // Model parameters
  textTemperature?: number
  textTopk?: number
  audioTemperature?: number
  audioTopk?: number
  padMult?: number
  repetitionPenalty?: number
  repetitionPenaltyContext?: number
  // Audio recording (captures both user and AI audio)
  enableRecording?: boolean
  // Callbacks
  onTranscript?: (userText: string, aiText: string) => void
  onComplete?: (transcript: TranscriptEntry[]) => void
  onError?: (error: Error) => void
  onAudioStats?: (stats: AudioStats) => void
  onRecordingComplete?: (blob: Blob) => void
}

export interface UsePersonaPlexReturn {
  state: PersonaPlexState
  transcript: TranscriptEntry[]
  currentUserText: string
  currentAiText: string
  error: Error | null
  isSupported: boolean
  audioStats: AudioStats | null
  // Recording
  isRecording: boolean
  recordingBlob: Blob | null
  recordingUrl: string | null
  recordingStartTime: number | null
  // Actions
  start: () => Promise<void>
  stop: () => void
  abort: () => void
  sendControl: (action: ControlAction) => void
}

export interface AudioStats {
  playedAudioDuration: number
  missedAudioDuration: number
  totalAudioMessages: number
  delay: number
  minPlaybackDelay: number
  maxPlaybackDelay: number
}

// ============================================================================
// Protocol Types (matching NVIDIA PersonaPlex)
// ============================================================================

type MessageType = 'handshake' | 'audio' | 'text' | 'control' | 'metadata' | 'error' | 'ping'

type ControlAction = 'start' | 'endTurn' | 'pause' | 'restart'

interface WSMessage {
  type: MessageType
  version?: number
  model?: number
  data?: Uint8Array | string | unknown
  action?: ControlAction
}

const CONTROL_MESSAGES_MAP: Record<ControlAction, number> = {
  start: 0b00000000,
  endTurn: 0b00000001,
  pause: 0b00000010,
  restart: 0b00000011,
}

// ============================================================================
// Protocol Encoder/Decoder
// ============================================================================

function encodeMessage(message: WSMessage): Uint8Array {
  switch (message.type) {
    case 'handshake':
      return new Uint8Array([0x00, message.version ?? 0, message.model ?? 0])

    case 'audio': {
      const audioData = message.data as Uint8Array
      const result = new Uint8Array(1 + audioData.length)
      result[0] = 0x01
      result.set(audioData, 1)
      return result
    }

    case 'text': {
      const textBytes = new TextEncoder().encode(message.data as string)
      const result = new Uint8Array(1 + textBytes.length)
      result[0] = 0x02
      result.set(textBytes, 1)
      return result
    }

    case 'control':
      return new Uint8Array([0x03, CONTROL_MESSAGES_MAP[message.action!]])

    case 'metadata': {
      const metaBytes = new TextEncoder().encode(JSON.stringify(message.data))
      const result = new Uint8Array(1 + metaBytes.length)
      result[0] = 0x04
      result.set(metaBytes, 1)
      return result
    }

    case 'error': {
      const errorBytes = new TextEncoder().encode(message.data as string)
      const result = new Uint8Array(1 + errorBytes.length)
      result[0] = 0x05
      result.set(errorBytes, 1)
      return result
    }

    case 'ping':
      return new Uint8Array([0x06])

    default:
      throw new Error(`Unknown message type: ${message.type}`)
  }
}

function decodeMessage(data: Uint8Array): WSMessage {
  const type = data[0]
  const payload = data.slice(1)

  switch (type) {
    case 0x00:
      return { type: 'handshake', version: 0, model: 0 }
    case 0x01:
      return { type: 'audio', data: payload }
    case 0x02:
      return { type: 'text', data: new TextDecoder().decode(payload) }
    case 0x03: {
      const actionEntry = Object.entries(CONTROL_MESSAGES_MAP).find(
        ([, value]) => value === payload[0]
      )
      if (!actionEntry) throw new Error('Unknown control message')
      return { type: 'control', action: actionEntry[0] as ControlAction }
    }
    case 0x04:
      return { type: 'metadata', data: JSON.parse(new TextDecoder().decode(payload)) }
    case 0x05:
      return { type: 'error', data: new TextDecoder().decode(payload) }
    case 0x06:
      return { type: 'ping' }
    default:
      throw new Error(`Unknown message type: ${type}`)
  }
}

// ============================================================================
// AudioWorklet Processor Code (inline as blob URL)
// ============================================================================

const AUDIO_WORKLET_CODE = `
// PersonaPlex Audio Processor - Moshi-style buffered playback
class PersonaPlexProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Buffer settings (in samples at native sample rate)
    const frameSize = Math.round(80 * sampleRate / 1000); // 80ms frames
    this.initialBufferSamples = 1 * frameSize;
    this.partialBufferSamples = Math.round(10 * sampleRate / 1000);
    this.maxBufferSamples = Math.round(10 * sampleRate / 1000);
    this.partialBufferIncrement = Math.round(5 * sampleRate / 1000);
    this.maxPartialWithIncrements = Math.round(80 * sampleRate / 1000);
    this.maxBufferSamplesIncrement = Math.round(5 * sampleRate / 1000);
    this.maxMaxBufferWithIncrements = Math.round(80 * sampleRate / 1000);
    
    this.initState();
    
    this.port.onmessage = (event) => {
      if (event.data.type === 'reset') {
        this.initState();
        return;
      }
      
      const frame = event.data.frame;
      this.frames.push(frame);
      
      if (this.currentSamples() >= this.initialBufferSamples && !this.started) {
        this.start();
      }
      
      // Handle buffer overflow
      if (this.currentSamples() >= this.totalMaxBufferSamples()) {
        const target = this.initialBufferSamples + this.partialBufferSamples;
        while (this.currentSamples() > target) {
          const first = this.frames[0];
          const toRemove = Math.min(
            first.length - this.offsetInFirstBuffer,
            this.currentSamples() - target
          );
          this.offsetInFirstBuffer += toRemove;
          this.timeInStream += toRemove / sampleRate;
          if (this.offsetInFirstBuffer === first.length) {
            this.frames.shift();
            this.offsetInFirstBuffer = 0;
          }
        }
        this.maxBufferSamples = Math.min(
          this.maxBufferSamples + this.maxBufferSamplesIncrement,
          this.maxMaxBufferWithIncrements
        );
      }
      
      // Report stats back
      this.port.postMessage({
        totalAudioPlayed: this.totalAudioPlayed,
        actualAudioPlayed: this.actualAudioPlayed,
        delay: event.data.micDuration - this.timeInStream,
        minDelay: this.minDelay,
        maxDelay: this.maxDelay,
      });
    };
  }
  
  initState() {
    this.frames = [];
    this.offsetInFirstBuffer = 0;
    this.firstOut = false;
    this.remainingPartialBufferSamples = 0;
    this.timeInStream = 0;
    this.started = false;
    this.totalAudioPlayed = 0;
    this.actualAudioPlayed = 0;
    this.maxDelay = 0;
    this.minDelay = 2000;
    this.partialBufferSamples = Math.round(10 * sampleRate / 1000);
    this.maxBufferSamples = Math.round(10 * sampleRate / 1000);
  }
  
  totalMaxBufferSamples() {
    return this.maxBufferSamples + this.partialBufferSamples + this.initialBufferSamples;
  }
  
  currentSamples() {
    let samples = 0;
    for (const frame of this.frames) {
      samples += frame.length;
    }
    return samples - this.offsetInFirstBuffer;
  }
  
  start() {
    this.started = true;
    this.remainingPartialBufferSamples = this.partialBufferSamples;
    this.firstOut = true;
  }
  
  canPlay() {
    return this.started && this.frames.length > 0 && this.remainingPartialBufferSamples <= 0;
  }
  
  process(inputs, outputs, parameters) {
    const output = outputs[0][0];
    if (!output) return true;
    
    const delay = this.currentSamples() / sampleRate;
    if (this.canPlay()) {
      this.maxDelay = Math.max(this.maxDelay, delay);
      this.minDelay = Math.min(this.minDelay, delay);
    }
    
    if (!this.canPlay()) {
      if (this.actualAudioPlayed > 0) {
        this.totalAudioPlayed += output.length / sampleRate;
      }
      this.remainingPartialBufferSamples -= output.length;
      return true;
    }
    
    let outIdx = 0;
    while (outIdx < output.length && this.frames.length) {
      const first = this.frames[0];
      const toCopy = Math.min(
        first.length - this.offsetInFirstBuffer,
        output.length - outIdx
      );
      output.set(
        first.subarray(this.offsetInFirstBuffer, this.offsetInFirstBuffer + toCopy),
        outIdx
      );
      this.offsetInFirstBuffer += toCopy;
      outIdx += toCopy;
      if (this.offsetInFirstBuffer === first.length) {
        this.offsetInFirstBuffer = 0;
        this.frames.shift();
      }
    }
    
    // Fade in on first output
    if (this.firstOut) {
      this.firstOut = false;
      for (let i = 0; i < outIdx; i++) {
        output[i] *= i / outIdx;
      }
    }
    
    // Handle underrun with fade out
    if (outIdx < output.length) {
      this.partialBufferSamples = Math.min(
        this.partialBufferSamples + this.partialBufferIncrement,
        this.maxPartialWithIncrements
      );
      this.started = false;
      for (let i = 0; i < outIdx; i++) {
        output[i] *= (outIdx - i) / outIdx;
      }
    }
    
    this.totalAudioPlayed += output.length / sampleRate;
    this.actualAudioPlayed += outIdx / sampleRate;
    this.timeInStream += outIdx / sampleRate;
    
    return true;
  }
}

registerProcessor('personaplex-processor', PersonaPlexProcessor);
`

// ============================================================================
// Opus Decoder (simplified inline implementation using Web Audio API)
// We use ogg-opus-decoder library if available, fallback to MediaSource
// ============================================================================

interface OpusDecoderConfig {
  sampleRate: number
  channels: number
}

class SimpleOpusDecoder {
  private audioContext: AudioContext
  private outputSampleRate: number
  private pendingPages: Uint8Array[] = []
  private onDecode: (samples: Float32Array) => void

  constructor(
    audioContext: AudioContext,
    onDecode: (samples: Float32Array) => void
  ) {
    this.audioContext = audioContext
    this.outputSampleRate = audioContext.sampleRate
    this.onDecode = onDecode
  }

  async decode(oggPage: Uint8Array): Promise<void> {
    // Skip Ogg header pages (OpusHead, OpusTags)
    if (this.isHeaderPage(oggPage)) {
      return
    }

    // Extract Opus frames from Ogg page and decode
    try {
      const audioData = await this.decodeOggPage(oggPage)
      if (audioData && audioData.length > 0) {
        this.onDecode(audioData)
      }
    } catch (err) {
      console.warn('Opus decode error:', err)
    }
  }

  private isHeaderPage(page: Uint8Array): boolean {
    // Check for "OggS" magic and BOS flag or OpusHead/OpusTags
    if (page.length < 28) return false
    
    // Check for OpusHead signature
    const hasOpusHead = page.length >= 36 && 
      String.fromCharCode.apply(null, Array.from(page.slice(28, 36))) === 'OpusHead'
    
    // Check for OpusTags signature  
    const hasOpusTags = page.length >= 36 &&
      String.fromCharCode.apply(null, Array.from(page.slice(28, 36))) === 'OpusTags'
    
    return hasOpusHead || hasOpusTags
  }

  private async decodeOggPage(page: Uint8Array): Promise<Float32Array | null> {
    // Parse Ogg page structure
    if (page.length < 27) return null
    
    // Verify OggS magic
    if (page[0] !== 0x4F || page[1] !== 0x67 || page[2] !== 0x67 || page[3] !== 0x53) {
      return null
    }
    
    const numSegments = page[26]
    const segmentTable = page.slice(27, 27 + numSegments)
    let dataOffset = 27 + numSegments
    
    // Calculate total payload size
    let totalSize = 0
    for (let i = 0; i < numSegments; i++) {
      totalSize += segmentTable[i]
    }
    
    // Extract audio payload
    const payload = page.slice(dataOffset, dataOffset + totalSize)
    
    // For PersonaPlex: audio comes as raw PCM float32 in the protocol
    // The server sends already-decoded audio, we just need to resample if needed
    if (payload.length === 0) return null
    
    // Convert Uint8Array to Float32Array (assuming 24kHz mono float32)
    const float32 = new Float32Array(payload.buffer, payload.byteOffset, payload.length / 4)
    
    // Resample from 24kHz to output sample rate if needed
    if (this.outputSampleRate !== 24000) {
      return this.resample(float32, 24000, this.outputSampleRate)
    }
    
    return float32
  }

  private resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    const ratio = fromRate / toRate
    const outputLength = Math.floor(input.length / ratio)
    const output = new Float32Array(outputLength)
    
    for (let i = 0; i < outputLength; i++) {
      const srcIdx = i * ratio
      const srcIdxFloor = Math.floor(srcIdx)
      const srcIdxCeil = Math.min(srcIdxFloor + 1, input.length - 1)
      const t = srcIdx - srcIdxFloor
      
      // Linear interpolation
      output[i] = input[srcIdxFloor] * (1 - t) + input[srcIdxCeil] * t
    }
    
    return output
  }
}

// ============================================================================
// Main Hook
// ============================================================================

const DEFAULT_SERVER_URL = process.env.NEXT_PUBLIC_PERSONAPLEX_URL || 'wss://100.97.242.10:8998/api/chat'

export function usePersonaPlexVoice(options: UsePersonaPlexOptions = {}): UsePersonaPlexReturn {
  const {
    serverUrl = DEFAULT_SERVER_URL,
    systemPrompt: baseSystemPrompt = 'You enjoy having a good conversation.',
    initialTopic,
    voice = 'yourstruly-voice.mp3',
    textTemperature = 0.7,
    textTopk = 25,
    audioTemperature = 0.8,
    audioTopk = 250,
    padMult = 1.0,
    repetitionPenalty = 1.0,
    repetitionPenaltyContext = 100,
    enableRecording = false,
    onTranscript,
    onComplete,
    onError,
    onAudioStats,
    onRecordingComplete,
  } = options
  
  // Build system prompt with initial topic
  const systemPrompt = initialTopic 
    ? `${baseSystemPrompt}\n\nIMPORTANT: Start the conversation by asking about: "${initialTopic}". Say something like "Let's talk about ${initialTopic}. Tell me about it." Keep your opening brief and warm.`
    : baseSystemPrompt

  // State
  const [state, setState] = useState<PersonaPlexState>('idle')
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [currentUserText, setCurrentUserText] = useState('')
  const [currentAiText, setCurrentAiText] = useState('')
  const [error, setError] = useState<Error | null>(null)
  const [audioStats, setAudioStats] = useState<AudioStats | null>(null)
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)

  // Refs
  const socketRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | ScriptProcessorNode | null>(null)
  const currentAiTextRef = useRef('')
  const currentUserTextRef = useRef('')
  const micDurationRef = useRef(0)
  const lastMessageTimeRef = useRef<number>(Date.now())
  const isConnectedRef = useRef(false)
  
  // Recording refs
  const stereoRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const stereoMergerRef = useRef<ChannelMergerNode | null>(null)
  const recordingDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)

  // Check browser support
  const isSupported = typeof window !== 'undefined' &&
    !!(window.AudioContext || (window as any).webkitAudioContext) &&
    !!navigator.mediaDevices?.getUserMedia

  // Build WebSocket URL with parameters
  const buildWebSocketUrl = useCallback(() => {
    const url = new URL(serverUrl)
    // Ensure /api/chat path is present
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/api/chat'
    }
    url.searchParams.set('text_prompt', systemPrompt)
    // Custom voices use their full filename; built-in voices append .pt
    const voiceFile = voice.includes('.') ? voice : `${voice}.pt`
    url.searchParams.set('voice_prompt', voiceFile)
    url.searchParams.set('text_temperature', textTemperature.toString())
    url.searchParams.set('text_topk', textTopk.toString())
    url.searchParams.set('audio_temperature', audioTemperature.toString())
    url.searchParams.set('audio_topk', audioTopk.toString())
    url.searchParams.set('pad_mult', padMult.toString())
    url.searchParams.set('repetition_penalty', repetitionPenalty.toString())
    url.searchParams.set('repetition_penalty_context', repetitionPenaltyContext.toString())
    url.searchParams.set('text_seed', Math.round(Math.random() * 1000000).toString())
    url.searchParams.set('audio_seed', Math.round(Math.random() * 1000000).toString())
    return url.toString()
  }, [serverUrl, systemPrompt, voice, textTemperature, textTopk, audioTemperature, audioTopk, padMult, repetitionPenalty, repetitionPenaltyContext])

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop stereo recording if active
    if (stereoRecorderRef.current && stereoRecorderRef.current.state === 'recording') {
      stereoRecorderRef.current.stop()
    }
    stereoRecorderRef.current = null
    
    // Disconnect stereo merger
    if (stereoMergerRef.current) {
      stereoMergerRef.current.disconnect()
      stereoMergerRef.current = null
    }
    
    if (recordingDestinationRef.current) {
      recordingDestinationRef.current = null
    }
    
    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Disconnect worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    isConnectedRef.current = false
  }, [])

  // Initialize AudioWorklet
  const initializeAudio = useCallback(async () => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    const audioContext = new AudioContextClass({ sampleRate: 24000 })
    audioContextRef.current = audioContext

    // Create worklet from inline code
    const blob = new Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' })
    const workletUrl = URL.createObjectURL(blob)

    try {
      await audioContext.audioWorklet.addModule(workletUrl)
    } finally {
      URL.revokeObjectURL(workletUrl)
    }

    // Create worklet node for playback
    const workletNode = new AudioWorkletNode(audioContext, 'personaplex-processor')
    workletNode.connect(audioContext.destination)
    workletNodeRef.current = workletNode

    // Handle stats from worklet
    workletNode.port.onmessage = (event) => {
      const stats: AudioStats = {
        playedAudioDuration: event.data.actualAudioPlayed || 0,
        missedAudioDuration: (event.data.totalAudioPlayed || 0) - (event.data.actualAudioPlayed || 0),
        totalAudioMessages: 0,
        delay: event.data.delay || 0,
        minPlaybackDelay: event.data.minDelay || 0,
        maxPlaybackDelay: event.data.maxDelay || 0,
      }
      setAudioStats(stats)
      onAudioStats?.(stats)
    }
    
    // Set up stereo recording if enabled
    // Left channel = AI audio (from worklet), Right channel = User mic
    if (enableRecording) {
      const stereoMerger = audioContext.createChannelMerger(2)
      const recordingDestination = audioContext.createMediaStreamDestination()
      
      // Connect AI audio (worklet output) to left channel (0)
      workletNode.connect(stereoMerger, 0, 0)
      
      // Connect merger to recording destination
      stereoMerger.connect(recordingDestination)
      
      stereoMergerRef.current = stereoMerger
      recordingDestinationRef.current = recordingDestination
      
      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      
      const recorder = new MediaRecorder(recordingDestination.stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      })
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data)
        }
      }
      
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: mimeType })
        setRecordingBlob(blob)
        setRecordingUrl(URL.createObjectURL(blob))
        setIsRecording(false)
        onRecordingComplete?.(blob)
        recordingChunksRef.current = []
      }
      
      stereoRecorderRef.current = recorder
    }

    return audioContext
  }, [onAudioStats, enableRecording, onRecordingComplete])

  // Start microphone recording
  const startMicrophoneRecording = useCallback(async (audioContext: AudioContext, ws: WebSocket) => {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 24000,
      }
    })
    mediaStreamRef.current = stream

    // Create source from microphone
    const source = audioContext.createMediaStreamSource(stream)

    // Use ScriptProcessor for mic capture (simpler than opus-recorder for now)
    // In production, you'd use opus-recorder for proper Opus encoding
    const bufferSize = 2048
    const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)

    processor.onaudioprocess = (event) => {
      if (!isConnectedRef.current || ws.readyState !== WebSocket.OPEN) return

      const inputData = event.inputBuffer.getChannelData(0)
      
      // Convert to Uint8Array for transmission
      const uint8Array = new Uint8Array(inputData.buffer)
      
      // Send audio message
      const message = encodeMessage({ type: 'audio', data: uint8Array })
      ws.send(message)
      
      micDurationRef.current += inputData.length / audioContext.sampleRate
    }

    source.connect(processor)
    processor.connect(audioContext.destination) // Required for onaudioprocess to fire
    recorderRef.current = processor
    
    // Connect mic to stereo recording (right channel = 1) if enabled
    if (enableRecording && stereoMergerRef.current) {
      source.connect(stereoMergerRef.current, 0, 1)
      
      // Start recording
      if (stereoRecorderRef.current && stereoRecorderRef.current.state === 'inactive') {
        stereoRecorderRef.current.start()
        setRecordingStartTime(Date.now())
        setIsRecording(true)
      }
    }

    setState('listening')
  }, [enableRecording])

  // Handle incoming WebSocket message
  const handleMessage = useCallback((data: ArrayBuffer) => {
    lastMessageTimeRef.current = Date.now()

    try {
      const message = decodeMessage(new Uint8Array(data))

      switch (message.type) {
        case 'handshake':
          console.log('PersonaPlex handshake received')
          isConnectedRef.current = true
          setState('connected')
          break

        case 'audio':
          // Forward audio to worklet for playback
          if (workletNodeRef.current && message.data instanceof Uint8Array) {
            // Convert to Float32Array (PersonaPlex sends 24kHz mono float32)
            const float32 = new Float32Array(
              message.data.buffer,
              message.data.byteOffset,
              message.data.length / 4
            )
            workletNodeRef.current.port.postMessage({
              frame: float32,
              micDuration: micDurationRef.current,
            })
            setState('aiSpeaking')
          }
          break

        case 'text':
          // AI transcript update
          const text = message.data as string
          currentAiTextRef.current += text
          setCurrentAiText(currentAiTextRef.current)
          
          // If this is a complete sentence (ends with punctuation), add to transcript
          if (/[.!?]$/.test(text.trim())) {
            const entry: TranscriptEntry = {
              role: 'assistant',
              text: currentAiTextRef.current,
              timestamp: Date.now(),
            }
            setTranscript(prev => [...prev, entry])
            
            // Call onTranscript callback
            if (currentUserTextRef.current) {
              onTranscript?.(currentUserTextRef.current, currentAiTextRef.current)
            }
            
            currentAiTextRef.current = ''
            setCurrentAiText('')
          }
          break

        case 'control':
          console.log('Control message:', message.action)
          if (message.action === 'endTurn') {
            setState('listening')
          }
          break

        case 'error':
          console.error('PersonaPlex error:', message.data)
          const err = new Error(message.data as string)
          setError(err)
          onError?.(err)
          break

        case 'ping':
          // Respond to ping with pong (ping back)
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(encodeMessage({ type: 'ping' }))
          }
          break
      }
    } catch (err) {
      console.error('Error handling message:', err)
    }
  }, [onTranscript, onError])

  // Start voice chat session
  const start = useCallback(async () => {
    if (!isSupported) {
      const err = new Error('PersonaPlex voice chat is not supported in this browser')
      setError(err)
      onError?.(err)
      return
    }

    setState('requesting')
    setError(null)
    setTranscript([])
    setCurrentUserText('')
    setCurrentAiText('')
    currentUserTextRef.current = ''
    currentAiTextRef.current = ''
    micDurationRef.current = 0

    try {
      // Initialize audio system
      setState('connecting')
      const audioContext = await initializeAudio()

      // Connect to PersonaPlex WebSocket
      const wsUrl = buildWebSocketUrl()
      console.log('Connecting to PersonaPlex:', wsUrl)

      const ws = new WebSocket(wsUrl)
      ws.binaryType = 'arraybuffer'
      socketRef.current = ws

      ws.onopen = async () => {
        console.log('WebSocket connected, sending handshake')
        // Send handshake
        ws.send(encodeMessage({ type: 'handshake', version: 0, model: 0 }))
        
        // Start microphone recording
        await startMicrophoneRecording(audioContext, ws)
      }

      ws.onmessage = (event) => {
        handleMessage(event.data)
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        const err = new Error('WebSocket connection error')
        setError(err)
        setState('error')
        onError?.(err)
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        if (isConnectedRef.current) {
          // Unexpected close
          setState('idle')
          cleanup()
        }
      }

      // Set up inactivity timeout (10 seconds)
      const checkInactivity = setInterval(() => {
        if (Date.now() - lastMessageTimeRef.current > 10000) {
          console.log('Closing due to inactivity')
          ws.close()
          clearInterval(checkInactivity)
        }
      }, 500)

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error('PersonaPlex start error:', error)
      setError(error)
      setState('error')
      onError?.(error)
      cleanup()
    }
  }, [isSupported, buildWebSocketUrl, initializeAudio, startMicrophoneRecording, handleMessage, onError, cleanup])

  // Stop the session gracefully
  const stop = useCallback(() => {
    // Save final transcript
    const finalTranscript = [...transcript]

    // Add any pending text
    if (currentUserTextRef.current) {
      finalTranscript.push({
        role: 'user',
        text: currentUserTextRef.current,
        timestamp: Date.now(),
      })
    }
    if (currentAiTextRef.current) {
      finalTranscript.push({
        role: 'assistant',
        text: currentAiTextRef.current,
        timestamp: Date.now(),
      })
    }

    if (finalTranscript.length > 0) {
      onComplete?.(finalTranscript)
    }

    cleanup()
    setState('idle')
    setCurrentUserText('')
    setCurrentAiText('')
  }, [transcript, onComplete, cleanup])

  // Abort immediately without saving
  const abort = useCallback(() => {
    cleanup()
    setState('idle')
    setCurrentUserText('')
    setCurrentAiText('')
    setTranscript([])
  }, [cleanup])

  // Send control message
  const sendControl = useCallback((action: ControlAction) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(encodeMessage({ type: 'control', action }))
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    state,
    transcript,
    currentUserText,
    currentAiText,
    error,
    isSupported,
    audioStats,
    // Recording
    isRecording,
    recordingBlob,
    recordingUrl,
    recordingStartTime,
    // Actions
    start,
    stop,
    abort,
    sendControl,
  }
}

// ============================================================================
// Voice metadata helper
// ============================================================================

export const PERSONAPLEX_VOICES: Record<PersonaPlexVoice, { name: string; category: string; gender: 'female' | 'male' }> = {
  // Custom YoursTruly voice
  'yourstruly-voice.mp3': { name: 'YoursTruly Voice', category: 'Custom', gender: 'female' },
  // Natural Female
  NATF0: { name: 'Natural Female 1', category: 'Natural', gender: 'female' },
  NATF1: { name: 'Natural Female 2', category: 'Natural', gender: 'female' },
  NATF2: { name: 'Natural Female 3', category: 'Natural', gender: 'female' },
  NATF3: { name: 'Natural Female 4', category: 'Natural', gender: 'female' },
  // Natural Male
  NATM0: { name: 'Natural Male 1', category: 'Natural', gender: 'male' },
  NATM1: { name: 'Natural Male 2', category: 'Natural', gender: 'male' },
  NATM2: { name: 'Natural Male 3', category: 'Natural', gender: 'male' },
  NATM3: { name: 'Natural Male 4', category: 'Natural', gender: 'male' },
  // Variety Female
  VARF0: { name: 'Variety Female 1', category: 'Variety', gender: 'female' },
  VARF1: { name: 'Variety Female 2', category: 'Variety', gender: 'female' },
  VARF2: { name: 'Variety Female 3', category: 'Variety', gender: 'female' },
  VARF3: { name: 'Variety Female 4', category: 'Variety', gender: 'female' },
  VARF4: { name: 'Variety Female 5', category: 'Variety', gender: 'female' },
  // Variety Male
  VARM0: { name: 'Variety Male 1', category: 'Variety', gender: 'male' },
  VARM1: { name: 'Variety Male 2', category: 'Variety', gender: 'male' },
  VARM2: { name: 'Variety Male 3', category: 'Variety', gender: 'male' },
  VARM3: { name: 'Variety Male 4', category: 'Variety', gender: 'male' },
  VARM4: { name: 'Variety Male 5', category: 'Variety', gender: 'male' },
}
