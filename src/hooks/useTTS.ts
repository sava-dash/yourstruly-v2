'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseTTSOptions {
  /** Whether TTS is initially enabled */
  enabled?: boolean;
  /** Auto-speak when text changes */
  autoSpeak?: boolean;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback when speech ends */
  onEnd?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseTTSReturn {
  /** Whether currently speaking */
  isSpeaking: boolean;
  /** Whether TTS is enabled */
  enabled: boolean;
  /** Speak the given text */
  speak: (text: string) => Promise<void>;
  /** Stop current speech */
  stop: () => void;
  /** Toggle TTS enabled state */
  toggle: () => void;
  /** Enable TTS */
  enable: () => void;
  /** Disable TTS */
  disable: () => void;
  /** Whether TTS is supported on this browser */
  isSupported: boolean;
}

// Track if voices have been loaded
let voicesLoaded = false;
let voicesLoadPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/**
 * Load speech synthesis voices, handling browser differences
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesLoaded && window.speechSynthesis.getVoices().length > 0) {
    return Promise.resolve(window.speechSynthesis.getVoices());
  }
  
  if (voicesLoadPromise) {
    return voicesLoadPromise;
  }

  voicesLoadPromise = new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      resolve(voices);
      return;
    }

    // Wait for voices to load
    const handleVoicesChanged = () => {
      voicesLoaded = true;
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    
    // Timeout fallback
    setTimeout(() => {
      if (!voicesLoaded) {
        resolve(window.speechSynthesis.getVoices());
      }
    }, 1000);
  });

  return voicesLoadPromise;
}

/**
 * Find the best available English voice
 */
function findBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const preferredVoices = [
    'Samantha',
    'Google US English',
    'Karen',
    'Victoria',
    'Alex',
  ];
  
  for (const name of preferredVoices) {
    const voice = voices.find(v => v.name.includes(name));
    if (voice) return voice;
  }
  
  // Fall back to any English voice
  return voices.find(v => v.lang.startsWith('en')) || voices[0];
}

/**
 * useTTS - Unified text-to-speech hook
 * 
 * Provides consistent TTS functionality across the application.
 * Supports browser SpeechSynthesis API with fallback to TTS proxy API.
 * 
 * @example
 * ```tsx
 * const { speak, stop, isSpeaking, toggle } = useTTS({
 *   enabled: true,
 *   autoSpeak: false
 * });
 * 
 * // Speak text
 * await speak("Hello world");
 * 
 * // Stop speaking
 * stop();
 * ```
 */
export function useTTS({
  enabled = false,
  autoSpeak = false,
  onStart,
  onEnd,
  onError,
}: UseTTSOptions = {}): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasSpokenRef = useRef<Set<string>>(new Set());

  // Check if TTS is supported
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isSupported]);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Stop any current audio
    stop();

    // Try browser speech synthesis first
    if (isSupported) {
      try {
        const voices = await loadVoices();
        
        if (voices.length > 0) {
          window.speechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          utterance.pitch = 1;
          utterance.volume = 1;
          
          const voice = findBestVoice(voices);
          if (voice) {
            utterance.voice = voice;
          }

          utterance.onstart = () => {
            setIsSpeaking(true);
            onStart?.();
          };
          
          utterance.onend = () => {
            setIsSpeaking(false);
            onEnd?.();
          };
          
          utterance.onerror = (event) => {
            setIsSpeaking(false);
            onError?.(new Error(`Speech synthesis error: ${event.error}`));
          };

          window.speechSynthesis.speak(utterance);
          return;
        }
      } catch (error) {
        console.log('Browser TTS failed, falling back to API');
      }
    }

    // Fallback: Use TTS proxy API
    try {
      setIsSpeaking(true);
      onStart?.();
      
      // Split long text into chunks (TTS API has a limit)
      const maxLen = 200;
      const chunks: string[] = [];
      let remaining = text;
      
      while (remaining.length > 0) {
        if (remaining.length <= maxLen) {
          chunks.push(remaining);
          break;
        }
        let breakPoint = remaining.lastIndexOf(' ', maxLen);
        if (breakPoint === -1) breakPoint = maxLen;
        chunks.push(remaining.slice(0, breakPoint));
        remaining = remaining.slice(breakPoint).trim();
      }

      // Play chunks sequentially
      for (const chunk of chunks) {
        const url = `/api/tts?text=${encodeURIComponent(chunk)}`;
        
        await new Promise<void>((resolve, reject) => {
          const audio = new Audio(url);
          audioRef.current = audio;
          
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('Audio playback failed'));
          
          audio.play().catch(reject);
        });
      }
      
      setIsSpeaking(false);
      onEnd?.();
    } catch (error) {
      console.error('TTS fallback failed:', error);
      setIsSpeaking(false);
      onError?.(error instanceof Error ? error : new Error('TTS failed'));
    }
  }, [isSupported, onStart, onEnd, onError]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, [isSupported]);

  const toggle = useCallback(() => {
    if (isSpeaking) {
      stop();
    }
    setIsEnabled(prev => !prev);
  }, [isSpeaking, stop]);

  const enable = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const disable = useCallback(() => {
    if (isSpeaking) {
      stop();
    }
    setIsEnabled(false);
  }, [isSpeaking, stop]);

  // Auto-speak functionality
  const autoSpeakRef = useRef(autoSpeak);
  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  return {
    isSpeaking,
    enabled: isEnabled,
    speak,
    stop,
    toggle,
    enable,
    disable,
    isSupported,
  };
}

export default useTTS;
