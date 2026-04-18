/**
 * Client-side prompt-ordering scorer.
 *
 * Implements a subset of PROMPT-ORDERING-STRATEGY.md as a pure TS
 * function so the existing shuffle RPC stays untouched. The signals
 * used here are the ones the dashboard already has on hand without
 * extra DB roundtrips:
 *
 *   - variety_penalty   (last shown types)
 *   - time_of_day       (current hour)
 *   - freshness_bonus   (createdAt recency)
 *   - photo_relevance   (has photo?)
 *   - completion_boost  (passed in via context.typeStats, optional)
 *   - streak_risk       (passed in via context.streakStatus, optional)
 *
 * The scorer never *removes* prompts; it only re-ranks the queue the
 * server returned. If the input array is empty or the user is on a
 * legacy client, the behavior is identical to "do nothing".
 */

import type { EngagementPrompt } from '@/types/engagement';

export type StreakStatus =
  | 'none'
  | 'broken_yesterday'
  | 'active_engaged_today'
  | 'active_not_engaged_today_morning'
  | 'active_not_engaged_today_evening';

export interface ScoringContext {
  /** Types shown in the previous queue, oldest first. Used for variety_penalty. */
  recentlyShownTypes?: string[];
  /** Per-type completion stats { type: { answered, skipped } }. Optional. */
  typeStats?: Record<string, { answered: number; skipped: number }>;
  /** Streak status — drives streak_risk_modifier. Default 'none'. */
  streakStatus?: StreakStatus;
  /** Override for "now" — useful in tests. Default `new Date()`. */
  now?: Date;
}

const QUICK_TYPES = new Set([
  'daily_checkin',
  'binary_choice',
  'missing_info',
  'tag_person',
  'quick_question',
]);

const DEEP_TYPES = new Set([
  'memory_prompt',
  'knowledge',
  'connect_dots',
  'postscript',
]);

const PHOTO_TYPES = new Set([
  'photo_backstory',
  'photo_metadata',
  'tag_person',
]);

const REFLECTIVE_TYPES = new Set([
  'postscript',
  'highlight',
  'letter_to_self',
]);

/**
 * Hour-of-day bucket → modifier per type-class.
 * Returns `0` for any type/hour not in the table.
 */
function timeOfDayModifier(type: string, hour: number): number {
  if (hour >= 0 && hour < 6) {
    return type === 'daily_checkin' ? 0 : -15;
  }
  if (hour >= 6 && hour < 9) {
    if (QUICK_TYPES.has(type)) return 10;
    if (DEEP_TYPES.has(type)) return -10;
    return 0;
  }
  if (hour >= 9 && hour < 12) {
    return type === 'favorites_firsts' || type === 'skills' ? 5 : 0;
  }
  if (hour >= 12 && hour < 17) {
    return PHOTO_TYPES.has(type) ? 10 : 0;
  }
  if (hour >= 17 && hour < 21) {
    if (DEEP_TYPES.has(type)) return 10;
    if (QUICK_TYPES.has(type)) return -5;
    return 0;
  }
  // 21–24
  return REFLECTIVE_TYPES.has(type) ? 10 : 0;
}

function varietyPenalty(type: string, recent: string[]): number {
  if (recent.length === 0) return 0;
  if (recent[recent.length - 1] === type) return -20;
  if (recent.slice(-2).includes(type)) return -10;
  const todayCount = recent.filter((t) => t === type).length;
  if (todayCount >= 3) return -15;
  return 0;
}

function freshnessBonus(createdAt: string | undefined, now: Date): number {
  if (!createdAt) return 0;
  const ageMs = now.getTime() - new Date(createdAt).getTime();
  if (Number.isNaN(ageMs) || ageMs < 0) return 0;
  const hours = ageMs / (1000 * 60 * 60);
  if (hours < 24) return 10;
  if (hours < 48) return 5;
  return 0;
}

function photoRelevance(prompt: EngagementPrompt): number {
  if (!prompt.photoId) return 0;
  if (prompt.type === 'tag_person') return 15;
  if (prompt.type === 'photo_backstory') return 10;
  if (PHOTO_TYPES.has(prompt.type)) return 8;
  return 0;
}

function completionBoost(
  type: string,
  stats: Record<string, { answered: number; skipped: number }> | undefined
): number {
  if (!stats || !stats[type]) return 0;
  const { answered, skipped } = stats[type];
  const total = answered + skipped;
  if (total < 3) return 0;
  const rate = answered / total;
  if (rate > 0.8) return 20;
  if (rate > 0.6) return 10;
  if (rate > 0.4) return 5;
  if (rate < 0.2) return -10;
  return 0;
}

function streakRiskModifier(type: string, status: StreakStatus): number {
  switch (status) {
    case 'broken_yesterday':
      return type === 'daily_checkin' || type === 'binary_choice' ? 15 : 0;
    case 'active_not_engaged_today_morning':
      return QUICK_TYPES.has(type) ? 10 : 0;
    case 'active_not_engaged_today_evening':
      if (QUICK_TYPES.has(type)) return 15;
      if (DEEP_TYPES.has(type)) return -10;
      return 0;
    case 'none':
      return type === 'daily_checkin' || type === 'photo_backstory' ? 10 : 0;
    case 'active_engaged_today':
    default:
      return 0;
  }
}

export function scorePrompt(prompt: EngagementPrompt, ctx: ScoringContext = {}): number {
  const now = ctx.now ?? new Date();
  const hour = now.getHours();

  return (
    (prompt.priority ?? 0) +
    completionBoost(prompt.type, ctx.typeStats) +
    timeOfDayModifier(prompt.type, hour) +
    streakRiskModifier(prompt.type, ctx.streakStatus ?? 'none') +
    varietyPenalty(prompt.type, ctx.recentlyShownTypes ?? []) +
    freshnessBonus(prompt.createdAt, now) +
    photoRelevance(prompt)
  );
}

/**
 * Re-rank a queue of prompts by score, with one variety pass: never put
 * two same-type prompts back-to-back if an alternative scored within 8
 * points exists. Returns a new array; never mutates input.
 */
export function rankPrompts(
  prompts: EngagementPrompt[],
  ctx: ScoringContext = {}
): EngagementPrompt[] {
  if (prompts.length <= 1) return prompts.slice();

  const scored = prompts.map((p) => ({ prompt: p, score: scorePrompt(p, ctx) }));
  scored.sort((a, b) => b.score - a.score);

  const result: EngagementPrompt[] = [];
  const remaining = scored.slice();

  while (remaining.length > 0) {
    const last = result[result.length - 1];
    let pickIndex = 0;
    if (last) {
      // Prefer the highest-scored candidate that isn't the same type as last,
      // as long as it's within 8 points of the top candidate.
      const top = remaining[0];
      const alt = remaining.findIndex(
        (c, i) => i > 0 && c.prompt.type !== last.type && top.score - c.score <= 8
      );
      if (top.prompt.type === last.type && alt !== -1) {
        pickIndex = alt;
      }
    }
    result.push(remaining[pickIndex].prompt);
    remaining.splice(pickIndex, 1);
  }

  return result;
}
