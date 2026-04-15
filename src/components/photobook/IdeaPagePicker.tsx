'use client'

/**
 * Idea Page picker — side panel with category tabs and 12 curated full-page
 * presets. Each card has two actions (large 50+-friendly tap targets):
 *
 *   • "Add as new page"   — inserts the preset at the END of the page list.
 *   • "Replace this page" — confirms, then swaps the current page's layout +
 *                           background + overlays with the preset.
 *
 * The picker stays purely declarative — it never touches photo content. Photo
 * slots in the chosen layout remain empty so the user fills them after.
 */

import { useMemo, useState } from 'react'
import { X, Plus, Replace } from 'lucide-react'
import {
  IDEA_PAGES,
  IDEA_PAGE_CATEGORIES,
  type IdeaPageCategory,
  type IdeaPagePreset,
} from '@/lib/photobook/idea-pages'

export type IdeaPageApplyMode = 'append' | 'replace'

interface Props {
  open: boolean
  onClose: () => void
  /** True when there's a selected page that "Replace" can target. */
  hasSelectedPage: boolean
  /** Caller decides what "append" vs "replace" means in their state model. */
  onApply: (preset: IdeaPagePreset, mode: IdeaPageApplyMode) => void
}

export default function IdeaPagePicker({ open, onClose, hasSelectedPage, onApply }: Props) {
  const [activeCat, setActiveCat] = useState<IdeaPageCategory | 'all'>('all')
  const [confirming, setConfirming] = useState<IdeaPagePreset | null>(null)

  const visible: IdeaPagePreset[] = useMemo(() => {
    if (activeCat === 'all') return [...IDEA_PAGES]
    return IDEA_PAGES.filter((p) => p.category === activeCat)
  }, [activeCat])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[95] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Idea pages"
    >
      <button
        type="button"
        aria-label="Close idea pages"
        onClick={onClose}
        className="flex-1 bg-black/30"
      />
      <aside className="w-full max-w-md bg-white shadow-2xl flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-[#DDE3DF]">
          <div>
            <h3
              className="font-semibold text-[#2A3E33] text-lg"
              style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
            >
              Idea pages
            </h3>
            <p className="text-xs text-[#5A6660] mt-0.5">
              Ready-made designs you can drop in and edit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[#F2F1E5] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Category tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-[#DDE3DF]">
          <div className="flex flex-wrap gap-2">
            <CategoryTab
              label="All"
              active={activeCat === 'all'}
              onClick={() => setActiveCat('all')}
            />
            {IDEA_PAGE_CATEGORIES.map((c) => (
              <CategoryTab
                key={c.id}
                label={c.label}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
              />
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {visible.map((preset) => (
            <article
              key={preset.id}
              className="border border-[#DDE3DF] rounded-xl overflow-hidden bg-white hover:border-[#406A56]/60 transition-colors"
            >
              <div className="flex gap-3 p-3">
                {/* Static SVG thumbnail (lightweight, no runtime canvas) */}
                <img
                  src={preset.thumbnail}
                  alt=""
                  width={84}
                  height={112}
                  className="w-[84px] h-[112px] flex-shrink-0 rounded-md object-cover bg-[#F2F1E5]"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-[#2A3E33] text-sm leading-tight">
                    {preset.name}
                  </h4>
                  <p className="text-xs text-[#5A6660] mt-1 leading-snug">
                    {preset.description}
                  </p>
                  {preset.placeholderText ? (
                    <p className="text-[11px] text-[#94A09A] italic mt-1 leading-snug">
                      {preset.placeholderText}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex border-t border-[#DDE3DF]">
                <button
                  type="button"
                  onClick={() => {
                    onApply(preset, 'append')
                    onClose()
                  }}
                  className="flex-1 min-h-[44px] px-3 text-sm font-medium text-[#406A56] hover:bg-[#406A56]/10 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add as new page
                </button>
                <div className="w-px bg-[#DDE3DF]" aria-hidden="true" />
                <button
                  type="button"
                  disabled={!hasSelectedPage}
                  onClick={() => setConfirming(preset)}
                  className="flex-1 min-h-[44px] px-3 text-sm font-medium text-[#C35F33] hover:bg-[#C35F33]/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  title={hasSelectedPage ? 'Replace the current page with this design' : 'Select a page first'}
                >
                  <Replace className="w-4 h-4" />
                  Replace this page
                </button>
              </div>
            </article>
          ))}
        </div>
      </aside>

      {/* Confirm dialog for "Replace this page" */}
      {confirming ? (
        <ConfirmReplace
          preset={confirming}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            const p = confirming
            setConfirming(null)
            onApply(p, 'replace')
            onClose()
          }}
        />
      ) : null}
    </div>
  )
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[36px] px-3 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-[#406A56] text-white'
          : 'bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20'
      }`}
    >
      {label}
    </button>
  )
}

function ConfirmReplace({
  preset,
  onCancel,
  onConfirm,
}: {
  preset: IdeaPagePreset
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label="Confirm replace page"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5">
        <h3
          className="text-lg font-semibold text-[#2A3E33] mb-2"
          style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
        >
          Replace this page?
        </h3>
        <p className="text-sm text-[#5A6660] mb-4">
          This will replace your current page design with{' '}
          <strong className="text-[#2A3E33]">{preset.name}</strong>. Photos
          you&rsquo;ve placed will be cleared. Continue?
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 rounded-lg bg-white border border-[#DDE3DF] text-[#2A3E33] text-sm font-medium hover:bg-[#F2F1E5]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] px-4 rounded-lg bg-[#C35F33] text-white text-sm font-medium hover:bg-[#A44E27]"
          >
            Replace page
          </button>
        </div>
      </div>
    </div>
  )
}
