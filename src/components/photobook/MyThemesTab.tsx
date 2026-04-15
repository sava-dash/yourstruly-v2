'use client'

/**
 * MyThemesTab — lists user-saved photobook themes and lets the owner apply
 * one (which rebuilds the current page sequence from the snapshot) or delete
 * one. Designed to slot into the existing ThemePicker modal as a second tab.
 */

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Trash2, Sparkles, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getTemplateById } from '@/lib/photobook/templates'
import type { ThemePage, ApplyThemeResult } from './ThemePicker'
import type { PhotobookTheme } from '@/lib/photobook/themes'

interface UserTheme {
  id: string
  name: string
  description: string | null
  snapshot_json: ThemeSnapshot
  created_at: string
}

interface ThemeSnapshot {
  version: number
  pageSequence: string[]
  pages?: Array<{
    pageNumber: number
    pageType: string
    layoutId: string
    slots: Array<Record<string, unknown>>
    background?: unknown
    overlays?: unknown[]
  }>
  coverDesign?: {
    title?: string
    subtitle?: string
    backText?: string
    spineText?: string
    textColor?: string
    fontPair?: string
  } | null
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Convert a saved snapshot back into a ThemePage[] the editor can adopt.
 * Existing photos in the user's current pages are carried by slot index when
 * the slot type matches the new template (mirrors PHOTOBOOK_THEMES behavior).
 */
export function buildPagesFromUserTheme(
  snapshot: ThemeSnapshot,
  currentPages: ThemePage[]
): ThemePage[] {
  return snapshot.pageSequence
    .map((templateId, i): ThemePage | null => {
      const tpl = getTemplateById(templateId)
      if (!tpl) return null
      const existing = currentPages[i]
      const slots = tpl.slots.map((s, slotIdx) => {
        const carry = existing?.slots?.[slotIdx]
        const base: ThemePage['slots'][number] = {
          slotId: s.id,
          type: s.type,
        }
        if (carry && carry.type === s.type) {
          if (s.type === 'photo') {
            base.memoryId = carry.memoryId
            base.mediaId = carry.mediaId
            base.fileUrl = carry.fileUrl
          } else if (s.type === 'text') {
            base.text = carry.text
          } else if (s.type === 'qr') {
            base.qrMemoryId = carry.qrMemoryId
            base.qrWisdomId = carry.qrWisdomId
          }
        }
        return base
      })
      return {
        id: uid(),
        pageNumber: i + 1,
        layoutId: tpl.id,
        slots,
        background: tpl.background,
      }
    })
    .filter((p): p is ThemePage => p !== null)
}

interface Props {
  currentPages: ThemePage[]
  /**
   * Re-uses the same ApplyThemeResult shape so the parent ThemePicker can
   * funnel both built-in and user themes through one onApply handler.
   */
  onApply: (result: ApplyThemeResult) => void
}

export default function MyThemesTab({ currentPages, onApply }: Props) {
  const supabase = createClient()
  const [themes, setThemes] = useState<UserTheme[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('photobook_user_themes')
      .select('id, name, description, snapshot_json, created_at')
      .order('created_at', { ascending: false })
    if (!error && data) setThemes(data as UserTheme[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const handleApply = (theme: UserTheme) => {
    const proceed =
      currentPages.length === 0
        ? true
        : typeof window !== 'undefined'
          ? window.confirm(
              `Applying "${theme.name}" will replace your page layout. Photos you've already added will be kept where they fit. Continue?`
            )
          : true
    if (!proceed) return
    setBusyId(theme.id)
    const newPages = buildPagesFromUserTheme(theme.snapshot_json, currentPages)
    // Synthesize a PhotobookTheme so the parent's onApply signature stays consistent.
    const synth: PhotobookTheme = {
      id: `user:${theme.id}`,
      name: theme.name,
      description: theme.description || 'Saved by you',
      accentColor: '#406A56',
      fontPair:
        (theme.snapshot_json.coverDesign?.fontPair as PhotobookTheme['fontPair']) ||
        'classic',
      coverPreset: {
        title: theme.snapshot_json.coverDesign?.title || theme.name,
        subtitle: theme.snapshot_json.coverDesign?.subtitle || '',
        backText: theme.snapshot_json.coverDesign?.backText || '',
        spineText: theme.snapshot_json.coverDesign?.spineText || theme.name,
        textColor:
          (theme.snapshot_json.coverDesign?.textColor as PhotobookTheme['coverPreset']['textColor']) ||
          '#F2F1E5',
        fontPair:
          (theme.snapshot_json.coverDesign?.fontPair as PhotobookTheme['fontPair']) ||
          'classic',
      },
      pageSequence: theme.snapshot_json.pageSequence,
    }
    onApply({ theme: synth, pages: newPages })
    setTimeout(() => setBusyId(null), 600)
  }

  const handleDelete = async (theme: UserTheme) => {
    if (!window.confirm(`Delete "${theme.name}"? This can't be undone.`)) return
    setBusyId(theme.id)
    try {
      const { error } = await supabase
        .from('photobook_user_themes')
        .delete()
        .eq('id', theme.id)
      if (error) {
        alert('Failed to delete theme')
        return
      }
      setThemes((t) => t.filter((x) => x.id !== theme.id))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#5A6660] gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your designs...
      </div>
    )
  }

  if (themes.length === 0) {
    return (
      <div className="text-center py-10 px-4">
        <Layers className="w-10 h-10 mx-auto text-[#D3E1DF] mb-3" />
        <p className="text-base font-medium text-[#2A3E33] mb-1">No saved designs yet</p>
        <p className="text-sm text-[#5A6660]">
          Build a layout you love, then click <span className="font-medium">Save as my theme</span> in the editor.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#C35F33]" />
        <h2
          className="text-lg font-semibold text-[#2A3E33]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          My designs
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {themes.map((theme) => {
          const pageCount = theme.snapshot_json.pageSequence?.length ?? 0
          const isBusy = busyId === theme.id
          return (
            <div
              key={theme.id}
              className="p-4 rounded-2xl border-2 border-[#DDE3DF] bg-white flex flex-col"
            >
              <div
                className="h-20 rounded-lg mb-3 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #C35F33, #406A56)',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: '#F2F1E5',
                }}
              >
                <span className="text-base font-semibold px-2 text-center">{theme.name}</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#2A3E33]">{theme.name}</div>
                {theme.description && (
                  <div className="text-xs text-[#5A6660] mt-1">{theme.description}</div>
                )}
                <div className="text-xs text-[#5A6660] mt-2">
                  {pageCount} pages · saved {new Date(theme.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => handleApply(theme)}
                  disabled={isBusy}
                  className="flex-1 min-h-[44px] px-3 rounded-lg bg-[#406A56] text-white text-sm font-medium hover:bg-[#345548] disabled:opacity-50 inline-flex items-center justify-center gap-1"
                >
                  {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(theme)}
                  disabled={isBusy}
                  aria-label={`Delete ${theme.name}`}
                  className="min-h-[44px] min-w-[44px] px-3 rounded-lg border border-[#C35F33] text-[#C35F33] text-sm font-medium hover:bg-[#C35F33]/10 disabled:opacity-50 inline-flex items-center justify-center"
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
