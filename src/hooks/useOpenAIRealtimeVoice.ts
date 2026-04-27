/**
 * useOpenAIRealtimeVoice — round-trip voice agent over WebRTC.
 *
 * Drop-in replacement for the old usePersonaPlexVoice hook. Handles:
 *   - minting an ephemeral session via POST /api/realtime/session
 *   - WebRTC handshake against OpenAI Realtime
 *   - bidirectional audio (mic out → model audio in via <audio>)
 *   - transcript stream from the data channel
 *   - optional stereo recording (left = AI, right = user) so call sites can
 *     keep using clip-stitcher to slice per-exchange WAVs.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TranscriptEntry, VoiceChatState } from '@/types/voice';

export type RealtimeVoice =
  | 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';

export interface UseOpenAIRealtimeVoiceOptions {
  /** Persona system prompt — passed as `instructions` to the session. */
  systemPrompt: string;
  /** OpenAI voice id. */
  voice?: RealtimeVoice;
  /** Optional opener spoken by the model on connect. */
  initialTopic?: string;
  /** Realtime model id; defaults to gpt-4o-realtime-preview. */
  model?: string;
  /**
   * Capture a stereo MediaRecorder of the conversation.
   *   left  channel = AI voice
   *   right channel = user voice
   * Surfaces as `recordingBlob` once the session ends.
   */
  enableRecording?: boolean;
  /** Fired on every completed transcript pair. */
  onTranscript?: (userText: string, aiText: string) => void;
  /** Fired when the session ends with the full transcript. */
  onComplete?: (transcript: TranscriptEntry[]) => void;
  /** Fired on any unrecoverable error. */
  onError?: (err: Error) => void;
}

export interface UseOpenAIRealtimeVoiceReturn {
  state: VoiceChatState;
  transcript: TranscriptEntry[];
  currentUserText: string;
  currentAiText: string;
  error: Error | null;
  isSupported: boolean | null;
  /** webm/opus stereo blob. Available after stop()/abort() if enableRecording. */
  recordingBlob: Blob | null;
  /** Date.now() captured the moment the recorder started. */
  recordingStartTime: number | null;
  start: () => Promise<void>;
  stop: () => void;
  abort: () => void;
}

// Warm female American English; kept in sync with /api/realtime/session route.
const DEFAULT_VOICE: RealtimeVoice = 'coral';
const RECORDER_MIME = 'audio/webm';

