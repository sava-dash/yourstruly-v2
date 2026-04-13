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
  const [loaded, setLoaded] = useState(false)

  // Load XP from database on mount
  useEffect(() => {
    if (!userId) {
      setCompletedTiles([])
      setTotalXp(0)
      setLoaded(false)
      return
    }

    let cancelled = false

    const loadXp = async () => {
      try {
        const res = await fetch('/api/xp')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setTotalXp(data.totalXp ?? 0)
            setLoaded(true)
          }
        }
      } catch (err) {
        console.error('Failed to load XP:', err)
      }

      // Migrate any localStorage XP to database (one-time)
      const localXp = localStorage.getItem(`yt_total_xp_${userId}`)
      if (localXp && parseInt(localXp, 10) > 0 && !cancelled) {
        const amount = parseInt(localXp, 10)
        try {
          const res = await fetch('/api/xp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, reason: 'migration_from_local', sourceId: 'localStorage' }),
          })
          if (res.ok) {
            const data = await res.json()
            if (!cancelled) setTotalXp(data.totalXp ?? amount)
            // Clear localStorage after successful migration
            localStorage.removeItem(`yt_total_xp_${userId}`)
            localStorage.removeItem(`yt_completed_tiles_${userId}`)
          }
        } catch {
          // Migration failed — will retry next load
        }
      }
    }

    loadXp()

    // Load completed tiles from localStorage (still useful for dedup on client)
    const saved = localStorage.getItem(`yt_completed_tiles_${userId}`)
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
      } catch {}
    }

    // Clean up old non-scoped keys
    localStorage.removeItem('yt_completed_tiles')
    localStorage.removeItem('yt_total_xp')

    return () => { cancelled = true }
  }, [userId])

  // Save completed tiles to localStorage (client-side dedup only)
  useEffect(() => {
    if (!userId || completedTiles.length === 0) return
    localStorage.setItem(`yt_completed_tiles_${userId}`, JSON.stringify(completedTiles))
  }, [completedTiles, userId])

  const addXp = useCallback(async (amount: number, reason = 'prompt_answered', sourceId?: string) => {
    if (amount <= 0 || !userId) return

    // Optimistic update
    setLastXpGain(amount)
    setXpAnimating(true)
    setTotalXp(prev => prev + amount)
    setTimeout(() => setXpAnimating(false), 1500)

    // Persist to database
    try {
      const res = await fetch('/api/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason, sourceId }),
      })
      if (res.ok) {
        const data = await res.json()
        setTotalXp(data.totalXp) // sync with server truth
      }
    } catch (err) {
      console.error('Failed to save XP:', err)
      // Optimistic update stays — will sync on next load
    }
  }, [userId])

  // Refetch XP from the server so the counter stays current after
  // chain saves (where the server awards XP but the client doesn't
  // call addXp).
  const refreshXp = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch('/api/xp')
      if (res.ok) {
        const data = await res.json()
        setTotalXp(data.totalXp ?? 0)
      }
    } catch {}
  }, [userId])

  // Listen for XP refresh events (e.g. after trading XP for postscript credits)
  useEffect(() => {
    const handler = () => refreshXp()
    window.addEventListener('yt:xp-refresh', handler)
    return () => window.removeEventListener('yt:xp-refresh', handler)
  }, [refreshXp])

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
    refreshXp,
    addCompletedTile,
    loaded,
  }
}
