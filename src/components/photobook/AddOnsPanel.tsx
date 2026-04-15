'use client'

/**
 * Add-on upsell cards. Surfaces during the Preview step so users decide what
 * they're buying right before checkout.
 *
 * Single primary value prop per card. Large 44px+ tap targets. Selected state
 * is announced visually (green border + check) and via aria-pressed.
 */

import { Check, Gift, Sparkles, EyeOff, Palette } from 'lucide-react'
import { ADD_ONS, AddOnId, formatMoney } from '@/lib/photobook/product-options'

interface Props {
  selected: AddOnId[]
  onChange: (next: AddOnId[]) => void
}

const ICONS: Record<AddOnId, React.ReactNode> = {
  gift_box: <Gift className="w-6 h-6" />,
  premium_print: <Sparkles className="w-6 h-6" />,
  logo_removal: <EyeOff className="w-6 h-6" />,
  color_pop: <Palette className="w-6 h-6" />,
}

export default function AddOnsPanel({ selected, onChange }: Props) {
  const isOn = (id: AddOnId) => selected.includes(id)
  const toggle = (id: AddOnId) => {
    onChange(isOn(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  return (
    <section aria-label="Add-ons" className="w-full">
      <div className="mb-4">
        <h3
          className="text-2xl font-bold text-[#1A1F1C] mb-1"
          style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}
        >
          Make it special
        </h3>
        <p className="text-[#5A6660]">
          Optional extras for your book. Add or skip — it&apos;s up to you.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ADD_ONS.map((addon) => {
          const on = isOn(addon.id)
          return (
            <button
              key={addon.id}
              type="button"
              role="switch"
              aria-pressed={on}
              aria-label={`${addon.label}, ${formatMoney(addon.price)}. ${addon.description}`}
              onClick={() => toggle(addon.id)}
              className={`relative text-left p-4 rounded-2xl border-2 min-h-[140px] transition-all active:scale-[0.99] ${
                on
                  ? 'border-[#406A56] bg-[#D3E1DF]/30 shadow-sm'
                  : 'border-[#DDE3DF] bg-white hover:border-[#406A56]/50'
              }`}
            >
              {addon.recommended && !on && (
                <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wide font-bold bg-[#C35F33] text-white px-2 py-0.5 rounded-full">
                  Popular
                </span>
              )}
              {on && (
                <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#406A56] flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </span>
              )}

              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  on ? 'bg-[#406A56] text-white' : 'bg-[#F2F1E5] text-[#406A56]'
                }`}
              >
                {ICONS[addon.id]}
              </div>

              <div className="flex items-baseline justify-between gap-2 mb-1">
                <h4 className="font-bold text-[#2A3E33]">{addon.label}</h4>
                <span className="text-sm font-bold text-[#C35F33]">
                  +{formatMoney(addon.price)}
                </span>
              </div>
              <p className="text-sm text-[#5A6660] leading-snug">{addon.description}</p>

              <div
                className={`mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  on
                    ? 'bg-[#406A56] text-white'
                    : 'bg-[#F2F1E5] text-[#2A3E33] border border-[#DDE3DF]'
                }`}
              >
                {on ? 'Added' : 'Add to book'}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
