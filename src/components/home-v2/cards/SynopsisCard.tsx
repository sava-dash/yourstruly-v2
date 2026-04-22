'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Calendar, Users, Heart, Tag, Check, Pencil, Loader2, UserPlus, Plus, Quote as QuoteIcon, Image as ImageIcon, Music, Sparkles, X } from 'lucide-react'
import { RELATIONSHIP_OPTIONS, getRelationshipLabel } from '@/lib/relationships'

interface PersonRef {
  id?: string
  contactId?: string
  name: string | null
  relation?: string | null
  existing: boolean
  /** Toggled after the user taps "Add" — means we've written this person
   *  to the contacts table and linked them to the memory. */
  added?: boolean
}

export interface SynopsisCardData {
  where?: string | null
  when?: string | null
  who?: PersonRef[]
  mood?: string | null
  tags?: string[]
  confirmed?: { where?: boolean; when?: boolean; who?: boolean; mood?: boolean; tags?: boolean }
  // Optional attachments the user added from "Add more"
  extras?: { quote?: string; song?: { title: string; artist: string }; mediaFiles?: File[] }
  // Set by the card once loaded — cached so re-mounts don't re-fetch
  loaded?: boolean
}

interface SynopsisCardProps {
  data: SynopsisCardData
  conversationTranscript: string
  promptText?: string
  memoryId?: string | null
  accentColor: string
  onSave: (data: SynopsisCardData) => void
  saved: boolean
}

