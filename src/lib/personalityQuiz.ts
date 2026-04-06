/**
 * Personality Quiz Logic for YoursTruly v2
 * 
 * A warm, accessible quiz that determines personality traits
 * Maps to Big Five + MBTI-like dimensions
 */

export interface QuizQuestion {
  id: number
  text: string
  dimension: 'EI' | 'SN' | 'TF' | 'JP' | 'O' | 'C' | 'E' | 'A' | 'N' // MBTI + Big Five
  options: {
    text: string
    score: number // -2 to +2, negative = first trait, positive = second
  }[]
}

export interface QuizResult {
  personalityType: string
  traits: string[]
  description: string
  strengths: string[]
}

// 15 engaging questions
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: "At a party, you're most likely to...",
    dimension: 'EI',
    options: [
      { text: "Work the room and meet everyone", score: 2 },
      { text: "Chat with a few close friends", score: 1 },
      { text: "Find a quiet corner to observe", score: -1 },
      { text: "Recharge alone, then join briefly", score: -2 }
    ]
  },
  {
    id: 2,
    text: "When making a big decision, you tend to...",
    dimension: 'TF',
    options: [
      { text: "Go with your gut feeling", score: 2 },
      { text: "Consider how it affects others", score: 1 },
      { text: "Weigh pros and cons logically", score: -1 },
      { text: "Analyze data and facts first", score: -2 }
    ]
  },
  {
    id: 3,
    text: "Your ideal weekend looks like...",
    dimension: 'JP',
    options: [
      { text: "A detailed itinerary with activities", score: -2 },
      { text: "A loose plan with time for spontaneity", score: -1 },
      { text: "Going with the flow, no plans", score: 1 },
      { text: "Whatever feels right in the moment", score: 2 }
    ]
  },
  {
    id: 4,
    text: "You're drawn to conversations about...",
    dimension: 'SN',
    options: [
      { text: "Big ideas, theories, and possibilities", score: 2 },
      { text: "Creative visions and future plans", score: 1 },
      { text: "Real experiences and stories", score: -1 },
      { text: "Practical matters and current events", score: -2 }
    ]
  },
  {
    id: 5,
    text: "When a friend is upset, you...",
    dimension: 'TF',
    options: [
      { text: "Listen and empathize first", score: 2 },
      { text: "Offer emotional support and comfort", score: 1 },
      { text: "Help them see the situation clearly", score: -1 },
      { text: "Offer practical solutions", score: -2 }
    ]
  },
  {
    id: 6,
    text: "In a new environment, you prefer to...",
    dimension: 'SN',
    options: [
      { text: "Dive in and learn by doing", score: -2 },
      { text: "Observe how things work first", score: -1 },
      { text: "Ask questions and explore possibilities", score: 1 },
      { text: "Imagine what could be improved", score: 2 }
    ]
  },
  {
    id: 7,
    text: "Your workspace is usually...",
    dimension: 'JP',
    options: [
      { text: "Everything in its place, organized", score: -2 },
      { text: "Neat with a system only you understand", score: -1 },
      { text: "A bit messy but you know where things are", score: 1 },
      { text: "Creative chaos that inspires you", score: 2 }
    ]
  },
  {
    id: 8,
    text: "After a long week, you recharge by...",
    dimension: 'EI',
    options: [
      { text: "Going out with friends or family", score: 2 },
      { text: "A mix of social time and alone time", score: 1 },
      { text: "Quiet activities at home", score: -1 },
      { text: "Complete solitude and reflection", score: -2 }
    ]
  },
  {
    id: 9,
    text: "You're most proud of being...",
    dimension: 'O',
    options: [
      { text: "Creative and original", score: 2 },
      { text: "Open to new experiences", score: 1 },
      { text: "Practical and grounded", score: -1 },
      { text: "Traditional and reliable", score: -2 }
    ]
  },
  {
    id: 10,
    text: "When starting a project, you...",
    dimension: 'C',
    options: [
      { text: "Create a detailed plan first", score: 2 },
      { text: "Set clear goals and milestones", score: 1 },
      { text: "Start with the interesting parts", score: -1 },
      { text: "Jump in and figure it out", score: -2 }
    ]
  },
  {
    id: 11,
    text: "In group settings, you typically...",
    dimension: 'E',
    options: [
      { text: "Lead discussions naturally", score: 2 },
      { text: "Contribute actively", score: 1 },
      { text: "Listen more than speak", score: -1 },
      { text: "Prefer to observe", score: -2 }
    ]
  },
  {
    id: 12,
    text: "When someone disagrees with you, you...",
    dimension: 'A',
    options: [
      { text: "Seek to understand their view", score: 2 },
      { text: "Look for common ground", score: 1 },
      { text: "Stand firm but respectfully", score: -1 },
      { text: "Debate to prove your point", score: -2 }
    ]
  },
  {
    id: 13,
    text: "Unexpected changes make you feel...",
    dimension: 'N',
    options: [
      { text: "Calm and adaptable", score: -2 },
      { text: "Curious about new possibilities", score: -1 },
      { text: "A bit anxious but you manage", score: 1 },
      { text: "Stressed until you process them", score: 2 }
    ]
  },
  {
    id: 14,
    text: "You value relationships that are...",
    dimension: 'EI',
    options: [
      { text: "Fun, social, and active", score: 2 },
      { text: "Warm with regular connection", score: 1 },
      { text: "Deep and meaningful", score: -1 },
      { text: "Intimate with few but close", score: -2 }
    ]
  },
  {
    id: 15,
    text: "Your approach to life is best described as...",
    dimension: 'JP',
    options: [
      { text: "Life is an adventure - embrace it!", score: 2 },
      { text: "Stay flexible and open", score: 1 },
      { text: "Balance structure with freedom", score: -1 },
      { text: "Plan ahead for peace of mind", score: -2 }
    ]
  }
]

