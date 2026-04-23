'use client';

import { createClient } from '@/lib/supabase/client';

export type OnboardingPhase =
  | 'basics'
  | 'map'
  | 'places-lived'
  | 'contacts'
  | 'interests'
  | 'photo-upload'
  | 'why-here'
  | 'preferences'
  | 'lets-go'
  | 'completed'
  | 'abandoned';

/**
 * Fire-and-forget: record that a user entered an onboarding phase.
 * Powers drop-off analytics. Non-blocking, non-throwing.
 */
export async function logOnboardingPhase(
  userId: string | null | undefined,
  phase: OnboardingPhase,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!userId) return;
  try {
    const supabase = createClient();
    await supabase.from('onboarding_events').insert({
      user_id: userId,
      phase,
      event: 'entered',
      metadata: metadata ?? null,
    });
  } catch (err) {
    // Analytics must never block onboarding
    console.debug('[onboarding-events] log failed:', err);
  }
}
