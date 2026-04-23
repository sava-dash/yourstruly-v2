'use client'

// Tiny pub/sub bus that lets the ConversationCard (Story) and the sibling
// TranscriptCard share messages + follow-up state without hoisting state up
// through the whole CardChain render loop. Keyed by conversation card id
// so each row's pair has its own channel.

import { useEffect, useState } from 'react'

export interface BusTurn {
  role: 'assistant' | 'user'
  content: string
  kind?: 'prompt' | 'suggestion' | 'transcript'
  createdAt: number
}

export interface BusState {
  messages: BusTurn[]
  /** The current follow-up suggestion migrating from Story → Transcript. */
  currentSuggestion: BusTurn | null
  transcribing: boolean
  followupLoading: boolean
  /** Partial transcript streaming in while the user is still speaking. */
  interimTranscript?: string
}

type Listener = (s: BusState) => void

const state = new Map<string, BusState>()
const listeners = new Map<string, Set<Listener>>()

function getOrInit(id: string): BusState {
  let s = state.get(id)
  if (!s) {
    s = { messages: [], currentSuggestion: null, transcribing: false, followupLoading: false }
    state.set(id, s)
  }
  return s
}

function replace(id: string, next: BusState) {
  state.set(id, next)
  const ls = listeners.get(id)
  if (!ls) return
  for (const l of ls) l(next)
}

export const conversationBus = {
  get(id: string): BusState {
    return getOrInit(id)
  },

  subscribe(id: string, fn: Listener): () => void {
    if (!listeners.has(id)) listeners.set(id, new Set())
    listeners.get(id)!.add(fn)
    // Fire once with current state so subscribers hydrate
    fn(getOrInit(id))
    return () => {
      listeners.get(id)?.delete(fn)
    }
  },

  pushUserTurn(id: string, content: string) {
    const s = getOrInit(id)
    replace(id, {
      ...s,
      messages: [...s.messages, { role: 'user', content, kind: 'transcript', createdAt: Date.now() }],
    })
  },

  /** Set the active follow-up suggestion (replaces any prior). */
  setSuggestion(id: string, content: string | null) {
    const s = getOrInit(id)
    replace(id, {
      ...s,
      currentSuggestion: content
        ? { role: 'assistant', content, kind: 'suggestion', createdAt: Date.now() }
        : null,
    })
  },

  setTranscribing(id: string, v: boolean) {
    const s = getOrInit(id)
    replace(id, { ...s, transcribing: v })
  },

  setFollowupLoading(id: string, v: boolean) {
    const s = getOrInit(id)
    replace(id, { ...s, followupLoading: v })
  },

  /** Live-transcription partial: updates the "in-flight" transcript that the
   *  TranscriptCard can show while the user is still speaking. */
  setInterimTranscript(id: string, text: string) {
    const s = getOrInit(id)
    replace(id, { ...s, interimTranscript: text })
  },

  clearInterimTranscript(id: string) {
    const s = getOrInit(id)
    if (!s.interimTranscript) return
    replace(id, { ...s, interimTranscript: '' })
  },

  reset(id: string) {
    state.delete(id)
    const ls = listeners.get(id)
    if (!ls) return
    const fresh: BusState = { messages: [], currentSuggestion: null, transcribing: false, followupLoading: false, interimTranscript: '' }
    for (const l of ls) l(fresh)
  },
}

/** React hook that subscribes to a conversation channel and re-renders on updates. */
export function useConversationBus(id: string | null): BusState {
  const [snapshot, setSnapshot] = useState<BusState>(() =>
    id ? conversationBus.get(id) : { messages: [], currentSuggestion: null, transcribing: false, followupLoading: false, interimTranscript: '' }
  )
  useEffect(() => {
    if (!id) return
    return conversationBus.subscribe(id, setSnapshot)
  }, [id])
  return snapshot
}
