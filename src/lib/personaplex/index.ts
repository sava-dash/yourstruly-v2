/**
 * PersonaPlex Client Library
 * 
 * Real-time, full-duplex speech-to-speech conversational AI client
 * for NVIDIA PersonaPlex servers.
 * 
 * @example
 * ```tsx
 * import { usePersonaPlexVoice, PERSONAPLEX_VOICES } from '@/lib/personaplex'
 * 
 * function VoiceChat() {
 *   const {
 *     state,
 *     transcript,
 *     currentAiText,
 *     start,
 *     stop,
 *   } = usePersonaPlexVoice({
 *     voice: 'NATF2',
 *     systemPrompt: 'You are a helpful assistant.',
 *     onTranscript: (user, ai) => console.log({ user, ai }),
 *   })
 * 
 *   return (
 *     <button onClick={state === 'idle' ? start : stop}>
 *       {state === 'idle' ? 'Start' : 'Stop'}
 *     </button>
 *   )
 * }
 * ```
 */

// Main hook
export {
  usePersonaPlexVoice,
  PERSONAPLEX_VOICES,
  type PersonaPlexState,
  type PersonaPlexVoice,
  type UsePersonaPlexOptions,
  type UsePersonaPlexReturn,
  type TranscriptEntry,
  type AudioStats,
} from '../../hooks/usePersonaPlexVoice'

// Protocol utilities
export {
  encodeMessage,
  decodeMessage,
  buildWebSocketUrl,
  type WSMessage,
  type ControlAction,
  type SocketStatus,
  type MessageType,
  type PersonaPlexConnectionParams,
  CONTROL_MESSAGES_MAP,
  MESSAGE_TYPE_MAP,
} from './protocol'

// Constants
export const PERSONAPLEX_DEFAULTS = {
  SERVER_URL: process.env.NEXT_PUBLIC_PERSONAPLEX_URL || 'wss://100.97.242.10:8998/api/chat',
  VOICE: 'yourstruly-voice.mp3' as const,
  SYSTEM_PROMPT: 'You enjoy having a good conversation.',
  TEXT_TEMPERATURE: 0.7,
  TEXT_TOPK: 25,
  AUDIO_TEMPERATURE: 0.8,
  AUDIO_TOPK: 250,
  PAD_MULT: 1.0,
  REPETITION_PENALTY: 1.0,
  REPETITION_PENALTY_CONTEXT: 100,
  SAMPLE_RATE: 24000,
}

// Voice categories for UI
export const VOICE_CATEGORIES = {
  natural: {
    label: 'Natural',
    description: 'More natural and conversational voices',
    voices: ['NATF0', 'NATF1', 'NATF2', 'NATF3', 'NATM0', 'NATM1', 'NATM2', 'NATM3'] as const,
  },
  variety: {
    label: 'Variety',
    description: 'More varied and expressive voices',
    voices: ['VARF0', 'VARF1', 'VARF2', 'VARF3', 'VARF4', 'VARM0', 'VARM1', 'VARM2', 'VARM3', 'VARM4'] as const,
  },
}

// Example prompts from NVIDIA documentation
export const EXAMPLE_PROMPTS = {
  assistant: 'You are a wise and friendly teacher. Answer questions or provide advice in a clear and engaging way.',
  casual: 'You enjoy having a good conversation.',
  customerService: (company: string, role: string, info: string) =>
    `You work for ${company} which is a ${role}. Information: ${info}`,
}
