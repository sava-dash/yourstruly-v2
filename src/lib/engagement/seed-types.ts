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
 * Map a seed-library / template category onto one of the canonical
 * life chapters used by the dashboard chapter filter.
 *
 * Philosophy: only route a category to a life-stage chapter when the
 * fit is obvious (e.g. `mentors` → `relationships`, `resilience` →
 * `wisdom_legacy`). Substantive life events go to `life_moments`.
 * Thematic tags (music, food, humor, sensory, nostalgia) and anything
 * we don't recognize fall through to `everyday_life`, the catch-all
 * "tastes, feelings, little things" chapter.
 */
const CATEGORY_TO_CHAPTER: Record<string, string> = {
  // ── childhood ────────────────────────────────────────────────
  childhood: 'childhood',
  early_life: 'childhood',

  // ── teenage ──────────────────────────────────────────────────
  teenage: 'teenage',
  growing_up: 'teenage',

  // ── high school ──────────────────────────────────────────────
  high_school: 'high_school',
  school: 'high_school',

  // ── college ──────────────────────────────────────────────────
  college: 'college',
  university: 'college',
  education: 'college',

  // ── career ───────────────────────────────────────────────────
  career: 'jobs_career',
  jobs_career: 'jobs_career',
  work: 'jobs_career',

  // ── relationships ────────────────────────────────────────────
  relationships: 'relationships',
  marriage: 'relationships',
  family: 'relationships',
  parenting: 'relationships',
  mentors: 'relationships',
  influence: 'relationships',
  support: 'relationships',
  friendship: 'relationships',
  lost_touch: 'relationships',

  // ── travel ───────────────────────────────────────────────────
  travel: 'travel',
  places_lived: 'travel',
  location: 'travel',
  adventure: 'travel',

  // ── spirituality ─────────────────────────────────────────────
  spirituality: 'spirituality',
  faith: 'spirituality',
  religion: 'spirituality',

  // ── wisdom & legacy ──────────────────────────────────────────
  wisdom_legacy: 'wisdom_legacy',
  wisdom: 'wisdom_legacy',
  legacy: 'wisdom_legacy',
  life_lessons: 'wisdom_legacy',
  values: 'wisdom_legacy',
  reflection: 'wisdom_legacy',
  perspective: 'wisdom_legacy',
  purpose: 'wisdom_legacy',
  growth: 'wisdom_legacy',
  resilience: 'wisdom_legacy',
  courage: 'wisdom_legacy',
  priorities: 'wisdom_legacy',

  // ── life moments (big events) ────────────────────────────────
  life_moments: 'life_moments',
  milestones: 'life_moments',
  celebration: 'life_moments',
  firsts: 'life_moments',
  turning_point: 'life_moments',
  independence: 'life_moments',
  decisions: 'life_moments',
  endings: 'life_moments',
  loss: 'life_moments',
  regret: 'life_moments',

  // ── everyday life (catch-all themes) ─────────────────────────
  everyday_life: 'everyday_life',
  everyday: 'everyday_life',
  nostalgia: 'everyday_life',
  belonging: 'everyday_life',
  familiarity: 'everyday_life',
  emotion: 'everyday_life',
  sensory: 'everyday_life',
  food: 'everyday_life',
  contentment: 'everyday_life',
  humor: 'everyday_life',
  music: 'everyday_life',
  movies: 'everyday_life',
  books: 'everyday_life',
  kindness: 'everyday_life',
  spontaneity: 'everyday_life',
  keepsakes: 'everyday_life',
  possessions: 'everyday_life',
  culture: 'everyday_life',
  creation: 'everyday_life',
  gifts: 'everyday_life',
  fashion: 'everyday_life',
  fate: 'everyday_life',
  hobbies: 'everyday_life',
  interests: 'everyday_life',
  skills: 'everyday_life',
  languages: 'everyday_life',
  memory: 'everyday_life',
  memories: 'everyday_life',
};

export function mapCategoryToLifeChapter(
  category: string | null | undefined,
  type?: string | null
): string {
  if (type === 'knowledge') return 'wisdom_legacy';
  if (!category) return 'everyday_life';
  const trimmed = category.trim().toLowerCase();
  if (CATEGORY_TO_CHAPTER[trimmed]) return CATEGORY_TO_CHAPTER[trimmed];
  if (trimmed.includes('child')) return 'childhood';
  if (trimmed.includes('teen')) return 'teenage';
  return 'everyday_life';
}

/**
 * Normalize prompt text for dedup comparison. Collapses whitespace, lowercases,
 * and strips trailing punctuation so "Tell me about..." and "Tell me about?"
 * are recognized as the same prompt.
 */
/**
 * Scrub display-time punctuation the AI generators are told not to emit but
 * sometimes do anyway. Em-dashes become commas, en-dashes become hyphens,
 * curly quotes become straight, horizontal ellipsis becomes three ASCII dots,
 * and "--" double-hyphens collapse to ", ". The seed-library hints separator
 * (\n---\n) is preserved so cards keep their structured rendering.
 */
export function scrubPromptText(text: string | null | undefined): string {
  if (!text) return '';
  const HINTS_SENTINEL = ' HINTS ';
  let out = text.replace(/\n---\n/g, HINTS_SENTINEL);
  out = out
    .replace(/\s*—\s*/g, ', ')   // em-dash (with flanking spaces)  -> ", "
    .replace(/–/g, '-')          // en-dash  -> hyphen
    .replace(/…/g, '...')        // ellipsis -> three dots
    .replace(/[“”]/g, '"') // curly double quotes -> straight
    .replace(/[‘’]/g, "'") // curly single quotes -> straight
    .replace(/\s*--+\s*/g, ', ')       // double-hyphen -> ", "
    .replace(/,\s*,/g, ',')              // collapse ", ," from stacked replacements
    .replace(/[ \t]{2,}/g, ' ');        // collapse doubled spaces/tabs
  out = out.replace(new RegExp(HINTS_SENTINEL, 'g'), '\n---\n');
  return out.trim();
}

export function normalizePromptText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.?!,;:'"`\u201C\u201D\u2018\u2019]+$/g, '')
    .trim();
}
