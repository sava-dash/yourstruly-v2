'use client'

import { useState } from 'react'
import { Check, Eye, X } from 'lucide-react'
import { THEMES, getTheme } from '@/lib/postscripts/themes'

interface ThemePickerProps {
  selectedTheme: string
  onChange: (themeId: string) => void
  /** Optional message text to show in preview */
  previewMessage?: string
  previewTitle?: string
}

export default function ThemePicker({ selectedTheme, onChange, previewMessage, previewTitle }: ThemePickerProps) {
  const [previewId, setPreviewId] = useState<string | null>(null)

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] mb-3">
        Stationery Style
      </h4>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {THEMES.map((theme) => {
          const isSelected = selectedTheme === theme.id
          return (
            <button
              key={theme.id}
              onClick={() => onChange(theme.id)}
              className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-[#2D5A3D] bg-[#2D5A3D]/5'
                  : 'border-transparent hover:border-gray-200 bg-white'
              }`}
            >
              <div
                className="w-full aspect-[3/4] rounded-lg border border-gray-200 relative overflow-hidden"
                style={{
                  background: theme.swatch.startsWith('linear') ? theme.swatch : undefined,
                  backgroundColor: theme.swatch.startsWith('linear') ? undefined : theme.swatch,
                }}
              >
                <div className="absolute inset-2 flex flex-col justify-center gap-1">
                  <div className="h-[2px] rounded-full" style={{ background: theme.accent, width: '60%', opacity: 0.4 }} />
                  <div className="h-[1px] rounded-full" style={{ background: theme.textColor, width: '90%', opacity: 0.15 }} />
                  <div className="h-[1px] rounded-full" style={{ background: theme.textColor, width: '80%', opacity: 0.15 }} />
                  <div className="h-[1px] rounded-full" style={{ background: theme.textColor, width: '70%', opacity: 0.15 }} />
                </div>
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#2D5A3D]/20">
                    <Check size={16} className="text-[#2D5A3D]" />
                  </div>
                )}
                {/* Preview eye icon on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); setPreviewId(theme.id) }}
                  className="absolute bottom-1 right-1 p-0.5 rounded bg-black/30 text-white opacity-0 group-hover:opacity-100 hover:bg-black/50 transition-opacity"
                  style={{ opacity: isSelected ? 0.7 : undefined }}
                >
                  <Eye size={10} />
                </button>
              </div>
              <span className="text-[10px] text-gray-600 font-medium leading-tight text-center">
                {theme.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Preview selected theme */}
      {selectedTheme && (
        <button
          onClick={() => setPreviewId(selectedTheme)}
          className="mt-2 text-xs text-[#2D5A3D] hover:underline flex items-center gap-1"
        >
          <Eye size={12} /> Preview selected theme
        </button>
      )}

      {/* Preview modal */}
      {previewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPreviewId(null)}>
          <div className="max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <ThemePreviewCard
              themeId={previewId}
              title={previewTitle || 'A Letter For You'}
              message={previewMessage || 'This is how your message will look to the recipient. The words you write will appear here, in this style, when they open your PostScript.'}
              onClose={() => setPreviewId(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ThemePreviewCard({ themeId, title, message, onClose }: { themeId: string; title: string; message: string; onClose: () => void }) {
  const theme = getTheme(themeId)
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ border: `2px solid ${theme.accent}30` }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2" style={{ background: `linear-gradient(135deg, ${theme.accent}20, ${theme.accent}10)` }}>
        <span className="text-xs font-medium" style={{ color: theme.accent }}>{theme.name}</span>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10 transition-colors">
          <X size={14} style={{ color: theme.textColor }} />
        </button>
      </div>
      {/* Letter body */}
      <div className={`p-8 ${theme.letterBg}`}>
        <h2
          className="text-xl mb-4 font-bold"
          style={{ fontFamily: theme.titleFont, color: theme.textColor }}
        >
          {title}
        </h2>
        <p
          className="text-[14px] leading-[1.8]"
          style={{ fontFamily: theme.bodyFont, color: theme.textColor, opacity: 0.85 }}
        >
          {message}
        </p>
        <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${theme.accent}20` }}>
          <p className="text-xs italic" style={{ color: `${theme.textColor}80` }}>
            — With love
          </p>
        </div>
      </div>
    </div>
  )
}
