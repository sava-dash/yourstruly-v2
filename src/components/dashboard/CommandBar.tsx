'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Mic, Send, Sparkles, X, Loader2, ChevronUp, ChevronDown, Brain, Search } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: { type: string; id: string; title: string }[]
}

const QUICK_PROMPTS = [
  "What's my life story so far?",
  'Tell me about my family',
  'My happiest memories',
  'Who are my closest friends?',
]

export default function CommandBar() {
  const [input, setInput] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isExpanded) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isExpanded])

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsExpanded(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded])

  const handleSubmit = async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    // Add user message
    const userMessage: Message = { role: 'user', content: trimmedInput }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setIsExpanded(true)

    try {
      // Use the new RAG-enabled chat endpoint
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          sessionId: undefined, // Could persist across sessions
        }),
      })

      const data = await res.json()

      if (data.error) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `I ran into an issue: ${data.error}` 
        }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.message,
          sources: data.sources,
        }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting right now. Try again in a moment." 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser.')
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
    }

    recognition.start()
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <>
      {/* Expanded Chat Panel - Fixed position overlay, centered with engagement column */}
      {isExpanded && (
        <div className="fixed bottom-20 left-0 right-0 lg:left-[328px] lg:right-[24px] z-40">
          <div className="mx-auto px-4" style={{ maxWidth: 776, width: '100%' }}>
            <div className="glass-modal rounded-refined-lg overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#B8562E]/10">
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Sparkles size={14} className="text-[#B8562E]" />
                  AI Assistant
                </div>
                <div className="flex items-center gap-3">
                  {messages.length > 0 && (
                    <button 
                      onClick={clearChat}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Clear
                    </button>
                  )}
                  <button 
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="max-h-80 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-6">
                    <Sparkles size={28} className="mx-auto text-[#B8562E]/50 mb-3" />
                    <p className="text-gray-500 text-sm mb-4">What's on your mind?</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleQuickPrompt(prompt)}
                          className="px-3 py-1.5 bg-[#B8562E]/5 hover:bg-[#B8562E]/10 text-gray-600 text-sm rounded-lg transition-colors border border-[#B8562E]/10"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-[#B8562E] to-[#C4A235] text-white'
                            : 'bg-[#FAFAF7] text-gray-800 border border-[#B8562E]/10'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        {/* Show sources for assistant messages */}
                        {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-[#B8562E]/10">
                            <p className="text-xs text-gray-400 mb-1">Based on:</p>
                            <div className="flex flex-wrap gap-1">
                              {msg.sources.slice(0, 3).map((source, j) => (
                                <span 
                                  key={j}
                                  className="px-2 py-0.5 bg-[#B8562E]/5 rounded text-xs text-gray-500"
                                >
                                  {source.type === 'memory' ? '📸' : source.type === 'contact' ? '👤' : source.type === 'pet' ? '🐾' : '📝'} {source.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#FAFAF7] px-4 py-3 rounded-2xl border border-[#B8562E]/10">
                      <div className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-[#B8562E]" />
                        <span className="text-gray-500 text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Bar - Fixed at bottom, centered in same space as engagement tiles */}
      {/* On lg screens: offset left by 328px (profile sidebar), then center the 776px bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[328px] lg:right-[24px] z-50 p-4 pointer-events-none">
        <div className="mx-auto pointer-events-auto" style={{ maxWidth: 776, width: '100%' }}>
          <div className="flex items-center gap-3 px-4 py-3 glass rounded-refined-lg card-shadow-md">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-[#B8562E] transition-colors flex-shrink-0"
            >
              {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
            
            {/* Search icon + input container */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                onFocus={() => !isExpanded && messages.length > 0 && setIsExpanded(true)}
                placeholder="Ask me anything... (⌘K)"
                className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none text-sm min-w-0"
              />
            </div>

            <button 
              onClick={toggleVoice}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-[#B8562E]/10 text-[#B8562E] hover:bg-[#B8562E]/20'
              }`}
            >
              <Mic size={14} />
              <span className="hidden sm:inline">{isListening ? 'Listening...' : 'Voice'}</span>
            </button>

            <button 
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 bg-gradient-to-r from-[#B8562E] to-[#C4A235] rounded-xl flex items-center justify-center text-white disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-[#B8562E]/25"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>

          <p className="text-center text-gray-400 text-xs mt-2 hidden sm:block">
            Press ⌘K to open · Ask questions, navigate, or create content
          </p>
        </div>
      </div>
    </>
  )
}
