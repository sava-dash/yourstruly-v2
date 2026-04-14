'use client'

/**
 * ThemePicker — 4 curated presets applied to the current photobook.
 *
 * On apply we:
 *   - rebuild `pages` from theme.pageSequence using `getTemplateById`
 *   - preserve photos already in the book by slot index (best-effort copy
 *     from the old page at the same ordinal, up to the new slot count)
 *   - hand the coverPreset + fontPair + accentColor back to the parent
 */

import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { PHOTOBOOK_THEMES, PhotobookTheme, FONT_PAIR_STACKS } from '@/lib/photobook/themes'
import { getTemplateById } from '@/lib/photobook/templates'

export interface ApplyThemeResult {
  theme: PhotobookTheme
  pages: ThemePage[]
}

export interface ThemePage {
  id: string
  pageNumber: number
  layoutId: string
  slots: ThemeSlot[]
  background?: string
}

export interface ThemeSlot {
  slotId: string
  type: 'photo' | 'text' | 'qr'
  memoryId?: string
  mediaId?: string
  fileUrl?: string
  text?: string
  qrMemoryId?: string
  qrWisdomId?: string
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Math.random().toString(36).slice(2, 10)}`
}

export function buildPagesFromTheme(
  theme: PhotobookTheme,
  currentPages: ThemePage[],
): ThemePage[] {
  return theme.pageSequence
    .map((templateId, i): ThemePage | null => {
      const tpl = getTemplateById(templateId)
      if (!tpl) return null
      const existing = currentPages[i]
      const slots: ThemeSlot[] = tpl.slots.map((s, slotIdx) => {
        const carry = existing?.slots?.[slotIdx]
        const base: ThemeSlot = {
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
  onApply: (result: ApplyThemeResult) => void
  selectedThemeId?: string | null
}

export default function ThemePicker({ currentPages, onApply, selectedThemeId }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleApply = (theme: PhotobookTheme) => {
    const proceed = currentPages.length === 0
      ? true
      : typeof window !== 'undefined'
        ? window.confirm(
            `Applying "${theme.name}" will replace your page layout. Photos you've already added will be kept. Continue?`,
          )
        : true
    if (!proceed) return
    setPendingId(theme.id)
    const newPages = buildPagesFromTheme(theme, currentPages)
    onApply({ theme, pages: newPages })
    setTimeout(() => setPendingId(null), 800)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#C35F33]" />
        <h2
          className="text-lg font-semibold text-[#2A3E33]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Start with a theme
        </h2>
      </div>
      <p className="text-sm text-[#666] mb-4">
        Each theme sets a page flow, cover style, and font pairing. You can tweak anything afterwards.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PHOTOBOOK_THEMES.map((theme) => {
          const isSelected = selectedThemeId === theme.id
          const isPending = pendingId === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleApply(theme)}
              aria-label={`Apply ${theme.name} theme`}
              className={`text-left p-4 rounded-2xl border-2 transition-all min-h-[44px] active:scale-[0.98] ${
                isSelected
                  ? 'border-[#406A56] bg-[#D3E1DF]/60'
                  : 'border-[#DDE3DF] bg-white hover:border-[#406A56]'
              }`}
            >
              <div
                className="h-20 rounded-lg mb-3 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${theme.accentColor}, #406A56)`,
                  fontFamily: FONT_PAIR_STACKS[theme.fontPair].heading,
                  color: '#F2F1E5',
                }}
              >
                <span className="text-lg font-semibold">{theme.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#2A3E33]">{theme.name}</div>
                  <div className="text-xs text-[#666] mt-1">{theme.description}</div>
                </div>
                {(isSelected || isPending) && (
                  <Check className="w-5 h-5 text-[#406A56] flex-shrink-0 ml-2" />
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-[#5A6660]">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: theme.accentColor }}
                />
                <span>{theme.pageSequence.length} pages</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
