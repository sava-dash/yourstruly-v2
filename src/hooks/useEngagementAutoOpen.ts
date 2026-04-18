'use client';

import { useEffect, useState } from 'react';

/**
 * Smart auto-open policy for the engagement overlay.
 *
 * Per todo + spec:
 *  - First N visits (default 6): auto-open every time so new users see the
 *    surface immediately.
 *  - After that, only auto-open when there's a *reason*: a fresh/high-priority
 *    prompt is in the queue, OR the user's streak is at risk of breaking.
 *  - Never auto-open between midnight and 6am (caller is presumed asleep).
 *  - Never auto-open if the user dismissed it earlier in the same session.
 *
 * The hook returns `shouldAutoOpen` plus a `dismiss()` recorder. Callers
 * mount this once; it tracks visit count automatically the first time it
 * is consulted in a session.
 */

const LS_VISIT_COUNT_KEY = 'ys_engagement_visit_count_v1';
const LS_LAST_DISMISSED_KEY = 'ys_engagement_last_dismissed_v1';
const SS_DISMISSED_KEY = 'ys_engagement_dismissed_session_v1';
const SS_VISIT_COUNTED_KEY = 'ys_engagement_visit_counted_v1';

const NEW_USER_VISIT_THRESHOLD = 6;

export interface AutoOpenSignals {
  /** Are there fresh (created in the last 24h) or high-priority (>=90) prompts? */
  hasFreshOrHighPriority: boolean;
  /** Is the streak at risk (active streak, not engaged today)? */
  streakAtRisk: boolean;
}

export interface AutoOpenResult {
  /** Final decision after applying the policy. */
  shouldAutoOpen: boolean;
  /** Why we decided what we decided — useful for instrumentation/debug. */
  reason:
    | 'pending'              // signals not loaded yet
    | 'new_user'             // under visit threshold
    | 'fresh_priority'       // post-threshold reason: fresh prompt
    | 'streak_at_risk'       // post-threshold reason: keep the streak alive
    | 'session_dismissed'    // suppressed: dismissed this session
    | 'quiet_hours'          // suppressed: between midnight and 6am
    | 'no_signal';           // suppressed: no good reason to interrupt
  /** Records a user dismissal for this session + persists across sessions. */
  dismiss: () => void;
}

function readVisitCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return Number(localStorage.getItem(LS_VISIT_COUNT_KEY)) || 0;
  } catch {
    return 0;
  }
}

function bumpVisitCountOncePerSession(): number {
  if (typeof window === 'undefined') return 0;
  try {
    if (sessionStorage.getItem(SS_VISIT_COUNTED_KEY)) return readVisitCount();
    const next = readVisitCount() + 1;
    localStorage.setItem(LS_VISIT_COUNT_KEY, String(next));
    sessionStorage.setItem(SS_VISIT_COUNTED_KEY, '1');
    return next;
  } catch {
    return readVisitCount();
  }
}

function isQuietHours(now: Date): boolean {
  const hour = now.getHours();
  return hour >= 0 && hour < 6;
}

function wasDismissedThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SS_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function useEngagementAutoOpen(signals: AutoOpenSignals | null): AutoOpenResult {
  const [decision, setDecision] = useState<{ shouldAutoOpen: boolean; reason: AutoOpenResult['reason'] }>({
    shouldAutoOpen: false,
    reason: 'pending',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const visitCount = bumpVisitCountOncePerSession();
    const now = new Date();

    if (wasDismissedThisSession()) {
      setDecision({ shouldAutoOpen: false, reason: 'session_dismissed' });
      return;
    }

    if (isQuietHours(now)) {
      setDecision({ shouldAutoOpen: false, reason: 'quiet_hours' });
      return;
    }

    if (visitCount <= NEW_USER_VISIT_THRESHOLD) {
      setDecision({ shouldAutoOpen: true, reason: 'new_user' });
      return;
    }

    // Past the new-user grace window — need a real reason to interrupt.
    if (signals === null) {
      // Caller hasn't supplied signals yet; defer the decision.
      setDecision({ shouldAutoOpen: false, reason: 'pending' });
      return;
    }

    if (signals.hasFreshOrHighPriority) {
      setDecision({ shouldAutoOpen: true, reason: 'fresh_priority' });
      return;
    }

    if (signals.streakAtRisk) {
      setDecision({ shouldAutoOpen: true, reason: 'streak_at_risk' });
      return;
    }

    setDecision({ shouldAutoOpen: false, reason: 'no_signal' });
  }, [signals?.hasFreshOrHighPriority, signals?.streakAtRisk]);

  const dismiss = () => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(SS_DISMISSED_KEY, '1');
      localStorage.setItem(LS_LAST_DISMISSED_KEY, new Date().toISOString());
    } catch {}
    setDecision({ shouldAutoOpen: false, reason: 'session_dismissed' });
  };

  return { ...decision, dismiss };
}
