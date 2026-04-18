/**
 * Types for the progressive engagement prompt seed library.
 * Used by the shuffle engine (PR 2), AI generation (PR 3),
 * and follow-up engine (PR 4).
 */

export type PromptTier = 0 | 1 | 2 | 3 | 4;

export type PromptAnchor =
  | 'place'
  | 'person'
  | 'interest'
  | 'why_here'
  | 'era'
  | null;

export type PromptAngle =
  | 'people'
  | 'place'
  | 'event'
  | 'feeling'
  | 'object'
  | 'turning_point';

export interface SeedPrompt {
  id: string;
  tier: PromptTier;
  text: string;
  anchor: PromptAnchor;
  placeholders: string[];
  category: string;
  angle: PromptAngle;
  requires: string[];
  anti_repeat_group: string;
  snowball_hooks: string[];
}

/**
 * Deprecated/duplicate prompt types collapse into a canonical one.
 * Per docs/ENGAGEMENT_AUDIT_FINDINGS.md, `recipes_wisdom` and `favorites_firsts`
 * are *categories*, not real types — they should ride on `memory_prompt`.
 * `photo_location` and `photo_date` are sub-cases of `photo_backstory`.
 * `quick_question` is a stale legacy alias for `memory_prompt`.
 */
const TYPE_ALIASES: Record<string, string> = {
  quick_question: 'memory_prompt',
  recipes_wisdom: 'memory_prompt',
  favorites_firsts: 'memory_prompt',
  photo_location: 'photo_backstory',
  photo_date: 'photo_backstory',
};

/**
 * Chapter aliases — the same chapter sometimes ships under multiple names
 * for backward-compat with legacy seed data. Normalizing on read keeps
 * gradient/style lookups consistent without mutating stored rows.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  career: 'jobs_career',
  work: 'jobs_career',
  religion: 'spirituality',
  life_lessons: 'wisdom_legacy',
  firsts: 'milestones',
  interests: 'hobbies',
  skills: 'hobbies',
};

export function normalizePromptType(type: string | null | undefined): string {
  if (!type) return 'memory_prompt';
  return TYPE_ALIASES[type] ?? type;
}

export function normalizePromptCategory(category: string | null | undefined): string {
  if (!category) return 'general';
  return CATEGORY_ALIASES[category] ?? category;
}

/**
 * Normalize prompt text for dedup comparison. Collapses whitespace, lowercases,
 * and strips trailing punctuation so "Tell me about..." and "Tell me about?"
 * are recognized as the same prompt.
 */
export function normalizePromptText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.?!,;:'"`\u201C\u201D\u2018\u2019]+$/g, '')
    .trim();
}
