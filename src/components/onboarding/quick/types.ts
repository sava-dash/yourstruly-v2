export interface ConversationMessage {
  role: 'assistant' | 'user';
  content: string;
}

export interface OnboardingData {
  name: string;
  birthday: string;
  interests: string[];
  hobbies: string[];
  skills: string[];
  lifeGoals: string[];
  personalityTraits: string[];
  religion: string;
  location: string;
  favoriteQuote: string;
  background: string;
  heartfeltAnswer?: string;
  heartfeltConversation?: ConversationMessage[];
  uploadedImagesCount?: number;
  // Globe-collected signals (piped through for profile + engagement engine)
  placesLived?: string[];
  whyHereText?: string;
  whyHereSelections?: string[];
  contactsCount?: number;
  sensitiveTopicOptouts?: string[];
  promptCadence?: string;
}

export type QuickStep =
  | 'birth-info'
  | 'globe'
  | 'interests'
  | 'traits'
  | 'religion'
  | 'why-here'
  | 'heartfelt'
  | 'ready';

export interface Pill {
  label: string;
  emoji: string;
  category: 'interest' | 'trait';
}

// Categorized interests
export interface InterestCategory {
  name: string;
  emoji: string;
  items: string[];
}

// Categorized religion/spiritual options
export interface ReligionCategory {
  category: string;
  options: string[];
}

export type GlobeSubPhase = 'basics' | 'map' | 'places-lived' | 'contacts' | 'interests' | 'why-here' | 'photo-upload' | 'photo-map' | 'preferences';

export interface QuickOnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  onSkipAll?: () => void;
  userId?: string;
  initialName?: string;
}
