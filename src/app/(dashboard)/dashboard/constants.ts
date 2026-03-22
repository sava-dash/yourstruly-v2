import { type PromptType } from '@/lib/prompt-icons'

// Type configs with semantic design tokens
export const TYPE_CONFIG: Record<string, { type: PromptType; label: string; xp: number; color: 'yellow' | 'green' | 'red' | 'blue' | 'purple' }> = {
  photo_backstory: { type: 'photo_backstory', label: 'Tell the Story', xp: 15, color: 'yellow' },
  tag_person: { type: 'tag_person', label: "Who's This?", xp: 5, color: 'blue' },
  missing_info: { type: 'missing_info', label: 'Update Info', xp: 5, color: 'green' },
  quick_question: { type: 'missing_info', label: 'Update Info', xp: 5, color: 'green' }, // alias → missing_info
  contact_info: { type: 'contact_info', label: 'Complete Profile', xp: 10, color: 'green' },
  memory_prompt: { type: 'memory_prompt', label: 'Remember When', xp: 20, color: 'purple' },
  knowledge: { type: 'knowledge', label: 'Share Wisdom', xp: 15, color: 'red' },
  connect_dots: { type: 'connect_dots', label: 'Then & Now', xp: 10, color: 'blue' },
  highlight: { type: 'highlight', label: 'Spotlight', xp: 5, color: 'yellow' },
  postscript: { type: 'postscript', label: 'Future Message', xp: 20, color: 'purple' },
  favorites_firsts: { type: 'favorites_firsts', label: 'Your Favorites', xp: 10, color: 'red' },
  recipes_wisdom: { type: 'recipes_wisdom', label: 'Pass It Down', xp: 15, color: 'yellow' },
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
]

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
