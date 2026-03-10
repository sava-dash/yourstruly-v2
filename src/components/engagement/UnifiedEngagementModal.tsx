'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Mic, Video, VideoOff, Camera, Loader2, Sparkles, UserPlus, Check } from 'lucide-react'
import { VoiceVideoChat } from '@/components/voice'
import type { PersonaConfig } from '@/types/voice'
import { ConversationEngine } from '@/components/conversation-engine'

interface UnifiedEngagementModalProps {
  prompt: {
    id: string
    type: string
    promptText: string
    photoUrl?: string
    contactName?: string
    contactId?: string
    metadata?: Record<string, any>
  }
  expectedXp?: number
  onComplete: (result: {
    memoryId?: string
    responseText?: string
    xpAwarded: number
  }) => void
  onClose: () => void
}

type InputMode = 'text' | 'voice' | 'video'

/**
 * UnifiedEngagementModal - Single modal for all engagement response types
 * 
 * Starts with text input by default, with voice and video options available.
 * When voice/video is selected, auto-starts the AI conversation.
 */
export function UnifiedEngagementModal({
  prompt,
  expectedXp = 25,
  onComplete,
  onClose,
}: UnifiedEngagementModalProps) {
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [textValue, setTextValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [savedMemoryId, setSavedMemoryId] = useState<string | null>(null)
  const [extractedPeople, setExtractedPeople] = useState<string[]>([])
  const [addingContact, setAddingContact] = useState<string | null>(null)
  const [addedContacts, setAddedContacts] = useState<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea on mount
  useEffect(() => {
    if (inputMode === 'text' && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [inputMode])

  // Build custom persona with the actual prompt question
  const buildPersona = useCallback((): PersonaConfig => {
    const questionText = prompt.metadata?.question_text || prompt.promptText
    const contactContext = prompt.contactName ? ` about ${prompt.contactName}` : ''
    
    return {
      name: 'Interviewer',
      description: 'A warm interviewer gathering your story',
      voice: 'coral',
      style: 'warm',
      systemPrompt: `You're a warm interviewer helping capture a meaningful memory.

Topic: "${questionText}"${contactContext}

RULES:
1. Keep responses SHORT - one sentence acknowledgment + one question. No long replies.
2. Ask about: who was there, when, where, how it felt, what happened
3. After EXACTLY 4-5 questions, say: "This is wonderful! Ready to save this memory?"
4. Stay on topic. No tangents.
5. Listen for names of people - remember them for later.

BAD (too long): "That's so interesting! I love hearing about family traditions. They really are the fabric of our lives and connect us to our past in such meaningful ways. Can you tell me more about who taught you this recipe?"

GOOD (concise): "I love that! Who taught you this recipe?"`
    }
  }, [prompt])

  // Handle text submission
  const handleTextSubmit = async () => {
    if (!textValue.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      // Save as a memory or knowledge entry
      const response = await fetch('/api/engagement/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: prompt.id,
          promptType: prompt.type,
          responseType: 'text',
          responseText: textValue,
          contactId: prompt.contactId,
        }),
      })

      const result = await response.json()
      
      setCompleted(true)
      setTimeout(() => {
        onComplete({
          memoryId: result.memoryId,
          responseText: textValue,
          xpAwarded: result.xpAwarded || expectedXp,
        })
      }, 1000)
    } catch (error) {
      console.error('Failed to save response:', error)
      setIsSubmitting(false)
    }
  }

  // Handle voice/video memory saved
  const handleMemorySaved = useCallback((memoryId: string) => {
    setSavedMemoryId(memoryId)
    setCompleted(true)
    // Don't close immediately if we have people to add
    // The close will happen when user clicks "Done" or after adding contacts
  }, [])

  // Handle extracted entities from voice chat
  const handleEntitiesExtracted = useCallback((entities: { people: string[]; places: string[] }) => {
    if (entities.people.length > 0) {
      setExtractedPeople(entities.people)
    }
  }, [])

  // Add a person as a contact
  const handleAddContact = async (name: string) => {
    setAddingContact(name)
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name,
          relationship: 'other',
          source: 'memory_mention',
          memory_id: savedMemoryId,
        }),
      })
      
      if (response.ok) {
        setAddedContacts(prev => new Set([...prev, name]))
      }
    } catch (error) {
      console.error('Failed to add contact:', error)
    } finally {
      setAddingContact(null)
    }
  }

  // Finish and close
  const handleFinish = () => {
    onComplete({
      memoryId: savedMemoryId || undefined,
      xpAwarded: expectedXp,
    })
  }

  // Switch to voice mode
  const startVoice = () => {
    setInputMode('voice')
  }

  // Switch to video mode  
  const startVideo = () => {
    setInputMode('video')
  }

  // Go back to text mode
  const backToText = () => {
    setInputMode('text')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-2xl bg-gradient-to-b from-white to-[#F9F7F3] rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#406A56]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D9C61A] to-[#c4b118] flex items-center justify-center shadow-md">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[#406A56]">Share Your Story</h2>
              <p className="text-sm text-[#406A56]/60">
                +{expectedXp} XP
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-[#406A56]/60 hover:text-[#406A56] hover:bg-[#406A56]/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Prompt Display */}
        <div className="px-5 py-4 bg-[#406A56]/5 border-b border-[#406A56]/10">
          <p className="text-[#406A56] font-medium leading-relaxed">
            {prompt.promptText}
          </p>
          
          {/* Photo preview */}
          {prompt.photoUrl && (
            <div className="mt-3 relative inline-block">
              <img
                src={prompt.photoUrl}
                alt="Photo context"
                className="w-24 h-24 object-cover rounded-lg shadow-md"
              />
            </div>
          )}
          
          {/* Contact info */}
          {prompt.contactName && (
            <p className="mt-2 text-sm text-[#406A56]/70">
              About: <span className="font-medium">{prompt.contactName}</span>
            </p>
          )}
        </div>

        {/* Content Area */}
        <div className="p-5">
          {inputMode === 'text' ? (
            /* Text Input Mode - Uses unified ConversationEngine */
            <div className="space-y-4">
              {/* Mode switcher - voice/video options */}
              <div className="flex items-center gap-2 pb-3 border-b border-[#406A56]/10">
                <span className="text-xs text-[#406A56]/50">Switch to:</span>
                <button
                  onClick={startVoice}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#406A56]/10 hover:bg-[#406A56]/20 text-[#406A56] text-sm font-medium rounded-lg transition-colors"
                >
                  <Mic size={14} />
                  Voice
                </button>
                <button
                  onClick={startVideo}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#406A56]/10 hover:bg-[#406A56]/20 text-[#406A56] text-sm font-medium rounded-lg transition-colors"
                >
                  <Video size={14} />
                  Video
                </button>
              </div>
              
              {/* ConversationEngine - unified AI interaction */}
              <ConversationEngine
                context="engagement"
                userName="Friend"
                userProfile={{
                  whyHere: prompt.promptText,
                }}
                initialMessage={prompt.promptText}
                onComplete={(state) => {
                  // Extract people names from conversation
                  const allText = state.messages
                    .filter(m => m.role === 'user')
                    .map(m => m.content)
                    .join(' ');
                  const nameMatches = allText.match(/\b[A-Z][a-z]+\b/g) || [];
                  const filtered = nameMatches.filter(n => 
                    !['The', 'And', 'But', 'This', 'That', 'When', 'Where', 'What', 'I', 'We'].includes(n)
                  );
                  if (filtered.length > 0) {
                    setExtractedPeople(prev => [...new Set([...prev, ...filtered])]);
                  }
                  
                  setCompleted(true);
                  
                  if (filtered.length === 0) {
                    setTimeout(() => {
                      onComplete({
                        responseText: allText,
                        xpAwarded: expectedXp,
                      });
                    }, 1500);
                  }
                }}
                onSkip={onClose}
                showSkip={false}
                maxHeight="300px"
              />
            </div>
          ) : (
            /* Voice/Video Mode */
            <div className="space-y-4">
              {/* Back to text button */}
              <button
                onClick={backToText}
                className="text-sm text-[#406A56]/60 hover:text-[#406A56] flex items-center gap-1"
              >
                ← Back to text input
              </button>
              
              {/* Voice/Video Chat - auto-starts immediately */}
              <VoiceVideoChat
                sessionType={prompt.type === 'knowledge' ? 'memory_capture' : 'engagement'}
                topic={prompt.metadata?.question_text || prompt.promptText}
                contactId={prompt.contactId}
                persona={buildPersona()}
                enableVideo={inputMode === 'video'}
                videoQuality="medium"
                maxQuestions={5}
                autoStart={true}
                onMemorySaved={handleMemorySaved}
                onEntitiesExtracted={handleEntitiesExtracted}
                onError={(error) => console.error('Voice error:', error)}
                showTranscript={true}
              />
            </div>
          )}
        </div>

        {/* Success overlay with optional "add contact" prompt */}
        <AnimatePresence>
          {completed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-3xl p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="text-center max-w-sm"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <Check size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#406A56]">Memory Saved!</h3>
                <p className="text-[#406A56]/70 mt-1">+{expectedXp} XP earned</p>
                
                {/* Add contacts section - only shows if people were mentioned */}
                {extractedPeople.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 p-4 bg-[#406A56]/5 rounded-xl text-left"
                  >
                    <p className="text-sm font-medium text-[#406A56] mb-3 flex items-center gap-2">
                      <UserPlus size={16} />
                      People mentioned:
                    </p>
                    <div className="space-y-2">
                      {extractedPeople.map((name) => (
                        <div key={name} className="flex items-center justify-between gap-2">
                          <span className="text-sm text-[#406A56]">{name}</span>
                          {addedContacts.has(name) ? (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Check size={12} /> Added
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddContact(name)}
                              disabled={addingContact === name}
                              className="text-xs px-2 py-1 bg-[#406A56] text-white rounded-md hover:bg-[#4a7a64] disabled:opacity-50 flex items-center gap-1"
                            >
                              {addingContact === name ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <UserPlus size={10} />
                              )}
                              Add
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
                
                {/* Done button */}
                <button
                  onClick={handleFinish}
                  className="mt-6 px-8 py-2.5 bg-[#406A56] text-white font-medium rounded-xl hover:bg-[#4a7a64] transition-colors"
                >
                  Done
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
