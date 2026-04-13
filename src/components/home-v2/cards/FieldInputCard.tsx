'use client'

import { useState } from 'react'
import { Check, Loader2, User } from 'lucide-react'

interface FieldInputCardProps {
  contactName?: string
  contactPhotoUrl?: string
  /** Raw missing-field key from the prompt (e.g. "birth_date") — if set, only this field is shown */
  missingField?: string
  /** Friendly label for the missing field (e.g. "Birthday") */
  missingFieldLabel?: string
  data: Record<string, string>
  onSave: (data: Record<string, string>) => void
  saved: boolean
}

const FIELDS = [
  { key: 'birthday', label: 'Birthday', placeholder: 'MM/DD/YYYY', icon: '🎂' },
  { key: 'phone', label: 'Phone', placeholder: '+1 (555) 123-4567', icon: '📱' },
  { key: 'email', label: 'Email', placeholder: 'name@example.com', icon: '✉️' },
  { key: 'address', label: 'Address', placeholder: '123 Main St, City, State', icon: '🏠' },
]

// Map raw RPC missing_field values → the field key used by the inputs above
const MISSING_FIELD_TO_KEY: Record<string, string> = {
  birth_date: 'birthday',
  birthday: 'birthday',
  phone: 'phone',
  phone_number: 'phone',
  email: 'email',
  address: 'address',
  home_address: 'address',
}

const PLACEHOLDERS: Record<string, string> = {
  birthday: 'MM/DD/YYYY',
  phone: '+1 (555) 123-4567',
  email: 'name@example.com',
  address: '123 Main St, City, State',
}

const ICONS: Record<string, string> = {
  birthday: '🎂',
  phone: '📱',
  email: '✉️',
  address: '🏠',
}

