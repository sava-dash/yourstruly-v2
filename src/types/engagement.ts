// Engagement prompt as returned by the API/hook
export interface EngagementPrompt {
  id: string;
  userId: string;
  type: string;
  category?: string;
  lifeChapter?: string;
  promptText: string;
  status: string;
  priority: number;
  photoUrl?: string;
  photoId?: string;
  photoMetadata?: {
    taken_at?: string | null;
    exif_lat?: number | null;
    exif_lng?: number | null;
    location_name?: string;
  };
  contactId?: string;
  contactName?: string;
  contactPhotoUrl?: string | null;
  memoryId?: string;
  missingField?: string;
  metadata?: {
    contact?: {
      name?: string;
      relationship_type?: string;
      phone?: string;
      email?: string;
      date_of_birth?: string;
      address?: string;
    };
    suggested_contact_name?: string;
    options?: string[];
    face_id?: string;
    [key: string]: any;
  };
  personalizationContext?: {
    interest?: string;
    skill?: string;
    hobby?: string;
  };
  steps?: string[];
  createdAt: string;
}

// Response types for answering prompts
export interface PromptResponse {
  type: 'text' | 'voice' | 'selection';
  text?: string;
  audioUrl?: string;
  videoUrl?: string;
  data?: {
    value?: string;
    contactId?: string;
    date?: string;
    field?: string;
    [key: string]: any;
  };
}

// Knowledge entry (wisdom/life lessons captured from prompts)
export interface KnowledgeEntry {
  id: string;
  userId: string;
  category: string;
  subcategory?: string;
  promptText: string;
  responseText: string;
  audioUrl?: string;
  wordCount: number;
  durationSeconds?: number;
  isFeatured: boolean;
  relatedContacts?: string[];
  relatedInterest?: string;
  relatedReligion?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// Stats returned by the engagement system
export interface EngagementStats {
  totalAnswered: number;
  totalSkipped: number;
  currentStreakDays: number;
  longestStreakDays: number;
  knowledgeEntries: number;
  preferredInputType?: string;
  lastEngagementDate?: string;
  byType?: {
    photoBackstory?: number;
    tagPerson?: number;
    missingInfo?: number;
    memoryPrompt?: number;
    knowledge?: number;
    [key: string]: number | undefined;
  };
}

// API request/response types
export interface AnswerPromptRequest {
  responseType: 'text' | 'voice' | 'selection';
  responseText?: string;
  responseAudioUrl?: string;
  responseVideoUrl?: string;
  responseData?: Record<string, any>;
}

export interface AnswerPromptResponse {
  success: boolean;
  prompt?: any;
  knowledgeEntry?: any;
  knowledgeEntryId?: string;
  memoryCreated?: boolean;
  memoryId?: string;
  contactId?: string;
  contactUpdated?: boolean;
  xpAwarded?: number;
}

export interface PromptTemplate {
  id: string;
  type: string;
  category: string | null;
  subcategory: string | null;
  prompt_text: string;
  prompt_variations: string[] | null;
  target_interest: string | null;
  target_skill: string | null;
  target_hobby: string | null;
  target_religion: string | null;
  target_field: string | null;
  is_active: boolean;
  priority_boost: number;
  cooldown_days: number;
  seasonal_months: number[] | null;
  anniversary_based: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptTemplateFormData {
  id: string;
  type: string;
  category: string;
  subcategory: string;
  prompt_text: string;
  prompt_variations: string[];
  target_interest: string;
  target_skill: string;
  target_hobby: string;
  target_religion: string;
  target_field: string;
  is_active: boolean;
  priority_boost: number;
  cooldown_days: number;
  seasonal_months: number[];
  anniversary_based: boolean;
}

export const PROMPT_TYPES = [
  { value: 'photo_backstory', label: 'Photo Backstory', description: 'Ask about the story behind a photo' },
  { value: 'tag_person', label: 'Tag Person', description: 'Identify people in photos' },
  { value: 'missing_info', label: 'Missing Info', description: 'Fill in missing contact or memory details' },
  { value: 'memory_prompt', label: 'Memory Prompt', description: 'General memory questions' },
  { value: 'knowledge', label: 'Knowledge', description: 'Capture wisdom and life lessons' },
  { value: 'connect_dots', label: 'Connect Dots', description: 'Compare photos, contacts, or memories' },
  { value: 'highlight', label: 'Highlight', description: 'Featured or important prompts' },
  { value: 'quick_question', label: 'Quick Question (→ missing_info)', description: 'Deprecated: alias for missing_info' },
  { value: 'photo_metadata', label: 'Photo Details', description: 'Add location, date, or other details to a photo' },
  { value: 'photo_location', label: 'Photo Location (→ photo_metadata)', description: 'Deprecated: alias for photo_metadata' },
  { value: 'photo_date', label: 'Photo Date (→ photo_metadata)', description: 'Deprecated: alias for photo_metadata' },
  { value: 'personality', label: 'Personality', description: 'How would you describe yourself? (pill selection)' },
  { value: 'religion', label: 'Faith & Spirituality', description: 'Spiritual or religious background (selection)' },
  { value: 'skills', label: 'Skills', description: 'What are your skills? (pill selection)' },
  { value: 'languages', label: 'Languages', description: 'What languages do you speak? (selection)' },
  { value: 'binary_choice', label: 'Quick Pick', description: 'A/B choice about a photo or memory' },
  { value: 'daily_checkin', label: 'Daily Check-in', description: 'Low-friction daily gratitude or reflection prompt' },
  { value: 'favorite_books', label: 'Favorite Books', description: 'What are your favorite books? (list with suggestions)' },
  { value: 'favorite_movies', label: 'Favorite Movies', description: 'What are your favorite movies? (list with suggestions)' },
  { value: 'favorite_music', label: 'Favorite Music', description: 'What are your favorite artists/songs? (list with suggestions)' },
  { value: 'favorite_foods', label: 'Favorite Foods', description: 'What are your favorite foods? (list with suggestions)' },
  { value: 'recipe', label: 'Family Recipe', description: 'Capture a family recipe with story, ingredients, directions, and tips' },
];

export const KNOWLEDGE_CATEGORIES = [
  'life_lessons',
  'values',
  'relationships',
  'parenting',
  'career',
  'health',
  'practical',
  'legacy',
  'faith',
  'interests',
  'skills',
  'hobbies',
  'goals',
];

export const INTERESTS = [
  'cooking', 'golf', 'travel', 'music', 'art', 'sports', 'reading', 'gardening',
  'photography', 'technology', 'fashion', 'fitness', 'gaming', 'movies', 'nature',
];

export const SKILLS = [
  'leadership', 'communication', 'problem_solving', 'creativity', 'teaching',
  'writing', 'public_speaking', 'negotiation', 'mentoring', 'planning',
];

export const RELIGIONS = [
  'christianity', 'islam', 'judaism', 'hinduism', 'buddhism', 'sikhism',
  'spiritual', 'agnostic', 'atheist', 'other',
];

export const MISSING_INFO_FIELDS = [
  { value: 'birth_date', label: 'Birth Date' },
  { value: 'relationship_type', label: 'Relationship Type' },
  { value: 'email', label: 'Email Address' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'address', label: 'Address' },
  { value: 'location', label: 'Location' },
  { value: 'date', label: 'Event Date' },
];

// API types for engagement endpoints
export interface GetPromptsResponse {
  prompts: EngagementPrompt[];
  stats?: EngagementStats;
}

export interface ShufflePromptsRequest {
  count?: number;
  types?: string[];
  excludeIds?: string[];
}
