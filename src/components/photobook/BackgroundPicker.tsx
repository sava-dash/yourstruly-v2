'use client'

/**
 * Per-page background picker with 3 tabs: Solid / Gradient / Texture.
 *
 * Calls `onApply` with the chosen `PageBackground | null` and a `scope`:
 *   - 'page' -> current page only
 *   - 'all'  -> every page (parent confirms with a dialog first)
 */

import { useState } from 'react'
import { X, Check } from 'lucide-react'
import type { PageBackground } from '@/lib/photobook/overlays'

interface Props {
  open: boolean
  onClose: () => void
  current: PageBackground | null | string | undefined
  onApply: (bg: PageBackground | null, scope: 'page' | 'all') => void
}

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

const SOLID_COLORS: readonly { value: string; label: string }[] = [
  // Brand
  { value: '#F2F1E5', label: 'Cream' },
  { value: '#FFFFFF', label: 'White' },
  { value: '#D3E1DF', label: 'Green light' },
  { value: '#406A56', label: 'YT Green' },
  { value: '#2A4938', label: 'YT Green dark' },
  { value: '#C35F33', label: 'Terra Cotta' },
  { value: '#E6C9BB', label: 'Terra soft' },
  // Warm neutrals
  { value: '#F8EFE3', label: 'Sand' },
  { value: '#EDE4D3', label: 'Linen' },
  { value: '#D8C7A8', label: 'Wheat' },
  { value: '#A88A5E', label: 'Camel' },
  // Cool neutrals
  { value: '#E3E7EA', label: 'Mist' },
  { value: '#B9C4C9', label: 'Fog' },
  { value: '#6F7E82', label: 'Slate' },
  // Accents
  { value: '#2d2d2d', label: 'Charcoal' },
  { value: '#000000', label: 'Black' },
  { value: '#F4D8B8', label: 'Peach' },
  { value: '#C6D9C2', label: 'Sage' },
  { value: '#B5C8DC', label: 'Sky' },
  { value: '#D5C1DC', label: 'Lilac' },
]

const GRADIENTS: readonly { id: string; label: string; from: string; to: string; angle: number }[] = [
  { id: 'cream-green', label: 'Cream → Green', from: '#F2F1E5', to: '#D3E1DF', angle: 135 },
  { id: 'green-terra', label: 'Green → Terra', from: '#D3E1DF', to: '#E6C9BB', angle: 135 },
  { id: 'white-cream', label: 'White → Cream', from: '#FFFFFF', to: '#F2F1E5', angle: 180 },
  { id: 'sunset', label: 'Soft sunset', from: '#F4D8B8', to: '#E6C9BB', angle: 135 },
  { id: 'meadow', label: 'Meadow', from: '#C6D9C2', to: '#F2F1E5', angle: 180 },
  { id: 'dusk', label: 'Dusk', from: '#B5C8DC', to: '#D5C1DC', angle: 135 },
  { id: 'linen-slate', label: 'Linen → Slate', from: '#EDE4D3', to: '#B9C4C9', angle: 180 },
  { id: 'green-cream', label: 'Green → Cream', from: '#406A56', to: '#F2F1E5', angle: 180 },
  { id: 'golden-hour', label: 'Golden hour', from: '#F8EFE3', to: '#D8C7A8', angle: 135 },
  { id: 'ink-cream', label: 'Ink → Cream', from: '#2d2d2d', to: '#F2F1E5', angle: 180 },
]

/**
 * Textures are rendered as CSS-only previews (repeating-linear-gradient /
 * radial-gradient) so no image assets are required. The renderer falls back
 * to cream if no matching image tile exists in /public/photobook-backgrounds.
 */
const TEXTURES: readonly { id: string; label: string; css: string }[] = [
  { id: 'paper', label: 'Paper', css: 'radial-gradient(circle at 20% 30%, rgba(0,0,0,0.06) 1px, transparent 1.5px), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.05) 1px, transparent 1.5px), #F2F1E5' },
  { id: 'linen', label: 'Linen', css: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 3px), #EDE4D3' },
  { id: 'dots', label: 'Dots', css: 'radial-gradient(circle, rgba(64,106,86,0.18) 1.5px, transparent 2px) 0 0/16px 16px, #F2F1E5' },
  { id: 'diagonal-lines', label: 'Diagonal', css: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 10px), #FFFFFF' },
  { id: 'grid', label: 'Grid', css: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 18px), repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 18px), #FFFFFF' },
  { id: 'noise', label: 'Noise', css: 'radial-gradient(circle at 10% 20%, rgba(0,0,0,0.04) 0.5px, transparent 1px) 0 0/5px 5px, #F8EFE3' },
  { id: 'waves', label: 'Waves', css: 'repeating-radial-gradient(circle at 50% 0, rgba(64,106,86,0.07) 0 12px, transparent 12px 24px), #F2F1E5' },
  { id: 'cross', label: 'Cross-hatch', css: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 8px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 8px), #EDE4D3' },
]

// ---------------------------------------------------------------------------

type Tab = 'solid' | 'gradient' | 'texture'

