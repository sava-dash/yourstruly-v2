import { type PromptType } from '@/lib/prompt-icons'

// Type configs with semantic design tokens
export const TYPE_CONFIG: Record<string, {
  type: PromptType;
  label: string;
  xp: number;
  color: 'yellow' | 'green' | 'red' | 'blue' | 'purple';
  inputHint: string;  // e.g. "⌨️ Type" or "🎙️ Talk"
  timeHint: string;   // e.g. "~30 sec" or "~2 min"
}> = {
  photo_backstory: { type: 'photo_backstory', label: 'Tell the Story', xp: 15, color: 'yellow', inputHint: '🎙️ Talk or type', timeHint: '~2 min' },
  tag_person: { type: 'tag_person', label: "Who's This?", xp: 5, color: 'blue', inputHint: '👆 Tap to tag', timeHint: '~30 sec' },
  missing_info: { type: 'missing_info', label: 'Update Info', xp: 5, color: 'green', inputHint: '⌨️ Quick fill', timeHint: '~30 sec' },
  quick_question: { type: 'missing_info', label: 'Update Info', xp: 5, color: 'green', inputHint: '⌨️ Quick fill', timeHint: '~30 sec' }, // alias
  contact_info: { type: 'contact_info', label: 'Complete Profile', xp: 10, color: 'green', inputHint: '⌨️ Quick fill', timeHint: '~1 min' },
  memory_prompt: { type: 'memory_prompt', label: 'Remember When', xp: 20, color: 'purple', inputHint: '🎙️ Talk or type', timeHint: '~3 min' },
  knowledge: { type: 'knowledge', label: 'Share Wisdom', xp: 15, color: 'red', inputHint: '🎙️ Talk or type', timeHint: '~3 min' },
  connect_dots: { type: 'connect_dots', label: 'Then & Now', xp: 10, color: 'blue', inputHint: '🎙️ Talk or type', timeHint: '~2 min' },
  highlight: { type: 'highlight', label: 'Spotlight', xp: 5, color: 'yellow', inputHint: '⌨️ Quick answer', timeHint: '~1 min' },
  postscript: { type: 'postscript', label: 'Future Message', xp: 20, color: 'purple', inputHint: '✍️ Write a letter', timeHint: '~5 min' },
  favorites_firsts: { type: 'favorites_firsts', label: 'Your Favorites', xp: 10, color: 'red', inputHint: '⌨️ Quick answer', timeHint: '~1 min' }, // consider merging into knowledge
  recipes_wisdom: { type: 'recipes_wisdom', label: 'Pass It Down', xp: 15, color: 'yellow', inputHint: '🎙️ Talk or type', timeHint: '~3 min' }, // consider merging into knowledge
  // New card types for profile completion
  personality: { type: 'personality' as PromptType, label: 'Your Personality', xp: 10, color: 'purple', inputHint: '👆 Pick traits', timeHint: '~30 sec' },
  religion: { type: 'religion' as PromptType, label: 'Faith & Spirituality', xp: 10, color: 'blue', inputHint: '👆 Select', timeHint: '~30 sec' },
  skills: { type: 'skills' as PromptType, label: 'Your Skills', xp: 10, color: 'green', inputHint: '👆 Pick skills', timeHint: '~30 sec' },
  languages: { type: 'languages' as PromptType, label: 'Languages', xp: 5, color: 'blue', inputHint: '👆 Select', timeHint: '~30 sec' },
  binary_choice: { type: 'binary_choice' as PromptType, label: 'Quick Pick', xp: 5, color: 'yellow', inputHint: '👆 Tap one', timeHint: '~10 sec' },
  daily_checkin: { type: 'daily_checkin' as PromptType, label: 'Daily Check-in', xp: 5, color: 'green', inputHint: '⌨️ Quick thought', timeHint: '~30 sec' },
  favorite_books: { type: 'favorite_books' as PromptType, label: 'Favorite Books', xp: 10, color: 'purple', inputHint: '⌨️ Add titles', timeHint: '~1 min' },
  favorite_movies: { type: 'favorite_movies' as PromptType, label: 'Favorite Movies', xp: 10, color: 'red', inputHint: '⌨️ Add titles', timeHint: '~1 min' },
  favorite_music: { type: 'favorite_music' as PromptType, label: 'Favorite Music', xp: 10, color: 'yellow', inputHint: '⌨️ Add artists', timeHint: '~1 min' },
  favorite_foods: { type: 'favorite_foods' as PromptType, label: 'Favorite Foods', xp: 10, color: 'green', inputHint: '⌨️ Add dishes', timeHint: '~1 min' },
  recipe: { type: 'recipe' as PromptType, label: 'Family Recipe', xp: 25, color: 'yellow', inputHint: '👨‍🍳 Full recipe', timeHint: '~5 min' },
}