// Calculate personality type from answers
export function calculateResults(answers: Record<number, number>): QuizResult {
  const scores = { EI: 0, SN: 0, TF: 0, JP: 0, O: 0, C: 0, E: 0, A: 0, N: 0 }
  
  QUIZ_QUESTIONS.forEach(q => {
    if (answers[q.id] !== undefined) {
      scores[q.dimension] += answers[q.id]
    }
  })
  
  // Determine MBTI type
  const e_i = scores.EI + scores.E > 0 ? 'E' : 'I'
  const s_n = scores.SN > 0 ? 'N' : 'S'
  const t_f = scores.TF > 0 ? 'F' : 'T'
  const j_p = scores.JP > 0 ? 'P' : 'J'
  
  const type = `${e_i}${s_n}${t_f}${j_p}`
  
  // Generate traits based on scores
  const traits: string[] = []
  
  // Extraversion traits
  if (scores.EI + scores.E > 3) traits.push('Outgoing', 'Social')
  else if (scores.EI + scores.E > 0) traits.push('Friendly', 'Approachable')
  else if (scores.EI + scores.E > -3) traits.push('Thoughtful', 'Reflective')
  else traits.push('Introspective', 'Independent')
  
  // Intuition traits
  if (scores.SN > 2) traits.push('Imaginative', 'Visionary')
  else if (scores.SN >= 0) traits.push('Creative', 'Curious')
  else traits.push('Practical', 'Detail-oriented')
  
  // Feeling traits
  if (scores.TF > 2) traits.push('Empathetic', 'Compassionate')
  else if (scores.TF >= 0) traits.push('Caring', 'Warm')
  else traits.push('Logical', 'Analytical')
  
  // Perceiving traits
  if (scores.JP > 2) traits.push('Spontaneous', 'Adaptable')
  else if (scores.JP >= 0) traits.push('Flexible', 'Open-minded')
  else traits.push('Organized', 'Methodical')
  
  // Additional Big Five traits
  if (scores.O > 0) traits.push('Open to Experience')
  if (scores.C > 0) traits.push('Conscientious')
  if (scores.A > 0) traits.push('Agreeable')
  if (scores.N < 0) traits.push('Emotionally Stable')
  
  return {
    personalityType: getPersonalityLabel(type),
    traits: traits.slice(0, 8), // Keep top 8 traits
    description: getDescription(type),
    strengths: getStrengths(type)
  }
}

