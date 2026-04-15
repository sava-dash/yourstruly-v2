/**
 * Branching question evaluator.
 *
 * A question row in `session_questions` may carry a JSONB `branch_rules`
 * column shaped like:
 *
 *   [
 *     { "if_answer_contains": ["yes", "yeah", "of course"],
 *       "then_ask": "Tell me more about that — what made it special?" },
 *     ...
 *   ]
 *
 * If the recipient's answer matches any rule's keywords (case-insensitive
 * substring), we use the matched `then_ask` as the next exchange instead
 * of an AI-generated follow-up. After the branch question is answered,
 * the conversation falls back to AI follow-ups.
 *
 * Backwards compatible: empty / missing rules behave exactly as today.
 */

export interface BranchRule {
  if_answer_contains: string[];
  then_ask: string;
}

export type BranchRules = BranchRule[] | null | undefined;

/**
 * Evaluate branch rules against an answer.
 * Returns the first matching `then_ask` string, or null.
 */
export function evaluateBranches(
  answer: string,
  rules: BranchRules
): string | null {
  if (!answer || typeof answer !== 'string') return null;
  if (!Array.isArray(rules) || rules.length === 0) return null;

  const haystack = answer.toLowerCase();

  for (const rule of rules) {
    if (!rule || typeof rule !== 'object') continue;
    if (!Array.isArray(rule.if_answer_contains)) continue;
    if (typeof rule.then_ask !== 'string' || rule.then_ask.trim() === '') {
      continue;
    }

    for (const needleRaw of rule.if_answer_contains) {
      if (typeof needleRaw !== 'string') continue;
      const needle = needleRaw.trim().toLowerCase();
      if (needle.length === 0) continue;
      if (haystack.includes(needle)) {
        return rule.then_ask.trim();
      }
    }
  }

  return null;
}

/**
 * Validate / normalize a JSONB blob from the database into typed rules.
 * Anything malformed is silently dropped — we never want bad data to
 * crash the recipient's interview.
 */
export function parseBranchRules(raw: unknown): BranchRule[] {
  if (!Array.isArray(raw)) return [];
  const out: BranchRule[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const keywords = Array.isArray(e.if_answer_contains)
      ? (e.if_answer_contains.filter((k) => typeof k === 'string') as string[])
      : [];
    const thenAsk = typeof e.then_ask === 'string' ? e.then_ask : '';
    if (keywords.length === 0 || thenAsk.trim().length === 0) continue;
    out.push({ if_answer_contains: keywords, then_ask: thenAsk });
  }
  return out;
}
