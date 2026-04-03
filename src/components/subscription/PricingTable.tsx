'use client'

import { Check } from 'lucide-react'

interface Plan {
  id: string
  name: string
  description: string
  price_monthly: number | null
  price_yearly: number | null
  currency: string
  features: Array<{ name: string; value: string; icon: string }>
  is_popular: boolean
  stripe_price_id: string | null
}

interface PricingTableProps {
  plans: Plan[]
  currentPlanId?: string | null
  onSelectPlan: (plan: Plan, billingCycle?: 'monthly' | 'yearly') => void
  billingPeriod?: 'monthly' | 'yearly'
  loading?: boolean
}

export function PricingTable({ plans, currentPlanId, onSelectPlan, billingPeriod = 'monthly' }: PricingTableProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const price = billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly
        const isCurrent = plan.id === currentPlanId
        
        return (
          <div
            key={plan.id}
            className={`relative rounded-2xl p-6 ${
              plan.is_popular 
                ? 'bg-gradient-to-br from-[#2D5A3D] to-[#234A31] text-white ring-2 ring-[#2D5A3D]' 
                : 'bg-white border border-gray-200'
            }`}
          >
            {plan.is_popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#C4A235] text-[#2d2d2d] text-xs font-bold rounded-full">
                Most Popular
              </div>
            )}
            
            <h3 className={`text-xl font-bold mb-2 ${plan.is_popular ? 'text-white' : 'text-[#2d2d2d]'}`}>
              {plan.name}
            </h3>
            <p className={`text-sm mb-4 ${plan.is_popular ? 'text-white/80' : 'text-gray-600'}`}>
              {plan.description}
            </p>
            
            <div className="mb-6">
              <span className={`text-4xl font-bold ${plan.is_popular ? 'text-white' : 'text-[#2d2d2d]'}`}>
                {price === null || price === 0 ? 'Free' : `$${price}`}
              </span>
              {price !== null && price > 0 && (
                <span className={`text-sm ${plan.is_popular ? 'text-white/70' : 'text-gray-500'}`}>
                  /{billingPeriod === 'yearly' ? 'year' : 'month'}
                </span>
              )}
            </div>
            
            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check size={16} className={`mt-0.5 flex-shrink-0 ${plan.is_popular ? 'text-white' : 'text-[#2D5A3D]'}`} />
                  <span className={`text-sm ${plan.is_popular ? 'text-white/90' : 'text-gray-700'}`}>
                    {feature.name}: {feature.value}
                  </span>
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => onSelectPlan(plan)}
              disabled={isCurrent}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                isCurrent
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : plan.is_popular
                    ? 'bg-white text-[#2D5A3D] hover:bg-gray-100'
                    : 'bg-[#2D5A3D] text-white hover:bg-[#234A31]'
              }`}
            >
              {isCurrent ? 'Current Plan' : 'Select Plan'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
