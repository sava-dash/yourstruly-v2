/**
 * Voice Types - Voice Memory Capture
 * 
 * Type definitions for voice-based memory capture sessions.
 * Supports multiple voice providers: OpenAI Realtime API, PersonaPlex.
 */

// ============================================================================
// Voice Provider Types
// ============================================================================

export type VoiceProvider = 'openai' | 'personaplex'

// ============================================================================
// OpenAI Voice Types
// ============================================================================

// Voice options from OpenAI Realtime API
// coral = warm & friendly, sage = calm & wise, ballad = storyteller
export type Voice = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'marin' | 'nova' | 'onyx' | 'sage' | 'shimmer' | 'verse' | 'cedar'

// ============================================================================
// PersonaPlex Voice Types
// ============================================================================

// PersonaPlex native voice IDs (all 18 voices + custom)
export type PersonaPlexVoice = 
  // Custom YoursTruly voice
  | 'yourstruly-voice.mp3'
  // Natural Female (4)
  | 'NATF0' | 'NATF1' | 'NATF2' | 'NATF3'
  // Natural Male (4)
  | 'NATM0' | 'NATM1' | 'NATM2' | 'NATM3'
  // Variety Female (5)
  | 'VARF0' | 'VARF1' | 'VARF2' | 'VARF3' | 'VARF4'
  // Variety Male (5)
  | 'VARM0' | 'VARM1' | 'VARM2' | 'VARM3' | 'VARM4'

// Union type for any supported voice
export type AnyVoice = Voice | PersonaPlexVoice

// Connection and interaction states
export type VoiceChatState = 
  | 'idle' 
  | 'requesting' 
  | 'connecting' 
  | 'connected' 
  | 'listening' 
  | 'thinking' 
  | 'aiSpeaking' 
  | 'error'
  | 'saving'
  | 'completed'

// Session types for different voice interactions
export type VoiceSessionType = 
  | 'memory_capture'      // Capture a new memory through conversation
  | 'life_interview'      // Structured life story interview
  | 'onboarding'          // Getting to know the user
  | 'engagement'          // Answer engagement prompts via voice
  | 'freeform'            // Open conversation

