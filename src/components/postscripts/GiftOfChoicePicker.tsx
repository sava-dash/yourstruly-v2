'use client'

import { Gift, DollarSign, Loader2 } from 'lucide-react'

// Gift of Choice amount options
const FLEX_GIFT_AMOUNTS = [
  { value: 25, label: '$25', popular: false },
  { value: 50, label: '$50', popular: true },
  { value: 75, label: '$75', popular: false },
  { value: 100, label: '$100', popular: true },
  { value: 150, label: '$150', popular: false },
  { value: 200, label: '$200', popular: false },
  { value: 250, label: '$250', popular: false },
  { value: 300, label: '$300', popular: false },
]

interface GiftOfChoicePickerProps {
  flexAmount: number
  onFlexAmountChange: (amount: number) => void
  onBack: () => void
  onConfirm: () => void
  isLoading: boolean
}

export default function GiftOfChoicePicker({
  flexAmount,
  onFlexAmountChange,
  onBack,
  onConfirm,
  isLoading,
}: GiftOfChoicePickerProps) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)

  return (
    <>
      {/* Picker body */}
      <div className="space-y-6 max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#406A56]/10 flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-[#406A56]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            How much would you like to give?
          </h3>
          <p className="text-sm text-gray-500">
            They&apos;ll receive a link to choose any gift up to this amount from hundreds of options.
          </p>
        </div>

        {/* Amount Grid */}
        <div className="grid grid-cols-4 gap-3">
          {FLEX_GIFT_AMOUNTS.map((amount) => (
            <button
              key={amount.value}
              onClick={() => onFlexAmountChange(amount.value)}
              className={`relative p-4 rounded-xl border-2 text-center transition-all
                ${flexAmount === amount.value
                  ? 'border-[#406A56] bg-[#406A56]/10'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              {amount.popular && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5
                               bg-amber-100 text-amber-700 text-xs rounded-full whitespace-nowrap">
                  Popular
                </span>
              )}
              <span className={`text-lg font-bold ${flexAmount === amount.value ? 'text-[#406A56]' : 'text-gray-900'}`}>
                {amount.label}
              </span>
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Or enter a custom amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              min={15}
              max={500}
              value={flexAmount}
              onChange={(e) => onFlexAmountChange(Math.max(15, parseInt(e.target.value) || 15))}
              className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                       focus:ring-2 focus:ring-[#406A56]/20 focus:border-[#406A56] outline-none"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Minimum $15</p>
        </div>

        {/* Preview Card */}
        <div className="p-4 bg-gradient-to-br from-[#406A56]/10 to-[#406A56]/5 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Gift className="w-8 h-8 text-[#406A56]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Gift of Choice - {formatPrice(flexAmount)}</p>
              <p className="text-sm text-gray-500">
                Recipient chooses from 500+ gift options
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onBack}
          className="text-[#C35F33] hover:underline text-sm"
        >
          &larr; Back to gifts
        </button>
      </div>

      {/* Footer for flex_amount step — rendered inside the modal footer slot */}
    </>
  )
}

/** Footer bar for the Gift of Choice step. Render inside the modal footer. */
export function GiftOfChoiceFooter({
  flexAmount,
  onBack,
  onConfirm,
  isLoading,
}: Pick<GiftOfChoicePickerProps, 'flexAmount' | 'onBack' | 'onConfirm' | 'isLoading'>) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">Total</p>
        <p className="text-2xl font-bold text-[#406A56]">
          {formatPrice(flexAmount)}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading || flexAmount < 15}
          className="px-6 py-2 bg-[#406A56] text-white rounded-lg font-medium
                   hover:bg-[#355a49] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Gift className="w-4 h-4" />
              Attach Gift of Choice
            </>
          )}
        </button>
      </div>
    </div>
  )
}
