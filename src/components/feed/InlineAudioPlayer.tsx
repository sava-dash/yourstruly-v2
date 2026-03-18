'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'

interface InlineAudioPlayerProps {
  audioUrl: string
  isPlaying: boolean
  onToggle: () => void
  accentColor?: string
}

export function InlineAudioPlayer({ 
  audioUrl, 
  isPlaying, 
  onToggle,
  accentColor = '#34D7FF' 
}: InlineAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const onToggleRef = useRef(onToggle)
  
  // Keep onToggle ref up to date
  useEffect(() => {
    onToggleRef.current = onToggle
  }, [onToggle])

  // Initialize audio element - only depends on audioUrl
  useEffect(() => {
    if (!audioUrl) {
      return
    }

    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0)
      setIsReady(true)
    }
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0)
    }
    
    const handleEnded = () => {
      onToggleRef.current()
      setCurrentTime(0)
    }

    const handleError = () => {
      console.error('[InlineAudioPlayer] Failed to load audio:', audioUrl)
      setIsReady(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    
    // Set src after adding listeners
    audio.src = audioUrl

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audioRef.current = null
    }
  }, [audioUrl])

  // Handle play/pause
  useEffect(() => {
    if (!audioRef.current) {
      console.log('[InlineAudioPlayer] No audio ref available')
      return
    }

    if (isPlaying) {
      console.log('[InlineAudioPlayer] Playing audio')
      audioRef.current.play().catch(err => {
        console.error('[InlineAudioPlayer] Play failed:', err)
      })
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div 
      className="inline-audio-player"
      onClick={(e) => e.preventDefault()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        marginTop: '8px',
      }}
    >
      {/* Play/Pause Button */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggle()
        }}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: accentColor,
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isPlaying ? (
          <Pause size={16} color="#000" fill="#000" />
        ) : (
          <Play size={16} color="#000" fill="#000" style={{ marginLeft: '2px' }} />
        )}
      </button>

      {/* Animated Waveform */}
      <div 
        className="waveform-container"
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '3px', 
          flex: 1, 
          height: '36px',
          overflow: 'hidden',
        }}
      >
        {[...Array(20)].map((_, i) => {
          const baseHeight = 8 + (Math.sin(i * 0.5) * 12)
          
          return (
            <div
              key={i}
              style={{
                width: '3px',
                height: `${baseHeight}px`,
                background: i / 20 < progress / 100 ? accentColor : 'rgba(255,255,255,0.3)',
                borderRadius: '2px',
                animationName: isPlaying ? 'waveform-pulse' : 'none',
                animationDuration: '1s',
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: `${i * 0.05}s`,
                transition: 'background 0.3s, height 0.3s',
              }}
            />
          )
        })}
      </div>

      {/* Time Display */}
      <div style={{
        fontSize: '11px',
        fontWeight: '600',
        color: '#fff',
        minWidth: '45px',
        textAlign: 'right',
      }}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <style jsx>{`
        @keyframes waveform-pulse {
          0%, 100% { 
            transform: scaleY(1); 
            opacity: 0.8;
          }
          50% { 
            transform: scaleY(1.3); 
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .inline-audio-player {
            gap: 6px !important;
            padding: 8px !important;
          }
          
          .inline-audio-player button {
            width: 32px !important;
            height: 32px !important;
          }
          
          .inline-audio-player button svg {
            width: 14px !important;
            height: 14px !important;
          }
          
          .waveform-container {
            gap: 2px !important;
          }
          
          .waveform-container div {
            width: 2px !important;
          }
        }

        @media (max-width: 480px) {
          .inline-audio-player {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  )
}
