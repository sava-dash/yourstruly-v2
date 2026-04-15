/**
 * event-contact-mapping
 *
 * For holiday-type event suggestions (Mother's Day, Father's Day, Valentine's
 * Day), try to resolve which contact the user most likely wants to send to, so
 * the postscript "Suggested Events" surface can deep-link straight into the
 * create flow with the recipient already chosen.
 *
 * Kept intentionally small and pure — no Supabase access, no React. The caller
 * (EventSuggestions) passes in the already-loaded contacts.
 */

export interface ContactLike {
  id: string
  full_name: string
  relationship_type?: string | null
}

export type HolidayKind = "mothers_day" | "fathers_day" | "valentines"

const RELATIONSHIP_BY_KIND: Record<HolidayKind, string[]> = {
  mothers_day: ["mother", "mom", "stepmother", "step_mother", "step-mother"],
  fathers_day: ["father", "dad", "stepfather", "step_father", "step-father"],
  valentines: [
    "spouse",
    "partner",
    "husband",
    "wife",
    "girlfriend",
    "boyfriend",
    "significant_other",
  ],
}

// Case-insensitive name heuristics used only when relationship_type is absent.
const NAME_PATTERN_BY_KIND: Record<HolidayKind, RegExp> = {
  mothers_day: /\b(mom|mother|mama|mommy|ma)\b/i,
  fathers_day: /\b(dad|father|papa|daddy|pa)\b/i,
  // No generic name heuristic for a partner — names are individual. Leave
  // undefined-ish by using a never-match regex.
  valentines: /$^/,
}

/**
 * Maps a human-readable holiday label (as produced by EventSuggestions) to the
 * canonical HolidayKind we use for contact resolution. Returns null if the
 * label isn't one we know how to auto-pick for.
 */
export function holidayKindFromLabel(label: string): HolidayKind | null {
  const l = label.toLowerCase()
  if (l.includes("mother")) return "mothers_day"
  if (l.includes("father")) return "fathers_day"
  if (l.includes("valentine")) return "valentines"
  return null
}

/**
 * inferContactForEvent
 * Given a holiday-kind event and the user's contacts, return the best matching
 * contact (or null). Matching rules, in priority order:
 *   1) contact.relationship_type matches one of the known tokens for that kind
 *   2) contact.full_name matches the kind's name pattern (Mother's/Father's
 *      only — there is no generic name heuristic for a partner)
 * Ties: returns the first match encountered (stable with input order).
 */
export function inferContactForEvent<T extends ContactLike>(
  eventKind: string,
  contacts: T[],
): T | null {
  // Accept either HolidayKind tokens or a raw holiday label.
  const kind =
    eventKind === "mothers_day" ||
    eventKind === "fathers_day" ||
    eventKind === "valentines"
      ? (eventKind as HolidayKind)
      : holidayKindFromLabel(eventKind)
  if (!kind) return null
  if (!Array.isArray(contacts) || contacts.length === 0) return null

  const rels = RELATIONSHIP_BY_KIND[kind]
  const namePattern = NAME_PATTERN_BY_KIND[kind]

  // 1) relationship_type match
  for (const c of contacts) {
    const rt = (c.relationship_type || "").toString().trim().toLowerCase()
    if (rt && rels.includes(rt)) return c
  }

  // 2) name heuristic (Mother's/Father's only — valentines regex never matches)
  for (const c of contacts) {
    const name = (c.full_name || "").toString()
    if (name && namePattern.test(name)) return c
  }

  return null
}
