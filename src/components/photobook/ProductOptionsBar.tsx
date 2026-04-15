'use client'

/**
 * Compact chip-and-popover bar shown in the editor header. Lets the user
 * change cover type / paper finish / binding without leaving the page.
 *
 * Plain-language labels for the 50+ audience. Tap targets >= 44px.
 */

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Palette, Layers, Check, X } from 'lucide-react'
import {
  BINDING,
  COVER_TYPES,
  PAPER_FINISH,
  ProductOptions,
  formatMoney,
  getBinding,
  getCoverType,
  getPaperFinish,
} from '@/lib/photobook/product-options'

interface Props {
  value: ProductOptions
  onChange: (next: ProductOptions) => void
}

type FieldKey = 'coverType' | 'paperFinish' | 'binding'

export default function ProductOptionsBar({ value, onChange }: Props) {
  const [open, setOpen] = useState<FieldKey | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const cover = getCoverType(value.coverType)
  const finish = getPaperFinish(value.paperFinish)
  const binding = getBinding(value.binding)

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-2" aria-label="Book options">
      <Chip
        icon={<BookOpen className="w-4 h-4" />}
        label="Cover"
        value={cover.label}
        active={open === 'coverType'}
        onClick={() => setOpen(open === 'coverType' ? null : 'coverType')}
      />
      <Chip
        icon={<Palette className="w-4 h-4" />}
        label="Finish"
        value={finish.label}
        active={open === 'paperFinish'}
        onClick={() => setOpen(open === 'paperFinish' ? null : 'paperFinish')}
      />
      <Chip
        icon={<Layers className="w-4 h-4" />}
        label="Binding"
        value={binding.label}
        active={open === 'binding'}
        onClick={() => setOpen(open === 'binding' ? null : 'binding')}
      />

      {open === 'coverType' && (
        <Popover title="Cover" onClose={() => setOpen(null)}>
          {COVER_TYPES.map((c) => (
            <RadioRow
              key={c.id}
              selected={value.coverType === c.id}
              label={c.label}
              description={c.description}
              priceDelta={c.priceDelta}
              onSelect={() => {
                onChange({ ...value, coverType: c.id })
                setOpen(null)
              }}
            />
          ))}
        </Popover>
      )}

      {open === 'paperFinish' && (
        <Popover title="Paper finish" onClose={() => setOpen(null)}>
          {PAPER_FINISH.map((c) => (
            <RadioRow
              key={c.id}
              selected={value.paperFinish === c.id}
              label={c.label}
              description={c.description}
              priceDelta={c.priceDelta}
              onSelect={() => {
                onChange({ ...value, paperFinish: c.id })
                setOpen(null)
              }}
            />
          ))}
        </Popover>
      )}

      {open === 'binding' && (
        <Popover title="Binding" onClose={() => setOpen(null)}>
          {BINDING.map((c) => (
            <RadioRow
              key={c.id}
              selected={value.binding === c.id}
              label={c.label}
              description={c.description}
              priceDelta={c.priceDelta}
              onSelect={() => {
                onChange({ ...value, binding: c.id })
                setOpen(null)
              }}
            />
          ))}
        </Popover>
      )}
    </div>
  )
}

function Chip({
  icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}. Tap to change.`}
      className={`min-h-[44px] px-3 rounded-xl border-2 text-sm font-medium flex items-center gap-2 transition-colors active:scale-95 ${
        active
          ? 'bg-[#D3E1DF] border-[#406A56] text-[#2A3E33]'
          : 'bg-white border-[#DDE3DF] hover:border-[#406A56] text-[#2A3E33]'
      }`}
    >
      <span className="text-[#406A56]">{icon}</span>
      <span className="text-[#666]">{label}:</span>
      <span className="font-semibold">{value}</span>
    </button>
  )
}

function Popover({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      className="absolute z-50 mt-2 w-[320px] bg-white border-2 border-[#DDE3DF] rounded-2xl shadow-xl p-3"
      style={{ top: '100%', left: 0 }}
    >
      <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-[#DDE3DF]">
        <div className="font-semibold text-[#2A3E33]">{title}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-[#F2F1E5]"
        >
          <X className="w-4 h-4 text-[#666]" />
        </button>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

function RadioRow({
  selected,
  label,
  description,
  priceDelta,
  onSelect,
}: {
  selected: boolean
  label: string
  description: string
  priceDelta: number
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-[64px] w-full text-left p-3 rounded-xl border-2 transition-colors flex items-start gap-3 active:scale-[0.98] ${
        selected
          ? 'border-[#406A56] bg-[#D3E1DF]/40'
          : 'border-transparent hover:bg-[#F2F1E5]'
      }`}
    >
      <div
        className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          selected ? 'bg-[#406A56]' : 'border-2 border-[#DDE3DF]'
        }`}
      >
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-[#2A3E33]">{label}</span>
          <span className={`text-sm font-medium ${priceDelta > 0 ? 'text-[#C35F33]' : priceDelta < 0 ? 'text-[#406A56]' : 'text-[#666]'}`}>
            {priceDelta === 0 ? 'included' : `${priceDelta > 0 ? '+' : ''}${formatMoney(priceDelta)}`}
          </span>
        </div>
        <div className="text-sm text-[#666] mt-0.5">{description}</div>
      </div>
    </button>
  )
}
