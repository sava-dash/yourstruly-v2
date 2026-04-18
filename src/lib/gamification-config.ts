// Default gamification config — admin can override all wording via DB
// Messaging focuses on effort for friends & family

export interface XpLevelConfig {
  level: number
  title: string
  minXp: number
  emoji: string
  message: string // shown when user reaches this level
}

export type BadgeMetric = 'memories' | 'photos' | 'voices' | 'shares' | 'tags' | 'streak' | 'complete_memories'

export interface BadgeCriteria {
  metric: BadgeMetric
  threshold: number
}

export interface BadgeConfig {
  type: string
  name: string
  emoji: string
  description: string // what the badge means
  congratsMessage: string // shown when earned
  criteria: BadgeCriteria
}

export interface ChallengeTemplate {
  type: string
  label: string // use {n} for target count
  emoji: string
  targets: number[]
  difficulty: 'easy' | 'medium' | 'hard'
  description: string // why this matters
  xpMultiplier?: number // per-target XP (default 20)
}

export interface GamificationConfig {
  xpLevels: XpLevelConfig[]
  badges: BadgeConfig[]
  challengeTemplates: ChallengeTemplate[]
  streakMessages: Record<string, string> // milestone -> message
}

export const DEFAULT_CONFIG: GamificationConfig = {
  xpLevels: [
    { level: 1, title: 'Getting Started', minXp: 0, emoji: '🌱', message: 'Welcome! Every memory you save is a gift to the people you love.' },
    { level: 2, title: 'Memory Keeper', minXp: 100, emoji: '📝', message: "You're building something beautiful for your family. Keep going!" },
    { level: 3, title: 'Storyteller', minXp: 300, emoji: '📖', message: 'Your stories are becoming a treasure your loved ones will cherish forever.' },
    { level: 4, title: 'Family Historian', minXp: 600, emoji: '🏛️', message: "You're preserving your family's history in a way no one else can." },
    { level: 5, title: 'Legacy Builder', minXp: 1000, emoji: '⭐', message: 'The legacy you\'re creating will be treasured for generations.' },
    { level: 6, title: 'Heart & Soul', minXp: 1500, emoji: '💝', message: 'Your dedication to preserving memories shows how much you care.' },
    { level: 7, title: 'Timeless', minXp: 2500, emoji: '👑', message: "You've created something truly timeless for the people who matter most." },
    { level: 8, title: 'Living Legacy', minXp: 4000, emoji: '🌟', message: 'You are a Living Legacy. Your family will thank you for this forever.' },
  ],

  badges: [
    { type: 'first_memory', name: 'First Step', emoji: '📝', description: 'Created your first memory for your loved ones', congratsMessage: "You've taken the first step in preserving your story for the people who matter most!", criteria: { metric: 'memories', threshold: 1 } },
    { type: 'memory_10', name: 'Dedicated', emoji: '📚', description: '10 memories saved for your family', congratsMessage: '10 memories! Your family is going to love looking back on these.', criteria: { metric: 'memories', threshold: 10 } },
    { type: 'memory_50', name: 'Family Treasure', emoji: '🏛️', description: '50 memories — a real family treasure', congratsMessage: "50 memories! You've built an incredible collection for your loved ones.", criteria: { metric: 'memories', threshold: 50 } },
    { type: 'first_voice', name: 'Your Voice', emoji: '🎙️', description: 'Recorded your voice for those you love', congratsMessage: "There's nothing more precious than hearing a loved one's voice. You just gave that gift.", criteria: { metric: 'voices', threshold: 1 } },
    { type: 'first_share', name: 'Sharing is Caring', emoji: '💝', description: 'Shared a memory with someone special', congratsMessage: 'You shared a piece of yourself. That means the world to the people in your life.', criteria: { metric: 'shares', threshold: 1 } },
    { type: 'streak_7', name: 'Committed', emoji: '🔥', description: '7 days of showing up for your family', congratsMessage: "A whole week! Your consistency shows how much your family's story matters to you.", criteria: { metric: 'streak', threshold: 7 } },
    { type: 'streak_30', name: 'Unstoppable', emoji: '💪', description: '30 days of building your legacy', congratsMessage: "30 days of dedication. Your loved ones are lucky to have someone who cares this much.", criteria: { metric: 'streak', threshold: 30 } },
    { type: 'photo_25', name: 'Moments Captured', emoji: '📸', description: '25 photos preserved for your family', congratsMessage: "25 photos! Each one is a moment your family can revisit forever.", criteria: { metric: 'photos', threshold: 25 } },
    { type: 'tagger', name: 'Connector', emoji: '👤', description: 'Tagged 10 faces — connecting people to memories', congratsMessage: "You're connecting faces to stories. Now your family can see who was there.", criteria: { metric: 'tags', threshold: 10 } },
    { type: 'completionist', name: 'Detail Oriented', emoji: '✨', description: '5 fully complete memories with all the details', congratsMessage: "You don't just save memories — you make them come alive with details. Your family will love that.", criteria: { metric: 'complete_memories', threshold: 5 } },
  ],

  challengeTemplates: [
    // Easy (low target, common actions)
    { type: 'add_memories', label: 'Create {n} memories for your family', emoji: '📝', targets: [2], difficulty: 'easy', description: 'Every memory you save is a gift to those you love' },
    { type: 'complete_prompts', label: 'Answer {n} memory prompts', emoji: '💬', targets: [2], difficulty: 'easy', description: 'Each answer adds another chapter to your story' },
    { type: 'add_wisdom', label: 'Share {n} piece of wisdom', emoji: '💡', targets: [1], difficulty: 'easy', description: 'Pass down the lessons that shaped who you are' },

    // Medium
    { type: 'add_photos', label: 'Share {n} photos with loved ones', emoji: '📸', targets: [5], difficulty: 'medium', description: 'Photos bring memories to life for your family' },
    { type: 'tag_faces', label: 'Tag {n} people in your photos', emoji: '👤', targets: [3], difficulty: 'medium', description: 'Help your family know who was part of these moments' },
    { type: 'record_voice', label: 'Record {n} voice message for family', emoji: '🎙️', targets: [2], difficulty: 'medium', description: "Your voice is irreplaceable — your family will treasure hearing it" },
    { type: 'share_memory', label: 'Share a memory with {n} people', emoji: '💌', targets: [1, 2], difficulty: 'medium', description: 'Sharing memories brings people closer together', xpMultiplier: 20 },

    // Hard (higher target, less common actions)
    { type: 'enrich_memories', label: 'Add details to {n} memories', emoji: '📍', targets: [5], difficulty: 'hard', description: 'The details make memories come alive for your loved ones' },
    { type: 'add_photos', label: 'Share {n} photos with loved ones', emoji: '📸', targets: [10], difficulty: 'hard', description: 'Photos bring memories to life for your family' },
    { type: 'tag_faces', label: 'Tag {n} people in your photos', emoji: '👤', targets: [8], difficulty: 'hard', description: 'Help your family know who was part of these moments' },
  ],

  streakMessages: {
    '3': "3 days in a row! Your family's story is growing.",
    '7': "A full week! Your dedication to your family is inspiring.",
    '14': "Two weeks strong. You're building something your loved ones will treasure.",
    '30': "A whole month! Your family is so lucky to have you documenting their story.",
    '60': "60 days. The legacy you're creating is extraordinary.",
    '100': "100 days! You are truly committed to preserving what matters most.",
  },
}

// Helper to merge admin overrides with defaults
export function mergeConfig(overrides: Partial<GamificationConfig> | null): GamificationConfig {
  if (!overrides) return DEFAULT_CONFIG
  return {
    xpLevels: overrides.xpLevels?.length ? overrides.xpLevels : DEFAULT_CONFIG.xpLevels,
    badges: overrides.badges?.length ? overrides.badges : DEFAULT_CONFIG.badges,
    challengeTemplates: overrides.challengeTemplates?.length ? overrides.challengeTemplates : DEFAULT_CONFIG.challengeTemplates,
    streakMessages: overrides.streakMessages || DEFAULT_CONFIG.streakMessages,
  }
}
