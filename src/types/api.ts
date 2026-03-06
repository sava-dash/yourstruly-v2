/**
 * Shared API Response Types
 * All API endpoints should use these types for consistency
 */

// =============================================================================
// TRANSCRIPTION
// =============================================================================

export interface TranscriptionResponse {
  /** URL where the audio was uploaded (if storage succeeded) */
  url?: string;
  /** Transcribed text from the audio */
  transcription: string;
  /** Which provider was used */
  provider?: 'gemini' | 'openai-whisper' | 'deepgram';
  /** Transcription confidence (0-1) */
  confidence?: number;
  /** Audio duration in seconds */
  duration?: number;
  /** Word count of transcription */
  wordCount?: number;
  /** Warning message if something went wrong but we still have partial data */
  warning?: string;
}

export interface TranscriptionRequest {
  /** Audio file (multipart form data) */
  audio: File | Blob;
  /** Optional: type of media (audio/video) */
  mediaType?: 'audio' | 'video';
}

// =============================================================================
// MEMORIES
// =============================================================================

export interface MemoryBase {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  memory_date?: string;
  memory_type?: string;
  created_at: string;
  updated_at?: string;
}

export interface MemoryCreateRequest {
  title: string;
  description?: string;
  memory_date?: string;
  memory_type?: string;
  audio_url?: string;
  media_url?: string;
  tags?: string[];
  ai_labels?: Record<string, unknown>;
}

export interface MemoryUpdateRequest extends Partial<MemoryCreateRequest> {
  id: string;
}

// =============================================================================
// KNOWLEDGE ENTRIES (Wisdom)
// =============================================================================

export interface KnowledgeEntryBase {
  id: string;
  user_id: string;
  /** The question/prompt that was asked */
  prompt_text: string;
  /** The user's response */
  response_text?: string;
  /** Audio URL if voice recorded */
  audio_url?: string;
  /** Category (life_lessons, relationships, etc.) */
  category: string;
  subcategory?: string;
  tags?: string[];
  created_at: string;
}

export interface KnowledgeEntryCreateRequest {
  prompt_text: string;
  response_text?: string;
  audio_url?: string;
  category: string;
  subcategory?: string;
  tags?: string[];
}

// =============================================================================
// API ERRORS
// =============================================================================

export interface APIError {
  error: string;
  code?: string;
  details?: string;
  status: number;
}

export interface APISuccess<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

// =============================================================================
// SHARES
// =============================================================================

export interface ShareRecipient {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
}

export interface MemoryShare {
  id: string;
  shared_with_user_id: string;
  permission_level?: 'view' | 'comment' | 'contributor';
  status?: 'pending' | 'accepted' | 'declined';
  shared_with?: ShareRecipient | null;
  created_at: string;
}

export interface KnowledgeShare {
  id: string;
  contact_id: string;
  can_comment: boolean;
  contact?: ShareRecipient | null;
  created_at: string;
}