// Prompt types that should use ConversationView (multi-turn voice/text)
export const CONVERSATION_TYPES = [
  'photo_backstory',
  'memory_prompt', 
  'knowledge',
  'favorites_firsts',
  'recipes_wisdom',
  'postscript',
  'connect_dots',
  'highlight',
  'daily_checkin',
]

// Prompt types that use pill selection UI
export const PILL_SELECTION_TYPES = [
  'personality',
  'religion',
  'skills',
  'languages',
]

// Prompt types that use favorites list UI (custom input + suggestions)
export const FAVORITES_TYPES = [
  'favorite_books',
  'favorite_movies',
  'favorite_music',
  'favorite_foods',
]

// Prompt types that use binary choice UI
export const BINARY_CHOICE_TYPES = ['binary_choice']

// Prompt types that use face tagging modal
export const PHOTO_TAGGING_TYPES = ['tag_person']

// Prompt types that should use simple inline input
export const INLINE_INPUT_TYPES = [
  'missing_info',
  'quick_question', // legacy alias for missing_info
  'contact_info',
]

// Fixed tile positions: 2x2 grid on left + 1 tall tile on right for photos
export const TILE_POSITIONS = [
  { col: 0, row: 0 },
  { col: 1, row: 0 },
  { col: 0, row: 1 },
  { col: 1, row: 1 },
  { col: 2, row: 0, tall: true },
]

// Life chapter categories with semantic color tokens
export const LIFE_CHAPTERS = [
  { id: 'childhood', label: 'Childhood', color: '#60A5FA' },
  { id: 'teenage', label: 'Teenage', color: '#F5A524' },
  { id: 'high_school', label: 'School', color: '#7828C8' },
  { id: 'college', label: 'College', color: '#F31260' },
  { id: 'jobs_career', label: 'Career', color: '#006FEE' },
  { id: 'relationships', label: 'Relationships', color: '#C084FC' },
  { id: 'travel', label: 'Travel', color: '#17C964' },
  { id: 'spirituality', label: 'Spirituality', color: '#9353D3' },
  { id: 'wisdom_legacy', label: 'Wisdom', color: '#6020A0' },
  { id: 'life_moments', label: 'Life Moments', color: '#FCD34D' },
]

// Postscript event options
export const EVENT_OPTIONS = [
  { key: 'birthday', label: 'Birthday', icon: '🎂' },
  { key: 'wedding', label: 'Wedding', icon: '💒' },
  { key: 'graduation', label: 'Graduation', icon: '🎓' },
  { key: 'anniversary', label: 'Anniversary', icon: '💕' },
  { key: 'first_child', label: 'First Child', icon: '👶' },
  { key: '18th_birthday', label: '18th Birthday', icon: '🎉' },
  { key: 'christmas', label: 'Christmas', icon: '🎄' },
  { key: 'tough_times', label: 'Tough Times', icon: '💪' },
]

// Helper functions
export const isContactPrompt = (type: string) =>
  type === 'quick_question' || type === 'missing_info'

// XP amounts per CardType in a chain — single source of truth.
// Keep in sync with types/home-v2/types.ts CardType union.
export const CARD_XP: Record<string, number> = {
  'when-where': 15,
  'text-voice-video': 25,
  'backstory': 25,
  'quote': 10,
  'comment': 5,
  'tag-people': 10,
  'people-present': 10,
  'field-input': 10,
  'pill-select': 10,
  'song': 15,
  'invite-collaborator': 20,
  'list-item': 10,
  'media-upload': 5,
  'media-item': 5,
}

export const getCardXp = (type: string): number => CARD_XP[type] ?? 10

// Friendly labels for `missing_field` values returned by the prompt RPC.
// Keys are raw DB column-ish identifiers; values are human-readable labels
// to display on the Update Info card (e.g. "Add Sarah's birthday").
export const FIELD_LABELS: Record<string, string> = {
  birth_date: 'Birthday',
  birthday: 'Birthday',
  email: 'Email Address',
  phone: 'Phone Number',
  phone_number: 'Phone Number',
  address: 'Address',
  home_address: 'Home Address',
  relationship: 'Relationship',
  relationship_type: 'Relationship',
  occupation: 'Occupation',
  job: 'Occupation',
  company: 'Company',
  hometown: 'Hometown',
  nickname: 'Nickname',
  middle_name: 'Middle Name',
  last_name: 'Last Name',
  maiden_name: 'Maiden Name',
  anniversary: 'Anniversary',
  notes: 'Notes',
}

export const getFieldLabel = (raw?: string | null): string => {
  if (!raw) return 'Missing Info'
  if (FIELD_LABELS[raw]) return FIELD_LABELS[raw]
  // Fall back: convert snake_case → Title Case
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