export function useOpenAIRealtimeVoice({
  systemPrompt,
  voice = DEFAULT_VOICE,
  initialTopic,
  model,
  enableRecording = false,
  onTranscript,
  onComplete,
  onError,
}: UseOpenAIRealtimeVoiceOptions): UseOpenAIRealtimeVoiceReturn {
  const [state, setState] = useState<VoiceChatState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentUserText, setCurrentUserText] = useState('');
  const [currentAiText, setCurrentAiText] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  // Recording graph
  const audioContextRef = useRef<AudioContext | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  // We accumulate per-item deltas keyed by item_id, then flush on .done /
  // .completed. Avoids interleaving stream order.
  const userBuffersRef = useRef<Record<string, string>>({});
  const aiBuffersRef = useRef<Record<string, string>>({});

  // Browser support: needs RTCPeerConnection + getUserMedia + WebSocket.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported =
      typeof RTCPeerConnection !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof WebSocket !== 'undefined';
    setIsSupported(supported);
  }, []);

  // Stop the recorder and finalize the blob synchronously. Returns true if a
  // new blob was produced.
  const finalizeRecording = useCallback((): boolean => {
    const recorder = recorderRef.current;
    if (!recorder) return false;
    const wasRecording = recorder.state !== 'inactive';
    if (wasRecording) {
      try { recorder.stop(); } catch {}
    }
    // recorder.onstop will collect the blob asynchronously, but we've already
    // pushed the chunks via ondataavailable; if onstop hasn't fired yet, build
    // the blob from current chunks now.
    if (recorderChunksRef.current.length > 0 && !recordingBlob) {
      const blob = new Blob(recorderChunksRef.current, { type: RECORDER_MIME });
      setRecordingBlob(blob);
    }
    return wasRecording;
  }, [recordingBlob]);

  const teardown = useCallback(() => {
    finalizeRecording();
    try { dcRef.current?.close(); } catch {}
    dcRef.current = null;
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
      audioElRef.current.remove();
      audioElRef.current = null;
    }
    try { mergerRef.current?.disconnect(); } catch {}
    mergerRef.current = null;
    try { audioContextRef.current?.close(); } catch {}
    audioContextRef.current = null;
    recorderRef.current = null;
    userBuffersRef.current = {};
    aiBuffersRef.current = {};
  }, [finalizeRecording]);

  const fail = useCallback((message: string) => {
    const e = new Error(message);
    setError(e);
    setState('error');
    onError?.(e);
    teardown();
  }, [onError, teardown]);

  const handleEvent = useCallback((evt: { type: string; [k: string]: unknown }) => {
    switch (evt.type) {
      case 'session.created':
      case 'session.updated':
        // Connected — request the model speak first if a topic was provided.
        if (initialTopic && state !== 'aiSpeaking') {
          dcRef.current?.send(JSON.stringify({
            type: 'response.create',
            response: {
              modalities: ['audio', 'text'],
              instructions: `Open the conversation by addressing this topic: ${initialTopic}`,
            },
          }));
        }
        setState('listening');
        break;

      case 'input_audio_buffer.speech_started':
        setState('listening');
        break;

      case 'response.created':
        setState('thinking');
        break;

      case 'response.audio.delta':
      case 'response.output_audio.delta':
        setState('aiSpeaking');
        break;

      case 'conversation.item.input_audio_transcription.delta': {
        const itemId = String(evt.item_id ?? '');
        const delta = String(evt.delta ?? '');
        if (!itemId || !delta) break;
        userBuffersRef.current[itemId] = (userBuffersRef.current[itemId] || '') + delta;
        setCurrentUserText(userBuffersRef.current[itemId]);
        break;
      }

      case 'conversation.item.input_audio_transcription.completed': {
        const itemId = String(evt.item_id ?? '');
        const text = String(evt.transcript ?? userBuffersRef.current[itemId] ?? '').trim();
        if (text) {
          setTranscript((prev) => [...prev, { role: 'user', text, timestamp: Date.now() }]);
        }
        setCurrentUserText('');
        delete userBuffersRef.current[itemId];
        break;
      }

      case 'response.audio_transcript.delta':
      case 'response.output_audio_transcript.delta':
      case 'response.text.delta':
      case 'response.output_text.delta': {
        const itemId = String(evt.item_id ?? evt.response_id ?? 'current');
        const delta = String(evt.delta ?? '');
        if (!delta) break;
        aiBuffersRef.current[itemId] = (aiBuffersRef.current[itemId] || '') + delta;
        setCurrentAiText(aiBuffersRef.current[itemId]);
        break;
      }

      case 'response.audio_transcript.done':
      case 'response.output_audio_transcript.done':
      case 'response.text.done':
      case 'response.output_text.done': {
        const itemId = String(evt.item_id ?? evt.response_id ?? 'current');
        const text = String(evt.transcript ?? evt.text ?? aiBuffersRef.current[itemId] ?? '').trim();
        if (text) {
          setTranscript((prev) => {
            const next = [...prev, { role: 'assistant' as const, text, timestamp: Date.now() }];
            const lastUser = [...next].reverse().find((t) => t.role === 'user')?.text || '';
            onTranscript?.(lastUser, text);
            return next;
          });
        }
        setCurrentAiText('');
        delete aiBuffersRef.current[itemId];
        break;
      }

      case 'response.done':
        setState('listening');
        break;

      case 'error':
        fail(
          (evt.error as { message?: string } | undefined)?.message ||
          'Realtime error',
        );
        break;
    }
  }, [fail, initialTopic, onTranscript, state]);

  const start = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return;
    setError(null);
    setTranscript([]);
    setCurrentUserText('');
    setCurrentAiText('');
    setRecordingBlob(null);
    setRecordingStartTime(null);
    recorderChunksRef.current = [];
    setState('requesting');

    try {
      // 1. Mint ephemeral session (server keeps the real API key).
      const sessionRes = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructions: systemPrompt,
          voice,
          ...(model ? { model } : {}),
        }),
      });
      if (!sessionRes.ok) {
        const detail = await sessionRes.text().catch(() => '');
        throw new Error(`Could not mint session: ${sessionRes.status} ${detail.slice(0, 120)}`);
      }
      const { clientSecret, model: resolvedModel } = await sessionRes.json();
      if (!clientSecret) throw new Error('Realtime session missing client_secret');

      // 2. Mic.
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = mic;

      // 3. Peer connection.
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));

      // 4. Stereo recording graph (optional).
      // Build the merger up front so we can wire the mic side immediately;
      // the AI side gets connected once pc.ontrack fires.
      let merger: ChannelMergerNode | null = null;
      let audioContext: AudioContext | null = null;
      if (enableRecording && typeof MediaRecorder !== 'undefined') {
        try {
          audioContext = new AudioContext();
          audioContextRef.current = audioContext;
          merger = audioContext.createChannelMerger(2);
          mergerRef.current = merger;

          const dest = audioContext.createMediaStreamDestination();
          merger.connect(dest);

          // Mic → right channel (1).
          const micSource = audioContext.createMediaStreamSource(mic);
          micSource.connect(merger, 0, 1);

          const recorder = new MediaRecorder(dest.stream, { mimeType: RECORDER_MIME });
          recorderRef.current = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recorderChunksRef.current.push(e.data);
          };
          recorder.onstop = () => {
            const blob = new Blob(recorderChunksRef.current, { type: RECORDER_MIME });
            setRecordingBlob(blob);
          };
          recorder.start(1000); // flush a chunk every second
          const startedAt = Date.now();
          setRecordingStartTime(startedAt);
        } catch (recErr) {
          console.warn('[useOpenAIRealtimeVoice] recording disabled:', recErr);
          merger = null;
          audioContext = null;
          mergerRef.current = null;
          audioContextRef.current = null;
          recorderRef.current = null;
        }
      }

      // 5. Remote audio sink.
      // Always assign srcObject to a hidden <audio> — Chrome needs this to
      // wake the WebRTC audio pipeline even when we route playback through
      // Web Audio for recording.
      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      pc.ontrack = (e) => {
        const [remote] = e.streams;
        if (!remote) return;

        if (audioContext && merger) {
          // Web Audio path: tap remote for recording AND playback. Mute the
          // <audio> element so we don't double-play; we still need to
          // srcObject-assign it to keep Chrome's pipeline alive.
          audioEl.srcObject = remote;
          audioEl.muted = true;
          void audioEl.play().catch(() => {});

          const aiSource = audioContext.createMediaStreamSource(remote);
          aiSource.connect(audioContext.destination);
          aiSource.connect(merger, 0, 0); // AI → left channel (0)
        } else {
          // Plain playback path (no recording).
          audioEl.srcObject = remote;
          audioEl.muted = false;
        }
      };

      // 6. Data channel for events.
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.onopen = () => {
        // Push the persona again on open in case the session-create one was
        // overwritten by a stale prior session on the same browser.
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: systemPrompt,
            voice,
            input_audio_transcription: { model: 'gpt-4o-transcribe' },
          },
        }));
      };
      dc.onmessage = (e) => {
        try { handleEvent(JSON.parse(e.data)); } catch {}
      };

      setState('connecting');

      // 7. SDP exchange.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(resolvedModel)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            'Content-Type': 'application/sdp',
            'OpenAI-Beta': 'realtime=v1',
          },
          body: offer.sdp,
        },
      );
      if (!sdpRes.ok) {
        const detail = await sdpRes.text().catch(() => '');
        throw new Error(`SDP exchange failed: ${sdpRes.status} ${detail.slice(0, 200)}`);
      }
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Could not start voice session');
    }
  }, [state, systemPrompt, voice, model, enableRecording, fail, handleEvent]);

  const stop = useCallback(() => {
    // Stop the recorder first so its onstop has a chance to fire before we
    // throw out the audio graph in teardown(). We then call onComplete with
    // the transcript; callers can read recordingBlob from this hook on the
    // next render.
    finalizeRecording();
    onComplete?.(transcript);
    setState('completed');
    teardown();
  }, [finalizeRecording, onComplete, transcript, teardown]);

  const abort = useCallback(() => {
    setState('idle');
    teardown();
  }, [teardown]);

  // Always tear down on unmount.
  useEffect(() => () => teardown(), [teardown]);

  return {
    state,
    transcript,
    currentUserText,
    currentAiText,
    error,
    isSupported,
    recordingBlob,
    recordingStartTime,
    start,
    stop,
    abort,
  };
}
