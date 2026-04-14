'use client'

/**
 * VersionHistoryPanel — sidebar drawer listing saved snapshots for a
 * photobook project. Supports: save-new, restore (with confirm), delete.
 */

import { useCallback, useEffect, useState } from 'react'
import { Clock, History, Loader2, RotateCcw, Save, Trash2, X } from 'lucide-react'

export interface VersionRow {
  id: string
  name: string
  created_at: string
}

interface Props {
  open: boolean
  onClose: () => void
  projectId: string | null
  /** Called after restore with the fresh pages from the server. */
  onRestored?: (pages: RestoredPage[]) => void
}

export interface RestoredPage {
  id: string
  page_number: number
  page_type: string
  layout_type: string
  content_json: unknown
  background_color: string | null
  background_image_url: string | null
}

function formatTimeAgo(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const m = Math.floor(diffMs / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

export default function VersionHistoryPanel({
  open,
  onClose,
  projectId,
  onRestored,
}: Props) {
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/photobook/projects/${projectId}/versions`)
      if (res.ok) {
        const data = await res.json()
        setVersions(data.versions ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  if (!open) return null

  const saveVersion = async () => {
    if (!projectId) {
      alert('Save your project at least once before creating a version.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/photobook/projects/${projectId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (err) {
      console.error('Save version failed:', err)
      alert('We couldn\'t save this version. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const restore = async (v: VersionRow) => {
    if (!projectId) return
    const ok = window.confirm(
      `Restoring "${v.name}" will replace your current pages. Continue?`,
    )
    if (!ok) return
    setBusyId(v.id)
    try {
      const res = await fetch(
        `/api/photobook/projects/${projectId}/versions/${v.id}/restore`,
        { method: 'POST' },
      )
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      onRestored?.(data.pages ?? [])
      alert('Version restored. Your pages have been updated.')
    } catch (err) {
      console.error('Restore failed:', err)
      alert('We couldn\'t restore this version. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (v: VersionRow) => {
    if (!projectId) return
    const ok = window.confirm(`Delete version "${v.name}"? This can't be undone.`)
    if (!ok) return
    setBusyId(v.id)
    try {
      const res = await fetch(
        `/api/photobook/projects/${projectId}/versions/${v.id}/restore`,
        { method: 'DELETE' },
      )
      if (!res.ok) throw new Error(await res.text())
      setVersions((vs) => vs.filter((x) => x.id !== v.id))
    } catch (err) {
      console.error('Delete failed:', err)
      alert('We couldn\'t delete this version. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-[380px] bg-white shadow-2xl border-l border-[#DDE3DF] z-50 flex flex-col"
      role="dialog"
      aria-label="Version history"
    >
      <div className="flex items-center justify-between p-4 border-b border-[#DDE3DF]">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#406A56]" />
          <h3 className="font-semibold text-[#2A3E33]">Version history</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close version history"
          className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[#F2F1E5] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 border-b border-[#DDE3DF]">
        <button
          type="button"
          onClick={saveVersion}
          disabled={saving || !projectId}
          className="w-full min-h-[52px] px-4 bg-[#406A56] text-white font-semibold rounded-xl hover:bg-[#345548] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving…' : 'Save version'}
        </button>
        {!projectId && (
          <p className="text-xs text-[#94A09A] mt-2">
            Pick a product to start your project, then you can save versions.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && (
          <div className="flex items-center gap-2 text-[#5A6660] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && versions.length === 0 && (
          <div className="text-sm text-[#666] p-4 rounded-lg bg-[#F2F1E5]">
            No saved versions yet. Use "Save version" to snapshot your current book.
          </div>
        )}
        {versions.map((v) => {
          const busy = busyId === v.id
          return (
            <div
              key={v.id}
              className="p-3 rounded-lg border border-[#DDE3DF] bg-white"
            >
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#406A56] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#2A3E33] truncate">{v.name}</div>
                  <div className="text-xs text-[#5A6660]">Saved {formatTimeAgo(v.created_at)}</div>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => restore(v)}
                  disabled={busy}
                  className="flex-1 min-h-[44px] px-3 rounded-lg border-2 border-[#406A56] text-[#406A56] font-medium text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => remove(v)}
                  disabled={busy}
                  aria-label={`Delete version ${v.name}`}
                  className="min-w-[44px] min-h-[44px] px-3 rounded-lg border-2 border-[#DDE3DF] text-[#C35F33] hover:border-[#C35F33] flex items-center justify-center disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
