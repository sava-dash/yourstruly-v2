'use client'

import { useState, useEffect } from 'react'

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

export default function MonthlyRecap() {
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
    { label: 'Memories', value: recap.memories_count, emoji: '📝', color: '#406A56' },
    { label: 'Photos', value: recap.photos_count, emoji: '📸', color: '#C35F33' },
    { label: 'Voice', value: recap.voices_count, emoji: '🎙️', color: '#D9C61A' },
    { label: 'Wisdom', value: recap.wisdom_count, emoji: '💡', color: '#406A56' },
    { label: 'Tags', value: recap.tags_count, emoji: '👤', color: '#C35F33' },
  ].filter(s => s.value > 0)

  return (
    <div style={{
      background: 'linear-gradient(135deg, #406A56 0%, #2d4d3e 100%)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '24px',
      color: '#fff',
    }}>
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
          color: '#D9C61A',
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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {recap.highlights.map((h, i) => (
          <div key={i} style={{
            fontSize: '12px',
            opacity: 0.85,
            lineHeight: '1.4',
          }}>
            {h}
          </div>
        ))}
      </div>
    </div>
  )
}
