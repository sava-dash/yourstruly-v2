/**
 * Lightweight engagement analytics helper.
 *
 * Fires events from the dashboard card-chain flow so we can measure
 * views, saves, errors, drop-off. No provider is wired yet — events are
 * logged to the console in dev and pushed to window.dataLayer if present,
 * so adopting GTM/PostHog/Mixpanel later is a one-line swap.
 */

type EngagementEventName =
  | 'card_viewed'
  | 'card_expanded'
  | 'card_saved'
  | 'card_finished'
  | 'card_save_failed'
  | 'card_finish_failed'
  | 'shuffle_clicked'

export function trackEngagement(
  event: EngagementEventName,
  props: Record<string, any> = {}
): void {
  try {
    const payload = {
      event: `engagement.${event}`,
      ts: Date.now(),
      ...props,
    }
    if (typeof window !== 'undefined') {
      // Push to dataLayer for GTM / downstream pipelines
      ;(window as any).dataLayer = (window as any).dataLayer || []
      ;(window as any).dataLayer.push(payload)
    }
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[analytics]', payload)
    }
  } catch {
    // Never let analytics break the app
  }
}
