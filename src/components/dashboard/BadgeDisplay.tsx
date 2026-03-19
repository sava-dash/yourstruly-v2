'use client'

import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'

interface Badge {
  badge_type: string
  badge_name: string
  badge_emoji: string
  earned_at?: string
}

interface BadgeDef {
  type: string
  name: string
  emoji: string
  description: string
}

export default function BadgeDisplay() {
  const [earned, setEarned] = useState<Badge[]>([])
  const [allBadges, setAllBadges] = useState<BadgeDef[]>([])
  const [newlyEarned, setNewlyEarned] = useState<string[]>([])
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null)

  useEffect(() => {
    checkBadges()
  }, [])

  const checkBadges = async () => {
    try {
      // Check for new badges
      const checkRes = await fetch('/api/badges/check', { method: 'POST' })
      if (checkRes.ok) {
        const data = await checkRes.json()
        setEarned(data.earned || [])
        setAllBadges(data.all || [])
        setNewlyEarned(data.newlyEarned || [])
      }
    } catch (err) {
      // Fallback: just fetch existing
      try {
        const res = await fetch('/api/badges')
        if (res.ok) {
          const data = await res.json()
          setEarned(data.earned || [])
          setAllBadges(data.all || [])
        }
      } catch {}
    }
  }

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

      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '4px',
        WebkitOverflowScrolling: 'touch',
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
                  <span style={{ filter: 'grayscale(1)' }}>
                    {def.emoji}
                  </span>
                )}
                {!isEarned && (
                  <Lock size={8} style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -4,
                    color: '#aaa',
                  }} />
                )}
              </div>
              <div style={{
                fontSize: '8px',
                fontWeight: '600',
                color: isEarned ? '#333' : '#aaa',
                textAlign: 'center',
                lineHeight: '1.2',
                maxWidth: '52px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {def.name}
              </div>

              {/* Tooltip on click */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#333',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                  zIndex: 20,
                  marginBottom: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}>
                  {isEarned
                    ? `Earned ${badge?.earned_at ? new Date(badge.earned_at).toLocaleDateString() : ''}`
                    : def.description
                  }
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
