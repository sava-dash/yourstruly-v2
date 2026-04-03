'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bot, Volume2, VolumeX, Play, Square, Sparkles } from 'lucide-react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { useTTS } from '@/hooks/useTTS';

export interface AnimatedQuestionProps {
  /** The question text to display */
  question: string;
  /** Animate the text appearing (typewriter effect) */
  animate?: boolean;
  /** Show loading state (animated dots) */
  isLoading?: boolean;
  /** Show avatar/bot icon */
  showAvatar?: boolean;
  /** Custom avatar element */
  avatar?: React.ReactNode;
  /** Enable text-to-speech controls */
  enableTTS?: boolean;
  /** Auto-speak when question appears */
  autoSpeak?: boolean;
  /** Callback when typing animation completes */
  onTypingComplete?: () => void;
  /** Additional class for the container */
  className?: string;
  /** Text size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Center the text */
  centered?: boolean;
  /** Typing speed in ms per character (default: 30) */
  typingSpeed?: number;
  /** Show controls only after typing is complete */
  showControlsAfterTyping?: boolean;
}

/**
 * AnimatedQuestion - Reusable animated question display with typewriter effect
 * 
 * The canonical component for consistent typewriter text animation with optional TTS
 * across engagement, onboarding, interviews, and wisdom capture flows.
 * 
 * Uses useTypewriter and useTTS hooks for consistent behavior.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <AnimatedQuestion question="What is your favorite memory?" />
 * 
 * // With TTS and animation
 * <AnimatedQuestion 
 *   question="What is your favorite memory?"
 *   animate={true}
 *   enableTTS={true}
 *   autoSpeak={true}
 *   onTypingComplete={() => console.log('Done typing')}
 * />
 * ```
 */
export function AnimatedQuestion({
  question,
  animate = true,
  isLoading = false,
  showAvatar = false,
  avatar,
  enableTTS = false,
  autoSpeak = false,
  onTypingComplete,
  className = '',
  size = 'lg',
  centered = false,
  typingSpeed = 30,
  showControlsAfterTyping = true,
}: AnimatedQuestionProps) {
  const hasSpokenRef = useRef(false);
  const questionRef = useRef(question);

  // Use the typewriter hook for consistent animation
  const { displayText, isComplete: typingDone, isTyping } = useTypewriter({
    text: question,
    animate,
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
    enable: enableTTSState,
    disable: disableTTS,
  } = useTTS({
    enabled: autoSpeak,
    autoSpeak: false,
  });

  // Reset hasSpoken when question changes
  useEffect(() => {
    if (question !== questionRef.current) {
      questionRef.current = question;
      hasSpokenRef.current = false;
    }
  }, [question]);

  // Auto-speak when enabled and typing starts/completes
  useEffect(() => {
    if (ttsEnabled && !hasSpokenRef.current && question) {
      hasSpokenRef.current = true;
      // Small delay to ensure audio context is ready
      const timer = setTimeout(() => {
        speak(question);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [ttsEnabled, question, speak]);

  // Handle play/stop button
  const handlePlayStop = useCallback(() => {
    if (isSpeaking) {
      stop();
    } else {
      speak(question);
    }
  }, [isSpeaking, stop, speak, question]);

  // Handle TTS toggle
  const handleToggleTTS = useCallback(() => {
    toggleTTS();
    // If enabling TTS and not already speaking, speak the current question
    if (!ttsEnabled && !isSpeaking) {
      speak(question);
    }
  }, [toggleTTS, ttsEnabled, isSpeaking, speak, question]);

  // Size classes mapping
  const sizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl md:text-2xl',
    xl: 'text-2xl md:text-3xl',
  };

  const shouldShowControls = enableTTS && (!showControlsAfterTyping || typingDone);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`animated-question ${className}`}
    >
      {showAvatar && (
        <div className="animated-question-avatar">
          {avatar || (
            <div className="w-10 h-10 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
              <Sparkles size={20} className="text-[#2D5A3D]" />
            </div>
          )}
          {isSpeaking && (
            <motion.div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#2D5A3D] rounded-full"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
        </div>
      )}
      
      <div className={`animated-question-content ${centered ? 'text-center' : ''}`}>
        <p className={`${sizeClasses[size]} font-medium text-[#2d2d2d] leading-relaxed font-playfair`}>
          {isLoading ? (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#2D5A3D] rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="inline-block w-2 h-2 bg-[#2D5A3D] rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="inline-block w-2 h-2 bg-[#2D5A3D] rounded-full animate-bounce" />
            </span>
          ) : (
            <>
              {displayText}
              {animate && !typingDone && (
                <span className="inline-block w-0.5 h-[1em] bg-[#2D5A3D] ml-1 animate-pulse align-middle" />
              )}
            </>
          )}
        </p>
      </div>

      {shouldShowControls && (
        <div className="animated-question-controls flex items-center gap-2 mt-3">
          <button
            onClick={handlePlayStop}
            className={`p-2 rounded-lg transition-all ${
              isSpeaking 
                ? 'bg-[#2D5A3D] text-white' 
                : 'bg-[#2D5A3D]/10 text-[#2D5A3D] hover:bg-[#2D5A3D]/20'
            }`}
            aria-label={isSpeaking ? 'Stop' : 'Play'}
          >
            {isSpeaking ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
          <button
            onClick={handleToggleTTS}
            className={`p-2 rounded-lg transition-all ${
              ttsEnabled 
                ? 'bg-[#2D5A3D]/20 text-[#2D5A3D]' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            aria-label={ttsEnabled ? 'Auto-speak on' : 'Auto-speak off'}
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default AnimatedQuestion;
