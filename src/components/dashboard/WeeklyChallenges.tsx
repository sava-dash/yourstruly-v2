'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'

interface Challenge {
  id: string
  challenge_type: string
  challenge_label: string
  challenge_emoji: string
  target_count: number
  current_count: number
  xp_reward: number
  completed: boolean
}

export default function WeeklyChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChallenges()
  }, [])

  const fetchChallenges = async () => {
    try {
      const res = await fetch('/api/challenges')
      if (res.ok) {
        const data = await res.json()
        setChallenges(data.challenges || [])
      }
    } catch (err) {
      console.error('Failed to fetch challenges:', err)
    }
    setLoading(false)
  }

  if (loading) return null
  if (challenges.length === 0) return null

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', marginBottom: '10px' }}>
        Weekly Challenges
      </div>

      <div style={{
        background: '#fff',
        border: '1px solid #eee',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {challenges.map((c, i) => {
          const progress = Math.min((c.current_count / c.target_count) * 100, 100)

          return (
            <div
              key={c.id}
              style={{
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderBottom: i < challenges.length - 1 ? '1px solid #f0f0f0' : 'none',
                opacity: c.completed ? 0.6 : 1,
              }}
            >
              {/* Completion check or emoji */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: c.completed ? '#406A56' : '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {c.completed ? (
                  <Check size={14} color="#fff" />
                ) : (
                  <span style={{ fontSize: '14px' }}>{c.challenge_emoji}</span>
                )}
              </div>

              {/* Label + progress */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: c.completed ? '#888' : '#333',
                  marginBottom: '6px',
                  textDecoration: c.completed ? 'line-through' : 'none',
                }}>
                  {c.challenge_label}
                </div>

                {/* Progress bar — same style as storage/data usage bar */}
                <div style={{
                  height: '4px',
                  background: '#eee',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: c.completed ? '#406A56' : '#D9C61A',
                    borderRadius: '2px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>

              {/* Count + XP */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#888' }}>
                  {c.current_count}/{c.target_count}
                </span>
                <span style={{ fontSize: '10px', fontWeight: '600', color: c.completed ? '#406A56' : '#D9C61A' }}>
                  {c.completed ? '✓ Done' : `⚡${c.xp_reward} XP`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