function getPersonalityLabel(type: string): string {
  const labels: Record<string, string> = {
    'INTJ': 'INTJ - Architect',
    'INTP': 'INTP - Logician', 
    'ENTJ': 'ENTJ - Commander',
    'ENTP': 'ENTP - Debater',
    'INFJ': 'INFJ - Advocate',
    'INFP': 'INFP - Mediator',
    'ENFJ': 'ENFJ - Protagonist',
    'ENFP': 'ENFP - Campaigner',
    'ISTJ': 'ISTJ - Logistician',
    'ISFJ': 'ISFJ - Defender',
    'ESTJ': 'ESTJ - Executive',
    'ESFJ': 'ESFJ - Consul',
    'ISTP': 'ISTP - Virtuoso',
    'ISFP': 'ISFP - Adventurer',
    'ESTP': 'ESTP - Entrepreneur',
    'ESFP': 'ESFP - Entertainer'
  }
  return labels[type] || type
}

function getDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'INTJ': "You're a strategic thinker with a vision for the future. You value competence and independence.",
    'INTP': "You're an innovative problem-solver who loves exploring ideas and theories.",
    'ENTJ': "You're a natural leader who turns visions into reality through determination.",
    'ENTP': "You're a quick-thinking innovator who loves intellectual challenges.",
    'INFJ': "You're an insightful idealist driven by your values and desire to help others.",
    'INFP': "You're a creative soul with deep values and a rich inner world.",
    'ENFJ': "You're a charismatic leader who inspires and brings out the best in others.",
    'ENFP': "You're an enthusiastic free spirit who sees possibilities everywhere.",
    'ISTJ': "You're reliable and dedicated, valuing tradition and responsibility.",
    'ISFJ': "You're a warm protector who cares deeply about those around you.",
    'ESTJ': "You're an organized leader who values order and tradition.",
    'ESFJ': "You're a caring host who creates harmony and brings people together.",
    'ISTP': "You're a practical problem-solver who loves understanding how things work.",
    'ISFP': "You're a gentle artist with a keen eye for beauty and authenticity.",
    'ESTP': "You're an energetic adventurer who lives in the moment.",
    'ESFP': "You're a spontaneous entertainer who brings joy to those around you."
  }
  return descriptions[type] || "You have a unique blend of traits that makes you who you are."
}

function getStrengths(type: string): string[] {
  const strengths: Record<string, string[]> = {
    'INTJ': ['Strategic thinking', 'Independence', 'Determination', 'Innovation'],
    'INTP': ['Analytical mind', 'Creativity', 'Open-mindedness', 'Objectivity'],
    'ENTJ': ['Leadership', 'Efficiency', 'Confidence', 'Strategic planning'],
    'ENTP': ['Quick thinking', 'Charisma', 'Creativity', 'Adaptability'],
    'INFJ': ['Insight', 'Creativity', 'Determination', 'Compassion'],
    'INFP': ['Idealism', 'Empathy', 'Creativity', 'Open-mindedness'],
    'ENFJ': ['Leadership', 'Empathy', 'Reliability', 'Charisma'],
    'ENFP': ['Enthusiasm', 'Creativity', 'Sociability', 'Optimism'],
    'ISTJ': ['Reliability', 'Organization', 'Patience', 'Dedication'],
    'ISFJ': ['Supportiveness', 'Reliability', 'Patience', 'Observation'],
    'ESTJ': ['Organization', 'Dedication', 'Honesty', 'Leadership'],
    'ESFJ': ['Caring', 'Sociability', 'Reliability', 'Loyalty'],
    'ISTP': ['Problem-solving', 'Practicality', 'Spontaneity', 'Rationality'],
    'ISFP': ['Charm', 'Sensitivity', 'Creativity', 'Passion'],
    'ESTP': ['Energy', 'Boldness', 'Practicality', 'Directness'],
    'ESFP': ['Enthusiasm', 'Spontaneity', 'Practicality', 'Sociability']
  }
  return strengths[type] || ['Unique perspective', 'Authenticity', 'Adaptability', 'Self-awareness']
}

