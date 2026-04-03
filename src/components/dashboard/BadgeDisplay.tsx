'use client'

import { useState, useEffect } from 'react'
import { Lock, ChevronDown } from 'lucide-react'
import { useGamificationConfig } from '@/hooks/useGamificationConfig'

interface Badge {
  badge_type: string
  badge_name: string
  badge_emoji: string
  earned_at?: string
}

function getCriteriaLabel(criteria: { metric: string, threshold: number }): string {
  const labels: Record<string, string> = {
    memories: 'memories',
    photos: 'photos uploaded',
    voices: 'voice recordings',
    shares: 'memories shared',
    tags: 'people tagged',
    streak: 'day streak',
    complete_memories: 'complete memories',
  }
  return `${criteria.threshold} ${labels[criteria.metric] || criteria.metric}`
}

export default function BadgeDisplay() {
  const { config } = useGamificationConfig()
  const [earned, setEarned] = useState<Badge[]>([])
  const [newlyEarned, setNewlyEarned] = useState<string[]>([])
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    checkBadges()
    const el = document.querySelector('.feed-page')
    if (el) setIsDark(el.getAttribute('data-theme') === 'dark')
    const observer = new MutationObserver(() => {
      const feedEl = document.querySelector('.feed-page')
      if (feedEl) setIsDark(feedEl.getAttribute('data-theme') === 'dark')
    })
    if (el) observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const checkBadges = async () => {
    try {
      const checkRes = await fetch('/api/badges/check', { method: 'POST' })
      if (checkRes.ok) {
        const data = await checkRes.json()
        setEarned(data.earned || [])
        setNewlyEarned(data.newlyEarned || [])
      }
    } catch {
      try {
        const res = await fetch('/api/badges')
        if (res.ok) {
          const data = await res.json()
          setEarned(data.earned || [])
        }
      } catch {}
    }
  }

  const allBadges = config.badges
  if (allBadges.length === 0) return null

  const earnedTypes = new Set(earned.map(b => b.badge_type))

  return (
    <div style={{ marginBottom: '4px' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          fontSize: '11px',
          fontWeight: '700',
          color: isDark ? 'rgba(255,255,255,0.45)' : '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        🏆 Badges
        <ChevronDown
          size={12}
          style={{
            transition: 'transform 0.2s ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            opacity: 0.6,
          }}
        />
      </button>

      <div style={{
        maxHeight: expanded ? '80px' : '0px',
        overflow: 'hidden',
        transition: 'max-height 0.25s ease',
      }}>
        <div className="badge-scroll" style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '4px',
          paddingTop: '6px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: isDark ? 'rgba(255,255,255,0.15) transparent' : 'rgba(0,0,0,0.12) transparent',
        }}>
          {allBadges.map((def) => {
            const isEarned = earnedTypes.has(def.type)
            const isNew = newlyEarned.includes(def.type)
            const badge = earned.find(b => b.badge_type === def.type)
            const isSelected = selectedBadge === def.type

            return (
              <div
                key={def.type}
                onClick={() => setSelectedBadge(isSelected ? null : def.type)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '6px 8px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  minWidth: '52px',
                  background: isSelected
                    ? (isDark ? 'rgba(255,255,255,0.06)' : '#2D5A3D15')
                    : 'transparent',
                  border: isNew ? '2px solid #C4A235' : '1px solid transparent',
                  opacity: isEarned ? 1 : 0.35,
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
                title={isEarned ? `${def.name} — Earned ${badge?.earned_at ? new Date(badge.earned_at).toLocaleDateString() : ''}` : def.description}
              >
                <div style={{ fontSize: '20px', position: 'relative' }}>
                  {isEarned ? def.emoji : (
                    <span style={{ filter: 'grayscale(1)' }}>{def.emoji}</span>
                  )}
                  {!isEarned && (
                    <Lock size={8} style={{ position: 'absolute', bottom: -2, right: -4, color: isDark ? '#666' : '#aaa' }} />
                  )}
                </div>
                <div style={{
                  fontSize: '9px',
                  fontWeight: '600',
                  color: isEarned ? (isDark ? '#e0e0e0' : '#333') : (isDark ? '#666' : '#999'),
                  textAlign: 'center',
                  lineHeight: '1.2',
                  maxWidth: '52px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {def.name}
                </div>

                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: isDark ? '#333' : '#fff',
                    color: isDark ? '#fff' : '#333',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    whiteSpace: 'normal',
                    zIndex: 20,
                    marginBottom: '6px',
                    boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.15)',
                    maxWidth: '220px',
                    width: 'max-content',
                    lineHeight: '1.4',
                    textAlign: 'center',
                    border: isDark ? 'none' : '1px solid #e0e0e0',
                  }}>
                    <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '12px' }}>
                      {def.emoji} {def.name}
                    </div>
                    {isEarned ? (
                      <>
                        <div style={{ color: isDark ? '#ccc' : '#666', fontSize: '10px' }}>
                          {def.congratsMessage}
                        </div>
                        {badge?.earned_at && (
                          <div style={{ color: isDark ? '#999' : '#aaa', fontSize: '9px', marginTop: '4px' }}>
                            Earned on {new Date(badge.earned_at).toLocaleDateString()}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ color: isDark ? '#ccc' : '#666', fontSize: '10px' }}>
                          {def.description}
                        </div>
                        {def.criteria && (
                          <div style={{ color: '#C4A235', fontSize: '10px', marginTop: '4px', fontWeight: '600' }}>
                            🎯 Need {getCriteriaLabel(def.criteria)}
                          </div>
                        )}
                      </>
                    )}
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: `6px solid ${isDark ? '#333' : '#fff'}`,
                    }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