export default function BackgroundPicker({ open, onClose, current, onApply }: Props) {
  const [tab, setTab] = useState<Tab>('solid')
  const [confirmAll, setConfirmAll] = useState<null | PageBackground | 'remove'>(null)

  if (!open) return null

  const currentSolidValue = typeof current === 'object' && current?.type === 'solid' ? current.color : undefined
  const currentGradientId = typeof current === 'object' && current?.type === 'gradient'
    ? GRADIENTS.find((g) => g.from === current.from && g.to === current.to)?.id
    : undefined
  const currentTextureId = typeof current === 'object' && current?.type === 'texture' ? current.textureId : undefined

  const pickSolid = (color: string) => onApply({ type: 'solid', color }, 'page')
  const pickGradient = (g: typeof GRADIENTS[number]) =>
    onApply({ type: 'gradient', from: g.from, to: g.to, angle: g.angle }, 'page')
  const pickTexture = (id: string) => onApply({ type: 'texture', textureId: id, opacity: 0.18 }, 'page')

  const askApplyAll = () => {
    // Re-derive current target to ship to all pages
    if (tab === 'solid' && currentSolidValue) setConfirmAll({ type: 'solid', color: currentSolidValue })
    else if (tab === 'gradient' && currentGradientId) {
      const g = GRADIENTS.find((x) => x.id === currentGradientId)
      if (g) setConfirmAll({ type: 'gradient', from: g.from, to: g.to, angle: g.angle })
    } else if (tab === 'texture' && currentTextureId) {
      setConfirmAll({ type: 'texture', textureId: currentTextureId, opacity: 0.18 })
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex justify-end" role="dialog" aria-modal="true" aria-label="Background picker">
      <button type="button" aria-label="Close backgrounds" onClick={onClose} className="flex-1 bg-black/30" />

      <aside className="w-full max-w-md bg-white shadow-2xl flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-[#DDE3DF]">
          <h3 className="font-semibold text-[#2A3E33] text-lg" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Page background
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[#F2F1E5] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-4 border-b border-[#DDE3DF] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onApply(null, 'page')}
            className="flex-1 min-h-[44px] rounded-xl border-2 border-[#DDE3DF] hover:border-[#C35F33] text-sm font-medium text-[#C35F33]"
          >
            Remove background
          </button>
        </div>

        <nav className="flex border-b border-[#DDE3DF]" role="tablist">
          {(['solid', 'gradient', 'texture'] as Tab[]).map((t) => (
            <button
              key={t} role="tab" aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 min-h-[44px] text-sm font-medium capitalize ${tab === t ? 'bg-[#F2F1E5] text-[#406A56] border-b-2 border-[#406A56]' : 'text-[#5A6660]'}`}
            >{t}</button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'solid' && (
            <div className="grid grid-cols-5 gap-2">
              {SOLID_COLORS.map((c) => (
                <button
                  key={c.value} type="button" onClick={() => pickSolid(c.value)}
                  aria-label={c.label} title={c.label}
                  className={`relative aspect-square rounded-lg border-2 ${currentSolidValue === c.value ? 'border-[#406A56] ring-2 ring-[#406A56]/40' : 'border-[#DDE3DF]'}`}
                  style={{ backgroundColor: c.value }}
                >
                  {currentSolidValue === c.value && <Check className="w-4 h-4 text-white drop-shadow absolute top-1 right-1" />}
                </button>
              ))}
            </div>
          )}

          {tab === 'gradient' && (
            <div className="grid grid-cols-2 gap-2">
              {GRADIENTS.map((g) => (
                <button
                  key={g.id} type="button" onClick={() => pickGradient(g)}
                  aria-label={g.label}
                  className={`relative aspect-[4/3] rounded-lg border-2 flex items-end p-2 text-xs font-medium text-[#2A3E33] ${currentGradientId === g.id ? 'border-[#406A56] ring-2 ring-[#406A56]/40' : 'border-[#DDE3DF]'}`}
                  style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
                >
                  <span className="bg-white/70 rounded px-1.5 py-0.5">{g.label}</span>
                </button>
              ))}
            </div>
          )}

          {tab === 'texture' && (
            <div className="grid grid-cols-2 gap-2">
              {TEXTURES.map((t) => (
                <button
                  key={t.id} type="button" onClick={() => pickTexture(t.id)}
                  aria-label={t.label}
                  className={`relative aspect-[4/3] rounded-lg border-2 flex items-end p-2 text-xs font-medium text-[#2A3E33] ${currentTextureId === t.id ? 'border-[#406A56] ring-2 ring-[#406A56]/40' : 'border-[#DDE3DF]'}`}
                  style={{ background: t.css }}
                >
                  <span className="bg-white/70 rounded px-1.5 py-0.5">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <footer className="p-3 border-t border-[#DDE3DF] flex items-center gap-2">
          <button
            type="button"
            onClick={askApplyAll}
            disabled={!current || typeof current !== 'object'}
            className="flex-1 min-h-[44px] rounded-xl bg-[#406A56] text-white font-medium disabled:opacity-40"
          >
            Apply to all pages
          </button>
        </footer>
      </aside>

      {/* Confirm apply-to-all */}
      {confirmAll && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h4 className="font-semibold text-lg text-[#2A3E33] mb-2">Apply to every page?</h4>
            <p className="text-sm text-[#5A6660] mb-5">
              This replaces the background on all pages in your book. You can undo right after.
            </p>
            <div className="flex gap-2">
              <button
                type="button" onClick={() => setConfirmAll(null)}
                className="flex-1 min-h-[44px] rounded-xl border-2 border-[#DDE3DF] font-medium"
              >Cancel</button>
              <button
                type="button"
                onClick={() => {
                  const payload = confirmAll === 'remove' ? null : confirmAll
                  onApply(payload, 'all')
                  setConfirmAll(null)
                }}
                className="flex-1 min-h-[44px] rounded-xl bg-[#406A56] text-white font-medium"
              >Apply to all</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
