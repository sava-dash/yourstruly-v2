'use client'

import { useState, useEffect, useRef } from 'react'
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

interface ChallengesResponse {
  challenges: Challenge[]
  weekStart: string
  streak: number
  streakBonus: number
}

export default function WeeklyChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [streak, setStreak] = useState(0)
  const [streakBonus, setStreakBonus] = useState(0)
  const [completedToast, setCompletedToast] = useState<{ label: string; xp: number } | null>(null)
  const prevCompletedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchChallenges()
    // Refetch when other parts of the app signal challenge-worthy activity
    // (e.g. after saving a cardchain)
    const onRefresh = () => fetchChallenges()
    window.addEventListener('yt:challenges-refresh', onRefresh)
    // Detect dark mode from closest feed-page ancestor
    const el = document.querySelector('.feed-page')
    if (el) setIsDark(el.getAttribute('data-theme') === 'dark')
    // Observe theme changes
    const observer = new MutationObserver(() => {
      const feedEl = document.querySelector('.feed-page')
      if (feedEl) setIsDark(feedEl.getAttribute('data-theme') === 'dark')
    })
    if (el) observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      window.removeEventListener('yt:challenges-refresh', onRefresh)
      observer.disconnect()
    }
  }, [])

  // Auto-dismiss completion toast after 3 seconds
  useEffect(() => {
    if (!completedToast) return
    const timer = setTimeout(() => setCompletedToast(null), 3000)
    return () => clearTimeout(timer)
  }, [completedToast])

  const fetchChallenges = async () => {
    try {
      const res = await fetch('/api/challenges')
      if (res.ok) {
        const data: ChallengesResponse = await res.json()
        const newChallenges = data.challenges || []

        // Detect newly completed challenges
        const prevCompleted = prevCompletedRef.current
        for (const c of newChallenges) {
          if (c.completed && !prevCompleted.has(c.id) && prevCompleted.size > 0) {
            setCompletedToast({ label: c.challenge_label, xp: c.xp_reward })
          }
        }
        prevCompletedRef.current = new Set(newChallenges.filter(c => c.completed).map(c => c.id))

        setChallenges(newChallenges)
        setStreak(data.streak || 0)
        setStreakBonus(data.streakBonus || 0)
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
    <div data-tour="weekly-challenges" style={{
      padding: 0,
      overflow: 'hidden',
      background: t.cardBg,
      border: t.cardBorder,
      borderRadius: '16px',
      backdropFilter: 'blur(12px)',
      boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
      position: 'relative',
    }}>
      {/* Completion toast */}
      {completedToast && (
        <div style={{
          position: 'absolute',
          top: '-48px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#406A56',
          color: '#fff',
          padding: '8px 18px',
          borderRadius: '9999px',
          fontSize: '13px',
          fontWeight: '600',
          fontFamily: "'Playfair Display', serif",
          whiteSpace: 'nowrap',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(64,106,86,0.3)',
          animation: 'fadeInUp 0.3s ease',
        }}>
          Challenge complete! +{completedToast.xp} XP
        </div>
      )}

      <div style={{
        padding: '12px 14px 8px',
        fontSize: '12px',
        fontWeight: '700',
        color: t.headerColor,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: `1px solid ${t.divider}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>Weekly Challenges</span>
        {streak > 0 && (
          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#C35F33',
            textTransform: 'none',
            letterSpacing: '0',
          }}>
            {streak}-week streak!{streakBonus > 0 ? ` +${streakBonus}%` : ''}
          </span>
        )}
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
                  {c.completed ? '\u2713 Done' : `\u26A1${c.xp_reward} XP`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
