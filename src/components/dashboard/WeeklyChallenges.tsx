'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Check, Loader2 } from 'lucide-react'

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
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
          🎯 Weekly Challenges
        </h3>
        <span style={{ fontSize: '11px', color: '#888' }}>Resets Monday</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
      }}>
        {challenges.map((c) => {
          const progress = Math.min((c.current_count / c.target_count) * 100, 100)
          const progressColor = c.completed ? '#406A56' : progress > 50 ? '#D9C61A' : '#C35F33'

          return (
            <div
              key={c.id}
              style={{
                background: c.completed ? '#406A5610' : '#fff',
                border: `1px solid ${c.completed ? '#406A5630' : '#eee'}`,
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {c.completed && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#406A56',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check size={12} color="#fff" />
                </div>
              )}

              <div style={{ fontSize: '20px' }}>{c.challenge_emoji}</div>

              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#333',
                lineHeight: '1.3',
              }}>
                {c.challenge_label}
              </div>

              {/* Progress bar */}
              <div>
                <div style={{
                  height: '4px',
                  background: '#eee',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: progressColor,
                    borderRadius: '2px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '4px',
                  fontSize: '10px',
                  color: '#888',
                }}>
                  <span>{c.current_count}/{c.target_count}</span>
                  <span style={{ color: '#D9C61A', fontWeight: '600' }}>
                    {c.completed ? '✅ Claimed!' : `⚡${c.xp_reward} XP`}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
