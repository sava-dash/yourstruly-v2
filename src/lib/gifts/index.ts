/**
 * Gift-a-Year helpers (F4). Tiers, pricing, entitlement application.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type GiftTier = 'yt' | 'yt_photobook' | 'yt_interview';

export interface GiftTierConfig {
  id: GiftTier;
  name: string;
  tagline: string;
  amountCents: number;
  features: string[];
}

export const GIFT_TIERS: Record<GiftTier, GiftTierConfig> = {
  yt: {
    id: 'yt',
    name: 'Just YoursTruly',
    tagline: 'A whole year of capturing memories.',
    amountCents: 9900,
    features: [
      'Unlimited memories, photos, and stories',
      'Daily prompts crafted just for them',
      'Private circles to share with family',
      'Beautiful keepsake feed they can revisit',
    ],
  },
  yt_photobook: {
    id: 'yt_photobook',
    name: 'YoursTruly + 1 Photobook',
    tagline: 'A year of memories, plus a printed keepsake.',
    amountCents: 14900,
    features: [
      'Everything in Just YoursTruly',
      'One hardcover photobook printed and shipped',
      'They choose the photos and captions',
    ],
  },
  yt_interview: {
    id: 'yt_interview',
    name: 'YoursTruly + Interview Set',
    tagline: 'A year of memories, plus guided interviews.',
    amountCents: 12900,
    features: [
      'Everything in Just YoursTruly',
      'Curated interview questions delivered weekly',
      'Audio + transcript, archived forever',
    ],
  },
};

export function getGiftTier(tier: string | null | undefined): GiftTierConfig | null {
  if (!tier) return null;
  return GIFT_TIERS[tier as GiftTier] ?? null;
}

/**
 * Apply a redeemed gift to the recipient's profile. Sets `gifted_until` one
 * year out from redemption (added by 20260414_weekly_story_prefs.sql).
 */
export async function applyGiftEntitlement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  giftId: string,
): Promise<boolean> {
  const giftedUntil = new Date();
  giftedUntil.setUTCFullYear(giftedUntil.getUTCFullYear() + 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (supabase.from('profiles') as any)
    .update({ gifted_until: giftedUntil.toISOString() })
    .eq('id', userId);
  if (profileError) {
    console.error('[gifts] apply entitlement failed', profileError);
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: giftError } = await (supabase.from('gift_subscriptions') as any)
    .update({
      recipient_user_id: userId,
      redeemed_at: new Date().toISOString(),
      status: 'redeemed',
    })
    .eq('id', giftId);
  if (giftError) {
    console.error('[gifts] mark redeemed failed', giftError);
    return false;
  }
  return true;
}
