/**
 * Home V2 — Card Chain Types
 */

export type CardType =
  | 'when-where'            // Location + date input
  | 'text-voice-video'      // Text, voice, or video response
  | 'media-upload'          // Upload photos/videos
  | 'media-item'            // An uploaded media item (auto-populated)
  | 'tag-people'            // Tag people in media (photo)
  | 'people-present'        // Tag people present in memory (no photo required)
  | 'pill-select'           // Pill-based selection (interests, traits, etc.)
  | 'field-input'           // Simple field input (DOB, phone, email, etc.)
  | 'list-item'             // A single item in a list (book, movie, etc.)
  | 'quote'                 // Quote card
  | 'comment'               // Comment/reaction card
  | 'invite-collaborator'   // Invite contacts to contribute to the story
  | 'song'                  // Song dedication — attach a song to the memory
  | 'plus'                  // "Add more" button card

export type PromptCategory =
  | 'memory'
  | 'wisdom'
  | 'contact'
  | 'profile'   // religion, skills, languages, etc.
  | 'favorites' // books, movies, music, foods
  | 'photo'

export interface ChainCard {
  id: string
  type: CardType
  /** Data stored in this card */
  data: Record<string, any>
  /** Who added this card */
  addedBy?: {
    userId: string
    name: string
    avatarUrl?: string
  }
  /** Whether this card has been saved */
  saved: boolean
  /** Timestamp */
  createdAt: string
}

export interface PromptRow {
  /** The engagement prompt */
  promptId: string
  promptText: string
  promptType: string
  category: PromptCategory
  /** Raw fine-grained category from the DB (e.g. "childhood", "relationships", "career") */
  dbCategory?: string | null
  /** Life chapter tag from the DB, if any */
  lifeChapter?: string | null
  photoUrl?: string
  photoId?: string
  contactName?: string
  contactId?: string
  contactPhotoUrl?: string
  /** Raw missing-field identifier from the prompt RPC (e.g. "birth_date") */
  missingField?: string
  metadata?: Record<string, any>
  /** The chain of cards for this prompt */
  cards: ChainCard[]
  /** Whether this row is expanded */
  expanded: boolean
}

/**
 * Map engagement prompt types to our card chain categories
 */
export function categorizePrompt(type: string): PromptCategory {
  switch (type) {
    case 'photo_backstory':
    case 'tag_person':
      return 'photo'
    case 'knowledge':
    case 'recipes_wisdom':
      return 'wisdom'
    case 'missing_info':
    case 'quick_question':
    case 'contact_info':
      return 'contact'
    case 'personality':
    case 'religion':
    case 'skills':
    case 'languages':
    case 'daily_checkin':
      return 'profile'
    case 'favorite_books':
    case 'favorite_movies':
    case 'favorite_music':
    case 'favorite_foods':
    case 'recipe':
      return 'favorites'
    default:
      return 'memory'
  }
}

/**
 * Generate the initial card chain for a prompt based on its category
 */
export function generateInitialCards(category: PromptCategory, promptType: string): CardType[] {
  switch (category) {
    case 'memory':
      return ['when-where', 'text-voice-video', 'people-present', 'media-upload', 'plus']
    case 'photo':
      return ['when-where', 'text-voice-video', 'tag-people', 'plus'] // backstory uses BackstoryCard via CardChain
    case 'wisdom':
      return ['text-voice-video', 'media-upload', 'plus']
    case 'contact':
      return ['field-input', 'plus']
    case 'profile':
      return ['pill-select', 'plus']
    case 'favorites':
      return ['list-item', 'plus']
    default:
      return ['text-voice-video', 'plus']
  }
}
