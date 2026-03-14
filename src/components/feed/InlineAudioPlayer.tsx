'use client'

import { useState, useRef, useEffect } from 'react'
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

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0)
      })
      
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0)
      })
      
      audioRef.current.addEventListener('ended', () => {
        onToggle()
        setCurrentTime(0)
      })
    }

    if (isPlaying) {
      audioRef.current.play()
    } else {
      audioRef.current.pause()
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.removeEventListener('loadedmetadata', () => {})
        audioRef.current.removeEventListener('timeupdate', () => {})
        audioRef.current.removeEventListener('ended', () => {})
      }
    }
  }, [isPlaying, audioUrl, onToggle])

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
        gap: '12px',
        padding: '12px',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flex: 1, height: '36px' }}>
        {[...Array(20)].map((_, i) => {
          const baseHeight = 8 + (Math.sin(i * 0.5) * 12)
          const animationDelay = `${i * 0.05}s`
          
          return (
            <div
              key={i}
              style={{
                width: '3px',
                height: `${baseHeight}px`,
                background: i / 20 < progress / 100 ? accentColor : 'rgba(255,255,255,0.3)',
                borderRadius: '2px',
                animation: isPlaying ? 'waveform-pulse 1s ease-in-out infinite' : 'none',
                animationDelay,
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
      `}</style>
    </div>
  )
}
