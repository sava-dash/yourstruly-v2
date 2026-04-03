'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, SkipForward, Zap, Radio } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onLiveTranscript?: (text: string) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

type TranscriptionMode = 'live' | 'recorded';

export function VoiceRecorder({ 
  onRecordingComplete, 
  onLiveTranscript,
  onSkip, 
  isLoading 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [mode, setMode] = useState<TranscriptionMode>('live'); // Default to live with Deepgram
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isDeepgramAvailable, setIsDeepgramAvailable] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const finalTranscriptRef = useRef<string>('');

  // Check if Deepgram is available
  useEffect(() => {
    fetch('/api/deepgram/token')
      .then(res => res.json())
      .then(data => {
        if (data.apiKey) {
          setIsDeepgramAvailable(true);
        } else {
          setMode('recorded');
        }
      })
      .catch(() => {
        setMode('recorded');
      });
  }, []);

  // Clear error when mode changes
  const handleModeChange = (newMode: TranscriptionMode) => {
    setMode(newMode);
    setError(null);
    setLiveTranscript('');
  };

  // Visualize audio waveform
  const visualizeAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(average / 255);

    animationFrameRef.current = requestAnimationFrame(visualizeAudio);
  }, []);

  // Convert Float32Array to Int16Array for Deepgram
  const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  // Start live recognition with Deepgram
  const startDeepgramLive = useCallback(async () => {
    try {
      setError(null);
      setLiveTranscript('');
      
      // Clear any existing timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Get Deepgram credentials
      const tokenRes = await fetch('/api/deepgram/token');
      const { apiKey, wsUrl } = await tokenRes.json();
      
      if (!apiKey) {
        throw new Error('Deepgram not configured');
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      
      streamRef.current = stream;
      setPermissionState('granted');

      // Set up audio context for visualization and processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      
      // Analyser for visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Connect to Deepgram WebSocket with API key in URL
      const dgUrl = `wss://api.deepgram.com/v1/listen?token=${apiKey}&model=nova-2&language=en-US&smart_format=true&interim_results=true&endpointing=300&punctuate=true`;
      const ws = new WebSocket(dgUrl);
      websocketRef.current = ws;

      finalTranscriptRef.current = '';

      ws.onopen = () => {
        console.log('Deepgram WebSocket connected, ready to send audio');

        // Create processor to send audio data
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        
        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = floatTo16BitPCM(inputData);
            ws.send(pcmData);
          }
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle transcription results
          if (data.type === 'Results') {
            const alt = data.channel?.alternatives?.[0];
            if (alt && alt.transcript) {
              const transcript = alt.transcript;
              
              if (data.is_final) {
                finalTranscriptRef.current += transcript + ' ';
                console.log('Final transcript:', finalTranscriptRef.current.trim());
              }
              // Always show the current state (final + interim)
              const display = data.is_final 
                ? finalTranscriptRef.current.trim() 
                : (finalTranscriptRef.current + transcript).trim();
              setLiveTranscript(display);
            }
          } else if (data.type === 'Metadata') {
            console.log('Deepgram ready:', data);
          } else if (data.type === 'Error') {
            console.error('Deepgram error:', data);
            setError('Transcription error. Try Record mode.');
          }
        } catch (err) {
          console.error('Error parsing Deepgram response:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Deepgram WebSocket error:', err);
        // Auto-switch to Record mode
        setMode('recorded');
        setError(null);
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
        // Start recorded mode instead
        setTimeout(() => startRecordedMode(), 100);
      };

      ws.onclose = () => {
        console.log('Deepgram disconnected, final transcript:', finalTranscriptRef.current.trim());
      };

      setIsRecording(true);
      startTimeRef.current = Date.now();
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) {
            stopRecording();
          }
          return prev + 1;
        });
      }, 1000);

      // Start visualization
      visualizeAudio();

    } catch (err) {
      console.error('Error starting Deepgram:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied.');
        setPermissionState('denied');
      } else {
        setError('Could not start live transcription. Try Record mode.');
        setMode('recorded');
      }
    }
  }, [onLiveTranscript, visualizeAudio]);

  // Start recorded mode (MediaRecorder + Gemini)
  const startRecordedMode = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      
      // Clear any existing timer (prevents double-speed timer on fallback)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      setPermissionState('granted');

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        stream.getTracks().forEach(track => track.stop());
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        onRecordingComplete(audioBlob, duration);
      };

      mediaRecorder.onerror = () => {
        setError('Recording error. Please try again.');
        setIsRecording(false);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) {
            stopRecording();
          }
          return prev + 1;
        });
      }, 1000);

      visualizeAudio();

    } catch (err) {
      console.error('Error starting recording:', err);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied.');
          setPermissionState('denied');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found.');
        } else {
          setError('Could not access microphone.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
    }
  }, [onRecordingComplete, visualizeAudio]);

  // Countdown before recording starts
  const startCountdown = useCallback(() => {
    setCountdown(3);
    
    const countInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countInterval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    // Start actual recording after countdown
    setTimeout(() => {
      if (mode === 'live' && isDeepgramAvailable) {
        startDeepgramLive();
      } else {
        startRecordedMode();
      }
    }, 3000);
  }, [mode, isDeepgramAvailable, startDeepgramLive, startRecordedMode]);

  // Start recording based on mode
  const startRecording = useCallback(async () => {
    // Start countdown first
    startCountdown();
  }, [startCountdown]);

  // Stop recording
  const stopRecording = useCallback(() => {
    // Get the transcript before cleaning up
    const transcriptToSubmit = finalTranscriptRef.current.trim() || liveTranscript.trim();
    console.log('Stopping recording, transcript:', transcriptToSubmit);

    // Close Deepgram WebSocket
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }

    // Close audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop MediaRecorder (for recorded mode)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // Don't return early - MediaRecorder.onstop will handle the callback
    }
    
    setIsRecording(false);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // For live mode, submit the transcript immediately
    if (mode === 'live' && transcriptToSubmit && onLiveTranscript) {
      console.log('Submitting live transcript:', transcriptToSubmit);
      onLiveTranscript(transcriptToSubmit);
      // Clear the refs
      finalTranscriptRef.current = '';
      setLiveTranscript('');
    }
  }, [mode, liveTranscript, onLiveTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.code === 'Space' && !isLoading) {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, isLoading, startRecording, stopRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const waveformBars = Array.from({ length: 20 }, (_, i) => {
    const baseHeight = 20;
    const variation = audioLevel * 60;
    const randomOffset = Math.sin(Date.now() / 200 + i) * 10;
    return Math.max(8, baseHeight + variation + randomOffset);
  });

  if (isLoading) {
    return (
      <div className="voice-recorder-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="voice-recorder-spinner"
        >
          <div className="voice-recorder-spinner-inner" />
        </motion.div>
        <p>Preparing next question...</p>
      </div>
    );
  }

  return (
    <div className="voice-recorder">
      {/* Mode toggle */}
      {isDeepgramAvailable && !isRecording && (
        <div className="voice-mode-toggle">
          <button
            onClick={() => handleModeChange('live')}
            className={`voice-mode-btn ${mode === 'live' ? 'active' : ''}`}
            title="Real-time transcription with Deepgram"
          >
            <Zap size={14} />
            Live
          </button>
          <button
            onClick={() => handleModeChange('recorded')}
            className={`voice-mode-btn ${mode === 'recorded' ? 'active' : ''}`}
            title="Record then transcribe with AI"
          >
            <Radio size={14} />
            Record
          </button>
        </div>
      )}

      {/* Countdown Animation */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="countdown-container"
          >
            <div className="countdown-ring" />
            <div className="countdown-ring countdown-ring-delayed" />
            <motion.span 
              className="countdown-number"
              key={countdown}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.3 }}
            >
              {countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waveform visualization */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="voice-recorder-waveform"
          >
            {waveformBars.map((height, i) => (
              <motion.div
                key={i}
                className="voice-recorder-bar"
                animate={{ height }}
                transition={{ duration: 0.1 }}
                style={{
                  backgroundColor: `hsl(${140 + audioLevel * 40}, 70%, ${40 + audioLevel * 20}%)`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live transcript preview */}
      {mode === 'live' && isRecording && liveTranscript && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="voice-live-preview"
        >
          {liveTranscript}
          <span className="voice-live-cursor" />
        </motion.div>
      )}

      {/* Main microphone button */}
      <div className="voice-recorder-main">
        <motion.button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading || countdown !== null}
          whileHover={{ scale: countdown !== null ? 1 : 1.05 }}
          whileTap={{ scale: countdown !== null ? 1 : 0.95 }}
          className={`voice-recorder-button ${isRecording ? 'recording' : ''} ${countdown !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <AnimatePresence mode="wait">
            {isRecording ? (
              <motion.div
                key="stop"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Square size={32} fill="currentColor" />
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Mic size={40} />
              </motion.div>
            )}
          </AnimatePresence>

          {isRecording && (
            <motion.div
              className="voice-recorder-pulse"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </motion.button>

        <motion.div
          className="voice-recorder-timer"
          animate={{ opacity: isRecording ? 1 : 0.6 }}
        >
          {countdown !== null ? (
            <span className="text-[#2D5A3D] font-medium">Get ready...</span>
          ) : isRecording ? (
            <>
              <span className="voice-recorder-timer-dot" />
              {formatTime(recordingTime)}
            </>
          ) : (
            'Tap to speak'
          )}
        </motion.div>
      </div>

      {/* Instructions */}
      <p className="voice-recorder-hint">
        {isRecording 
          ? mode === 'live' 
            ? 'Speaking... see your words appear live' 
            : 'Recording... tap stop when done'
          : permissionState === 'denied'
          ? 'Enable microphone in browser settings'
          : mode === 'live'
          ? 'Live: See your words as you speak (Deepgram)'
          : 'Record: AI transcribes after you finish'}
      </p>

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="voice-recorder-skip"
        disabled={isRecording}
      >
        <SkipForward size={14} />
        Skip this question
      </button>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="voice-recorder-error"
            role="alert"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcut hint */}
      <div className="voice-recorder-shortcuts">
        <kbd>Space</kbd> to {isRecording ? 'stop' : 'start'}
      </div>
    </div>
  );
}
