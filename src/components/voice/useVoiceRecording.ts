'use client'

/* global SpeechRecognition types for browsers */
type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : any
type SpeechRecognitionInstance = InstanceType<SpeechRecognitionType> & {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

import { useCallback, useRef, useState } from 'react'

interface UseVoiceRecordingReturn {
  startRecording: () => Promise<void>
  stopRecording: () => void
  isRecording: boolean
  audioBlob: Blob | null
  transcript: string | null
  error: string | null
}

const SILENCE_THRESHOLD = 0.01
const SILENCE_DURATION_MS = 3000
const ANALYSER_FFT_SIZE = 2048
const SILENCE_CHECK_INTERVAL_MS = 200

/**
 * Hook that handles audio recording with silence detection.
 * Uses MediaRecorder as primary, falls back to Web Speech API.
 */
export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silenceCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const usingSpeechAPIRef = useRef(false)

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (silenceCheckRef.current) {
      clearInterval(silenceCheckRef.current)
      silenceCheckRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.abort()
      speechRecognitionRef.current = null
    }
    mediaRecorderRef.current = null
    analyserRef.current = null
    chunksRef.current = []
  }, [])

  const stopRecording = useCallback(() => {
    if (usingSpeechAPIRef.current && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop()
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }, [])

  const startSilenceDetection = useCallback(
    (analyser: AnalyserNode) => {
      const dataArray = new Float32Array(analyser.fftSize)
      let silentSince: number | null = null

      silenceCheckRef.current = setInterval(() => {
        analyser.getFloatTimeDomainData(dataArray)

        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i]
        }
        const rms = Math.sqrt(sum / dataArray.length)

        if (rms < SILENCE_THRESHOLD) {
          if (silentSince === null) {
            silentSince = Date.now()
          } else if (Date.now() - silentSince >= SILENCE_DURATION_MS) {
            stopRecording()
          }
        } else {
          silentSince = null
        }
      }, SILENCE_CHECK_INTERVAL_MS)
    },
    [stopRecording]
  )

  const startWithMediaRecorder = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    const audioContext = new AudioContext()
    audioContextRef.current = audioContext
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = ANALYSER_FFT_SIZE
    source.connect(analyser)
    analyserRef.current = analyser

    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      setAudioBlob(blob)
      setIsRecording(false)
      cleanup()
    }

    recorder.onerror = () => {
      setError('Recording failed')
      setIsRecording(false)
      cleanup()
    }

    recorder.start(250)
    setIsRecording(true)
    setAudioBlob(null)
    setTranscript(null)
    setError(null)

    startSilenceDetection(analyser)
  }, [cleanup, startSilenceDetection])

  const startWithSpeechAPI = useCallback(() => {
    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null

    if (!SpeechRecognitionAPI) {
      throw new Error('No speech recognition available')
    }

    usingSpeechAPIRef.current = true
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    speechRecognitionRef.current = recognition

    let finalTranscript = ''

    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      setTranscript(finalTranscript + interim)
    }

    recognition.onend = () => {
      setTranscript(finalTranscript)
      setIsRecording(false)
      usingSpeechAPIRef.current = false
    }

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`)
      }
      setIsRecording(false)
      usingSpeechAPIRef.current = false
    }

    recognition.start()
    setIsRecording(true)
    setAudioBlob(null)
    setTranscript(null)
    setError(null)
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)

    const hasMediaRecorder =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof MediaRecorder !== 'undefined'

    if (hasMediaRecorder) {
      try {
        await startWithMediaRecorder()
        return
      } catch {
        // Fall through to Speech API
      }
    }

    try {
      startWithSpeechAPI()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No recording capability available'
      )
    }
  }, [startWithMediaRecorder, startWithSpeechAPI])

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioBlob,
    transcript,
    error,
  }
}
