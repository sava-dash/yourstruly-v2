'use client'

import { useEffect, useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Lock, Users, Globe, Check, Loader2, Search, X, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  open: boolean
  memoryId: string | null
  promptText: string
  /** People already tagged / mentioned in the chain */
  mentionedPeople: { id: string; name: string }[]
  /** Called when the user picks a visibility and it's saved */
  onComplete: () => void
  /** Called when the user skips — saves as private and moves on */
  onSkip: () => void
}

type Visibility = 'private' | 'shared_people' | 'shared_circles'

interface Circle {
  id: string
  name: string
  member_count?: number
}

/**
 * "How should this memory be saved?" popup. Shown after Save & Continue,
 * before the celebration modal. Three options:
 *
 *   1. Private — only you can see it.
 *   2. Shared with mentioned people (+ add more from contacts).
 *   3. Shared with circles (select which).
 *
 * Persists the selection via an UPDATE to the memory row and/or inserts
 * into a sharing table.
 */
export function VisibilityModal({
  open,
  memoryId,
  promptText,
  mentionedPeople,
  onComplete,
  onSkip,
}: Props) {
  const [step, setStep] = useState<'pick' | 'people' | 'circles'>('pick')
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  // People sharing state
  const [selectedPeople, setSelectedPeople] = useState<Map<string, string>>(new Map())
  const [allContacts, setAllContacts] = useState<{ id: string; name: string }[]>([])
  const [peopleSearch, setPeopleSearch] = useState('')

  // Circles state
  const [circles, setCircles] = useState<Circle[]>([])
  const [selectedCircles, setSelectedCircles] = useState<Set<string>>(new Set())

  useEffect(() => setMounted(true), [])

  // Pre-populate mentioned people when the modal opens
  useEffect(() => {
    if (!open) return
    setStep('pick')
    setSaving(false)
    setPeopleSearch('')
    setSelectedCircles(new Set())
    const map = new Map<string, string>()
    for (const p of mentionedPeople) map.set(p.id, p.name)
    setSelectedPeople(map)
  }, [open, mentionedPeople])

  // Lazy load contacts + circles on first open
  useEffect(() => {
    if (!open) return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [contactsRes, circlesRes] = await Promise.all([
        supabase.from('contacts').select('id, full_name').eq('user_id', user.id).order('full_name').limit(200),
        supabase.from('circles').select('id, name').eq('created_by', user.id).order('name'),
      ])
      setAllContacts((contactsRes.data || []).map((c: any) => ({ id: c.id, name: c.full_name })))
      setCircles((circlesRes.data || []) as Circle[])
    })()
  }, [open, supabase])

  // Esc key
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onSkip() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onSkip])

  const handleSave = async (vis: Visibility) => {
    setSaving(true)
    try {
      if (memoryId) {
        // Update the memory's visibility field
        await supabase
          .from('memories')
          .update({ visibility: vis })
          .eq('id', memoryId)

        // For shared_people, insert sharing records
        if (vis === 'shared_people' && selectedPeople.size > 0) {
          const shares = Array.from(selectedPeople.keys()).map((contactId) => ({
            memory_id: memoryId,
            contact_id: contactId,
            shared_at: new Date().toISOString(),
          }))
          await supabase.from('memory_shares').upsert(shares, { onConflict: 'memory_id,contact_id' }).select()
        }

        // For shared_circles, insert circle sharing records
        if (vis === 'shared_circles' && selectedCircles.size > 0) {
          const circleShares = Array.from(selectedCircles).map((circleId) => ({
            memory_id: memoryId,
            circle_id: circleId,
            shared_at: new Date().toISOString(),
          }))
          await supabase.from('memory_circle_shares').upsert(circleShares, { onConflict: 'memory_id,circle_id' }).select()
        }
      }
    } catch (err) {
      console.error('[VisibilityModal] save failed', err)
    } finally {
      setSaving(false)
      onComplete()
    }
  }

  const filteredContacts = allContacts.filter((c) =>
    c.name.toLowerCase().includes(peopleSearch.toLowerCase()) && !selectedPeople.has(c.id)
  )

  if (!mounted) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onSkip}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 115,
            background: 'rgba(26, 31, 28, 0.5)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            style={{
              width: '100%',
              maxWidth: '440px',
              maxHeight: 'calc(100vh - 80px)',
              overflow: 'hidden',
              borderRadius: '24px',
              background: '#FAFAF7',
              boxShadow: '0 24px 64px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.7)',
              border: '1px solid #DDE3DF',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{ padding: '22px 24px 14px', borderBottom: '1px solid #DDE3DF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#1A1F1C',
                    fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)',
                  }}
                >
                  {step === 'pick' ? 'How should this be saved?' : step === 'people' ? 'Share with people' : 'Share with circles'}
                </h2>
                <button
                  onClick={onSkip}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.04)',
                    border: '1px solid #DDE3DF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#5A6660',
                  }}
                  aria-label="Skip — save as private"
                >
                  <X size={14} />
                </button>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94A09A', lineHeight: 1.4 }}>
                {step === 'pick'
                  ? 'Choose who can see this memory. You can change this later.'
                  : step === 'people'
                    ? 'Select contacts to share this with. Mentioned people are pre-selected.'
                    : 'Pick one or more circles to share with.'}
              </p>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 20px' }}>
              {step === 'pick' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Private */}
                  <button
                    onClick={() => handleSave('private')}
                    disabled={saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px',
                      borderRadius: '16px',
                      background: '#FFFFFF',
                      border: '2px solid #DDE3DF',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#F5F1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Lock size={20} color="#5A6660" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1A1F1C' }}>Private</p>
                      <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94A09A' }}>Only you can see this memory</p>
                    </div>
                    <ChevronRight size={16} color="#94A09A" />
                  </button>

                  {/* Shared with people */}
                  <button
                    onClick={() => setStep('people')}
                    disabled={saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px',
                      borderRadius: '16px',
                      background: '#FFFFFF',
                      border: '2px solid #DDE3DF',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#E6F0EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Users size={20} color="#2D5A3D" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1A1F1C' }}>Share with people</p>
                      <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94A09A' }}>
                        {mentionedPeople.length > 0
                          ? `${mentionedPeople.map((p) => p.name.split(' ')[0]).join(', ')} + others`
                          : 'Choose contacts to share with'}
                      </p>
                    </div>
                    <ChevronRight size={16} color="#94A09A" />
                  </button>

                  {/* Shared with circles */}
                  <button
                    onClick={() => setStep('circles')}
                    disabled={saving || circles.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px',
                      borderRadius: '16px',
                      background: '#FFFFFF',
                      border: '2px solid #DDE3DF',
                      cursor: circles.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: circles.length === 0 ? 0.5 : 1,
                      textAlign: 'left',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#FAF5E4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Globe size={20} color="#C4A235" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1A1F1C' }}>Share with circles</p>
                      <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94A09A' }}>
                        {circles.length > 0 ? `${circles.length} circle${circles.length === 1 ? '' : 's'} available` : 'No circles created yet'}
                      </p>
                    </div>
                    <ChevronRight size={16} color="#94A09A" />
                  </button>
                </div>
              )}

              {step === 'people' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Selected chips */}
                  {selectedPeople.size > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {Array.from(selectedPeople.entries()).map(([id, name]) => (
                        <span
                          key={id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            background: '#E6F0EA',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#2D5A3D',
                            border: '1px solid #2D5A3D20',
                          }}
                        >
                          {name.split(' ')[0]}
                          <button
                            onClick={() => setSelectedPeople((prev) => {
                              const next = new Map(prev)
                              next.delete(id)
                              return next
                            })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2D5A3D', padding: 0, display: 'flex' }}
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search */}
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A09A' }} />
                    <input
                      type="text"
                      value={peopleSearch}
                      onChange={(e) => setPeopleSearch(e.target.value)}
                      placeholder="Search contacts..."
                      style={{
                        width: '100%',
                        paddingLeft: '36px',
                        paddingRight: '12px',
                        paddingTop: '10px',
                        paddingBottom: '10px',
                        borderRadius: '12px',
                        border: '1px solid #DDE3DF',
                        background: '#FFFFFF',
                        fontSize: '13px',
                        color: '#1A1F1C',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Contact list */}
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredContacts.slice(0, 30).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedPeople((prev) => new Map(prev).set(c.id, c.name))}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '13px',
                          color: '#1A1F1C',
                        }}
                      >
                        <span
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#F5F1EA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#5A6660',
                            flexShrink: 0,
                          }}
                        >
                          {c.name.charAt(0)}
                        </span>
                        {c.name}
                      </button>
                    ))}
                  </div>

                  {/* Confirm */}
                  <button
                    onClick={() => handleSave('shared_people')}
                    disabled={selectedPeople.size === 0 || saving}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '14px',
                      background: selectedPeople.size > 0 ? '#2D5A3D' : '#DDE3DF',
                      color: selectedPeople.size > 0 ? '#FFFFFF' : '#94A09A',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: selectedPeople.size > 0 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    Share with {selectedPeople.size} {selectedPeople.size === 1 ? 'person' : 'people'}
                  </button>
                  <button
                    onClick={() => setStep('pick')}
                    style={{ background: 'none', border: 'none', color: '#94A09A', fontSize: '12px', cursor: 'pointer', padding: '4px', textAlign: 'center' }}
                  >
                    Back
                  </button>
                </div>
              )}

              {step === 'circles' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {circles.map((c) => {
                    const isSelected = selectedCircles.has(c.id)
                    return (
                      <button
                        key={c.id}
                        onClick={() =>
                          setSelectedCircles((prev) => {
                            const next = new Set(prev)
                            if (next.has(c.id)) next.delete(c.id)
                            else next.add(c.id)
                            return next
                          })
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '14px',
                          borderRadius: '14px',
                          background: isSelected ? '#E6F0EA' : '#FFFFFF',
                          border: `2px solid ${isSelected ? '#2D5A3D' : '#DDE3DF'}`,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: isSelected ? '#2D5A3D' : '#FAF5E4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected ? <Check size={16} color="#FFFFFF" /> : <Globe size={16} color="#C4A235" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1A1F1C' }}>{c.name}</p>
                        </div>
                      </button>
                    )
                  })}
                  <button
                    onClick={() => handleSave('shared_circles')}
                    disabled={selectedCircles.size === 0 || saving}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '14px',
                      background: selectedCircles.size > 0 ? '#2D5A3D' : '#DDE3DF',
                      color: selectedCircles.size > 0 ? '#FFFFFF' : '#94A09A',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: selectedCircles.size > 0 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    Share with {selectedCircles.size} {selectedCircles.size === 1 ? 'circle' : 'circles'}
                  </button>
                  <button
                    onClick={() => setStep('pick')}
                    style={{ background: 'none', border: 'none', color: '#94A09A', fontSize: '12px', cursor: 'pointer', padding: '4px', textAlign: 'center' }}
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
