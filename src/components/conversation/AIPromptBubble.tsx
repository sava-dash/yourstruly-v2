'use client';

import { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bot, Volume2, VolumeX, Play, Square } from 'lucide-react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { useTTS } from '@/hooks/useTTS';

export interface AIPromptBubbleProps {
  /** The question text to display */
  question: string;
  /** Whether this is a new question (triggers animation) */
  isNew?: boolean;
  /** Whether to show loading state */
  isLoading?: boolean;
  /** Enable TTS functionality */
  enableTTS?: boolean;
  /** Typing speed in ms per character (default: 25) */
  typingSpeed?: number;
  /** Callback when typing completes */
  onTypingComplete?: () => void;
  /** Additional CSS class */
  className?: string;
}

/**
 * AIPromptBubble - AI question display with typewriter animation and TTS
 * 
 * Used in conversation flows to display AI prompts with consistent animation.
 * Uses useTypewriter and useTTS hooks for unified behavior across the app.
 * 
 * For simpler question displays, consider using AnimatedQuestion instead.
 * 
 * @example
 * ```tsx
 * // Standard usage in conversation
 * <AIPromptBubble 
 *   question="What is your favorite memory?"
 *   isNew={true}
 *   isLoading={false}
 *   enableTTS={true}
 * />
 * ```
 */
export function AIPromptBubble({ 
  question, 
  isNew = false, 
  isLoading = false,
  enableTTS = false,
  typingSpeed = 25,
  onTypingComplete,
  className = '',
}: AIPromptBubbleProps) {
  const hasSpokenRef = useRef(false);
  const questionRef = useRef(question);

  // Use the typewriter hook for consistent animation
  const { displayText, isComplete: typingDone } = useTypewriter({
    text: question,
    animate: isNew,
    speed: typingSpeed,
    onComplete: onTypingComplete,
  });

  // Use the TTS hook for consistent speech
  const { 
    isSpeaking, 
    enabled: ttsEnabled, 
    speak, 
    stop, 
    toggle: toggleTTS,
  } = useTTS({
    enabled: enableTTS,
  });

  // Track question changes
  useEffect(() => {
    if (question !== questionRef.current) {
      questionRef.current = question;
      hasSpokenRef.current = false;
    }
  }, [question]);

  // Auto-speak when TTS is enabled (don't wait for typing)
  useEffect(() => {
    if (ttsEnabled && !hasSpokenRef.current && isNew && question) {
      hasSpokenRef.current = true;
      // Small delay to ensure audio context is ready
      const timer = setTimeout(() => {
        speak(question);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [ttsEnabled, question, isNew, speak]);

  // Handle play/stop button
  const handlePlayStop = useCallback(() => {
    if (isSpeaking) {
      stop();
    } else {
      speak(question);
    }
  }, [isSpeaking, stop, speak, question]);

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ai-prompt-bubble ai-prompt-bubble-loading"
      >
        <div className="ai-prompt-avatar">
          <Bot size={20} />
        </div>
        <div className="ai-prompt-content">
          <div className="ai-prompt-typing">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`ai-prompt-bubble ${className}`}
    >
      <div className="ai-prompt-avatar">
        <Bot size={20} />
        {isSpeaking && (
          <motion.div
            className="ai-prompt-speaking-indicator"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </div>
      <div className="ai-prompt-content">
        <div className="ai-prompt-text">
          {displayText}
          {isNew && !typingDone && (
            <span className="ai-prompt-cursor" />
          )}
        </div>
      </div>
      {enableTTS && (
        <div className="ai-prompt-tts-controls">
          {/* Play/Stop button - always visible when typing is done */}
          {typingDone && (
            <button
              onClick={handlePlayStop}
              className={`ai-prompt-play-btn ${isSpeaking ? 'speaking' : ''}`}
              aria-label={isSpeaking ? 'Stop' : 'Play question'}
              title={isSpeaking ? 'Stop' : 'Play question'}
            >
              {isSpeaking ? (
                <Square size={12} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
            </button>
          )}
          {/* TTS toggle */}
          <button
            onClick={toggleTTS}
            className={`ai-prompt-tts-btn ${ttsEnabled ? 'enabled' : ''}`}
            aria-label={ttsEnabled ? 'Auto-speak on' : 'Auto-speak off'}
            title={ttsEnabled ? 'Auto-speak: ON' : 'Auto-speak: OFF'}
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default AIPromptBubble;