// A single entry in the conversation transcript
export interface TranscriptEntry {
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

// Metadata about a voice session
export interface VoiceSessionMetadata {
  id: string
  userId: string
  type: VoiceSessionType
  topic?: string
  startedAt: string
  endedAt?: string
  durationSeconds?: number
  questionCount: number
  transcriptLength: number
  memoryId?: string
  status: 'in_progress' | 'completed' | 'abandoned'
}

// Configuration for voice memory capture
export interface MemoryCaptureConfig {
  /** Optional topic to guide the conversation */
  topic?: string
  /** Optional contact ID if this memory is about someone specific */
  contactId?: string
  /** Optional memory ID if continuing an existing memory */
  memoryId?: string
  /** Voice to use (default: coral) */
  voice?: Voice
  /** Maximum number of follow-up questions before suggesting save */
  maxQuestions?: number
  /** Minimum duration in seconds before allowing save */
  minDurationSeconds?: number
  /** Maximum duration in seconds before auto-ending */
  maxDurationSeconds?: number
}

// The result of a completed voice session
export interface VoiceSessionResult {
  success: boolean
  sessionId: string
  sessionType?: VoiceSessionType
  memoryId?: string
  title?: string
  content?: string
  transcript: TranscriptEntry[]
  durationSeconds: number
  questionCount: number
  error?: string
}

// System prompt configuration for different personas
export interface PersonaConfig {
  name: string
  description: string
  systemPrompt: string
  voice: Voice
  style: 'warm' | 'professional' | 'casual' | 'investigative'
}

// Pre-configured personas for YoursTruly
export const JOURNALIST_PERSONA: PersonaConfig = {
  name: 'Journalist',
  description: 'A warm, thoughtful biographer who draws out stories naturally',
  voice: 'coral',
  style: 'warm',
  systemPrompt: `You're a warm biographer capturing someone's story. Be brief and conversational.

RULES:
1. Keep responses SHORT - one brief acknowledgment + one question. Example: "I love that! Who taught you?"
2. Ask about: who, when, where, feelings, specific details
3. One question at a time
4. Listen for names of people - they matter
5. Be warm but concise - no long responses

FOCUS RULES (CRITICAL):
- STAY ON TOPIC. Your job is to draw out the memory/story you started asking about.
- IGNORE background noise, ambient speech, or interruptions (like "hello" from someone passing by)
- If you hear something unrelated (greetings, side conversations, TV sounds), DO NOT acknowledge it or ask about it
- If the person briefly talks to someone else, wait for them to return to the story, then gently bring them back: "So, where were we..."
- Never abandon the original topic to ask about background sounds or unrelated speech

BAD: "That's such a wonderful memory! Family traditions really are the heart of our experiences and connect us through generations. I can tell this recipe means a lot to you. Can you tell me more about the person who first made it?"

GOOD: "That's beautiful! Who first taught you to make it?"`
}

export const FRIEND_PERSONA: PersonaConfig = {
  name: 'Friend',
  description: 'A close friend catching up and reminiscing',
  voice: 'coral',
  style: 'casual',
  systemPrompt: `You are a close, caring friend catching up with someone you genuinely care about. You're warm, supportive, and love hearing their stories. You chat naturally, showing enthusiasm for their experiences and asking follow-up questions like a friend would - curious but never pushy.

Key behaviors:
- Use casual, warm language
- React to their stories with genuine interest ("That's amazing!", "I love that")
- Ask natural follow-ups that friends ask ("Wait, who was there?", "What happened next?")
- Share in their emotions - celebrate joys, acknowledge struggles
- Keep it conversational, one question at a time
- After a good chat (around 5 exchanges), offer to save this memory or keep talking

FOCUS RULES (CRITICAL):
- STAY ON TOPIC. Keep the conversation focused on the memory/story being discussed.
- IGNORE background noise, ambient speech, or interruptions (like "hello" from someone passing by)
- If you hear something unrelated (greetings, side conversations, TV sounds), DO NOT acknowledge it or ask about it
- If the person briefly talks to someone else, wait patiently, then gently bring them back: "So anyway, you were saying..."

Never:
- Sound like an interviewer or therapist
- Be too formal or clinical
- Rush through questions
- Make it feel like an interrogation
- Get distracted by background sounds or unrelated speech`
}

export const LIFE_STORY_PERSONA: PersonaConfig = {
  name: 'Life Story Guide',
  description: 'A professional life story interviewer for structured interviews',
  voice: 'coral',
  style: 'professional',
  systemPrompt: `You are a professional life story interviewer, skilled at helping people document their most meaningful experiences. You're warm yet purposeful - you guide the conversation with gentle expertise, knowing which details matter for preserving a legacy.

Key behaviors:
- Ask clear, purposeful questions
- Guide toward specific memories and concrete details
- Help organize thoughts chronologically or thematically
- Ask about people, places, dates, and the "why" behind choices
- Be respectful of emotional moments while gently encouraging sharing
- After substantial content (around 5 exchanges), summarize and offer to save or continue

FOCUS RULES (CRITICAL):
- STAY ON TOPIC. Your job is to document the life story being discussed.
- IGNORE background noise, ambient speech, or interruptions (like "hello" from someone passing by)
- If you hear something unrelated (greetings, side conversations, TV sounds), DO NOT acknowledge it or ask about it
- If the person briefly talks to someone else, wait patiently, then gently bring them back: "Now, where were we in your story..."

Never:
- Rush or pressure the person
- Be cold or detached
- Ask leading questions that put words in their mouth
- Lose track of the narrative thread
- Get distracted by background sounds or unrelated speech`
}

// Voice memory for Supabase storage
export interface VoiceMemoryInput {
  title: string
  content: string
  transcript: TranscriptEntry[]
  topic?: string
  contactId?: string
  durationSeconds: number
  questionCount: number
  metadata?: {
    voice?: Voice
    persona?: string
    sessionType?: VoiceSessionType
    [key: string]: any
  }
}

// API Request/Response types
export interface CreateVoiceMemoryRequest {
  transcript: TranscriptEntry[]
  topic?: string
  contactId?: string
  durationSeconds: number
  questionCount: number
  generateTitle?: boolean
}

export interface CreateVoiceMemoryResponse {
  success: boolean
  memoryId?: string
  title?: string
  content?: string
  error?: string
}

// Realtime API event types (from OpenAI)
export interface RealtimeEvent {
  type: string
  [key: string]: any
}

export interface InputAudioBufferSpeechStarted extends RealtimeEvent {
  type: 'input_audio_buffer.speech_started'
  audio_start_ms: number
}

export interface InputAudioBufferSpeechStopped extends RealtimeEvent {
  type: 'input_audio_buffer.speech_stopped'
  audio_end_ms: number
}

export interface ConversationItemInputAudioTranscriptionCompleted extends RealtimeEvent {
  type: 'conversation.item.input_audio_transcription.completed'
  item_id: string
  transcript: string
}

export interface ResponseTextDelta extends RealtimeEvent {
  type: 'response.text.delta'
  delta: string
}

export interface ResponseTextDone extends RealtimeEvent {
  type: 'response.text.done'
  text: string
}

export interface ResponseDone extends RealtimeEvent {
  type: 'response.done'
  response: {
    id: string
    status: 'completed' | 'incomplete' | 'cancelled'
    [key: string]: any
  }
}

export interface RealtimeError extends RealtimeEvent {
  type: 'error'
  error: {
    type: string
    code: string
    message: string
    param?: string
    event_id?: string
  }
}
