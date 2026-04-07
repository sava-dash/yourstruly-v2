'use client';

import './conversation-engine.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Mic,
  Square,
  Loader2,
  Bookmark,
  BookOpen,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  createInitialState,
  EngineState,
  ConversationContext,
} from '@/lib/conversation-engine/types';

// Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// Use existing Window augmentation if available, otherwise declare
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface WindowWithSpeechRecognition {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface ConversationEngineProps {
  context: ConversationContext;
  userName: string;
  userProfile?: {
    interests?: string[];
    religion?: string;
    location?: string;
    whyHere?: string;
  };
  initialMessage?: string; // optional first AI message
  onComplete?: (state: EngineState) => void;
  onSkip?: () => void;
  showSkip?: boolean;
  maxHeight?: string; // e.g. '400px' or '60vh'
}

export function ConversationEngine({
  context,
  userName,
  userProfile,
  initialMessage,
  onComplete,
  onSkip,
  showSkip = false,
  maxHeight = '400px',
}: ConversationEngineProps) {
  const [engineState, setEngineState] = useState<EngineState>(
    createInitialState(),
  );
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveReady, setSaveReady] = useState(false);
  const [saveType, setSaveType] = useState<'memory' | 'wisdom' | undefined>();
  const [savedMessage, setSavedMessage] = useState('');

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [useFallback, setUseFallback] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // TTS
  const [isMuted, setIsMuted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Display messages from engine state
  const messages = engineState.messages;

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  // Focus input when ready
  useEffect(() => {
    if (!isSending && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSending, messages]);

  // Set initial message if provided
  useEffect(() => {
    if (initialMessage && messages.length === 0) {
      setEngineState((prev) => ({
        ...prev,
        messages: [{ role: 'assistant', content: initialMessage }],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  // TTS disabled — pending VibeVoice integration
  const speakMessage = useCallback((_text: string) => {}, []);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && !isSending) {
      speakMessage(last.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isSending, speakMessage]);

  // Send message to engine
  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const userMessage = input.trim();
    setInput('');
    setIsSending(true);

    // Optimistically add user message
    setEngineState((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        { role: 'user' as const, content: userMessage },
      ],
    }));

    try {
      const res = await fetch('/api/conversation-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          engineState,
          context,
          userName,
          userProfile,
        }),
      });

      if (!res.ok) throw new Error('Engine error');
      const data = await res.json();

      setEngineState(data.engineState);
      setSaveReady(data.saveReady);
      setSaveType(data.saveType);
    } catch (error) {
      console.error('Engine error:', error);
      // Fallback response
      setEngineState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            role: 'assistant',
            content: `That's really interesting, ${userName}. Tell me more about that.`,
          },
        ],
      }));
    } finally {
      setIsSending(false);
    }
  };

  // Save memory/wisdom
  const handleSave = async () => {
    if (!saveType || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/conversation-engine/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engineState, saveType }),
      });
      if (res.ok) {
        setSavedMessage(
          saveType === 'wisdom' ? '💡 Wisdom saved!' : '✨ Memory saved!',
        );
        setSaveReady(false);
        // Clear the active candidate after saving
        setEngineState((prev) => ({
          ...prev,
          activeCandidate: null,
          pastCandidates: prev.activeCandidate
            ? [...prev.pastCandidates, prev.activeCandidate]
            : prev.pastCandidates,
        }));
        setTimeout(() => setSavedMessage(''), 3000);
      }
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Voice: Web Speech API with MediaRecorder fallback
  const startFallbackRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsTranscribing(true);
        try {
          const blob = new Blob(audioChunksRef.current, {
            type: 'audio/webm',
          });
          const fd = new FormData();
          fd.append('audio', blob, 'recording.webm');
          const res = await fetch('/api/conversation/transcribe', {
            method: 'POST',
            body: fd,
          });
          if (res.ok) {
            const d = await res.json();
            const text = d.transcription || d.text || '';
            if (text) setInput((prev) => prev + (prev ? ' ' : '') + text);
          }
        } catch (e) {
          console.error('Transcription error:', e);
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      setIsRecording(true);
      setLiveTranscript('Recording... tap stop to transcribe');
    } catch (e) {
      console.error('Mic error:', e);
      alert('Could not access microphone.');
    }
  };

  const startRecording = () => {
    if (useFallback) {
      startFallbackRecording();
      return;
    }
    try {
      const w = window as unknown as WindowWithSpeechRecognition;
      const API = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!API) {
        setUseFallback(true);
        startFallbackRecording();
        return;
      }
      const recognition = new API();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      let networkError = false;
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '',
          final_ = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal)
            final_ += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        if (final_) setInput((prev) => prev + (prev ? ' ' : '') + final_);
        setLiveTranscript(interim);
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (
          event.error === 'network' ||
          event.error === 'service-not-allowed'
        ) {
          networkError = true;
          setUseFallback(true);
          recognition.stop();
          setIsRecording(false);
          setLiveTranscript('');
          startFallbackRecording();
        } else {
          setIsRecording(false);
          setLiveTranscript('');
        }
      };
      recognition.onend = () => {
        if (!networkError) {
          setIsRecording(false);
          setLiveTranscript('');
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch {
      setUseFallback(true);
      startFallbackRecording();
    }
  };

  const stopRecording = () => {
    if (useFallback) {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setLiveTranscript('');
      }
      return;
    }
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      setLiveTranscript('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="conversation-engine">
      {/* Chat Messages */}
      <div className="ce-messages" style={{ maxHeight, overflowY: 'auto' }}>
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`ce-msg ${msg.role === 'user' ? 'ce-msg-user' : 'ce-msg-ai'}`}
            >
              <div
                className={`ce-bubble ${msg.role === 'user' ? 'ce-bubble-user' : 'ce-bubble-ai'}`}
              >
                <p>{msg.content}</p>
              </div>
              {/* Show classification badge on user messages */}
              {msg.role === 'user' && msg.classification && (
                <span
                  className={`ce-badge ce-badge-${msg.classification.toLowerCase()}`}
                >
                  {msg.classification === 'MEMORY'
                    ? '📖'
                    : msg.classification === 'WISDOM'
                      ? '💡'
                      : msg.classification === 'INTEREST'
                        ? '✨'
                        : '💬'}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isSending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ce-msg ce-msg-ai"
          >
            <div className="ce-bubble ce-bubble-ai">
              <div className="ce-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Save Banner */}
      <AnimatePresence>
        {saveReady && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="ce-save-banner"
          >
            <div className="ce-save-content">
              {saveType === 'wisdom' ? (
                <>
                  <BookOpen size={18} />
                  <span>Wisdom captured</span>
                </>
              ) : (
                <>
                  <Bookmark size={18} />
                  <span>Memory ready to save</span>
                </>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="ce-save-btn"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved confirmation */}
      <AnimatePresence>
        {savedMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="ce-saved-toast"
          >
            {savedMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live transcript - shows during recording */}
      {isRecording && (
        <div className="ce-live-transcript">
          {input && <span className="ce-live-final">{input}</span>}
          {liveTranscript && (
            <span className="ce-live-interim">
              {input ? ' ' : ''}{liveTranscript}...
            </span>
          )}
          {!input && !liveTranscript && !useFallback && (
            <span className="ce-live-listening">🎤 Listening...</span>
          )}
          {!input && !liveTranscript && useFallback && (
            <span className="ce-live-listening">🎤 Recording... tap stop to transcribe</span>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="ce-input-area">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isTranscribing ? 'Transcribing...' : 'Share your thoughts...'
          }
          className="ce-textarea"
          rows={2}
          disabled={isSending || isTranscribing}
        />

        <div className="ce-input-actions">
          {/* Mic */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isSending || isTranscribing}
            className={`ce-icon-btn ${isRecording ? 'ce-recording' : ''}`}
            title={isRecording ? 'Stop' : 'Record'}
          >
            {isRecording ? (
              <Square size={18} />
            ) : isTranscribing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Mic size={18} />
            )}
          </button>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="ce-send-btn"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Skip / Complete */}
      {(showSkip || onComplete) && (
        <div className="ce-footer">
          {showSkip && onSkip && (
            <button onClick={onSkip} className="ce-skip-btn">
              Skip for now
            </button>
          )}
          {onComplete &&
            messages.filter((m) => m.role === 'user').length >= 1 && (
              <button
                onClick={() => onComplete(engineState)}
                className="ce-complete-btn"
              >
                Done <Sparkles size={14} />
              </button>
            )}
        </div>
      )}

    </div>
  );
}
