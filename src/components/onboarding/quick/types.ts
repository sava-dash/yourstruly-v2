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

export type GlobeSubPhase = 'map' | 'places-lived' | 'contacts' | 'interests' | 'why-here' | 'photo-upload' | 'photo-map';

export interface QuickOnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  onSkipAll?: () => void;
  userId?: string;
  initialName?: string;
}
