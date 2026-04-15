'use client'

/**
 * Sticky transparent-pricing rail. Visible during the Design + Preview steps.
 * All numbers driven by computePricing() so editor + checkout stay in sync.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, Receipt, ShieldCheck, Truck } from 'lucide-react'
import {
  PricingBreakdown,
  PricingLineItem,
  formatMoney,
} from '@/lib/photobook/product-options'

interface Props {
  breakdown: PricingBreakdown
  productName: string
  productSize: string
  /**
   * Tailwind class that sets the rail's fixed top offset on xl+ screens.
   * Needs to clear the page's sticky header (top-14 + title + options bar +
   * step progress, plus an optional toolbar row on the Preview step). The
   * previous default of `xl:top-44` (176px) caused the header to cover the
   * rail on Preview/Checkout — user-reported bug. 260px is a safe default
   * that clears the entire header stack in both step layouts.
   */
  topOffsetClassName?: string
}

export default function PricingRail({
  breakdown,
  productName,
  productSize,
  topOffsetClassName = 'xl:top-[260px]',
}: Props) {
  const [showIncluded, setShowIncluded] = useState(false)

  return (
    <aside
      aria-label="Price summary"
      className={`w-full xl:w-80 bg-white border-2 border-[#DDE3DF] rounded-2xl shadow-sm p-5 xl:fixed xl:right-6 ${topOffsetClassName} xl:max-h-[calc(100vh-18rem)] xl:overflow-y-auto`}
    >
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#DDE3DF]">
        <Receipt className="w-5 h-5 text-[#406A56]" />
        <h3
          className="font-bold text-[#1A1F1C]"
          style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}
        >
          Your book so far
        </h3>
      </div>

      {/* Print line items */}
      <ul className="text-sm space-y-1.5">
        <Row
          label={`${productName} (${productSize})`}
          amount={formatMoney(breakdown.base.amount)}
        />
        {breakdown.extraPages && (
          <Row
            label={breakdown.extraPages.label}
            amount={`+${formatMoney(breakdown.extraPages.amount)}`}
          />
        )}
        <OptionRow item={breakdown.cover} />
        <OptionRow item={breakdown.binding} />
        <OptionRow item={breakdown.finish} />
      </ul>

      {/* Add-ons */}
      {breakdown.addOns.length > 0 && (
        <>
          <div className="mt-3 pt-3 border-t border-[#DDE3DF]">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#666] mb-1.5">
              Add-ons
            </div>
            <ul className="text-sm space-y-1.5">
              {breakdown.addOns.map((item) => (
                <Row
                  key={item.id}
                  label={
                    <span className="flex items-center gap-1.5">
                      <span className="text-[#406A56]">✓</span>
                      {item.label}
                    </span>
                  }
                  amount={`+${formatMoney(item.amount)}`}
                />
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Subtotal / shipping / tax */}
      <div className="mt-3 pt-3 border-t border-[#DDE3DF] text-sm space-y-1.5">
        <Row label="Subtotal" amount={formatMoney(breakdown.subtotal)} />
        <Row
          label={
            <span className="flex items-center gap-1.5 text-[#666]">
              <Truck className="w-3.5 h-3.5" /> Shipping (standard)
            </span>
          }
          amount={formatMoney(breakdown.shipping)}
        />
        <Row
          label={<span className="text-[#666]">Estimated tax</span>}
          amount={formatMoney(breakdown.estimatedTax)}
        />
      </div>

      {/* Total */}
      <div className="mt-3 pt-3 border-t-2 border-[#406A56] flex items-baseline justify-between">
        <span className="font-semibold text-[#2A3E33]">Estimated total</span>
        <span
          className="text-2xl font-bold text-[#406A56]"
          style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}
        >
          {formatMoney(breakdown.total)}
        </span>
      </div>
      <p className="mt-1 text-xs text-[#94A09A]">
        Tax is estimated until you enter a shipping address.
      </p>

      {/* What's included */}
      <button
        type="button"
        onClick={() => setShowIncluded((s) => !s)}
        aria-expanded={showIncluded}
        className="mt-4 w-full min-h-[44px] flex items-center justify-between px-3 rounded-xl bg-[#F2F1E5] hover:bg-[#E8E6D8] text-sm font-medium text-[#2A3E33]"
      >
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#406A56]" /> What&apos;s included
        </span>
        {showIncluded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      {showIncluded && (
        <ul className="mt-2 text-xs text-[#5A6660] space-y-1 px-3">
          <li>• Tracked shipping on every order</li>
          <li>• 100% satisfaction guarantee — we&apos;ll reprint if anything&apos;s off</li>
          <li>• Free design help by phone if you get stuck</li>
        </ul>
      )}
    </aside>
  )
}

function Row({
  label,
  amount,
}: {
  label: React.ReactNode
  amount: React.ReactNode
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-[#2A3E33]">{label}</span>
      <span className="font-medium text-[#2A3E33] tabular-nums">{amount}</span>
    </li>
  )
}

function OptionRow({ item }: { item: PricingLineItem }) {
  return (
    <Row
      label={item.label}
      amount={
        item.included ? (
          <span className="text-[#666] italic">incl</span>
        ) : (
          `${item.amount > 0 ? '+' : ''}${formatMoney(item.amount)}`
        )
      }
    />
  )
}
