// Voice Chat Components — OpenAI Realtime voice memory capture
export { VoiceChat } from './VoiceChat'
export { VoiceChatUI } from './VoiceChatUI'
export { VoiceVideoChat } from './VoiceVideoChat'

// Re-export types
export type { VoiceChatProps } from './VoiceChat'
export type { VoiceVideoChatProps } from './VoiceVideoChat'

// Re-export personas from types (they're const objects, not types)
export {
  JOURNALIST_PERSONA,
  FRIEND_PERSONA,
  LIFE_STORY_PERSONA
} from '@/types/voice'

// Re-export hooks
export { useOpenAIRealtimeVoice, type RealtimeVoice } from '@/hooks/useOpenAIRealtimeVoice'
export { useVideoRecorder } from '@/hooks/useVideoRecorder'
