'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { ChevronLeft, Inbox, Flag, Pencil, Circle, CheckCheck, AlertCircle, X } from 'lucide-react'
import Link from 'next/link'

interface Response {
  id: string
  transcript: string | null
  ai_summary: string | null
  created_at: string
  seen_at: string | null
  flagged_at: string | null
  transcript_edited_at: string | null
  session_id: string
  session_question_id: string | null
  session_questions?: { question_text: string } | null
  interview_sessions?: {
    id: string
    invitee_name: string | null
    contact_id: string | null
    title: string | null
  } | null
}

type Filter = 'all' | 'new' | 'flagged' | 'followup'

export default function InterviewInboxPage() {
  const [items, setItems] = useState<Response[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<Response | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('video_responses')
      .select('id, transcript, ai_summary, created_at, seen_at, flagged_at, transcript_edited_at, session_id, session_question_id, session_questions(question_text), interview_sessions(id, invitee_name, contact_id, title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200)
    setItems((data as unknown as Response[]) || [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (filter === 'new') return items.filter(i => !i.seen_at)
    if (filter === 'flagged') return items.filter(i => !!i.flagged_at)
    if (filter === 'followup') return items.filter(i => !!i.flagged_at && !i.seen_at)
    return items
  }, [items, filter])

  const counts = useMemo(() => ({
    all: items.length,
    new: items.filter(i => !i.seen_at).length,
    flagged: items.filter(i => !!i.flagged_at).length,
    followup: items.filter(i => !!i.flagged_at && !i.seen_at).length,
  }), [items])

  async function toggleExpand(r: Response) {
    setExpanded(prev => prev === r.id ? null : r.id)
    if (!r.seen_at) {
      try {
        const res = await fetch(`/api/interviews/responses/${r.id}/seen`, { method: 'POST' })
        if (res.ok) {
          const now = new Date().toISOString()
          setItems(prev => prev.map(x => x.id === r.id ? { ...x, seen_at: now } : x))
        }
      } catch { /* ignore */ }
    }
  }

  async function toggleFlag(r: Response) {
    const flagged = !r.flagged_at
    try {
      const res = await fetch(`/api/interviews/responses/${r.id}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagged }),
      })
      if (res.ok) {
        const { flagged_at } = await res.json()
        setItems(prev => prev.map(x => x.id === r.id ? { ...x, flagged_at } : x))
      }
    } catch { /* ignore */ }
  }

  function openEdit(r: Response) {
    setEditing(r)
    setEditText(r.transcript || '')
    setError(null)
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/interviews/responses/${editing.id}/edit-transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: editText }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Save failed')
      }
      const { transcript_edited_at } = await res.json()
      setItems(prev => prev.map(x =>
        x.id === editing.id ? { ...x, transcript: editText, transcript_edited_at } : x
      ))
      setEditing(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ed-cream, #F3ECDC)' }}>
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard/journalist"
            aria-label="Back to journalist dashboard"
            className="flex items-center justify-center"
            style={{
              width: 36, height: 36,
              borderRadius: 999,
              border: '2px solid var(--ed-ink, #111)',
              background: 'var(--ed-paper, #FFFBF1)',
            }}
          >
            <ChevronLeft size={16} className="text-[var(--ed-ink,#111)]" />
          </Link>
          <span
            aria-hidden
            className="flex items-center justify-center"
            style={{
              width: 56, height: 56,
              background: 'var(--ed-paper, #FFFBF1)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 999,
            }}
          >
            <Inbox size={26} className="text-[var(--ed-ink,#111)]" />
          </span>
          <h1
            className="text-[var(--ed-ink,#111)] leading-tight"
            style={{
              fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
              fontSize: 'clamp(28px, 5vw, 44px)',
            }}
          >
            RESPONSE INBOX
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
          {/* Sidebar filters */}
          <nav
            aria-label="Inbox filters"
            className="p-2 h-fit flex flex-col gap-1.5"
            style={{
              background: 'var(--ed-paper, #FFFBF1)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            {(['all','new','flagged','followup'] as Filter[]).map(f => {
              const label = f === 'all' ? 'ALL' : f === 'new' ? 'NEW' : f === 'flagged' ? 'FLAGGED' : 'FOLLOW-UP'
              const active = filter === f
              const palette: Record<Filter, { bg: string; ink: string }> = {
                all:      { bg: 'var(--ed-red, #E23B2E)',    ink: '#fff' },
                new:      { bg: 'var(--ed-blue, #2A5CD3)',   ink: '#fff' },
                flagged:  { bg: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' },
                followup: { bg: 'var(--ed-ink, #111)',       ink: '#fff' },
              }
              const c = palette[f]
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-current={active}
                  className="w-full text-left min-h-[40px] px-3 py-2 flex items-center justify-between gap-2"
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    background: active ? c.bg : 'transparent',
                    color: active ? c.ink : 'var(--ed-ink, #111)',
                    border: active ? '2px solid var(--ed-ink, #111)' : '2px solid transparent',
                    borderRadius: 2,
                  }}
                >
                  <span className="text-[10px] tracking-[0.18em]">{label}</span>
                  <span
                    className="inline-flex items-center justify-center text-[9px]"
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: '0 4px',
                      background: active ? '#fff' : 'var(--ed-ink, #111)',
                      color: active ? 'var(--ed-ink, #111)' : '#fff',
                      borderRadius: 999,
                    }}
                  >
                    {counts[f]}
                  </span>
                </button>
              )
            })}
          </nav>

          {/* List */}
          <div
            className="p-2"
            style={{
              background: 'var(--ed-paper, #FFFBF1)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
            role="list"
            aria-live="polite"
          >
            {loading && (
              <div className="p-6 text-center text-[#406A56]">Loading…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-10 text-center text-[#406A56]">
                <Inbox className="mx-auto mb-3 opacity-40" size={40} />
                <p className="font-medium">Nothing here yet</p>
                <p className="text-sm opacity-70">As people answer your questions, their responses will land here.</p>
              </div>
            )}
            {!loading && filtered.map(r => {
              const isUnread = !r.seen_at
              const isFlagged = !!r.flagged_at
              const isOpen = expanded === r.id
              const question = r.session_questions?.question_text || 'Question'
              const answerFull = r.transcript || r.ai_summary || ''
              const excerpt = answerFull.length > 140 ? answerFull.slice(0, 140) + '…' : answerFull
              const recipient = r.interview_sessions?.invitee_name || 'Someone'
              const sessionTitle = r.interview_sessions?.title || 'Interview'
              const initials = recipient.split(/\s+/).map(s => s[0]).slice(0,2).join('').toUpperCase() || '?'
              return (
                <div
                  key={r.id}
                  role="listitem"
                  className={`border-b border-[#D3E1DF] last:border-0 p-3 md:p-4 ${isUnread ? 'bg-[#D3E1DF]/25' : ''}`}
                >
                  <button
                    onClick={() => toggleExpand(r)}
                    aria-expanded={isOpen}
                    className="w-full text-left flex items-start gap-3 min-h-[44px]"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#406A56] text-[#F2F1E5] flex items-center justify-center font-semibold shrink-0" aria-hidden>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[#406A56]">{recipient}</span>
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 text-xs bg-[#C35F33] text-[#F2F1E5] px-2 py-0.5 rounded-full">
                            <Circle size={8} fill="currentColor" /> New
                          </span>
                        )}
                        {isFlagged && (
                          <span className="inline-flex items-center gap-1 text-xs bg-[#C35F33]/15 text-[#C35F33] px-2 py-0.5 rounded-full">
                            <Flag size={10} /> Flagged
                          </span>
                        )}
                        <span className="text-xs text-[#406A56]/60 ml-auto">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="text-sm text-[#406A56] mt-1 truncate">{question}</div>
                      <div className="text-sm text-[#406A56]/70 mt-1">{excerpt}</div>
                      <div className="text-xs text-[#406A56]/50 mt-1">{sessionTitle}</div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-3 ml-13 pl-13 md:pl-13">
                      <div className="bg-[#F2F1E5] rounded-md p-3 text-sm text-[#1a1a1a] whitespace-pre-wrap">
                        {answerFull || <em className="opacity-60">No transcript available.</em>}
                      </div>
                      {r.transcript_edited_at && (
                        <div className="text-xs text-[#406A56]/60 mt-1">
                          Edited {formatDistanceToNow(new Date(r.transcript_edited_at), { addSuffix: true })}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          onClick={() => openEdit(r)}
                          aria-label="Edit transcript"
                          className="inline-flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-md bg-white border border-[#D3E1DF] text-[#406A56] hover:bg-[#D3E1DF]/30 text-sm"
                        >
                          <Pencil size={14} /> Edit transcript
                        </button>
                        <button
                          onClick={() => toggleFlag(r)}
                          aria-label={isFlagged ? 'Unflag response' : 'Flag response'}
                          aria-pressed={isFlagged}
                          className={`inline-flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-md text-sm ${
                            isFlagged ? 'bg-[#C35F33] text-[#F2F1E5]' : 'bg-white border border-[#D3E1DF] text-[#406A56]'
                          }`}
                        >
                          <Flag size={14} /> {isFlagged ? 'Unflag' : 'Flag'}
                        </button>
                        {!isUnread && (
                          <span className="inline-flex items-center gap-1 text-xs text-[#406A56]/60 px-2">
                            <CheckCheck size={14} /> Read
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Edit transcript modal */}
      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit transcript"
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null) }}
        >
          <div className="bg-[#F2F1E5] rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#D3E1DF]">
              <h2 className="text-lg font-semibold text-[#406A56]">Edit transcript</h2>
              <button
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-[#D3E1DF]"
              >
                <X className="text-[#406A56]" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <label htmlFor="transcript-edit" className="sr-only">Transcript</label>
              <textarea
                id="transcript-edit"
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full h-64 p-3 border border-[#D3E1DF] rounded-md bg-white text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#406A56]"
                placeholder="Edit what they said…"
              />
              {error && (
                <div className="mt-2 flex items-center gap-2 text-[#C35F33] text-sm" role="alert">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[#D3E1DF] flex gap-2 justify-end">
              <button
                onClick={() => setEditing(null)}
                className="min-h-[44px] px-4 py-2 rounded-md border border-[#D3E1DF] text-[#406A56] hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !editText.trim()}
                className="min-h-[44px] px-4 py-2 rounded-md bg-[#406A56] text-[#F2F1E5] hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
