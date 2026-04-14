import type { QuickStep, Pill, InterestCategory, ReligionCategory } from './types';

const ALL_STEPS: QuickStep[] = [
  'birth-info',
  'globe',
  // interests, contacts, why-here, photo-upload are now embedded in the globe step
  // religion removed
  // heartfelt (onboarding cards) removed — users will learn cards on the dashboard
  'ready',
];

// Progress steps for the non-globe flow
const PROGRESS_STEPS: QuickStep[] = [
  'birth-info',
  'globe',
  'ready',
];

// Map each step to the explanation tile key
const TILE_KEY: Partial<Record<QuickStep, string>> = {
  'birth-info': 'location',
  interests: 'interests',
  traits: 'interests',
  religion: 'religion',
  'why-here': 'background',
  heartfelt: 'heartfelt-question',
  ready: 'celebration',
};

const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    name: 'Creative Arts',
    emoji: '🎨',
    items: ['Drawing', 'Painting', 'Photography', 'Writing', 'Music', 'Dancing', 'Theater', 'Film', 'Graphic Design', 'Fashion', 'Interior Design', 'DIY Crafts'],
  },
  {
    name: 'Health & Wellness',
    emoji: '💪',
    items: ['Fitness', 'Yoga', 'Meditation', 'Running', 'Cycling', 'Swimming', 'Martial Arts', 'Nutrition', 'Mindfulness'],
  },
  {
    name: 'Nature & Adventure',
    emoji: '🏔️',
    items: ['Hiking', 'Camping', 'Travel', 'Gardening', 'Fishing', 'Surfing', 'Climbing', 'Snowboarding', 'Birdwatching'],
  },
  {
    name: 'Food & Drink',
    emoji: '🍳',
    items: ['Cooking', 'Baking', 'Food Tasting', 'Wine', 'Coffee', 'Tea', 'Mixology'],
  },
  {
    name: 'Learning & Tech',
    emoji: '💻',
    items: ['Technology', 'Coding', 'Science', 'History', 'Philosophy', 'Psychology', 'Languages', 'Astronomy'],
  },
  {
    name: 'Sports & Games',
    emoji: '⚽',
    items: ['Gaming', 'Soccer', 'Basketball', 'Football', 'Tennis', 'Golf', 'Baseball', 'Pickleball'],
  },
  {
    name: 'Lifestyle',
    emoji: '🏠',
    items: ['Family', 'Parenting', 'Home Improvement', 'Minimalism', 'Collecting', 'Travel Blogging', 'Animals & Pets'],
  },
  {
    name: 'Community',
    emoji: '🤝',
    items: ['Volunteering', 'Community Service', 'Sustainability', 'Animal Care'],
  },
  {
    name: 'Business',
    emoji: '💼',
    items: ['Entrepreneurship', 'Investing', 'Real Estate', 'Personal Finance', 'Public Speaking'],
  },
];

// Flat list of all interests for backward compatibility
const ALL_INTERESTS = INTEREST_CATEGORIES.flatMap(c => c.items);

// Personality traits
const PERSONALITY_TRAITS = [
  'Adventurous', 'Ambitious', 'Analytical', 'Authentic', 'Calm', 'Caring', 'Charismatic',
  'Compassionate', 'Confident', 'Creative', 'Curious', 'Determined', 'Empathetic',
  'Energetic', 'Extroverted', 'Flexible', 'Friendly', 'Generous', 'Hardworking',
  'Honest', 'Humble', 'Independent', 'Innovative', 'Introverted', 'Kind', 'Logical',
  'Loyal', 'Optimistic', 'Organized', 'Patient', 'Persistent', 'Practical', 'Reflective',
  'Reliable', 'Resilient', 'Resourceful', 'Self-aware', 'Sincere', 'Spontaneous',
  'Supportive', 'Thoughtful', 'Trustworthy', 'Warm', 'Wise', 'Witty'
];

