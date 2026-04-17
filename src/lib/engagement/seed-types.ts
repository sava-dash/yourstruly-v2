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