// Predefined options for profile dropdowns
export const OCCUPATION_OPTIONS = [
  'Software Engineer',
  'Teacher / Educator',
  'Healthcare Professional',
  'Business Owner',
  'Artist / Creative',
  'Manager / Executive',
  'Sales / Marketing',
  'Finance / Accounting',
  'Legal Professional',
  'Engineer',
  'Writer / Content Creator',
  'Designer',
  'Consultant',
  'Student',
  'Retired',
  'Homemaker',
  'Self-employed',
  'Other'
]

export const INTEREST_OPTIONS = [
  'Reading', 'Writing', 'Music', 'Art', 'Photography',
  'Cooking', 'Gardening', 'Fitness', 'Yoga', 'Hiking',
  'Travel', 'Technology', 'Gaming', 'Movies', 'TV Shows',
  'Sports', 'Fashion', 'DIY Projects', 'Volunteering',
  'Languages', 'History', 'Science', 'Philosophy', 'Spirituality',
  'Nature', 'Animals', 'Cars', 'Home Decor', 'Podcasts',
  'Board Games', 'Dancing', 'Theater', 'Wine & Dining', 'Crafts'
]

export const LANGUAGE_OPTIONS = [
  'English', 'Spanish', 'French', 'German', 'Italian',
  'Portuguese', 'Chinese (Mandarin)', 'Chinese (Cantonese)', 'Japanese', 'Korean',
  'Arabic', 'Hindi', 'Urdu', 'Bengali', 'Punjabi', 'Tamil', 'Telugu', 'Marathi', 'Gujarati',
  'Russian', 'Ukrainian', 'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
  'Polish', 'Czech', 'Slovak', 'Romanian', 'Hungarian', 'Serbian', 'Croatian', 'Bulgarian',
  'Turkish', 'Persian (Farsi)', 'Kurdish', 'Pashto',
  'Vietnamese', 'Thai', 'Indonesian', 'Malay', 'Burmese', 'Khmer', 'Lao',
  'Greek', 'Hebrew', 'Yiddish', 'Amharic', 'Somali',
  'Filipino/Tagalog', 'Swahili', 'Hausa', 'Yoruba', 'Igbo', 'Zulu', 'Xhosa',
  'Nepali', 'Sinhala', 'Dari',
  'Catalan', 'Basque', 'Galician', 'Welsh', 'Irish (Gaelic)', 'Scottish Gaelic',
  'Latin', 'Esperanto',
  'Sign Language (ASL)', 'Sign Language (BSL)', 'Sign Language (Other)',
]

export const RELIGION_OPTIONS = [
  'Christianity',
  'Catholicism',
  'Protestantism',
  'Judaism',
  'Islam',
  'Buddhism',
  'Hinduism',
  'Sikhism',
  'Spiritual but not religious',
  'Agnostic',
  'Atheist',
  'Other',
  'Prefer not to say'
]

export const POLITICAL_OPTIONS = [
  'Very Liberal',
  'Liberal',
  'Moderate',
  'Conservative',
  'Very Conservative',
  'Libertarian',
  'Not political',
  'Prefer not to say'
]

export const EDUCATION_LEVEL_OPTIONS = [
  'High School',
  'Some College',
  'Associate\'s Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctorate / PhD',
  'Professional Degree (MD, JD, etc.)',
  'Trade School / Vocational',
  'Self-taught',
  'Other'
]

export const HOBBY_OPTIONS = [
  'Reading', 'Writing', 'Painting', 'Drawing', 'Photography',
  'Cooking', 'Baking', 'Gardening', 'Hiking', 'Camping',
  'Fishing', 'Hunting', 'Running', 'Cycling', 'Swimming',
  'Yoga', 'Meditation', 'Dancing', 'Singing', 'Playing an Instrument',
  'Video Games', 'Board Games', 'Chess', 'Puzzles', 'Crafts',
  'Knitting', 'Sewing', 'Woodworking', 'DIY Projects', 'Model Building',
  'Collecting', 'Bird Watching', 'Stargazing', 'Traveling', 'Volunteering',
  'Podcasting', 'Blogging', 'Journaling', 'Scrapbooking', 'Genealogy'
]

