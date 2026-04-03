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
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    fetchChallenges()
    // Detect dark mode from closest feed-page ancestor
    const el = document.querySelector('.feed-page')
    if (el) setIsDark(el.getAttribute('data-theme') === 'dark')
    // Observe theme changes
    const observer = new MutationObserver(() => {
      const feedEl = document.querySelector('.feed-page')
      if (feedEl) setIsDark(feedEl.getAttribute('data-theme') === 'dark')
    })
    if (el) observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
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

  // Theme colors
  const t = {
    cardBg: isDark ? 'rgba(40, 40, 40, 0.92)' : 'rgba(255,255,255,0.95)',
    cardBorder: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(64,106,86,0.1)',
    headerColor: isDark ? '#8DACAB' : '#2D5A3D',
    divider: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0',
    iconBg: isDark ? 'rgba(255,255,255,0.08)' : '#f5f5f5',
    labelColor: isDark ? 'rgba(255,255,255,0.8)' : '#333',
    labelDone: isDark ? 'rgba(255,255,255,0.4)' : '#888',
    progressTrack: isDark ? 'rgba(255,255,255,0.08)' : '#eee',
    countColor: isDark ? 'rgba(255,255,255,0.4)' : '#888',
  }

  return (
    <div style={{
      padding: 0,
      overflow: 'hidden',
      background: t.cardBg,
      border: t.cardBorder,
      borderRadius: '16px',
      backdropFilter: 'blur(12px)',
      boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        padding: '12px 14px 8px',
        fontSize: '12px',
        fontWeight: '700',
        color: t.headerColor,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: `1px solid ${t.divider}`,
      }}>
        Weekly Challenges
      </div>
      <div>
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
                borderBottom: i < challenges.length - 1 ? `1px solid ${t.divider}` : 'none',
                opacity: c.completed ? 0.6 : 1,
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: c.completed ? '#2D5A3D' : t.iconBg,
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

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: c.completed ? t.labelDone : t.labelColor,
                  marginBottom: '6px',
                  textDecoration: c.completed ? 'line-through' : 'none',
                }}>
                  {c.challenge_label}
                </div>

                <div style={{
                  height: '4px',
                  background: t.progressTrack,
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: c.completed ? '#2D5A3D' : '#C4A235',
                    borderRadius: '2px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: t.countColor }}>
                  {c.current_count}/{c.target_count}
                </span>
                <span style={{ fontSize: '10px', fontWeight: '600', color: c.completed ? '#2D5A3D' : '#C4A235' }}>
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
