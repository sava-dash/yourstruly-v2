'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Send, Loader2, ChevronLeft, Sparkles, MessageCircle, Mic, Square, CheckCircle, Volume2, VolumeX } from 'lucide-react';

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
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
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface HeartfeltConversationProps {
  whyHere: string;       // From background step: "What brings you here?"
  whatDrives: string[];  // From life-goals step: "What matters most in life?"
  userName: string;
  onComplete: (conversation: Message[]) => void;
  onSkip?: () => void;
}

const MIN_EXCHANGES = 2; // At least 2 back-and-forth exchanges before allowing completion
const SUGGEST_SAVE_AT = 5; // Prominently suggest saving after this many exchanges

export function HeartfeltConversation({ 
  whyHere, 
  whatDrives, 
  userName,
  onComplete, 
  onSkip 
}: HeartfeltConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [showSaveSuggestion, setShowSaveSuggestion] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // TTS disabled — pending VibeVoice integration
  const speakMessage = useCallback((_text: string) => {}, []);

  // Count user messages to track exchanges
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  
  // Show save suggestion after SUGGEST_SAVE_AT exchanges
  useEffect(() => {
    if (userMessageCount >= SUGGEST_SAVE_AT && !showSaveSuggestion) {
      setShowSaveSuggestion(true);
    }
  }, [userMessageCount, showSaveSuggestion]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-speak new assistant messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && !isLoading && !isMuted) {
      speakMessage(lastMessage.content);
    }
  }, [messages, isLoading, speakMessage, isMuted]);

  // Generate initial question based on whyHere and whatDrives
  useEffect(() => {
    generateInitialQuestion();
  }, []);

  // Focus input after assistant message
  useEffect(() => {
    if (!isLoading && !isSending && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, isSending, messages]);

  const generateInitialQuestion = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/onboarding/heartfelt-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_initial',
          whyHere,
          whatDrives,
          userName,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate question');
      
      const data = await response.json();
      setMessages([{ role: 'assistant', content: data.question }]);
    } catch (error) {
      console.error('Error generating initial question:', error);
      // Fallback question
      const fallback = generateFallbackQuestion(whyHere, whatDrives);
      setMessages([{ role: 'assistant', content: fallback }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackQuestion = (why: string, drives: string[]): string => {
    // Smart fallback based on inputs
    if (why.toLowerCase().includes('family') || why.toLowerCase().includes('children')) {
      return `${userName ? userName + ', you' : 'You'} mentioned wanting to create something meaningful for your family. What's one story or lesson from your own life that you hope they'll always remember?`;
    }
    if (why.toLowerCase().includes('parent')) {
      return `Preserving your parents' stories is such a beautiful goal. What's one thing about their life or wisdom that you're most afraid of losing?`;
    }
    if (drives.some(d => d.toLowerCase().includes('legacy'))) {
      return `Legacy clearly matters to you. If your great-grandchildren could know just one thing about who you really were, what would you want that to be?`;
    }
    if (drives.some(d => d.toLowerCase().includes('help') || d.toLowerCase().includes('impact'))) {
      return `You want to make a difference in the world. Can you tell me about a time when you felt you truly helped someone in a meaningful way?`;
    }
    return `${userName ? userName + ', w' : 'W'}hat's a moment in your life that shaped who you are today—something you'd want the people you love to understand about you?`;
  };

  // Fallback: MediaRecorder + server-side Whisper transcription
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [useFallback, setUseFallback] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const startFallbackRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          const response = await fetch('/api/conversation/transcribe', { method: 'POST', body: formData });
          if (response.ok) {
            const data = await response.json();
            const text = data.transcription || data.text || '';
            if (text) setInput(prev => prev + (prev ? ' ' : '') + text);
          }
        } catch (e) {
          console.error('Transcription error:', e);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setLiveTranscript('Recording... tap stop to transcribe');
    } catch (error) {
      console.error('Fallback recording failed:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopFallbackRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setLiveTranscript('');
    }
  };

  const startRecording = () => {
    // If we already know Web Speech API doesn't work, go straight to fallback
    if (useFallback) {
      startFallbackRecording();
      return;
    }

    try {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        setUseFallback(true);
        startFallbackRecording();
        return;
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let hasNetworkError = false;

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) {
          setInput(prev => prev + (prev ? ' ' : '') + final);
        }
        setLiveTranscript(interim);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'network' || event.error === 'service-not-allowed' || event.error === 'not-allowed') {
          // Web Speech API unavailable — switch to fallback permanently
          hasNetworkError = true;
          setUseFallback(true);
          recognition.stop();
          setIsRecording(false);
          setLiveTranscript('');
          // Auto-start fallback recording
          startFallbackRecording();
        } else {
          setIsRecording(false);
          setLiveTranscript('');
        }
      };

      recognition.onend = () => {
        if (!hasNetworkError) {
          setIsRecording(false);
          setLiveTranscript('');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setUseFallback(true);
      startFallbackRecording();
    }
  };

  const stopRecording = () => {
    if (useFallback) {
      stopFallbackRecording();
      return;
    }
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      setLiveTranscript('');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsSending(true);

    try {
      const response = await fetch('/api/onboarding/heartfelt-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'follow_up',
          whyHere,
          whatDrives,
          userName,
          conversation: [...messages, { role: 'user', content: userMessage }],
        }),
      });

      if (!response.ok) throw new Error('Failed to generate follow-up');

      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      
      // After MIN_EXCHANGES, allow completion
      if (userMessageCount + 1 >= MIN_EXCHANGES) {
        setCanComplete(true);
      }
    } catch (error) {
      console.error('Error generating follow-up:', error);
      // Graceful fallback - encourage completion
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Thank you for sharing that. Your story is already becoming part of your legacy. Would you like to continue exploring, or save this conversation and move on?" 
      }]);
      setCanComplete(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleComplete = () => {
    onComplete(messages);
  };

  return (
    <div className="glass-card glass-card-strong p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6 relative">
        {/* Mute toggle */}
        <button
          onClick={() => {
            setIsMuted(!isMuted);
            if (!isMuted && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
          }}
          className="absolute top-0 right-0 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          title={isMuted ? 'Unmute voice' : 'Mute voice'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#8DACAB] mb-3">
          <Heart size={24} className="text-white" />
        </div>
        <h2 className="text-xl font-semibold text-[#2d2d2d] font-playfair">
          Let's Go Deeper
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          A meaningful conversation to capture your story
        </p>
      </div>

      {/* Conversation Area */}
      <div className="bg-white/50 rounded-xl p-4 mb-4 max-h-[400px] overflow-y-auto">
        <AnimatePresence>
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-8"
            >
              <div className="flex items-center gap-3 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm" style={{ fontFamily: 'var(--font-handwritten)' }}>
                  Thinking of something meaningful to ask...
                </span>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index === messages.length - 1 ? 0.1 : 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-[#2D5A3D] text-white rounded-br-md'
                        : 'bg-white border border-gray-100 text-[#2d2d2d] rounded-bl-md shadow-sm'
                    }`}
                  >
                    {/* Clean assistant messages — no label */}
                    <p className={`text-sm leading-relaxed ${
                      message.role === 'assistant' ? 'font-playfair' : ''
                    }`}>
                      {message.content}
                    </p>
                  </div>
                </motion.div>
              ))}
              
              {isSending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#2D5A3D]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-[#2D5A3D]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-[#2D5A3D]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Save Suggestion Banner */}
      {showSaveSuggestion && canComplete && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-gradient-to-r from-[#2D5A3D]/10 to-[#8DACAB]/10 rounded-xl border border-[#2D5A3D]/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#2D5A3D]" />
              <div>
                <p className="text-sm font-medium text-[#2d2d2d]">Great conversation!</p>
                <p className="text-xs text-gray-500">You can save now or keep exploring</p>
              </div>
            </div>
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-lg text-sm font-medium hover:bg-[#355a48] transition-all"
            >
              <Sparkles size={14} />
              Save & Continue
            </button>
          </div>
        </motion.div>
      )}

      {/* Input Area */}
      {!isLoading && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Share your thoughts..."
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 
                         text-[#2d2d2d] placeholder-gray-400 resize-none
                         focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                rows={2}
                disabled={isSending}
              />
              {isRecording && liveTranscript && (
                <div className="text-xs text-gray-400 italic px-2 mt-1">
                  {liveTranscript}...
                </div>
              )}
            </div>
            
            {/* Voice Recording Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isSending || isTranscribing}
              className={`px-4 py-3 rounded-xl transition-all self-end ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse hover:bg-red-600' 
                  : isTranscribing
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Record voice'}
            >
              {isRecording ? <Square size={20} /> : isTranscribing ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
            </button>
            
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="px-4 py-3 bg-[#2D5A3D] text-white rounded-xl 
                       hover:bg-[#355a48] disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all self-end"
            >
              <Send size={20} />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip for now
              </button>
            )}
            
            <div className="flex items-center gap-3 ml-auto">
              {!canComplete && (
                <span className="text-xs text-gray-400">
                  {MIN_EXCHANGES - userMessageCount} more {MIN_EXCHANGES - userMessageCount === 1 ? 'response' : 'responses'} to unlock save
                </span>
              )}
              
              {!showSaveSuggestion && (
                <button
                  onClick={handleComplete}
                  disabled={!canComplete}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all
                    ${canComplete 
                      ? 'bg-gradient-to-r from-[#2D5A3D] to-[#8DACAB] text-white hover:shadow-lg' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  <Sparkles size={16} />
                  Save & Continue
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
