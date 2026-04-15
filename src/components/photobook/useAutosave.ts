'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'

/**
 * Autosave status — reflected in the top toolbar pill.
 * - idle:   nothing to save (pristine since load or since last successful save)
 * - saving: a save is in flight
 * - saved:  last save succeeded at savedAt
 * - failed: last save threw or returned null — user should know
 */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'failed'

export interface AutosaveOptions {
  /** ms between dirty-checks + save attempts. Default 10_000. */
  intervalMs?: number
  /** Returns true when save succeeded. `save()` implementations should return the project row or null on failure. */
  save: () => Promise<unknown | null>
  /** Whether the editor currently has a target row to save against. */
  canSave: boolean
}

export interface AutosaveApi {
  status: AutosaveStatus
  savedAt: Date | null
  /** Call after any user-initiated mutation (page/cover/options/overlay change). */
  markDirty: () => void
  /** Trigger an immediate save; resolves when done. Safe to call concurrently (guarded by savingRef). */
  saveNow: () => Promise<void>
  /** Human-readable "Saved Xs ago". Refreshed via internal ticker. */
  relativeLabel: string
}

/**
 * Robust editor autosave:
 * - Fires every `intervalMs` while dirty (default 10s)
 * - Skips overlapping saves via savingRef
 * - Saves on `beforeunload` if dirty, so navigation doesn't drop work
 * - Ticker refreshes the "Xs ago" label every 15s without re-rendering on every keystroke
 */
export function useAutosave({
  intervalMs = 10_000,
  save,
  canSave,
}: AutosaveOptions): AutosaveApi {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [relativeLabel, setRelativeLabel] = useState<string>('')

  // Use refs to avoid stale-closure trouble inside intervals / unload handlers.
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const saveRef = useRef(save)
  const canSaveRef = useRef(canSave)

  useEffect(() => { saveRef.current = save }, [save])
  useEffect(() => { canSaveRef.current = canSave }, [canSave])

  const markDirty = useCallback(() => {
    dirtyRef.current = true
  }, [])

  const saveNow = useCallback(async () => {
    if (savingRef.current) return
    if (!canSaveRef.current) return
    if (!dirtyRef.current) return
    savingRef.current = true
    setStatus('saving')
    // Optimistically clear dirty — new edits during the save will re-set it
    // and trigger another cycle on the next interval tick.
    dirtyRef.current = false
    try {
      const result = await saveRef.current()
      if (result) {
        setSavedAt(new Date())
        setStatus('saved')
      } else {
        // Save returned null — keep dirty so the next tick retries.
        dirtyRef.current = true
        setStatus('failed')
      }
    } catch {
      dirtyRef.current = true
      setStatus('failed')
    } finally {
      savingRef.current = false
    }
  }, [])

  // 10-second dirty-check tick
  useEffect(() => {
    const id = window.setInterval(() => {
      if (dirtyRef.current && canSaveRef.current && !savingRef.current) {
        void saveNow()
      }
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, saveNow])

  // Flush on navigation
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        // Best-effort: fire the save (can't await in beforeunload).
        void saveRef.current()
        // Prompt user so the tab stays long enough for the request to leave.
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // Relative timestamp ticker — 15s cadence is plenty for "Xs/Xm ago".
  useEffect(() => {
    const render = () => {
      if (!savedAt) {
        setRelativeLabel('')
        return
      }
      const seconds = Math.round((Date.now() - savedAt.getTime()) / 1000)
      if (seconds < 5) {
        setRelativeLabel('just now')
      } else {
        setRelativeLabel(`${formatDistanceToNowStrict(savedAt)} ago`)
      }
    }
    render()
    const id = window.setInterval(render, 15_000)
    return () => window.clearInterval(id)
  }, [savedAt])

  return { status, savedAt, markDirty, saveNow, relativeLabel }
}