export function FieldInputCard({
  contactName,
  contactPhotoUrl,
  missingField,
  missingFieldLabel,
  data,
  onSave,
  saved,
}: FieldInputCardProps) {
  const [values, setValues] = useState<Record<string, string>>(data || {})
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const filled = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim()))
    if (Object.keys(filled).length === 0) return
    setSaving(true)
    await onSave(filled)
    setSaving(false)
  }

  const hasContent = Object.values(values).some(v => v.trim())

  // If the prompt targets a specific missing field, focus just that one.
  const targetKey = missingField ? MISSING_FIELD_TO_KEY[missingField] : undefined
  const fieldsToShow = targetKey
    ? [{
        key: targetKey,
        label: missingFieldLabel || targetKey,
        placeholder: PLACEHOLDERS[targetKey] || '',
        icon: ICONS[targetKey] || '•',
      }]
    : FIELDS

  const initial = contactName?.trim()?.[0]?.toUpperCase() || '?'
  const header = targetKey && contactName
    ? `Add ${contactName}'s ${missingFieldLabel || 'info'}`
    : contactName
      ? `${contactName}'s Info`
      : 'Contact Info'

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <div className="flex items-center gap-2.5">
        {contactPhotoUrl ? (
          <img
            src={contactPhotoUrl}
            alt={contactName ? `${contactName}'s avatar` : 'Contact avatar'}
            className="w-9 h-9 rounded-full object-cover border border-[#DDE3DF] flex-shrink-0"
            draggable={false}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[#2D5A3D] text-sm font-semibold"
            style={{ background: '#E6F0EA', border: '1px solid #DDE3DF' }}
            aria-hidden="true"
          >
            {contactName ? initial : <User size={14} />}
          </div>
        )}
        <h3 className="text-sm font-semibold text-[#1A1F1C] leading-tight">
          {header}
        </h3>
      </div>

      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto">
        {fieldsToShow.map(field =>
          field.key === 'birthday' ? (
            <BirthdayPicker
              key={field.key}
              label={field.label}
              icon={field.icon}
              value={values[field.key] || ''}
              onChange={(v) => setValues(prev => ({ ...prev, [field.key]: v }))}
            />
          ) : (
            <div key={field.key}>
              <label className="text-[10px] text-[#94A09A] uppercase tracking-wider mb-0.5 block">
                {field.icon} {field.label}
              </label>
              <input
                type="text"
                value={values[field.key] || ''}
                onChange={(e) => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 bg-[#FAFAF7] rounded-lg border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 focus:border-[#2D5A3D]/50 placeholder-[#94A09A]"
              />
            </div>
          )
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={!hasContent || saving || saved}
        className={`w-full py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.96] flex items-center justify-center gap-2 ${
          saved
            ? 'bg-[#E6F0EA] text-[#2D5A3D] border border-[#2D5A3D]/30'
            : 'bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40'
        }`}
      >
        {saved ? <><Check size={14} /> Saved</> : saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
      </button>
    </div>
  )
}

/* ─── Birthday Picker — Month / Day / Year dropdowns ─── */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function BirthdayPicker({
  label,
  icon,
  value,
  onChange,
}: {
  label: string
  icon: string
  value: string
  onChange: (formatted: string) => void
}) {
  // Parse existing value like "01/15/1985" or "January 15, 1985" into parts
  const parsed = parseDateParts(value)
  const [month, setMonth] = useState(parsed.month)
  const [day, setDay] = useState(parsed.day)
  const [year, setYear] = useState(parsed.year)

  const update = (m: string, d: string, y: string) => {
    setMonth(m)
    setDay(d)
    setYear(y)
    // Build a normalized date string only when at least month+day are set
    if (m && d) {
      const formatted = y
        ? `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`
        : `${m.padStart(2, '0')}/${d.padStart(2, '0')}`
      onChange(formatted)
    } else if (m || d || y) {
      // Partial — store whatever we have so hasContent is true
      onChange([m, d, y].filter(Boolean).join('/'))
    } else {
      onChange('')
    }
  }

  const currentYear = new Date().getFullYear()
  const maxDays = month
    ? new Date(Number(year) || 2000, Number(month), 0).getDate()
    : 31

  const selectClass =
    'flex-1 min-w-0 px-2.5 py-2.5 bg-[#FAFAF7] rounded-lg border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 focus:border-[#2D5A3D]/50 appearance-none'

  return (
    <div>
      <label className="text-[10px] text-[#94A09A] uppercase tracking-wider mb-1.5 block">
        {icon} {label}
      </label>
      <div className="flex gap-2">
        {/* Month */}
        <select
          value={month}
          onChange={(e) => update(e.target.value, day, year)}
          className={selectClass}
          style={{ color: month ? '#1A1F1C' : '#94A09A' }}
        >
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)}>
              {m}
            </option>
          ))}
        </select>

        {/* Day */}
        <select
          value={day}
          onChange={(e) => update(month, e.target.value, year)}
          className={selectClass}
          style={{ color: day ? '#1A1F1C' : '#94A09A', maxWidth: '72px' }}
        >
          <option value="">Day</option>
          {Array.from({ length: maxDays }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>
              {i + 1}
            </option>
          ))}
        </select>

        {/* Year */}
        <select
          value={year}
          onChange={(e) => update(month, day, e.target.value)}
          className={selectClass}
          style={{ color: year ? '#1A1F1C' : '#94A09A', maxWidth: '84px' }}
        >
          <option value="">Year</option>
          {Array.from({ length: 120 }, (_, i) => {
            const y = currentYear - i
            return (
              <option key={y} value={String(y)}>
                {y}
              </option>
            )
          })}
        </select>
      </div>
    </div>
  )
}

function parseDateParts(raw: string): { month: string; day: string; year: string } {
  if (!raw) return { month: '', day: '', year: '' }
  // Try MM/DD/YYYY
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (slash) {
    return { month: slash[1], day: slash[2], year: slash[3] || '' }
  }
  // Try ISO YYYY-MM-DD
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    return { month: String(Number(iso[2])), day: String(Number(iso[3])), year: iso[1] }
  }
  return { month: '', day: '', year: '' }
}
