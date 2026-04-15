'use client'

/**
 * Floating price chip + slide-out breakdown for the Design step.
 *
 * Replaces the sticky PricingRail during currentStep === 1 so the design
 * canvas can use the full editor width. Clicking the chip opens a 320px
 * right-edge slide-in that renders the same PricingRail content — no
 * duplicated money math (all driven by computePricing()).
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import PricingRail from './PricingRail'
import {
  PricingBreakdown,
  formatMoney,
} from '@/lib/photobook/product-options'

interface Props {
  breakdown: PricingBreakdown
  productName: string
  productSize: string
}

export default function PriceChip({ breakdown, productName, productSize }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating chip — bottom-right, above the canvas, below bottom nav */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Pricing total ${formatMoney(breakdown.total)}, open breakdown`}
        className="fixed bottom-24 right-6 z-40 flex items-center justify-center gap-2 px-4 min-w-[160px] min-h-[44px] rounded-full bg-[#406A56] text-white shadow-lg hover:bg-[#345548] active:scale-95 transition-all"
        style={{
          fontFamily: 'var(--font-inter-tight), Inter, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 8px 20px -4px rgba(26, 31, 28, 0.25)',
        }}
      >
        <span className="tabular-nums">{formatMoney(breakdown.total)}</span>
        <span aria-hidden="true" className="opacity-70">•</span>
        <span>See breakdown</span>
      </button>

      {/* Slide-out panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[95] bg-black/30"
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Pricing breakdown"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 bottom-0 z-[100] w-[320px] max-w-full bg-[#FAFAF7] shadow-2xl overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#FAFAF7] border-b border-[#DDE3DF]">
                <h2
                  className="font-bold text-[#1A1F1C]"
                  style={{ fontFamily: 'var(--font-dm-serif), Georgia, serif' }}
                >
                  Pricing
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close pricing breakdown"
                  className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[#F2F1E5] flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-[#2A3E33]" />
                </button>
              </div>

              <div className="p-4 [&>aside]:!static [&>aside]:!w-full [&>aside]:!max-h-none [&>aside]:!right-auto [&>aside]:!top-auto">
                {/* Reuse the existing rail so breakdown markup stays in one place.
                    The arbitrary-variant wrapper neutralizes PricingRail's xl:fixed
                    positioning when rendered inside the slide-out panel. */}
                <PricingRail
                  breakdown={breakdown}
                  productName={productName}
                  productSize={productSize}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
