'use client'

import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'
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

  useEffect(() => {
    checkBadges()
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
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        fontSize: '11px',
        fontWeight: '700',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '8px',
      }}>
        🏆 Badges ({earned.length}/{allBadges.length})
      </div>

      <div className="badge-scroll" style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '4px',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
        scrollbarColor: '#555 #333',
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
                background: isSelected ? (isEarned ? '#406A5615' : '#f5f5f5') : 'transparent',
                border: isNew ? '2px solid #D9C61A' : '1px solid transparent',
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
                  <Lock size={8} style={{ position: 'absolute', bottom: -2, right: -4, color: '#aaa' }} />
                )}
              </div>
              <div style={{
                fontSize: '9px',
                fontWeight: '600',
                color: isEarned ? '#e0e0e0' : '#666',
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
                  background: '#333',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  whiteSpace: 'normal',
                  zIndex: 20,
                  marginBottom: '6px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                  maxWidth: '220px',
                  width: 'max-content',
                  lineHeight: '1.4',
                  textAlign: 'center',
                }}>
                  <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '12px' }}>
                    {def.emoji} {def.name}
                  </div>
                  {isEarned ? (
                    <>
                      <div style={{ color: '#ccc', fontSize: '10px' }}>
                        {def.congratsMessage}
                      </div>
                      {badge?.earned_at && (
                        <div style={{ color: '#999', fontSize: '9px', marginTop: '4px' }}>
                          Earned on {new Date(badge.earned_at).toLocaleDateString()}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ color: '#ccc', fontSize: '10px' }}>
                        {def.description}
                      </div>
                      {def.criteria && (
                        <div style={{ color: '#D9C61A', fontSize: '10px', marginTop: '4px', fontWeight: '600' }}>
                          🎯 Need {getCriteriaLabel(def.criteria)}
                        </div>
                      )}
                    </>
                  )}
                  {/* Arrow pointing down */}
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid #333',
                  }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
