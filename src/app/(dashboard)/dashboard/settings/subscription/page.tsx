'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Loader2, Users, ChevronRight, Check, X, Minus, Crown, Sparkles, Heart, Shield } from 'lucide-react';
import '@/styles/engagement.css';

// Pricing constants
const PREMIUM_BASE_PRICE = 20; // $20/mo includes 2 seats
const SEAT_PRICE_TIER_1 = 8;   // $8/seat for seats 3-5
const SEAT_PRICE_TIER_2 = 6;   // $6/seat for seats 6-10
const MAX_SEATS = 10;
const INCLUDED_SEATS = 2;

// Feature comparison
const FEATURES = [
  { name: 'Storage', basic: '10 GB', premium: '100 GB', highlight: true },
  { name: 'Memories', basic: 'Unlimited', premium: 'Unlimited', highlight: false },
  { name: 'AI Interviews', basic: '5 per month', premium: 'Unlimited', highlight: true },
  { name: 'Voice Cloning', basic: false, premium: true, highlight: true },
  { name: 'Video Messages', basic: '3 per month', premium: 'Unlimited', highlight: true },
  { name: 'Family Seats', basic: '1 (you)', premium: 'Up to 10', highlight: true },
  { name: 'Photobook Printing', basic: false, premium: true, highlight: false },
  { name: 'Calendar Printing', basic: false, premium: true, highlight: false },
  { name: 'AI Chat', basic: 'Basic', premium: 'Advanced', highlight: false },
  { name: 'Export Options', basic: 'PDF only', premium: 'PDF, Video, Family Tree', highlight: false },
  { name: 'Priority Support', basic: false, premium: true, highlight: false },
  { name: 'Legacy Planning', basic: false, premium: true, highlight: true },
];

interface Subscription {
  id: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  seats_used?: number;
  total_seats?: number;
}

