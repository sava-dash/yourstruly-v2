'use client'

/**
 * Sticker picker side panel.
 *
 * Shows the 6 category tabs plus a search field; clicking a sticker calls
 * `onPick(stickerId)` and the parent inserts it onto the current page as a
 * StickerOverlay centered at 80x80 (of the editor preview).
 */

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import {
  STICKERS,
  STICKER_CATEGORIES,
  type StickerCategoryId,
  type StickerMeta,
} from '@/lib/photobook/stickers'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (stickerId: string) => void
}

export default function StickerPicker({ open, onClose, onPick }: Props) {
  const [activeCat, setActiveCat] = useState<StickerCategoryId | 'all'>('all')
  const [query, setQuery] = useState('')

  const visible: StickerMeta[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    return STICKERS.filter((s) => {
      if (activeCat !== 'all' && s.category !== activeCat) return false
      if (!q) return true
      return s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    })
  }, [activeCat, query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[95] flex justify-end" role="dialog" aria-modal="true" aria-label="Sticker picker">
      <button
        type="button" aria-label="Close stickers"
        onClick={onClose}
        className="flex-1 bg-black/30"
      />
      <aside className="w-full max-w-md bg-white shadow-2xl flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-[#DDE3DF]">
          <h3 className="font-semibold text-[#2A3E33] text-lg" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Add a sticker
          </h3>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[#F2F1E5] flex items-center justify-center"
          ><X className="w-5 h-5" /></button>
        </header>

        <div className="p-4 border-b border-[#DDE3DF] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A09A]" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stickers..."
              aria-label="Search stickers"
              className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border-2 border-[#DDE3DF] focus:border-[#406A56] outline-none text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sticker category">
            <CatButton active={activeCat === 'all'} onClick={() => setActiveCat('all')} label="All" />
            {STICKER_CATEGORIES.map((c) => (
              <CatButton
                key={c.id}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
                label={c.label}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {visible.length === 0 ? (
            <p className="text-sm text-[#5A6660] text-center py-12">
              No stickers match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {visible.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onPick(s.id)}
                  aria-label={`Add ${s.label}`}
                  title={s.label}
                  className="aspect-square rounded-xl border-2 border-[#DDE3DF] hover:border-[#406A56] hover:bg-[#F2F1E5] flex items-center justify-center p-3 text-[#406A56] transition-colors min-h-[80px]"
                >
                  {/* Using <img> avoids Next/Image server config for bundled public SVGs */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.svgPath}
                    alt=""
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <footer className="p-3 border-t border-[#DDE3DF] text-xs text-[#5A6660]">
          Tap a sticker to add it to this page. Drag to move, corners to resize.
        </footer>
      </aside>
    </div>
  )
}

function CatButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button" role="tab" aria-selected={active}
      onClick={onClick}
      className={`min-h-[36px] px-3 rounded-full border-2 text-sm font-medium transition-colors ${
        active ? 'bg-[#406A56] text-white border-[#406A56]' : 'bg-white text-[#2A3E33] border-[#DDE3DF] hover:border-[#406A56]'
      }`}
    >
      {label}
    </button>
  )
}
