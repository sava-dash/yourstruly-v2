'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseTypewriterOptions {
  /** Text to animate */
  text: string;
  /** Whether to animate the text (typewriter effect) */
  animate?: boolean;
  /** Typing speed in milliseconds per character */
  speed?: number;
  /** Callback when typing animation completes */
  onComplete?: () => void;
  /** Delay before starting the animation */
  delay?: number;
}

export interface UseTypewriterReturn {
  /** The currently displayed text */
  displayText: string;
  /** Whether the typing animation is complete */
  isComplete: boolean;
  /** Whether typing is currently in progress */
  isTyping: boolean;
  /** Reset the animation to start over */
  reset: () => void;
  /** Skip to the end of the animation */
  skip: () => void;
}

/**
 * useTypewriter - Reusable typewriter animation hook
 * 
 * Provides consistent typewriter text animation across the application.
 * Used by AIPromptBubble, AnimatedQuestion, and other components.
 * 
 * @example
 * ```tsx
 * const { displayText, isComplete } = useTypewriter({
 *   text: "Hello world",
 *   animate: true,
 *   speed: 30,
 *   onComplete: () => console.log('Done!')
 * });
 * ```
 */
export function useTypewriter({
  text,
  animate = true,
  speed = 30,
  onComplete,
  delay = 0,
}: UseTypewriterOptions): UseTypewriterReturn {
  const [displayText, setDisplayText] = useState(animate ? '' : text);
  const [isComplete, setIsComplete] = useState(!animate);
  const [isTyping, setIsTyping] = useState(false);
  const textRef = useRef(text);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when text changes
  useEffect(() => {
    if (text !== textRef.current) {
      textRef.current = text;
      setDisplayText(animate ? '' : text);
      setIsComplete(!animate);
      setIsTyping(false);
      
      // Clear any pending animations
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [text, animate]);

  // Run typing animation
  useEffect(() => {
    if (!animate || isComplete) {
      return;
    }

    setIsTyping(true);
    let index = 0;

    const startTyping = () => {
      intervalRef.current = setInterval(() => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
        } else {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsTyping(false);
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);
    };

    if (delay > 0) {
      timeoutRef.current = setTimeout(startTyping, delay);
    } else {
      startTyping();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [animate, text, speed, delay, onComplete, isComplete]);

  const reset = useCallback(() => {
    setDisplayText('');
    setIsComplete(false);
    setIsTyping(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const skip = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setDisplayText(text);
    setIsTyping(false);
    setIsComplete(true);
    onComplete?.();
  }, [text, onComplete]);

  return {
    displayText,
    isComplete,
    isTyping,
    reset,
    skip,
  };
}

export default useTypewriter;
