'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Mic, Square, SkipForward, Zap, Radio, Camera, RotateCcw } from 'lucide-react';

interface MediaRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number, type: 'video' | 'audio') => void;
  onLiveTranscript?: (text: string) => void;
  onSkip?: () => void;
  isLoading?: boolean;
  allowVideo?: boolean;  // Enable video option
  defaultMode?: 'video' | 'voice' | 'text';
}

type RecordingMode = 'video' | 'voice';
type TranscriptionMode = 'live' | 'recorded';

export function MediaRecorder({ 
  onRecordingComplete, 
  onLiveTranscript,
  onSkip, 
  isLoading,
  allowVideo = true,
  defaultMode = 'voice'
}: MediaRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [recordingMode, setRecordingMode] = useState<RecordingMode>(defaultMode === 'video' ? 'video' : 'voice');
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>('recorded');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isDeepgramAvailable, setIsDeepgramAvailable] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  
  const mediaRecorderRef = useRef<globalThis.MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const finalTranscriptRef = useRef<string>('');

  // Check if Deepgram is available
  useEffect(() => {
    fetch('/api/realtime/transcribe-session', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.clientSecret) {
          setIsDeepgramAvailable(true);
        }
      })
      .catch(() => {});
  }, []);

  // Setup camera preview when video mode is selected
  useEffect(() => {
    if (recordingMode === 'video' && !isRecording) {
      setupCameraPreview();
    } else {
      stopCameraPreview();
    }
    
    return () => {
      stopCameraPreview();
    };
  }, [recordingMode]);

  const setupCameraPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      
      streamRef.current = stream;
      setPermissionState('granted');
      setCameraReady(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera preview error:', err);
      setPermissionState('denied');
      setError('Camera access denied. Try voice mode instead.');
    }
  };

  const stopCameraPreview = () => {
    if (streamRef.current && !isRecording) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setCameraReady(false);
    }
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

  // Start video recording
  const startVideoRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      // Use existing stream or get new one
      let stream = streamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
        streamRef.current = stream;
        setPermissionState('granted');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }

      // Setup audio analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = globalThis.MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : globalThis.MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const mediaRecorder = new globalThis.MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        // Keep stream for preview, don't stop it
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        onRecordingComplete(videoBlob, duration, 'video');
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) stopRecording();
          return prev + 1;
        });
      }, 1000);

      visualizeAudio();

    } catch (err) {
      console.error('Error starting video recording:', err);
      handleRecordingError(err);
    }
  }, [onRecordingComplete, visualizeAudio]);

  // Start voice recording (same as original VoiceRecorder)
  const startVoiceRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

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
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = globalThis.MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : globalThis.MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const mediaRecorder = new globalThis.MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        stream.getTracks().forEach(track => track.stop());
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        onRecordingComplete(audioBlob, duration, 'audio');
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) stopRecording();
          return prev + 1;
        });
      }, 1000);

      visualizeAudio();

    } catch (err) {
      console.error('Error starting voice recording:', err);
      handleRecordingError(err);
    }
  }, [onRecordingComplete, visualizeAudio]);

  const handleRecordingError = (err: any) => {
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') {
        setError('Permission denied. Allow camera/microphone access.');
        setPermissionState('denied');
      } else if (err.name === 'NotFoundError') {
        setError('No camera/microphone found.');
      } else {
        setError('Could not access media devices.');
      }
    } else {
      setError('An unexpected error occurred.');
    }
  };

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

    setTimeout(() => {
      if (recordingMode === 'video') {
        startVideoRecording();
      } else {
        startVoiceRecording();
      }
    }, 3000);
  }, [recordingMode, startVideoRecording, startVoiceRecording]);

  // Start recording
  const startRecording = useCallback(() => {
    startCountdown();
  }, [startCountdown]);

  // Stop recording
  const stopRecording = useCallback(() => {
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // For voice mode, stop the stream
    if (recordingMode === 'voice' && streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [recordingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
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
        } else if (countdown === null) {
          startRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, isLoading, startRecording, stopRecording, countdown]);

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
      <div className="media-recorder-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="media-recorder-spinner"
        >
          <div className="media-recorder-spinner-inner" />
        </motion.div>
        <p>Preparing...</p>
      </div>
    );
  }

  return (
    <div className="media-recorder">
      {/* Mode toggle - Video / Voice */}
      {allowVideo && !isRecording && (
        <div className="media-mode-toggle">
          <button
            onClick={() => setRecordingMode('video')}
            className={`media-mode-btn ${recordingMode === 'video' ? 'active' : ''}`}
          >
            <Video size={16} />
            Video
          </button>
          <button
            onClick={() => setRecordingMode('voice')}
            className={`media-mode-btn ${recordingMode === 'voice' ? 'active' : ''}`}
          >
            <Mic size={16} />
            Voice
          </button>
        </div>
      )}

      {/* Video Preview */}
      {recordingMode === 'video' && (
        <div className={`video-preview-container ${isRecording ? 'recording' : ''}`}>
          <video
            ref={videoRef}
            className="video-preview"
            playsInline
            muted
          />
          {isRecording && (
            <div className="video-recording-indicator">
              <span className="recording-dot" />
              REC {formatTime(recordingTime)}
            </div>
          )}
          {!cameraReady && !isRecording && (
            <div className="video-preview-placeholder">
              <Camera size={48} />
              <p>Setting up camera...</p>
            </div>
          )}
        </div>
      )}

      {/* Voice Waveform */}
      {recordingMode === 'voice' && isRecording && (
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

      {/* Main record/stop button */}
      <div className="media-recorder-main">
        <motion.button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading || countdown !== null || (recordingMode === 'video' && !cameraReady && !isRecording)}
          whileHover={{ scale: countdown !== null ? 1 : 1.05 }}
          whileTap={{ scale: countdown !== null ? 1 : 0.95 }}
          className={`media-recorder-button ${isRecording ? 'recording' : ''}`}
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
                key="record"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                {recordingMode === 'video' ? <Video size={40} /> : <Mic size={40} />}
              </motion.div>
            )}
          </AnimatePresence>

          {isRecording && (
            <motion.div
              className="media-recorder-pulse"
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
          className="media-recorder-timer"
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
            `Tap to record ${recordingMode}`
          )}
        </motion.div>
      </div>

      {/* Instructions */}
      <p className="media-recorder-hint">
        {isRecording 
          ? `Recording ${recordingMode}... tap stop when done`
          : permissionState === 'denied'
          ? 'Enable camera/microphone in browser settings'
          : recordingMode === 'video'
          ? 'Record a video response'
          : 'Record a voice response'}
      </p>

      {/* Skip button */}
      {onSkip && (
        <button
          onClick={onSkip}
          className="media-recorder-skip"
          disabled={isRecording}
        >
          <SkipForward size={14} />
          Skip this question
        </button>
      )}

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="media-recorder-error"
            role="alert"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcut hint */}
      <div className="media-recorder-shortcuts">
        <kbd>Space</kbd> to {isRecording ? 'stop' : 'start'}
      </div>
    </div>
  );
}
