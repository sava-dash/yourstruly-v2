'use client'

/**
 * AICaptionSuggester — small "✨ Suggest a caption" button + popover that
 * surfaces 3 short caption suggestions for a photo using EXIF (date + GPS)
 * and face-tag context. The button only shows when a referenced media id is
 * available (no point asking when we have no metadata to feed Claude).
 *
 * Click a suggestion to apply it via `onApply`, or hit "Refresh" for new ones.
 */

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Loader2, RefreshCw, X } from 'lucide-react'

interface Props {
  projectId: string
  /** Photo this caption should describe — must come from the page's first photo slot. */
  mediaId: string
  /** Called with the chosen caption text when the user picks one. */
  onApply: (caption: string) => void
  /** Optional className so the parent can position the trigger button. */
  className?: string
}

export default function AICaptionSuggester({
  projectId,
  mediaId,
  onApply,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const popoverRef = useRef<HTMLDivElement>(null)

  // Click-outside to close the popover.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  const fetchSuggestions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/photobook/projects/${projectId}/ai-caption`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mediaId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Could not generate captions')
        setSuggestions([])
        return
      }
      const list = Array.isArray(json.suggestions) ? (json.suggestions as string[]) : []
      setSuggestions(list)
      if (list.length === 0) {
        setError('No suggestions came back. Try refreshing.')
      }
    } catch (e) {
      console.error('AICaptionSuggester fetch error', e)
      setError('Network problem. Try again.')
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (suggestions.length === 0 && !loading) {
      void fetchSuggestions()
    }
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={handleOpen}
        className="min-h-[44px] px-3 rounded-lg bg-white border border-[#DDE3DF] text-[#406A56] text-sm font-medium hover:border-[#406A56] inline-flex items-center gap-1.5"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Sparkles className="w-4 h-4 text-[#C35F33]" />
        Suggest a caption
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          className="absolute z-30 mt-2 right-0 w-[280px] bg-white border border-[#DDE3DF] rounded-xl shadow-xl p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#2A3E33] uppercase tracking-wide">
              Suggestions
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void fetchSuggestions()}
                disabled={loading}
                aria-label="Refresh suggestions"
                className="min-w-[36px] min-h-[36px] rounded-md hover:bg-[#F2F1E5] inline-flex items-center justify-center text-[#406A56] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="min-w-[36px] min-h-[36px] rounded-md hover:bg-[#F2F1E5] inline-flex items-center justify-center text-[#5A6660]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading && suggestions.length === 0 ? (
            <div className="py-6 flex items-center justify-center text-sm text-[#5A6660] gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
            </div>
          ) : error ? (
            <p className="text-sm text-[#C35F33] py-2">{error}</p>
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-[#5A6660] py-2">No suggestions yet.</p>
          ) : (
            <ul className="space-y-1">
              {suggestions.map((s, i) => (
                <li key={`${i}-${s}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onApply(s)
                      setOpen(false)
                    }}
                    className="w-full text-left min-h-[44px] px-3 py-2 rounded-lg border border-[#DDE3DF] hover:border-[#406A56] hover:bg-[#F2F1E5] text-sm text-[#2A3E33]"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] text-[#94A09A]">
            Pick one to use it as your caption. Refresh for new ideas.
          </p>
        </div>
      )}
    </div>
  )
}
