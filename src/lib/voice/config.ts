/**
 * Voice Provider Configuration
 * 
 * PersonaPlex-only voice configuration.
 * PersonaPlex is a self-hosted NVIDIA Moshi-based voice chat service.
 */

// ============================================================================
// PersonaPlex Voice Types
// ============================================================================

// PersonaPlex voice IDs
export type PersonaPlexVoice = 
  | 'yourstruly-voice.mp3'  // Custom YoursTruly voice (uploaded)
  | 'NATF0' | 'NATF1' | 'NATF2' | 'NATF3'  // Female voices
  | 'NATM0' | 'NATM1' | 'NATM2' | 'NATM3'  // Male voices
  | 'VARF0' | 'VARF1' | 'VARF2' | 'VARF3' | 'VARF4'  // Variable female
  | 'VARM0' | 'VARM1' | 'VARM2' | 'VARM3' | 'VARM4'  // Variable male

// Default voice - custom YoursTruly voice
export const DEFAULT_VOICE: PersonaPlexVoice = 'yourstruly-voice.mp3'

// ============================================================================
// Provider Configuration
// ============================================================================

/**
 * Get the PersonaPlex server URL from environment
 */
export function getPersonaPlexUrl(): string {
  return process.env.NEXT_PUBLIC_PERSONAPLEX_URL || 'wss://100.97.242.10:8998/api/chat'
}

/**
 * Check if PersonaPlex is configured
 */
export function isPersonaPlexConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_PERSONAPLEX_URL
}

// ============================================================================
// Voice Metadata
// ============================================================================

export interface VoiceInfo {
  id: PersonaPlexVoice
  name: string
  description: string
  gender: 'female' | 'male'
  tone: 'warm' | 'neutral' | 'bright' | 'deep'
}

export const PERSONAPLEX_VOICES: Record<PersonaPlexVoice, VoiceInfo> = {
  // Custom YoursTruly voice
  'yourstruly-voice.mp3': { id: 'yourstruly-voice.mp3' as PersonaPlexVoice, name: 'YoursTruly Voice', description: 'Custom YoursTruly voice', gender: 'female', tone: 'warm' },
  
  // Natural Female voices
  'NATF0': { id: 'NATF0', name: 'Natural Female 0', description: 'Neutral, clear female voice', gender: 'female', tone: 'neutral' },
  'NATF1': { id: 'NATF1', name: 'Natural Female 1', description: 'Warm, friendly female voice (default)', gender: 'female', tone: 'warm' },
  'NATF2': { id: 'NATF2', name: 'Natural Female 2', description: 'Bright, energetic female voice', gender: 'female', tone: 'bright' },
  'NATF3': { id: 'NATF3', name: 'Natural Female 4', description: 'Calm, soothing female voice (default)', gender: 'female', tone: 'neutral' },
  
  // Natural Male voices
  'NATM0': { id: 'NATM0', name: 'Natural Male 0', description: 'Neutral, clear male voice', gender: 'male', tone: 'neutral' },
  'NATM1': { id: 'NATM1', name: 'Natural Male 1', description: 'Warm, expressive male voice', gender: 'male', tone: 'warm' },
  'NATM2': { id: 'NATM2', name: 'Natural Male 2', description: 'Deep, resonant male voice', gender: 'male', tone: 'deep' },
  'NATM3': { id: 'NATM3', name: 'Natural Male 3', description: 'Calm, steady male voice', gender: 'male', tone: 'neutral' },
  
  // Variable Female voices (more expressive range)
  'VARF0': { id: 'VARF0', name: 'Variable Female 0', description: 'Versatile female voice', gender: 'female', tone: 'neutral' },
  'VARF1': { id: 'VARF1', name: 'Variable Female 1', description: 'Expressive female voice', gender: 'female', tone: 'warm' },
  'VARF2': { id: 'VARF2', name: 'Variable Female 2', description: 'Dynamic female voice', gender: 'female', tone: 'bright' },
  'VARF3': { id: 'VARF3', name: 'Variable Female 3', description: 'Animated female voice', gender: 'female', tone: 'warm' },
  'VARF4': { id: 'VARF4', name: 'Variable Female 4', description: 'Theatrical female voice', gender: 'female', tone: 'bright' },
  
  // Variable Male voices (more expressive range)
  'VARM0': { id: 'VARM0', name: 'Variable Male 0', description: 'Versatile male voice', gender: 'male', tone: 'neutral' },
  'VARM1': { id: 'VARM1', name: 'Variable Male 1', description: 'Expressive male voice', gender: 'male', tone: 'warm' },
  'VARM2': { id: 'VARM2', name: 'Variable Male 2', description: 'Dynamic male voice', gender: 'male', tone: 'deep' },
  'VARM3': { id: 'VARM3', name: 'Variable Male 3', description: 'Animated male voice', gender: 'male', tone: 'warm' },
  'VARM4': { id: 'VARM4', name: 'Variable Male 4', description: 'Theatrical male voice', gender: 'male', tone: 'deep' },
}

/**
 * Get voice info by ID
 */
export function getVoiceInfo(voice: PersonaPlexVoice): VoiceInfo {
  return PERSONAPLEX_VOICES[voice] || PERSONAPLEX_VOICES[DEFAULT_VOICE]
}

/**
 * Get all available voices
 */
export function getAllVoices(): VoiceInfo[] {
  return Object.values(PERSONAPLEX_VOICES)
}

/**
 * Get voices by gender
 */
export function getVoicesByGender(gender: 'female' | 'male'): VoiceInfo[] {
  return Object.values(PERSONAPLEX_VOICES).filter(v => v.gender === gender)
}
