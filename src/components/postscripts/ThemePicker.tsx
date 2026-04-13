'use client'

import { Check } from 'lucide-react'
import { THEMES, type PostScriptTheme } from '@/lib/postscripts/themes'

interface ThemePickerProps {
  selectedTheme: string
  onChange: (themeId: string) => void
}

export default function ThemePicker({ selectedTheme, onChange }: ThemePickerProps) {
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
              {/* Swatch */}
              <div
                className="w-full aspect-[3/4] rounded-lg border border-gray-200 relative overflow-hidden"
                style={{
                  background: theme.swatch.startsWith('linear') ? theme.swatch : theme.swatch,
                  backgroundColor: theme.swatch.startsWith('linear') ? undefined : theme.swatch,
                }}
              >
                {/* Mini letter lines */}
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
              </div>
              <span className="text-[10px] text-gray-600 font-medium leading-tight text-center">
                {theme.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