const ABOUT_YOU_PILLS: Pill[] = [
  // Popular interests (shown first)
  { label: 'Family', emoji: '👨‍👩‍👧', category: 'interest' },
  { label: 'Travel', emoji: '✈️', category: 'interest' },
  { label: 'Music', emoji: '🎵', category: 'interest' },
  { label: 'Cooking', emoji: '🍳', category: 'interest' },
  { label: 'Fitness', emoji: '💪', category: 'interest' },
  { label: 'Reading', emoji: '📚', category: 'interest' },
  { label: 'Nature', emoji: '🌿', category: 'interest' },
  { label: 'Art', emoji: '🎨', category: 'interest' },
  { label: 'Technology', emoji: '💻', category: 'interest' },
  { label: 'Spirituality', emoji: '🙏', category: 'interest' },
  { label: 'Photography', emoji: '📷', category: 'interest' },
  { label: 'Gardening', emoji: '🌱', category: 'interest' },
  { label: 'Sports', emoji: '⚽', category: 'interest' },
  { label: 'Movies & TV', emoji: '🎬', category: 'interest' },
  { label: 'Writing', emoji: '✍️', category: 'interest' },
  { label: 'Fashion', emoji: '👗', category: 'interest' },
  { label: 'DIY & Crafts', emoji: '🛠️', category: 'interest' },
  { label: 'Animals & Pets', emoji: '🐾', category: 'interest' },
  { label: 'Volunteering', emoji: '🤲', category: 'interest' },
  { label: 'History', emoji: '📜', category: 'interest' },
  { label: 'Science', emoji: '🔬', category: 'interest' },
  { label: 'Gaming', emoji: '🎮', category: 'interest' },
  { label: 'Dancing', emoji: '💃', category: 'interest' },
  { label: 'Food & Wine', emoji: '🍷', category: 'interest' },
  // Popular traits
  { label: 'Adventurous', emoji: '🏔️', category: 'trait' },
  { label: 'Creative', emoji: '✨', category: 'trait' },
  { label: 'Empathetic', emoji: '💛', category: 'trait' },
  { label: 'Optimistic', emoji: '☀️', category: 'trait' },
  { label: 'Curious', emoji: '🔍', category: 'trait' },
  { label: 'Loyal', emoji: '🤝', category: 'trait' },
  { label: 'Humorous', emoji: '😄', category: 'trait' },
  { label: 'Calm', emoji: '🌊', category: 'trait' },
  { label: 'Driven', emoji: '🚀', category: 'trait' },
  { label: 'Nurturing', emoji: '🌸', category: 'trait' },
  { label: 'Independent', emoji: '🦅', category: 'trait' },
  { label: 'Reflective', emoji: '💭', category: 'trait' },
  { label: 'Analytical', emoji: '🧩', category: 'trait' },
  { label: 'Spontaneous', emoji: '⚡', category: 'trait' },
  { label: 'Resilient', emoji: '🌳', category: 'trait' },
  { label: 'Patient', emoji: '⏳', category: 'trait' },
  { label: 'Ambitious', emoji: '🎯', category: 'trait' },
  { label: 'Passionate', emoji: '🔥', category: 'trait' },
  { label: 'Pragmatic', emoji: '🔧', category: 'trait' },
  { label: 'Thoughtful', emoji: '🌙', category: 'trait' },
  { label: 'Extroverted', emoji: '🎉', category: 'trait' },
  { label: 'Introverted', emoji: '📖', category: 'trait' },
];

const RELIGION_CATEGORIES: ReligionCategory[] = [
  {
    category: 'Major World Religions',
    options: ['Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Sikhism', 'Baháʼí Faith'],
  },
  {
    category: 'Christian Traditions',
    options: ['Catholicism', 'Protestant Christianity', 'Eastern Orthodoxy', 'Non-denominational Christianity'],
  },
  {
    category: 'Eastern & Dharmic',
    options: ['Taoism', 'Confucianism', 'Shinto', 'Jainism'],
  },
  {
    category: 'Indigenous & Ancestral',
    options: ['Native American spirituality', 'African traditional religions', 'Aboriginal Australian beliefs'],
  },
  {
    category: 'New Thought & Modern',
    options: ['New Age spirituality', 'Meditation traditions', 'Yoga philosophy', 'Stoicism'],
  },
  {
    category: 'Nature-Based',
    options: ['Paganism', 'Wicca', 'Druidry', 'Animism'],
  },
  {
    category: 'Philosophical',
    options: ['Humanism', 'Secular spirituality', 'Agnosticism', 'Atheism', 'Spiritual but not religious'],
  },
  {
    category: 'Other',
    options: ['Other', 'Prefer not to say'],
  },
];

// Flat list for backward compatibility
const RELIGION_OPTIONS = RELIGION_CATEGORIES.flatMap(c => c.options);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WHY_OPTIONS = [
  { emoji: '🧠', text: "I want to reflect on my life experiences and personal growth" },
  { emoji: '💼', text: "I'm reflecting on my career and the lessons I've learned" },
  { emoji: '❤️', text: "I want to preserve my parents' stories before they're lost" },
  { emoji: '🔄', text: "I'm at a transitional moment and processing big changes" },
  { emoji: '🌱', text: "I want to create something meaningful for my children" },
  { emoji: '📖', text: "I want to document my life story for future generations" },
];

export {
  ALL_STEPS,
  PROGRESS_STEPS,
  TILE_KEY,
  INTEREST_CATEGORIES,
  ALL_INTERESTS,
  PERSONALITY_TRAITS,
  ABOUT_YOU_PILLS,
  RELIGION_CATEGORIES,
  RELIGION_OPTIONS,
  MONTHS,
  WHY_OPTIONS,
};
