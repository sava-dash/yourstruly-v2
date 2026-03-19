'use client'

import { useState, useEffect } from 'react'
import { DEFAULT_CONFIG, type GamificationConfig } from '@/lib/gamification-config'

let cachedConfig: GamificationConfig | null = null
let fetchPromise: Promise<GamificationConfig> | null = null

async function fetchConfig(): Promise<GamificationConfig> {
  try {
    const res = await fetch('/api/admin/gamification')
    if (res.ok) {
      const data = await res.json()
      cachedConfig = data
      return data
    }
  } catch {}
  return DEFAULT_CONFIG
}

export function useGamificationConfig() {
  const [config, setConfig] = useState<GamificationConfig>(cachedConfig || DEFAULT_CONFIG)
  const [loading, setLoading] = useState(!cachedConfig)

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig)
      setLoading(false)
      return
    }

    if (!fetchPromise) {
      fetchPromise = fetchConfig()
    }

    fetchPromise.then(c => {
      setConfig(c)
      setLoading(false)
    })
  }, [])

  return { config, loading }
}

// Force refresh (after admin saves)
export function invalidateGamificationConfig() {
  cachedConfig = null
  fetchPromise = null
}
