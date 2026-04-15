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
  date_of_birth?: string | null
  anniversary_date?: string | null
}

/**
 * Given an event kind chip (birthday, anniversary, 18th_birthday, etc.) and a
 * contact whose DOB / anniversary we may know, return the next occurrence date
 * for the event, or null when we can't resolve it from stored data.
 *
 * - `birthday` / `Nth_birthday` → uses contact.date_of_birth
 *   * `Nth_birthday` returns the Nth birthday year if still in the future,
 *     otherwise null (already passed)
 * - `anniversary` → uses contact.anniversary_date (if present)
 * - everything else → null (user supplies a date)
 */
export function computeDateForEvent(
  eventKind: string,
  contact: ContactLike | null | undefined,
): Date | null {
  if (!contact) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const nthMatch = /^(\d{1,3})(?:st|nd|rd|th)?_birthday$/i.exec(eventKind)
  if (nthMatch && contact.date_of_birth) {
    const n = parseInt(nthMatch[1], 10)
    const dob = new Date(contact.date_of_birth + 'T00:00:00')
    if (isNaN(dob.getTime())) return null
    const target = new Date(dob)
    target.setFullYear(dob.getFullYear() + n)
    return target >= today ? target : null
  }

  if (eventKind === 'birthday' && contact.date_of_birth) {
    return nextOccurrence(contact.date_of_birth, today)
  }
  if (eventKind === 'anniversary' && contact.anniversary_date) {
    return nextOccurrence(contact.anniversary_date, today)
  }
  return null
}

function nextOccurrence(isoDate: string, today: Date): Date | null {
  const src = new Date(isoDate + 'T00:00:00')
  if (isNaN(src.getTime())) return null
  const candidate = new Date(today.getFullYear(), src.getMonth(), src.getDate())
  if (candidate < today) candidate.setFullYear(today.getFullYear() + 1)
  return candidate
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
