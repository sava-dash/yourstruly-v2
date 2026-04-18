import Stripe from 'stripe';
import { loadStripe, Stripe as StripeClient } from '@stripe/stripe-js';

// Server-side Stripe instance (lazy initialization for build compatibility)
let _stripe: Stripe | null = null;
export function getStripeServer(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// Alias for backward compatibility
export const stripe = { get: getStripeServer };

// Client-side Stripe promise
let stripePromise: Promise<StripeClient | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Plan IDs (placeholder - replace with real Stripe Price IDs)
export const STRIPE_PLANS = {
  FREE: null,
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly_placeholder',
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly_placeholder',
  FAMILY_MONTHLY: process.env.STRIPE_PRICE_FAMILY_MONTHLY || 'price_family_monthly_placeholder',
  FAMILY_YEARLY: process.env.STRIPE_PRICE_FAMILY_YEARLY || 'price_family_yearly_placeholder',
};

// Helper to format price from cents to dollars
export const formatPrice = (cents: number | null, currency: string = 'usd'): string => {
  if (cents === null || cents === undefined) return 'Free';
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  
  return formatter.format(cents / 100);
};

// Subscription status helpers
export const isSubscriptionActive = (status: string | null): boolean => {
  return status === 'active' || status === 'trialing';
};

export const hasPremiumAccess = (subscriptionStatus: string | null): boolean => {
  return isSubscriptionActive(subscriptionStatus) || subscriptionStatus === 'past_due';
};

// Feature limit helpers
export const checkFeatureLimit = (
  currentUsage: number,
  limit: number | null | undefined
): { allowed: boolean; remaining: number } => {
  // -1 or null means unlimited
  if (limit === null || limit === undefined || limit === -1) {
    return { allowed: true, remaining: Infinity };
  }
  
  const remaining = limit - currentUsage;
  return { allowed: remaining > 0, remaining };
};