export default function SubscriptionSettings() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [seats, setSeats] = useState(2);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchSubscriptionData();
    
    // Check for success/canceled query params
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setNotification({ type: 'success', message: 'Premium activated. You now have more space for your stories.' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      setNotification({ type: 'error', message: 'Checkout was canceled. No changes were made.' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscription/status');
      const data = await response.json();
      if (response.ok) {
        setSubscription(data.subscription);
        if (data.subscription?.total_seats) {
          setSeats(data.subscription.total_seats);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate seat pricing
  const seatPricing = useMemo(() => {
    let additionalCost = 0;
    
    if (seats > INCLUDED_SEATS) {
      // Seats 3-5: $8 each
      const tier1Seats = Math.min(seats - INCLUDED_SEATS, 3); // up to 3 additional seats at $8
      additionalCost += tier1Seats * SEAT_PRICE_TIER_1;
      
      // Seats 6-10: $6 each
      if (seats > 5) {
        const tier2Seats = seats - 5;
        additionalCost += tier2Seats * SEAT_PRICE_TIER_2;
      }
    }
    
    const monthlyTotal = PREMIUM_BASE_PRICE + additionalCost;
    const yearlyTotal = monthlyTotal * 12 * 0.917; // ~8.3% discount for annual
    const avgPerSeat = monthlyTotal / seats;
    
    return {
      monthlyTotal,
      yearlyTotal: Math.round(yearlyTotal),
      yearlyMonthly: Math.round(yearlyTotal / 12),
      additionalCost,
      avgPerSeat: avgPerSeat.toFixed(2),
    };
  }, [seats]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seats,
          billingCycle,
        }),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to start checkout' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to start checkout. Please try again.' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const isPremium = subscription?.status === 'active';

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
        </div>
        <div className="relative z-10 flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>
      
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="page-header mb-8">
          <Link href="/dashboard/settings" className="page-header-back">
            <ChevronRight size={20} className="rotate-180" />
          </Link>
          <div className="flex-1">
            <h1 className="page-header-title">Subscription</h1>
            <p className="page-header-subtitle">Choose the plan that's right for your family</p>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            notification.type === 'success' 
              ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]' 
              : 'bg-red-50 text-red-600'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {notification.message}
            <button 
              onClick={() => setNotification(null)}
              className="ml-auto p-1 hover:bg-black/5 rounded"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Current Status (if premium) */}
        {isPremium && (
          <div className="glass-card-page p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#2D5A3D] flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-[#2d2d2d]">Premium Plan Active</h2>
                <p className="text-sm text-gray-500">
                  {subscription?.seats_used || 1} of {subscription?.total_seats || 2} seats used
                </p>
              </div>
              <Link 
                href="/dashboard/settings/subscription/seats"
                className="ml-auto btn-secondary"
              >
                <Users size={16} />
                Manage Seats
              </Link>
            </div>
            {subscription?.cancel_at_period_end && (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                Your subscription will cancel on {new Date(subscription.current_period_end).toLocaleDateString()}.
                <button className="underline ml-2">Resume subscription</button>
              </p>
            )}
          </div>
        )}

        {/* Plan Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Basic Plan - Tile Style */}
          <div className="engagement-tile" data-color="blue">
            <div className="torn-edge torn-edge-top" />
            <div className="torn-edge torn-edge-bottom" />
            
            <div className="tile-content p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#8DACAB]/20 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-[#8DACAB]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#2d2d2d]">Basic</h3>
                  <p className="text-sm text-gray-500">Get started free</p>
                </div>
              </div>
              
              <div className="mb-6 p-4 bg-white/50 rounded-xl">
                <span className="text-4xl font-bold text-[#2d2d2d]">Free</span>
                <span className="text-gray-500 ml-2">forever</span>
              </div>

              <div className="space-y-3 mb-6">
                {FEATURES.slice(0, 6).map((feature) => (
                  <div key={feature.name} className="flex items-center gap-3">
                    {feature.basic === false ? (
                      <Minus className="w-4 h-4 text-gray-300" />
                    ) : (
                      <Check className="w-4 h-4 text-[#2D5A3D]" />
                    )}
                    <span className={`text-sm ${feature.basic === false ? 'text-gray-400' : 'text-gray-700'}`}>
                      {feature.name}: {feature.basic === false ? '—' : feature.basic === true ? '✓' : feature.basic}
                    </span>
                  </div>
                ))}
              </div>

              {!isPremium && (
                <button 
                  disabled
                  className="w-full py-3 rounded-xl font-semibold bg-white/60 text-gray-500 cursor-not-allowed border border-gray-200"
                >
                  Current Plan
                </button>
              )}
            </div>
          </div>

          {/* Premium Plan - Tile Style with highlight */}
          <div className="engagement-tile relative" data-color="green">
            <div className="torn-edge torn-edge-top" />
            <div className="torn-edge torn-edge-bottom" />
            
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1 bg-[#C4A235] text-[#2d2d2d] text-xs font-bold rounded-full shadow-sm">
              <Crown className="inline w-3 h-3 mr-1" />
              Recommended
            </div>
            
            <div className="tile-content p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#2D5A3D]/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#2D5A3D]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#2d2d2d]">Premium</h3>
                <p className="text-sm text-gray-500">Complete family legacy</p>
              </div>
            </div>
            
            {/* Dynamic Pricing Display - Avg price prominent */}
            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[#2D5A3D]">
                  ${seatPricing.avgPerSeat}
                </span>
                <span className="text-gray-500">/month per person</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                ${billingCycle === 'monthly' ? seatPricing.monthlyTotal : seatPricing.yearlyMonthly}/mo total · {seats} {seats === 1 ? 'seat' : 'seats'}
              </p>
              {billingCycle === 'yearly' && (
                <p className="text-sm text-[#2D5A3D] font-medium mt-1">
                  Save ${(seatPricing.monthlyTotal * 12) - seatPricing.yearlyTotal}/year with annual billing
                </p>
              )}
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-[#2D5A3D] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  billingCycle === 'yearly'
                    ? 'bg-[#2D5A3D] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Yearly
                <span className="ml-1 text-xs opacity-80">Save ~8%</span>
              </button>
            </div>

            {/* Seat Slider */}
            <div className="mb-6 p-4 bg-[#2D5A3D]/5 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-[#2d2d2d]">
                  <Users className="inline w-4 h-4 mr-1" />
                  Family Seats
                </label>
                <span className="text-lg font-bold text-[#2D5A3D]">{seats}</span>
              </div>
              <input
                type="range"
                min="1"
                max={MAX_SEATS}
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2D5A3D]"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
              
              {/* Seat pricing breakdown */}
              <div className="mt-3 pt-3 border-t border-[#2D5A3D]/10 text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Base price (includes 2 seats)</span>
                  <span>${PREMIUM_BASE_PRICE}/mo</span>
                </div>
                {seats > INCLUDED_SEATS && (
                  <div className="flex justify-between text-[#2D5A3D]">
                    <span>+{seats - INCLUDED_SEATS} additional seats</span>
                    <span>+${seatPricing.additionalCost}/mo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              {FEATURES.filter(f => f.highlight).map((feature) => (
                <div key={feature.name} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#2D5A3D]" />
                  <span className="text-sm text-gray-700">
                    {feature.name}: {feature.premium === true ? 'Included' : feature.premium}
                  </span>
                </div>
              ))}
              <p className="text-xs text-gray-500 pl-7">+ all Basic features</p>
            </div>

            {/* CTA Button */}
            {isPremium ? (
              <button 
                disabled
                className="w-full py-3 rounded-xl font-semibold bg-[#2D5A3D]/20 text-[#2D5A3D] cursor-not-allowed"
              >
                <Check className="inline w-4 h-4 mr-2" />
                Current Plan
              </button>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full py-3 rounded-xl font-semibold bg-[#2D5A3D] text-white hover:bg-[#355a48] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkoutLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  <>
                    Upgrade to Premium · ${billingCycle === 'monthly' 
                      ? seatPricing.monthlyTotal 
                      : seatPricing.yearlyTotal
                    }/{billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </>
                )}
              </button>
            )}
            </div>
          </div>
        </div>

        {/* Full Feature Comparison Table */}
        <div className="glass-card-page p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#2d2d2d] mb-4">Full Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Feature</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Basic</th>
                  <th className="text-center py-3 px-4 font-medium text-[#2D5A3D]">Premium</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature) => (
                  <tr key={feature.name} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm text-gray-700">{feature.name}</td>
                    <td className="py-3 px-4 text-center text-sm">
                      {feature.basic === false ? (
                        <X className="w-4 h-4 text-gray-300 mx-auto" />
                      ) : feature.basic === true ? (
                        <Check className="w-4 h-4 text-[#2D5A3D] mx-auto" />
                      ) : (
                        <span className="text-gray-600">{feature.basic}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-sm">
                      {feature.premium === true ? (
                        <Check className="w-4 h-4 text-[#2D5A3D] mx-auto" />
                      ) : (
                        <span className="text-[#2D5A3D] font-medium">{feature.premium}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="glass-card-page p-6">
          <h2 className="text-lg font-semibold text-[#2d2d2d] mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-[#2d2d2d] mb-1">How do family seats work?</h3>
              <p className="text-sm text-gray-500">
                Each seat gives a family member their own account to document their memories. 
                Premium includes 2 seats (you + 1 family member). Add more seats as needed.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-[#2d2d2d] mb-1">Can I add seats later?</h3>
              <p className="text-sm text-gray-500">
                Yes! You can add or remove seats anytime. Your billing will adjust automatically.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-[#2d2d2d] mb-1">What happens if I downgrade?</h3>
              <p className="text-sm text-gray-500">
                You'll keep access until the end of your billing period. Your memories are safe - 
                you just won't be able to add new content beyond Basic limits.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-[#2d2d2d] mb-1">Is my payment secure?</h3>
              <p className="text-sm text-gray-500">
                Yes, we use Stripe for secure payment processing. We never store your card details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
