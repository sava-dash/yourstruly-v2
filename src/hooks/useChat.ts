import { useState, useCallback } from 'react'

export type ChatMode = 'concierge' | 'avatar'

interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  sources?: { type: string; id: string; title: string }[]
  createdAt?: string
}

interface UseChatOptions {
  sessionId?: string
  /** Which AI surface to talk to. Defaults to 'concierge' for backwards compat. */
  mode?: ChatMode
  onError?: (error: Error) => void
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(options.sessionId)
  const [error, setError] = useState<Error | null>(null)
  const mode: ChatMode = options.mode || 'concierge'

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    // Add user message immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId,
          mode,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Update session ID if new
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId)
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        sources: data.sources,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMessage])

      return data

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      options.onError?.(error)
      
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1))
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId, options, mode])

  const loadHistory = useCallback(async (loadSessionId?: string) => {
    const targetSessionId = loadSessionId || sessionId
    if (!targetSessionId) return

    try {
      const response = await fetch(`/api/chat?sessionId=${targetSessionId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages?.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources,
          createdAt: m.created_at,
        })) || [])
        setSessionId(targetSessionId)
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
    }
  }, [sessionId])

  const clearChat = useCallback(() => {
    setMessages([])
    setSessionId(undefined)
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sessionId,
    sendMessage,
    loadHistory,
    clearChat,
  }
}
