'use client'

/**
 * EventSuggestions
 * Surfaces upcoming life events (contact birthdays, user's own birthday,
 * major holidays) as clickable cards inside the postscript event picker.
 * Sorted by proximity, capped at 10.
 */
import React, { useMemo } from 'react'
import { formatDistanceToNowStrict, format as formatDate } from 'date-fns'
import { inferContactForEvent, holidayKindFromLabel } from '@/lib/postscripts/event-contact-mapping'

export interface SuggestionContact {
  id: string
  full_name: string
  date_of_birth?: string | null
  /** Needed so holiday suggestions (Mother's/Father's/Valentine's Day) can
   * auto-pick the right recipient. Optional — pages that don't load it still
   * fall back to a name heuristic. */
  relationship_type?: string | null
}

export interface SuggestionProfile {
  date_of_birth?: string | null
  anniversary_date?: string | null
}

export interface EventSuggestion {
  id: string
  emoji: string
  label: string
  date: Date              // next upcoming occurrence
  eventKey: string        // maps to EVENT_OPTIONS.key
  eventType: 'contact_birthday' | 'profile_birthday' | 'profile_anniversary' | 'holiday'
  contactId?: string | null
  contactName?: string | null
}

interface EventSuggestionsProps {
  contacts: SuggestionContact[]
  profile?: SuggestionProfile | null
  onSelect: (s: EventSuggestion) => void
  maxDaysAhead?: number   // default 90 for birthdays/anniversaries
  limit?: number          // default 10
  /**
   * When set, only suggestions for that contact (contact_birthday) are shown.
   * The user's own events (profile birthday/anniversary) and holidays are hidden
   * so the surface stays focused on the selected recipient.
   */
  filterContactId?: string | null
  /** The last-selected suggestion — renders a "Will be delivered on {date}" confirmation below the list. */
  selectedDate?: Date | null
  selectedLabel?: string | null
}

// ---------- Holiday definitions ----------
// Fixed-date holidays: (month, day, label, emoji)
const FIXED_HOLIDAYS: Array<{ month: number; day: number; label: string; emoji: string }> = [
  { month: 1,  day: 1,  label: "New Year's Day",  emoji: '🎆' },
  { month: 2,  day: 14, label: "Valentine's Day", emoji: '💌' },
  { month: 7,  day: 4,  label: 'Independence Day', emoji: '🎇' },
  { month: 10, day: 31, label: 'Halloween',       emoji: '🎃' },
  { month: 12, day: 24, label: 'Christmas Eve',   emoji: '🎄' },
  { month: 12, day: 25, label: 'Christmas',       emoji: '🎄' },
  { month: 12, day: 31, label: "New Year's Eve",  emoji: '🥂' },
]

// Nth-weekday holidays: (month, nth, weekday[0=Sun], label, emoji)
// weekday convention: Date.getDay() => 0 Sun … 6 Sat
const NTH_WEEKDAY_HOLIDAYS: Array<{
  month: number
  nth: number          // 1..5; use -1 for "last"
  weekday: number
  label: string
  emoji: string
}> = [
  { month: 5,  nth: 2,  weekday: 0, label: "Mother's Day",  emoji: '💐' },
  { month: 6,  nth: 3,  weekday: 0, label: "Father's Day",  emoji: '👔' },
  { month: 11, nth: 4,  weekday: 4, label: 'Thanksgiving',  emoji: '🦃' }, // 4th Thursday
]

function nthWeekdayOfMonth(year: number, month1: number, nth: number, weekday: number): Date {
  // month1 is 1-indexed
  const first = new Date(year, month1 - 1, 1)
  const firstDow = first.getDay()
  const offset = ((weekday - firstDow + 7) % 7) + (nth - 1) * 7
  return new Date(year, month1 - 1, 1 + offset)
}

