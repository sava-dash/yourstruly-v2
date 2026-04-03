'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface RecapData {
  month: string
  monthName: string
  memories_count: number
  photos_count: number
  voices_count: number
  wisdom_count: number
  tags_count: number
  total_items: number
  highlights: string[]
}

interface MonthlyRecapProps {
  onClose?: () => void
}

export default function MonthlyRecap({ onClose }: MonthlyRecapProps) {
  const [recap, setRecap] = useState<RecapData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecap()
  }, [])

  const fetchRecap = async () => {
    try {
      const res = await fetch('/api/recap/monthly')
      if (res.ok) {
        const data = await res.json()
        if (data.total_items > 0) {
          setRecap(data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch recap:', err)
    }
    setLoading(false)
  }

  if (loading || !recap) return null

  const stats = [
    { label: 'Memories', value: recap.memories_count, emoji: '📝', color: '#2D5A3D' },
    { label: 'Photos', value: recap.photos_count, emoji: '📸', color: '#B8562E' },
    { label: 'Voice', value: recap.voices_count, emoji: '🎙️', color: '#C4A235' },
    { label: 'Wisdom', value: recap.wisdom_count, emoji: '💡', color: '#2D5A3D' },
    { label: 'Tags', value: recap.tags_count, emoji: '👤', color: '#B8562E' },
  ].filter(s => s.value > 0)

  const filteredHighlights = recap.highlights.filter(h => h && h.trim())

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div style={{
        background: 'linear-gradient(135deg, #2D5A3D 0%, #2d4d3e 100%)',
        borderRadius: '20px',
        padding: '24px',
        color: '#fff',
        width: 'min(420px, 90vw)',
        maxHeight: '85vh',
        overflow: 'auto',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Close button */}
        <button
          onClick={() => onClose?.()}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Monthly Recap
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '2px' }}>
              {recap.monthName}
            </div>
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: '800',
            color: '#C4A235',
          }}>
            {recap.total_items}
            <span style={{ fontSize: '12px', fontWeight: '500', opacity: 0.7, marginLeft: '4px' }}>items</span>
          </div>
        </div>

        {/* Stat grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(stats.length, 5)}, 1fr)`,
          gap: '8px',
          marginBottom: '16px',
        }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '10px 8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '16px', marginBottom: '2px' }}>{s.emoji}</div>
              <div style={{ fontSize: '18px', fontWeight: '700' }}>{s.value}</div>
              <div style={{ fontSize: '9px', opacity: 0.7, fontWeight: '600', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Highlights */}
        {filteredHighlights.length > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            {filteredHighlights.map((h, i) => (
              <div key={i} style={{
                fontSize: '12px',
                opacity: 0.85,
                lineHeight: '1.4',
              }}>
                {h}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
