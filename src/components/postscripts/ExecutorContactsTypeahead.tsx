'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export interface ExecutorContact {
  id: string
  full_name: string
  email: string | null
  phone: string | null
}

interface Props {
  contacts: ExecutorContact[]
  value: string
  onNameChange: (name: string) => void
  onSelectContact: (contact: ExecutorContact) => void
  placeholder?: string
  inputId?: string
}

/**
 * Name input with contacts typeahead. Selecting a contact fires
 * onSelectContact so the caller can populate name/email/phone.
 * Free-text entry remains supported — typing a name not in contacts
 * just calls onNameChange.
 */
export default function ExecutorContactsTypeahead({
  contacts,
  value,
  onNameChange,
  onSelectContact,
  placeholder = 'e.g., Sarah Mitchell',
  inputId,
}: Props) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return []
    return contacts
      .filter((c) => c.full_name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [contacts, value])

  useEffect(() => {
    setHighlighted(0)
  }, [value])

  // Dismiss on outside click
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function handlePick(c: ExecutorContact) {
    onSelectContact(c)
    setOpen(false)
  }

  const showDropdown = open && matches.length > 0

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={inputId}
        type="text"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onNameChange(e.target.value)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (!showDropdown) {
            if (e.key === 'ArrowDown' && matches.length > 0) {
              setOpen(true)
              e.preventDefault()
            }
            return
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlighted((h) => Math.min(h + 1, matches.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlighted((h) => Math.max(h - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const pick = matches[highlighted]
            if (pick) handlePick(pick)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        className="w-full min-h-[44px] px-4 py-3 bg-white border border-[#D3E1DF] rounded-xl text-[#2d2d2d] placeholder:text-gray-400
                   focus:ring-2 focus:ring-[#406A56]/20 focus:border-[#406A56] outline-none"
      />

      {showDropdown && (
        <ul
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-[#D3E1DF] shadow-lg overflow-hidden"
        >
          {matches.map((c, i) => {
            const isActive = i === highlighted
            const contactInfo = c.email || c.phone || ''
            return (
              <li
                key={c.id}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => {
                  // mousedown (not click) so it fires before input blur
                  e.preventDefault()
                  handlePick(c)
                }}
                className={`min-h-[44px] px-4 py-2 flex flex-col justify-center cursor-pointer transition-colors ${
                  isActive ? 'bg-[#F2F1E5]' : 'bg-white hover:bg-[#F2F1E5]'
                }`}
              >
                <span className="text-sm font-medium text-[#2d2d2d] leading-tight">
                  {c.full_name}
                </span>
                {contactInfo && (
                  <span className="text-xs text-[#5A6660] leading-tight truncate">
                    {contactInfo}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
