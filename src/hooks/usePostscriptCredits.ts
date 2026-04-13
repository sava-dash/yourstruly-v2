'use client'

import { useState, useEffect, useCallback } from 'react'

export interface PostscriptCredits {
  total_credits: number
  used_this_month: number
  is_premium: boolean
  seat_count: number
  monthly_allowance: number
  next_refresh_date: string | null
}

export interface XPInfo {
  available: number
  trade_cost: number
}

export interface PostscriptCreditData {
  credits: PostscriptCredits
  xp: XPInfo
}

export function usePostscriptCredits() {
  const [data, setData] = useState<PostscriptCreditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/postscripts/credits')
      if (!res.ok) {
        if (res.status === 401) {
          setData(null)
          return
        }
        throw new Error('Failed to fetch credits')
      }
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      console.error('Error fetching credits:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  const tradeXP = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/postscripts/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trade_xp' })
      })
      const json = await res.json()
      
      if (!res.ok) {
        return { success: false, message: json.error || 'Failed to trade XP' }
      }
      
      // Refresh credits + XP counter after trade
      await fetchCredits()
      // Notify dashboard to refresh XP display
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('yt:xp-refresh'))
      }
      return { success: true, message: json.message }
    } catch (err) {
      return { success: false, message: 'Network error' }
    }
  }, [fetchCredits])

  const purchaseBundle = useCallback(async (bundleType: '1_pack' | '5_pack'): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/postscripts/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purchase', bundle_type: bundleType })
      })
      const json = await res.json()
      
      if (!res.ok) {
        return { success: false, message: json.error || 'Failed to purchase' }
      }
      
      // Refresh credits after purchase
      await fetchCredits()
      return { success: true, message: json.message }
    } catch (err) {
      return { success: false, message: 'Network error' }
    }
  }, [fetchCredits])

  return {
    credits: data?.credits ?? null,
    xp: data?.xp ?? null,
    loading,
    error,
    refetch: fetchCredits,
    tradeXP,
    purchaseBundle,
    canCreatePostscript: (data?.credits?.total_credits ?? 0) > 0,
    canTradeXP: (data?.xp?.available ?? 0) >= (data?.xp?.trade_cost ?? 200)
  }
}