export const SKILL_OPTIONS = [
  'Leadership', 'Communication', 'Problem Solving', 'Critical Thinking', 'Creativity',
  'Time Management', 'Organization', 'Negotiation', 'Public Speaking', 'Writing',
  'Teaching', 'Coaching', 'Mentoring', 'Project Management', 'Strategic Planning',
  'Data Analysis', 'Programming', 'Web Development', 'Design', 'Marketing',
  'Sales', 'Customer Service', 'Financial Planning', 'Budgeting', 'Investing',
  'Cooking', 'Home Repair', 'Carpentry', 'Electrical Work', 'Plumbing',
  'Gardening', 'First Aid', 'CPR', 'Foreign Languages', 'Sign Language',
  'Photography', 'Video Editing', 'Music Production', 'Graphic Design', 'Social Media'
]

export const LIFE_GOAL_OPTIONS = [
  'Travel the world', 'Learn a new language', 'Start a business', 'Write a book', 'Run a marathon',
  'Learn an instrument', 'Get a degree', 'Buy a home', 'Retire early', 'Start a family',
  'Volunteer regularly', 'Learn to cook well', 'Get in shape', 'Build wealth', 'Find purpose',
  'Make a difference', 'Be a great parent', 'Mentor others', 'Create art', 'Build something lasting',
  'Achieve work-life balance', 'Master a skill', 'Live abroad', 'Start a nonprofit', 'Be debt-free',
  'Reconnect with family', 'Find inner peace', 'Leave a legacy', 'Inspire others', 'Live authentically'
]

export const PERSONALITY_TRAIT_OPTIONS = [
  'Creative', 'Analytical', 'Empathetic', 'Ambitious', 'Curious',
  'Patient', 'Adventurous', 'Loyal', 'Optimistic', 'Pragmatic',
  'Introverted', 'Extroverted', 'Compassionate', 'Determined', 'Flexible',
  'Honest', 'Humorous', 'Independent', 'Organized', 'Passionate',
  'Reliable', 'Resilient', 'Thoughtful', 'Warm', 'Wise'
]

export const BOOK_SUGGESTIONS = [
  'To Kill a Mockingbird', '1984', 'Pride and Prejudice', 'The Great Gatsby', 'Harry Potter series',
  'The Lord of the Rings', 'The Catcher in the Rye', 'Jane Eyre', 'The Alchemist', 'Sapiens',
  'Atomic Habits', 'Thinking, Fast and Slow', 'The Power of Now', 'Man\'s Search for Meaning',
  'The Bible', 'The Quran', 'Meditations', 'The Art of War', 'Rich Dad Poor Dad'
]

export const MOVIE_SUGGESTIONS = [
  'The Shawshank Redemption', 'The Godfather', 'Forrest Gump', 'The Dark Knight', 'Inception',
  'Pulp Fiction', 'Fight Club', 'The Matrix', 'Goodfellas', 'Interstellar',
  'Titanic', 'The Lion King', 'Schindler\'s List', 'Gladiator', 'Braveheart',
  'The Departed', 'Saving Private Ryan', 'Back to the Future', 'Star Wars', 'Avatar'
]

export const MUSIC_SUGGESTIONS = [
  'The Beatles', 'Michael Jackson', 'Elvis Presley', 'Queen', 'Led Zeppelin',
  'Pink Floyd', 'Bob Dylan', 'David Bowie', 'Prince', 'Madonna',
  'Beyoncé', 'Taylor Swift', 'Drake', 'Kendrick Lamar', 'Adele',
  'Ed Sheeran', 'Bruno Mars', 'Classical', 'Jazz', 'Country',
  'Hip Hop', 'Rock', 'R&B', 'Electronic', 'Indie'
]

export const FOOD_SUGGESTIONS = [
  'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai',
  'Indian', 'Mediterranean', 'French', 'American BBQ', 'Seafood',
  'Pizza', 'Sushi', 'Tacos', 'Pasta', 'Steak',
  'Chicken', 'Salads', 'Burgers', 'Ice Cream', 'Chocolate',
  'Coffee', 'Wine', 'Craft Beer', 'Vegetarian', 'Vegan'
]