// Naive Easter (Anonymous Gregorian algorithm) — included as a bonus holiday.
function easterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const L = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * L) / 451)
  const month = Math.floor((h + L - 7 * m + 114) / 31)
  const day = ((h + L - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/** Next occurrence (today or later) of a month/day, parsed from a YYYY-MM-DD string. */
function nextOccurrence(monthDayIso: string, today: Date): Date | null {
  // Accept full ISO date; we only care about month+day.
  const parts = monthDayIso.split('-')
  if (parts.length < 3) return null
  const m = parseInt(parts[1], 10)
  const d = parseInt(parts[2], 10)
  if (!m || !d) return null
  const y = today.getFullYear()
  const candidate = new Date(y, m - 1, d)
  // Normalize to midnight
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (candidate < t0) return new Date(y + 1, m - 1, d)
  return candidate
}

function daysBetween(a: Date, b: Date): number {
  const MS = 24 * 60 * 60 * 1000
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.round((b0 - a0) / MS)
}

function computeHolidayOccurrences(today: Date): Array<{ label: string; emoji: string; date: Date }> {
  const out: Array<{ label: string; emoji: string; date: Date }> = []
  const y = today.getFullYear()
  const t0 = new Date(y, today.getMonth(), today.getDate())

  for (const h of FIXED_HOLIDAYS) {
    let d = new Date(y, h.month - 1, h.day)
    if (d < t0) d = new Date(y + 1, h.month - 1, h.day)
    out.push({ label: h.label, emoji: h.emoji, date: d })
  }
  for (const h of NTH_WEEKDAY_HOLIDAYS) {
    let d = nthWeekdayOfMonth(y, h.month, h.nth, h.weekday)
    if (d < t0) d = nthWeekdayOfMonth(y + 1, h.month, h.nth, h.weekday)
    out.push({ label: h.label, emoji: h.emoji, date: d })
  }
  // Easter this year, else next year
  let easter = easterDate(y)
  if (easter < t0) easter = easterDate(y + 1)
  out.push({ label: 'Easter', emoji: '🐣', date: easter })

  return out
}

export function buildSuggestions(
  contacts: SuggestionContact[],
  profile: SuggestionProfile | null | undefined,
  today: Date,
  maxDaysAhead: number,
  limit: number,
): EventSuggestion[] {
  const results: EventSuggestion[] = []

  // Contact birthdays (only if ≤ maxDaysAhead)
  for (const c of contacts) {
    if (!c.date_of_birth) continue
    const next = nextOccurrence(c.date_of_birth, today)
    if (!next) continue
    const days = daysBetween(today, next)
    if (days > maxDaysAhead) continue
    results.push({
      id: `contact-bday-${c.id}`,
      emoji: '🎂',
      label: `${c.full_name}'s birthday`,
      date: next,
      eventKey: 'birthday',
      eventType: 'contact_birthday',
      contactId: c.id,
      contactName: c.full_name,
    })
  }

  // User's own birthday
  if (profile?.date_of_birth) {
    const next = nextOccurrence(profile.date_of_birth, today)
    if (next) {
      const days = daysBetween(today, next)
      if (days <= maxDaysAhead) {
        results.push({
          id: 'profile-bday',
          emoji: '🎂',
          label: 'Your birthday',
          date: next,
          eventKey: 'birthday',
          eventType: 'profile_birthday',
        })
      }
    }
  }

  // User's own anniversary (if schema exposes one)
  if (profile?.anniversary_date) {
    const next = nextOccurrence(profile.anniversary_date, today)
    if (next) {
      const days = daysBetween(today, next)
      if (days <= maxDaysAhead) {
        results.push({
          id: 'profile-anniv',
          emoji: '💍',
          label: 'Your anniversary',
          date: next,
          eventKey: 'anniversary',
          eventType: 'profile_anniversary',
        })
      }
    }
  }

  // Holidays (always included if within ~120 days — a bit wider than birthdays so users see the next one)
  const holidayHorizon = Math.max(maxDaysAhead, 120)
  for (const h of computeHolidayOccurrences(today)) {
    const days = daysBetween(today, h.date)
    if (days > holidayHorizon) continue
    const lower = h.label.toLowerCase()
    // Map label → the app's canonical event_type token. Mother's/Father's/
    // Valentine's get their own tokens so the /new deep-link hydrates the
    // "event" correctly instead of landing on a generic "other".
    const kind = holidayKindFromLabel(h.label) // 'mothers_day' | 'fathers_day' | 'valentines' | null
    const key = kind
      ? kind
      : lower.includes('christmas')
      ? 'christmas'
      : lower.includes('new year')
      ? 'new_year'
      : 'other'
    // Auto-pick a recipient for the relationship-bound holidays.
    const match = kind ? inferContactForEvent(kind, contacts) : null
    results.push({
      id: `holiday-${h.label}`,
      emoji: h.emoji,
      label: h.label,
      date: h.date,
      eventKey: key,
      eventType: 'holiday',
      contactId: match?.id ?? null,
      contactName: match?.full_name ?? null,
    })
  }

  results.sort((a, b) => a.date.getTime() - b.date.getTime())
  return results.slice(0, limit)
}

export default function EventSuggestions({
  contacts,
  profile,
  onSelect,
  maxDaysAhead = 90,
  limit = 10,
  filterContactId = null,
  selectedDate = null,
  selectedLabel = null,
}: EventSuggestionsProps) {
  const suggestions = useMemo(() => {
    if (filterContactId) {
      // Narrow to just this contact's events. Profile + holidays excluded
      // (the user already picked a person — only that person's milestones matter).
      const onlyThisContact = contacts.filter(c => c.id === filterContactId)
      const all = buildSuggestions(onlyThisContact, null, new Date(), maxDaysAhead, limit)
      return all.filter(s => s.eventType === 'contact_birthday' && s.contactId === filterContactId)
    }
    return buildSuggestions(contacts, profile, new Date(), maxDaysAhead, limit)
  }, [contacts, profile, maxDaysAhead, limit, filterContactId])

  if (suggestions.length === 0 && !selectedDate) return null

  const hasContactBirthdays = suggestions.some(s => s.eventType === 'contact_birthday')

  return (
    <section className="rounded-2xl border border-[#406A56]/15 bg-[#F2F1E5] p-4 sm:p-5">
      <h3
        className="text-base sm:text-lg text-[#406A56] mb-3"
        style={{ fontFamily: 'var(--font-playfair, "Playfair Display", serif)' }}
      >
        Suggested events
      </h3>
      <ul className="space-y-2">
        {suggestions.map(s => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s)}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl
                         bg-white hover:bg-[#F7F6EC] border border-[#406A56]/10
                         text-left transition-colors"
              style={{ fontFamily: 'var(--font-inter-tight, "Inter Tight", sans-serif)' }}
            >
              <span className="text-xl leading-none" aria-hidden="true">{s.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-[#2d2d2d] truncate">
                  {s.label}
                  {s.eventType === 'holiday' && s.contactName && (
                    <span
                      className="ml-2 text-[#406A56]/80"
                      style={{
                        fontFamily: 'var(--font-caveat, "Caveat", cursive)',
                        fontSize: '15px',
                      }}
                    >
                      → {s.contactName}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-[#5A6660]">
                  {formatDistanceToNowStrict(s.date, { addSuffix: true })}
                  {s.eventType === 'holiday' && s.contactName && (
                    <span className="ml-1 text-[#5A6660]/70"> · Tap to send to {s.contactName}</span>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!hasContactBirthdays && contacts.length === 0 && (
        <p className="mt-3 text-xs text-[#5A6660]">
          Add birthdays to your contacts to see personalized suggestions.
        </p>
      )}

      {/* Explicit delivery-date confirmation after an event is picked.
          Larger Playfair + YT Green per UX brief so 50+ users can verify at a glance. */}
      {selectedDate && (
        <div
          className="mt-4 rounded-xl border border-[#406A56]/30 bg-white px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs uppercase tracking-wider text-[#5A6660] mb-1">
            {selectedLabel ? `${selectedLabel} —` : ''} Your message will be delivered on
          </p>
          <p
            className="text-[#406A56]"
            style={{
              fontFamily: 'var(--font-playfair, "Playfair Display", serif)',
              fontSize: '20px',
              lineHeight: 1.3,
            }}
          >
            {formatDate(selectedDate, 'MMMM d, yyyy')}
          </p>
        </div>
      )}
    </section>
  )
}