export function SynopsisCard({ data, conversationTranscript, promptText, memoryId, accentColor, onSave, saved }: SynopsisCardProps) {
  const [loading, setLoading] = useState(!data.loaded)
  const [state, setState] = useState<SynopsisCardData>({
    where: data.where ?? null,
    when: data.when ?? null,
    who: data.who ?? [],
    mood: data.mood ?? null,
    tags: data.tags ?? [],
    confirmed: data.confirmed ?? {},
    extras: data.extras ?? {},
    loaded: data.loaded,
  })
  const [editing, setEditing] = useState<null | 'where' | 'when' | 'mood' | 'tags'>(null)
  const [showAddMore, setShowAddMore] = useState(false)
  const loadedRef = useRef(data.loaded || false)

  useEffect(() => {
    if (loadedRef.current || !conversationTranscript.trim()) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/memory/synopsis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memoryId, transcript: conversationTranscript, promptText }),
        })
        if (!res.ok) throw new Error(`synopsis ${res.status}`)
        const d = await res.json()
        if (cancelled) return
        const who: PersonRef[] = Array.isArray(d.who)
          ? (d.who as any[]).map((p) => ({
              contactId: p.contactId,
              name: p.name,
              relation: p.relation || null,
              existing: !!p.existing,
              added: !!p.existing, // existing contacts are already in the DB
            }))
          : []
        const next: SynopsisCardData = {
          where: d.where || null,
          when: d.when || null,
          who,
          mood: d.mood || null,
          tags: Array.isArray(d.tags) ? d.tags : [],
          confirmed: {},
          extras: state.extras || {},
          loaded: true,
        }
        loadedRef.current = true
        setState(next)
      } catch (err) {
        console.error('[SynopsisCard] load failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationTranscript, memoryId])

  const toggleConfirm = (k: 'where' | 'when' | 'who' | 'mood' | 'tags') => {
    setState((s) => ({ ...s, confirmed: { ...(s.confirmed || {}), [k]: !s.confirmed?.[k] } }))
  }

  const handleSave = () => {
    onSave({ ...state, loaded: true })
  }

  if (saved) {
    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column', height: '100%',
          padding: '18px 20px 16px',
          background: `linear-gradient(180deg, ${accentColor}08 0%, transparent 35%)`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '22px', height: '22px', borderRadius: '50%',
                background: accentColor, color: '#FFFFFF',
                boxShadow: `0 2px 8px ${accentColor}55`,
              }}
            >
              <Sparkles size={11} />
            </span>
            <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: accentColor }}>
              Captured
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#94A09A', fontWeight: 600 }}>
            {[state.where, state.when, state.who?.length, state.mood, state.tags?.length].filter(Boolean).length} details
          </span>
        </div>

        {/* Field grid */}
        <div className="synopsis-saved-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {state.where && (
            <SavedField icon={<MapPin size={13} />} label="Where" accent={accentColor}>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1A1F1C' }}>{state.where}</span>
            </SavedField>
          )}
          {state.when && (
            <SavedField icon={<Calendar size={13} />} label="When" accent={accentColor}>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1A1F1C' }}>{state.when}</span>
            </SavedField>
          )}
          {state.who && state.who.length > 0 && (
            <SavedField icon={<Users size={13} />} label="Who" accent={accentColor}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {state.who.map((p, i) => {
                  const label = p.name || (p.relation ? getRelationshipLabel(p.relation) : 'Unnamed')
                  return (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 9px', borderRadius: '999px',
                        background: p.added ? `${accentColor}14` : '#F5F1EA',
                        color: p.added ? accentColor : '#6B3A1E',
                        fontSize: '11.5px', fontWeight: 600,
                      }}
                    >
                      {!p.added && <UserPlus size={9} />}
                      {label}
                      {p.name && p.relation && (
                        <span style={{ fontSize: '10px', opacity: 0.75, fontWeight: 500 }}>
                          · {getRelationshipLabel(p.relation)}
                        </span>
                      )}
                    </span>
                  )
                })}
              </div>
            </SavedField>
          )}
          {state.mood && (
            <SavedField icon={<Heart size={13} />} label="Mood" accent={accentColor}>
              <span
                style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: '999px',
                  background: `${accentColor}14`, color: accentColor,
                  fontSize: '12px', fontWeight: 700, textTransform: 'capitalize',
                }}
              >
                {state.mood}
              </span>
            </SavedField>
          )}
          {state.tags && state.tags.length > 0 && (
            <SavedField icon={<Tag size={13} />} label="Tags" accent={accentColor}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {state.tags.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '2px 8px', borderRadius: '999px',
                      background: '#FAFAF7', border: '1px solid #EEF2EF',
                      color: '#5A6660', fontSize: '11px', fontWeight: 600,
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </SavedField>
          )}
          {state.extras?.quote && (
            <SavedField icon={<QuoteIcon size={13} />} label="Quote" accent={accentColor}>
              <p
                style={{
                  margin: 0, fontSize: '13px', lineHeight: 1.45,
                  color: '#1A1F1C', fontStyle: 'italic',
                  fontFamily: 'var(--font-playfair, Playfair Display, serif)',
                }}
              >
                &ldquo;{state.extras.quote}&rdquo;
              </p>
            </SavedField>
          )}
          {state.extras?.song && (state.extras.song.title || state.extras.song.artist) && (
            <SavedField icon={<Music size={13} />} label="Song" accent={accentColor}>
              <span style={{ fontSize: '12.5px', color: '#1A1F1C' }}>
                <span style={{ fontWeight: 600 }}>{state.extras.song.title || 'Untitled'}</span>
                {state.extras.song.artist && <span style={{ color: '#94A09A' }}> — {state.extras.song.artist}</span>}
              </span>
            </SavedField>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '12px', paddingTop: '10px',
            borderTop: `1px solid ${accentColor}18`,
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '10.5px', color: '#94A09A',
          }}
        >
          <Check size={11} color={accentColor} strokeWidth={3} />
          <span style={{ fontWeight: 600, color: '#5A6660' }}>Saved to your story</span>
        </div>

        <style jsx>{`
          .synopsis-saved-scroll::-webkit-scrollbar { width: 4px; }
          .synopsis-saved-scroll::-webkit-scrollbar-track { background: transparent; }
          .synopsis-saved-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 2px; }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: '14px 18px 8px' }}>
        <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accentColor }}>
          Synopsis
        </p>
        <h3 style={{ margin: '3px 0 0', fontSize: '16px', fontWeight: 700, color: '#1A1F1C', fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}>
          Here&apos;s what we captured
        </h3>
      </div>

      {/* Body */}
      <div className="synopsis-scroll" style={{ flex: 1, overflowY: 'auto', padding: '2px 18px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A09A', fontSize: '12px', padding: '10px 0' }}>
            <Loader2 size={14} className="animate-spin" /> Reading your memory…
          </div>
        )}

        {!loading && (
          <>
            <WhereRow
              value={state.where}
              confirmed={!!state.confirmed?.where}
              accent={accentColor}
              isEditing={editing === 'where'}
              onEdit={() => setEditing('where')}
              onConfirm={() => toggleConfirm('where')}
              onSubmitEdit={(v) => { setState((s) => ({ ...s, where: v })); setEditing(null) }}
              onCancelEdit={() => setEditing(null)}
            />
            <FieldRow
              icon={<Calendar size={13} />}
              label="When"
              value={state.when}
              confirmed={!!state.confirmed?.when}
              accent={accentColor}
              isEditing={editing === 'when'}
              onEdit={() => setEditing('when')}
              onConfirm={() => toggleConfirm('when')}
              onSubmitEdit={(v) => { setState((s) => ({ ...s, when: v })); setEditing(null) }}
              onCancelEdit={() => setEditing(null)}
              empty="No date detected"
              placeholder="Add a date"
            />
            <WhoRow
              who={state.who || []}
              confirmed={!!state.confirmed?.who}
              accent={accentColor}
              memoryId={memoryId || null}
              onConfirm={() => toggleConfirm('who')}
              onAdd={(name) => setState((s) => ({ ...s, who: [...(s.who || []), { name, existing: false, added: false }] }))}
              onUpdate={(idx, patch) => setState((s) => ({
                ...s,
                who: (s.who || []).map((p, j) => (j === idx ? { ...p, ...patch } : p)),
              }))}
              onRemove={(i) => setState((s) => ({ ...s, who: (s.who || []).filter((_, j) => j !== i) }))}
            />
            <FieldRow
              icon={<Heart size={13} />}
              label="Mood"
              value={state.mood}
              confirmed={!!state.confirmed?.mood}
              accent={accentColor}
              isEditing={editing === 'mood'}
              onEdit={() => setEditing('mood')}
              onConfirm={() => toggleConfirm('mood')}
              onSubmitEdit={(v) => { setState((s) => ({ ...s, mood: v })); setEditing(null) }}
              onCancelEdit={() => setEditing(null)}
              empty="No mood detected"
              placeholder="e.g. wistful"
            />
            <TagsRow
              tags={state.tags || []}
              confirmed={!!state.confirmed?.tags}
              accent={accentColor}
              onConfirm={() => toggleConfirm('tags')}
              setTags={(tags) => setState((s) => ({ ...s, tags }))}
            />

            <AnimatePresence>
              {showAddMore && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden', marginTop: '4px' }}
                >
                  <AddMoreBlock
                    extras={state.extras || {}}
                    setExtras={(extras) => setState((s) => ({ ...s, extras }))}
                    accent={accentColor}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <div
          style={{
            flexShrink: 0,
            padding: '10px 16px 14px',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setShowAddMore((v) => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '8px 12px', borderRadius: '999px',
              background: showAddMore ? `${accentColor}14` : '#FFFFFF',
              color: showAddMore ? accentColor : '#5A6660',
              border: `1px solid ${showAddMore ? accentColor : '#DDE3DF'}`,
              cursor: 'pointer', fontSize: '11.5px', fontWeight: 600,
            }}
          >
            <Plus size={12} style={{ transform: showAddMore ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} /> Add more
          </button>
          <button
            onClick={handleSave}
            style={{
              marginLeft: 'auto',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', borderRadius: '999px',
              background: accentColor, color: '#FFFFFF', border: 'none',
              cursor: 'pointer', fontSize: '12.5px', fontWeight: 700,
              boxShadow: `0 4px 12px ${accentColor}40`,
            }}
          >
            <Check size={13} /> Save
          </button>
        </div>
      )}

      <style jsx>{`
        .synopsis-scroll::-webkit-scrollbar { width: 6px; }
        .synopsis-scroll::-webkit-scrollbar-track { background: transparent; }
        .synopsis-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 3px; }
      `}</style>
    </div>
  )
}

/* ─────────────── Field row (where / when / mood) ─────────────── */

function FieldRow({
  icon, label, value, confirmed, accent, isEditing, onEdit, onConfirm, onSubmitEdit, onCancelEdit, empty, placeholder,
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
  confirmed: boolean
  accent: string
  isEditing: boolean
  onEdit: () => void
  onConfirm: () => void
  onSubmitEdit: (v: string) => void
  onCancelEdit: () => void
  empty: string
  placeholder: string
}) {
  const [draft, setDraft] = useState(value || '')
  useEffect(() => { setDraft(value || '') }, [value, isEditing])

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${confirmed ? `${accent}40` : '#EEF2EF'}`,
        borderRadius: '12px',
        padding: '9px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'border-color 0.2s ease',
      }}
    >
      <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: `${accent}14`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A09A' }}>
          {label}
        </p>
        {isEditing ? (
          <div style={{ display: 'flex', gap: '4px', marginTop: '3px' }}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              onKeyDown={(e) => { if (e.key === 'Enter') onSubmitEdit(draft.trim()); if (e.key === 'Escape') onCancelEdit() }}
              style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid #DDE3DF', background: '#FAFAF7', fontSize: '12.5px', color: '#1A1F1C', outline: 'none' }}
            />
            <button onClick={() => onSubmitEdit(draft.trim())} style={{ padding: '4px 8px', borderRadius: '6px', background: accent, color: '#FFFFFF', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>OK</button>
          </div>
        ) : (
          <div
            onClick={onEdit}
            style={{ marginTop: '1px', fontSize: '12.5px', fontWeight: value ? 600 : 400, color: value ? '#1A1F1C' : '#94A09A', fontStyle: value ? 'normal' : 'italic', cursor: 'pointer' }}
          >
            {value || empty}
          </div>
        )}
      </div>
      {!isEditing && (
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={onEdit}
            aria-label={`Edit ${label}`}
            style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(0,0,0,0.04)', border: '1px solid #DDE3DF', color: '#94A09A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Pencil size={11} />
          </button>
          {value && (
            <button
              onClick={onConfirm}
              aria-label={`Confirm ${label}`}
              style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: confirmed ? accent : 'rgba(0,0,0,0.04)',
                border: `1px solid ${confirmed ? accent : '#DDE3DF'}`,
                color: confirmed ? '#FFFFFF' : '#94A09A',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Check size={11} />
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

/* ─────────────── Where row (field with autocomplete suggestions) ─────────────── */

function WhereRow({ value, confirmed, accent, isEditing, onEdit, onConfirm, onSubmitEdit, onCancelEdit }: {
  value: string | null | undefined
  confirmed: boolean
  accent: string
  isEditing: boolean
  onEdit: () => void
  onConfirm: () => void
  onSubmitEdit: (v: string) => void
  onCancelEdit: () => void
}) {
  const [draft, setDraft] = useState(value || '')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSug, setLoadingSug] = useState(false)
  const debounceRef = useRef<any>(null)

  useEffect(() => { setDraft(value || '') }, [value, isEditing])

  // Pull past-location suggestions when the input opens or the draft changes
  useEffect(() => {
    if (!isEditing) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoadingSug(true)
      try {
        const res = await fetch(`/api/memory/locations${draft.trim() ? `?q=${encodeURIComponent(draft.trim())}` : ''}`)
        if (res.ok) {
          const d = await res.json()
          const arr: string[] = Array.isArray(d.suggestions) ? d.suggestions : []
          // Filter out exact match of current draft
          setSuggestions(arr.filter((s) => s.toLowerCase() !== draft.trim().toLowerCase()).slice(0, 6))
        }
      } catch {}
      finally { setLoadingSug(false) }
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [draft, isEditing])

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${confirmed ? `${accent}40` : '#EEF2EF'}`,
        borderRadius: '12px',
        padding: '9px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'border-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: `${accent}14`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MapPin size={13} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A09A' }}>
            Where
          </p>
          {isEditing ? (
            <div style={{ display: 'flex', gap: '4px', marginTop: '3px' }}>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a place"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmitEdit(draft.trim())
                  if (e.key === 'Escape') onCancelEdit()
                }}
                style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid #DDE3DF', background: '#FAFAF7', fontSize: '12.5px', color: '#1A1F1C', outline: 'none' }}
              />
              <button onClick={() => onSubmitEdit(draft.trim())} style={{ padding: '4px 8px', borderRadius: '6px', background: accent, color: '#FFFFFF', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>OK</button>
            </div>
          ) : (
            <div
              onClick={onEdit}
              style={{ marginTop: '1px', fontSize: '12.5px', fontWeight: value ? 600 : 400, color: value ? '#1A1F1C' : '#94A09A', fontStyle: value ? 'normal' : 'italic', cursor: 'pointer' }}
            >
              {value || 'No location detected'}
            </div>
          )}
        </div>
        {!isEditing && (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={onEdit}
              aria-label="Edit Where"
              style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(0,0,0,0.04)', border: '1px solid #DDE3DF', color: '#94A09A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Pencil size={11} />
            </button>
            {value && (
              <button
                onClick={onConfirm}
                aria-label="Confirm Where"
                style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: confirmed ? accent : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${confirmed ? accent : '#DDE3DF'}`,
                  color: confirmed ? '#FFFFFF' : '#94A09A',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Check size={11} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Suggestion chips below the input */}
      {isEditing && (suggestions.length > 0 || loadingSug) && (
        <div style={{ paddingLeft: '36px', display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
          {loadingSug && suggestions.length === 0 && (
            <span style={{ fontSize: '10px', color: '#94A09A' }}>
              <Loader2 size={10} className="animate-spin" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Finding places…
            </span>
          )}
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSubmitEdit(s)}
              style={{
                padding: '3px 9px',
                borderRadius: '999px',
                background: '#F5F1EA',
                border: '1px solid #E6DDCC',
                color: '#5A6660',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

/* ─────────────── Who row (people chips + add) ─────────────── */

function WhoRow({ who, confirmed, accent, memoryId, onConfirm, onAdd, onUpdate, onRemove }: {
  who: PersonRef[]
  confirmed: boolean
  accent: string
  memoryId: string | null
  onConfirm: () => void
  onAdd: (name: string) => void
  onUpdate: (idx: number, patch: Partial<PersonRef>) => void
  onRemove: (i: number) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${confirmed ? `${accent}40` : '#EEF2EF'}`,
        borderRadius: '12px',
        padding: '10px 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: `${accent}14`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Users size={13} />
        </div>
        <p style={{ flex: 1, margin: 0, fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A09A' }}>Who was there</p>
        {who.length > 0 && (
          <button
            onClick={onConfirm}
            aria-label="Confirm who"
            style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: confirmed ? accent : 'rgba(0,0,0,0.04)',
              border: `1px solid ${confirmed ? accent : '#DDE3DF'}`,
              color: confirmed ? '#FFFFFF' : '#94A09A',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Check size={10} />
          </button>
        )}
      </div>

      {who.length === 0 && !adding && (
        <p style={{ margin: '6px 0 0 36px', fontSize: '12px', color: '#94A09A', fontStyle: 'italic' }}>No people mentioned</p>
      )}

      {who.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {who.map((p, i) => (
            <PersonRow
              key={i}
              person={p}
              accent={accent}
              memoryId={memoryId}
              onPatch={(patch) => onUpdate(i, patch)}
              onRemove={() => onRemove(i)}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
        {adding ? (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) { onAdd(newName.trim()); setNewName(''); setAdding(false) }
              if (e.key === 'Escape') { setNewName(''); setAdding(false) }
            }}
            onBlur={() => { if (newName.trim()) { onAdd(newName.trim()); setNewName('') } setAdding(false) }}
            placeholder="Name…"
            style={{ padding: '5px 10px', borderRadius: '999px', border: '1px solid #DDE3DF', background: '#FAFAF7', fontSize: '12px', color: '#1A1F1C', outline: 'none', width: '140px' }}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', borderRadius: '999px',
              background: '#FFFFFF', border: '1px dashed #C8D4CC',
              color: '#5A6660', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
            }}
          >
            <Plus size={10} /> Add person
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ─────────────── Person row (name + relation picker + add) ─────────────── */

function PersonRow({ person, accent, memoryId, onPatch, onRemove }: {
  person: PersonRef
  accent: string
  memoryId: string | null
  onPatch: (patch: Partial<PersonRef>) => void
  onRemove: () => void
}) {
  const [relationOpen, setRelationOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(person.name || '')
  const [saving, setSaving] = useState(false)
  const relationBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setNameDraft(person.name || '') }, [person.name])

  const canAdd = !!person.name && !!person.relation
  const needsName = !person.name
  const needsRelation = !person.relation

  const commitName = () => {
    const trimmed = nameDraft.trim()
    if (trimmed) onPatch({ name: trimmed })
    setEditingName(false)
  }

  const handleAdd = async () => {
    if (saving || person.added || !canAdd) return
    setSaving(true)
    try {
      const res = await fetch('/api/memory/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: person.name,
          relation: person.relation || null,
          memoryId: memoryId || null,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        onPatch({ added: true, contactId: d.contactId, existing: true })
      }
    } catch (err) {
      console.error('[PersonRow] add contact failed', err)
    } finally {
      setSaving(false)
    }
  }

  const relationLabel = person.relation ? getRelationshipLabel(person.relation) : null
  const displayName = person.name || (relationLabel ? relationLabel : 'Unnamed')
  const avatarInitials = person.name
    ? person.name.split(/\s+/).slice(0, 2).map((s) => s[0] || '').join('').toUpperCase() || '?'
    : relationLabel
      ? relationLabel[0].toUpperCase()
      : '?'

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 10px',
        background: person.added ? `${accent}0C` : '#FAFAF7',
        border: `1px solid ${person.added ? `${accent}30` : '#EEF2EF'}`,
        borderRadius: '10px',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: person.added ? accent : needsName ? '#DDE3DF' : '#C4A235',
          color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, flexShrink: 0,
        }}
      >
        {avatarInitials}
      </div>

      {/* Name + relation */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName()
              if (e.key === 'Escape') { setNameDraft(person.name || ''); setEditingName(false) }
            }}
            onBlur={commitName}
            placeholder="Their name…"
            style={{ width: '100%', padding: '3px 8px', borderRadius: '6px', border: '1px solid #DDE3DF', background: '#FFFFFF', fontSize: '12.5px', color: '#1A1F1C', outline: 'none' }}
          />
        ) : needsName ? (
          <button
            onClick={() => setEditingName(true)}
            style={{
              background: 'transparent', border: '1px dashed #C8D4CC',
              padding: '2px 8px', borderRadius: '8px',
              color: '#5A6660', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600,
            }}
          >
            + add name
          </button>
        ) : (
          <p
            onClick={() => setEditingName(true)}
            style={{ margin: 0, fontSize: '12.5px', fontWeight: 600, color: '#1A1F1C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
          >
            {displayName}
          </p>
        )}

        <div style={{ marginTop: '2px' }}>
          <button
            ref={relationBtnRef}
            onClick={() => setRelationOpen((v) => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              padding: '1px 7px', borderRadius: '999px',
              background: relationLabel ? `${accent}14` : 'transparent',
              color: relationLabel ? accent : '#94A09A',
              border: relationLabel ? `1px solid ${accent}30` : '1px dashed #DDE3DF',
              cursor: 'pointer', fontSize: '10px', fontWeight: 600,
            }}
          >
            {relationLabel || '+ relation'}
          </button>
          {relationOpen && (
            <RelationDropdown
              anchorRef={relationBtnRef}
              value={person.relation || null}
              accent={accent}
              onPick={(rel) => { onPatch({ relation: rel }); setRelationOpen(false) }}
              onClose={() => setRelationOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Action button */}
      {person.added ? (
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            padding: '3px 9px', borderRadius: '999px',
            background: accent, color: '#FFFFFF',
            fontSize: '10px', fontWeight: 700,
          }}
        >
          <Check size={10} /> Linked
        </span>
      ) : (
        <button
          onClick={handleAdd}
          disabled={saving || !canAdd}
          title={!canAdd ? (needsName && needsRelation ? 'Add a name and relation first' : needsName ? 'Add a name first' : 'Pick a relation first') : undefined}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            padding: '4px 10px', borderRadius: '999px',
            background: saving || !canAdd ? '#C8D4CC' : '#C4A235', color: '#FFFFFF',
            border: 'none', cursor: saving ? 'wait' : canAdd ? 'pointer' : 'not-allowed',
            fontSize: '10.5px', fontWeight: 700,
          }}
        >
          {saving ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
          {saving ? '' : 'Add'}
        </button>
      )}

      <button
        onClick={onRemove}
        aria-label="Remove"
        style={{
          background: 'none', border: 'none',
          color: '#94A09A', cursor: 'pointer',
          padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '18px', height: '18px',
        }}
      >
        <X size={12} />
      </button>
    </div>
  )
}

/* Relation dropdown — portaled to body so it can overflow the card's
   clip region. Positioned relative to the anchor button via fixed coords. */
function RelationDropdown({ anchorRef, value, accent, onPick, onClose }: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  value: string | null
  accent: string
  onPick: (rel: string) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'below' | 'above' } | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const compute = () => {
      const anchor = anchorRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const dropdownWidth = 280
      const dropdownMaxH = 280
      // Open upward if there isn't enough room below
      const spaceBelow = window.innerHeight - rect.bottom
      const placement: 'below' | 'above' = spaceBelow < dropdownMaxH + 16 && rect.top > dropdownMaxH + 16 ? 'above' : 'below'
      const top = placement === 'below' ? rect.bottom + 6 : rect.top - 6
      // Clamp horizontally so it stays on screen
      let left = rect.left
      const rightEdge = left + dropdownWidth
      if (rightEdge > window.innerWidth - 8) left = Math.max(8, window.innerWidth - dropdownWidth - 8)
      if (left < 8) left = 8
      setCoords({ top, left, placement })
    }
    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', compute, true)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', compute, true)
    }
  }, [anchorRef])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!mounted || !coords) return null

  const panel = (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
      />
      <motion.div
        initial={{ opacity: 0, y: coords.placement === 'below' ? -4 : 4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          top: coords.placement === 'below' ? coords.top : undefined,
          bottom: coords.placement === 'above' ? window.innerHeight - coords.top : undefined,
          left: coords.left,
          width: '280px',
          maxHeight: '280px',
          overflowY: 'auto',
          zIndex: 9999,
          background: '#FFFFFF',
          border: '1px solid #DDE3DF',
          borderRadius: '12px',
          boxShadow: '0 18px 48px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.08)',
          padding: '10px',
        }}
      >
        {RELATIONSHIP_OPTIONS.map((group) => (
          <div key={group.category} style={{ marginBottom: '8px' }}>
            <p style={{ margin: '0 0 5px 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A09A' }}>
              {group.category}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {group.options.map((opt) => {
                const active = value === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => onPick(opt.id)}
                    style={{
                      padding: '6px 9px',
                      borderRadius: '8px',
                      background: active ? accent : 'transparent',
                      color: active ? '#FFFFFF' : '#1A1F1C',
                      border: `1px solid ${active ? accent : '#EEF2EF'}`,
                      cursor: 'pointer',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      textAlign: 'left',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </motion.div>
    </>
  )

  return createPortal(panel, document.body)
}

/* ─────────────── Tags row ─────────────── */

function TagsRow({ tags, confirmed, accent, onConfirm, setTags }: {
  tags: string[]
  confirmed: boolean
  accent: string
  onConfirm: () => void
  setTags: (t: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${confirmed ? `${accent}40` : '#EEF2EF'}`,
        borderRadius: '12px',
        padding: '9px 12px',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: `${accent}14`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Tag size={13} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A09A' }}>Tags</p>
          {tags.length > 0 && (
            <button
              onClick={onConfirm}
              aria-label="Confirm tags"
              style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: confirmed ? accent : 'rgba(0,0,0,0.04)',
                border: `1px solid ${confirmed ? accent : '#DDE3DF'}`,
                color: confirmed ? '#FFFFFF' : '#94A09A',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Check size={10} />
            </button>
          )}
        </div>
        <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {tags.length === 0 && !adding && (
            <span style={{ fontSize: '12px', color: '#94A09A', fontStyle: 'italic' }}>No tags</span>
          )}
          {tags.map((t, i) => (
            <span
              key={i}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '999px', background: '#FAFAF7', border: '1px solid #EEF2EF', color: '#5A6660', fontSize: '11px', fontWeight: 600 }}
            >
              #{t}
              <button onClick={() => setTags(tags.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'currentColor', opacity: 0.5, cursor: 'pointer', padding: 0, fontSize: '10px', lineHeight: 1 }}>
                ×
              </button>
            </span>
          ))}
          {adding ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && draft.trim()) { setTags([...tags, draft.trim()].slice(0, 8)); setDraft(''); setAdding(false) }
                if (e.key === 'Escape') { setDraft(''); setAdding(false) }
              }}
              onBlur={() => { if (draft.trim()) { setTags([...tags, draft.trim()].slice(0, 8)); setDraft('') } setAdding(false) }}
              placeholder="tag"
              style={{ padding: '2px 8px', borderRadius: '999px', border: '1px solid #DDE3DF', background: '#FAFAF7', fontSize: '11px', color: '#1A1F1C', outline: 'none', width: '70px' }}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 9px', borderRadius: '999px', background: '#FFFFFF', border: '1px dashed #C8D4CC', color: '#5A6660', cursor: 'pointer', fontSize: '10.5px', fontWeight: 600 }}
            >
              <Plus size={9} /> Add
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────── Add more (attachments) ─────────────── */

function AddMoreBlock({ extras, setExtras, accent }: {
  extras: NonNullable<SynopsisCardData['extras']>
  setExtras: (e: NonNullable<SynopsisCardData['extras']>) => void
  accent: string
}) {
  const [open, setOpen] = useState<null | 'quote' | 'song' | 'media'>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const panel = { padding: '10px 12px', background: '#FFFFFF', border: '1px solid #EEF2EF', borderRadius: '12px', display: 'flex', flexDirection: 'column' as const, gap: '8px' }

  const options: { key: 'quote' | 'song' | 'media'; Icon: any; label: string }[] = [
    { key: 'quote', Icon: QuoteIcon, label: 'Quote' },
    { key: 'song', Icon: Music, label: 'Song' },
    { key: 'media', Icon: ImageIcon, label: 'Media' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', gap: '5px' }}>
        {options.map(({ key, Icon, label }) => {
          const active = open === key
          const filled = (key === 'quote' && extras.quote) || (key === 'song' && (extras.song?.title || extras.song?.artist)) || (key === 'media' && extras.mediaFiles && extras.mediaFiles.length > 0)
          return (
            <button
              key={key}
              onClick={() => setOpen(active ? null : key)}
              style={{
                flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                padding: '7px 8px', borderRadius: '10px',
                background: active ? `${accent}14` : '#FFFFFF',
                border: `1px solid ${active ? accent : (filled ? `${accent}60` : '#EEF2EF')}`,
                color: active ? accent : '#3D4540',
                cursor: 'pointer', fontSize: '11px', fontWeight: 600,
              }}
            >
              <Icon size={11} />
              {label}
              {filled && <Check size={10} color={accent} />}
            </button>
          )
        })}
      </div>

      {open === 'quote' && (
        <div style={panel}>
          <textarea
            value={extras.quote || ''}
            onChange={(e) => setExtras({ ...extras, quote: e.target.value })}
            rows={2}
            placeholder='"And then she just said…"'
            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #DDE3DF', background: '#FAFAF7', fontSize: '12.5px', lineHeight: 1.4, color: '#1A1F1C', outline: 'none', resize: 'none', fontFamily: 'var(--font-playfair, Playfair Display, serif)', fontStyle: 'italic' }}
          />
        </div>
      )}
      {open === 'song' && (
        <div style={panel}>
          <input
            value={extras.song?.title || ''}
            onChange={(e) => setExtras({ ...extras, song: { title: e.target.value, artist: extras.song?.artist || '' } })}
            placeholder="Song title"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #DDE3DF', background: '#FAFAF7', fontSize: '12.5px', color: '#1A1F1C', outline: 'none' }}
          />
          <input
            value={extras.song?.artist || ''}
            onChange={(e) => setExtras({ ...extras, song: { title: extras.song?.title || '', artist: e.target.value } })}
            placeholder="Artist"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #DDE3DF', background: '#FAFAF7', fontSize: '12.5px', color: '#1A1F1C', outline: 'none' }}
          />
        </div>
      )}
      {open === 'media' && (
        <div style={panel}>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={(e) => { const f = Array.from(e.target.files || []); setExtras({ ...extras, mediaFiles: [...(extras.mediaFiles || []), ...f].slice(0, 10) }); e.target.value = '' }}
          />
          <button onClick={() => fileRef.current?.click()} style={{ padding: '8px', borderRadius: '8px', border: '1.5px dashed #C8D4CC', background: '#FAFAF7', cursor: 'pointer', color: '#5A6660', fontSize: '12px' }}>
            {extras.mediaFiles && extras.mediaFiles.length > 0 ? `${extras.mediaFiles.length} attached — add more` : 'Choose photos or video'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ─────────────── Saved field row ─────────────── */

function SavedField({
  icon, label, accent, children,
}: {
  icon: React.ReactNode
  label: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24 }}
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        padding: '9px 12px',
        background: '#FFFFFF',
        border: '1px solid #EEF2EF',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <span
        style={{
          width: '26px', height: '26px', borderRadius: '8px',
          background: `${accent}14`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 3px', fontSize: '9.5px', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A09A',
          }}
        >
          {label}
        </p>
        {children}
      </div>
    </motion.div>
  )
}
