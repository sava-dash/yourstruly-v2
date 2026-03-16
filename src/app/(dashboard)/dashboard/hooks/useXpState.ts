'use client'

import { useState, useEffect, useCallback } from 'react'

export interface CompletedTile {
  id: string
  type: string
  title: string
  xp?: number
  photoUrl?: string
  contactName?: string
  contactId?: string
  memoryId?: string
  photoId?: string
  knowledgeId?: string
  resultMemoryId?: string
  answeredAt: string
}

export function useXpState(userId: string | null) {
  const [totalXp, setTotalXp] = useState(0)
  const [xpAnimating, setXpAnimating] = useState(false)
  const [lastXpGain, setLastXpGain] = useState(0)
  const [completedTiles, setCompletedTiles] = useState<CompletedTile[]>([])

  // Load saved state from user-scoped localStorage
  useEffect(() => {
    if (!userId) {
      setCompletedTiles([])
      setTotalXp(0)
      return
    }
    
    // Clean up old non-scoped keys
    localStorage.removeItem('yt_completed_tiles')
    localStorage.removeItem('yt_total_xp')
    
    const saved = localStorage.getItem(`yt_completed_tiles_${userId}`)
    const savedXp = localStorage.getItem(`yt_total_xp_${userId}`)
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          const seen = new Set<string>()
          const deduped = parsed.filter((tile: CompletedTile) => {
            if (seen.has(tile.id)) return false
            seen.add(tile.id)
            return true
          })
          setCompletedTiles(deduped)
        }
      } catch (e) {
        console.error('Failed to parse completed tiles:', e)
      }
    } else {
      setCompletedTiles([])
    }
    
    if (savedXp) {
      setTotalXp(parseInt(savedXp, 10) || 0)
    } else {
      setTotalXp(0)
    }
  }, [userId])

  // Save completed tiles to localStorage
  useEffect(() => {
    if (!userId || completedTiles.length === 0) return
    localStorage.setItem(`yt_completed_tiles_${userId}`, JSON.stringify(completedTiles))
  }, [completedTiles, userId])

  const addXp = useCallback((amount: number) => {
    if (amount <= 0 || !userId) return
    
    setLastXpGain(amount)
    setXpAnimating(true)
    setTotalXp(prev => {
      const newXp = prev + amount
      localStorage.setItem(`yt_total_xp_${userId}`, String(newXp))
      return newXp
    })
    setTimeout(() => setXpAnimating(false), 1500)
  }, [userId])

  const addCompletedTile = useCallback((tile: Omit<CompletedTile, 'answeredAt'>) => {
    setCompletedTiles(prev => {
      if (prev.some(t => t.id === tile.id)) return prev
      return [{
        ...tile,
        answeredAt: new Date().toISOString(),
      }, ...prev]
    })
  }, [])

  return {
    totalXp,
    xpAnimating,
    lastXpGain,
    completedTiles,
    addXp,
    addCompletedTile,
  }
}
