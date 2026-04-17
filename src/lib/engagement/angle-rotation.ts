/**
 * Angle rotation for engagement prompts.
 * Ensures prompts cycle through different perspectives to avoid monotony.
 */

export type PromptAngle = 'people' | 'place' | 'event' | 'feeling' | 'object' | 'turning_point';

const ALL_ANGLES: PromptAngle[] = ['people', 'place', 'event', 'feeling', 'object', 'turning_point'];

const VALID_ANGLES = new Set<string>(ALL_ANGLES);

/**
 * Given the user's recent angle history, returns the next angle that
 * hasn't appeared in the last 5 prompts. Falls back to random if all
 * have been used recently.
 */
export function getNextAngle(recent: string[]): PromptAngle {
  const lastFive = recent.slice(-5);
  for (const a of ALL_ANGLES) {
    if (!lastFive.includes(a)) return a;
  }
  return ALL_ANGLES[Math.floor(Math.random() * ALL_ANGLES.length)];
}

/**
 * Validates an angle string against the allowed values.
 * Returns the angle if valid, or a fallback based on recent history.
 */
export function validateAngle(angle: string | undefined, recent: string[]): PromptAngle {
  if (angle && VALID_ANGLES.has(angle)) return angle as PromptAngle;
  return getNextAngle(recent);
}

/**
 * Extracts a simple anti-repeat group from prompt text.
 * Uses the first significant noun phrase as a grouping key.
 */
export function extractAntiRepeatGroup(text: string): string {
  const lower = text.toLowerCase().replace(/[?.!,"']/g, '');
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'was', 'were', 'are', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'shall', 'to', 'of',
    'in', 'for', 'on', 'with', 'at', 'by', 'from', 'about', 'that',
    'this', 'it', 'you', 'your', 'what', 'when', 'where', 'who',
    'how', 'if', 'or', 'and', 'but', 'not', 'no', 'so', 'up',
    'out', 'just', 'than', 'then', 'also', 'into', 'over', 'after',
    'before', 'there', 'me', 'my', 'we', 'our', 'tell', 'ever',
    'most', 'some', 'any', 'each', 'every', 'all', 'more',
  ]);
  const words = lower.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
  return words.slice(0, 2).join('_') || 'general';
}

/**
 * Extracts 2-3 snowball hooks (keywords) from a prompt for
 * cross-referencing with future prompts.
 */
export function extractSnowballHooks(text: string): string[] {
  const lower = text.toLowerCase().replace(/[?.!,"']/g, '');
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'was', 'were', 'are', 'you', 'your',
    'what', 'when', 'where', 'who', 'how', 'tell', 'about', 'that',
    'this', 'ever', 'have', 'has', 'had', 'been', 'there', 'with',
  ]);
  const words = lower.split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w));
  return [...new Set(words)].slice(0, 3);
}
