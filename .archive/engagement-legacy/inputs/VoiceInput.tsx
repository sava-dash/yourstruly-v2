'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Play, Pause, RotateCcw, Check, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onSubmit: (audioUrl: string, transcription: string) => void;
  onCancel: () => void;
  disabled?: boolean;
  maxDuration?: number; // seconds
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'playing' | 'transcribing';

export function VoiceInput({
  onSubmit,
  onCancel,
  disabled = false,
  maxDuration = 120,
}: VoiceInputProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('recorded');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= maxDuration) {
            stopRecording();
            return d;
          }
          return d + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
      setState('playing');
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState('recorded');
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscription(null);
    setDuration(0);
    setState('idle');
  };

  const handleSubmit = async () => {
    if (!audioUrl) return;

    setState('transcribing');

    try {
      // Get the blob from the URL
      const response = await fetch(audioUrl);
      const blob = await response.blob();

      // Upload to storage and get transcription
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const uploadResponse = await fetch('/api/engagement/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to transcribe');
      }

      const { url, transcription: text } = await uploadResponse.json();
      
      setTranscription(text);
      onSubmit(url, text);

    } catch (err) {
      console.error('Failed to submit:', err);
      setError('Failed to process recording. Please try again.');
      setState('recorded');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-input">
      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* Audio element for playback */}
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl}
          onEnded={() => setState('recorded')}
        />
      )}

      {/* Recording visualization */}
      <div className="recording-display">
        {state === 'recording' && (
          <motion.div 
            className="recording-indicator"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <div className="pulse-ring" />
            <Mic className="mic-icon recording" size={32} />
          </motion.div>
        )}

        {state === 'recorded' && (
          <div className="playback-indicator">
            <Mic className="mic-icon" size={32} />
          </div>
        )}

        {state === 'playing' && (
          <motion.div 
            className="playing-indicator"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <Play className="play-icon" size={32} />
          </motion.div>
        )}

        {state === 'transcribing' && (
          <div className="transcribing-indicator">
            <Loader2 className="spinner" size={32} />
            <span>Transcribing...</span>
          </div>
        )}

        {state === 'idle' && (
          <div className="idle-indicator">
            <Mic className="mic-icon" size={32} />
            <span>Tap to record</span>
          </div>
        )}

        {/* Duration */}
        {(state === 'recording' || state === 'recorded' || state === 'playing') && (
          <div className="duration">{formatTime(duration)}</div>
        )}
      </div>

      {/* Controls */}
      <div className="controls">
        {state === 'idle' && (
          <button 
            className="record-btn"
            onClick={startRecording}
            disabled={disabled}
          >
            <Mic size={20} />
            <span>Start Recording</span>
          </button>
        )}

        {state === 'recording' && (
          <button 
            className="stop-btn"
            onClick={stopRecording}
          >
            <Square size={20} />
            <span>Stop</span>
          </button>
        )}

        {(state === 'recorded' || state === 'playing') && (
          <>
            <button 
              className="play-btn"
              onClick={state === 'playing' ? pauseAudio : playAudio}
            >
              {state === 'playing' ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button 
              className="reset-btn"
              onClick={resetRecording}
            >
              <RotateCcw size={20} />
              <span>Redo</span>
            </button>
            <button 
              className="submit-btn"
              onClick={handleSubmit}
              disabled={disabled}
            >
              <Check size={20} />
              <span>Save</span>
            </button>
          </>
        )}
      </div>

      {/* Cancel */}
      <button className="cancel-link" onClick={onCancel}>
        Cancel
      </button>

      <style jsx>{`
        .voice-input {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .error-message {
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #fca5a5;
          font-size: 13px;
        }

        .recording-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 24px;
          min-height: 100px;
        }

        .recording-indicator,
        .playback-indicator,
        .playing-indicator,
        .transcribing-indicator,
        .idle-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: white;
        }

        .recording-indicator {
          position: relative;
        }

        .pulse-ring {
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.3);
          animation: pulse-ring 1.5s ease-out infinite;
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .mic-icon {
          z-index: 1;
        }

        .mic-icon.recording {
          color: #ef4444;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .idle-indicator span {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }

        .duration {
          font-size: 24px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: white;
        }

        .controls {
          display: flex;
          gap: 12px;
        }

        .record-btn,
        .stop-btn,
        .play-btn,
        .reset-btn,
        .submit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .record-btn {
          background: #ef4444;
          color: white;
        }

        .stop-btn {
          background: #ef4444;
          color: white;
        }

        .play-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          padding: 12px;
        }

        .reset-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .submit-btn {
          background: #10b981;
          color: white;
        }

        .record-btn:hover,
        .stop-btn:hover {
          background: #dc2626;
        }

        .play-btn:hover,
        .reset-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .submit-btn:hover {
          background: #059669;
        }

        .record-btn:disabled,
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cancel-link {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
          cursor: pointer;
        }

        .cancel-link:hover {
          color: rgba(255, 255, 255, 0.8);
        }
      `}</style>
    </div>
  );
}
