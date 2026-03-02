/**
 * Mood Analysis Service
 * Uses Gemini to analyze memory content and suggest an emotional mood
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export type MoodType = 
  | 'joyful' | 'proud' | 'grateful' | 'peaceful' | 'nostalgic' | 'loving' | 'hopeful' | 'playful'  // positive
  | 'bittersweet' | 'melancholy' | 'reflective' | 'longing' | 'solemn'  // mixed/negative

export interface MoodAnalysisResult {
  mood: MoodType
  confidence: number
  reasoning: string
}

// Muted, elegant color palette - no emojis
export const MOOD_DEFINITIONS: Record<MoodType, { label: string; color: string; bgColor: string; description: string }> = {
  // Positive moods
  joyful: {
    label: 'Joyful',
    color: '#D9C61A', // brand yellow
    bgColor: 'bg-[#D9C61A]/15',
    description: 'Happiness, celebration, laughter'
  },
  proud: {
    label: 'Proud',
    color: '#4A3552', // brand purple
    bgColor: 'bg-[#4A3552]/15',
    description: 'Achievements, milestones, accomplishments'
  },
  grateful: {
    label: 'Grateful',
    color: '#406A56', // brand green
    bgColor: 'bg-[#406A56]/15',
    description: 'Thankfulness, appreciation, blessings'
  },
  peaceful: {
    label: 'Peaceful',
    color: '#8DACAB', // brand blue
    bgColor: 'bg-[#8DACAB]/20',
    description: 'Calm, serene, tranquil moments'
  },
  nostalgic: {
    label: 'Nostalgic',
    color: '#C35F33', // brand terra cotta
    bgColor: 'bg-[#C35F33]/15',
    description: 'Fond memories, reminiscence'
  },
  loving: {
    label: 'Loving',
    color: '#9D6B7D', // muted rose
    bgColor: 'bg-[#9D6B7D]/15',
    description: 'Love, affection, deep connection'
  },
  hopeful: {
    label: 'Hopeful',
    color: '#7BA68C', // soft sage
    bgColor: 'bg-[#7BA68C]/15',
    description: 'Optimism, anticipation, dreams'
  },
  playful: {
    label: 'Playful',
    color: '#E8A87C', // warm peach
    bgColor: 'bg-[#E8A87C]/20',
    description: 'Fun, lighthearted, spontaneous'
  },
  // Mixed/Negative moods
  bittersweet: {
    label: 'Bittersweet',
    color: '#8B7355', // warm brown
    bgColor: 'bg-[#8B7355]/15',
    description: 'Joy mixed with sadness, endings'
  },
  melancholy: {
    label: 'Melancholy',
    color: '#6B7B8C', // slate blue
    bgColor: 'bg-[#6B7B8C]/15',
    description: 'Sadness, loss, grief'
  },
  reflective: {
    label: 'Reflective',
    color: '#7D8471', // sage gray
    bgColor: 'bg-[#7D8471]/15',
    description: 'Thoughtful, contemplative, introspective'
  },
  longing: {
    label: 'Longing',
    color: '#A0887D', // dusty mauve
    bgColor: 'bg-[#A0887D]/15',
    description: 'Missing someone, yearning, wistful'
  },
  solemn: {
    label: 'Solemn',
    color: '#5D5D5D', // charcoal
    bgColor: 'bg-[#5D5D5D]/15',
    description: 'Serious, meaningful, reverent'
  }
}

const VALID_MOODS: MoodType[] = [
  'joyful', 'proud', 'grateful', 'peaceful', 'nostalgic', 'loving', 'hopeful', 'playful',
  'bittersweet', 'melancholy', 'reflective', 'longing', 'solemn'
]

/**
 * Analyze memory content to determine emotional mood
 */
export async function analyzeMood(
  title: string,
  description: string | null,
  memoryType: string | null,
  aiLabels: string[] = []
): Promise<MoodAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, using fallback mood')
    return getFallbackMood(memoryType)
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `Analyze this memory and determine its primary emotional mood.

Memory Title: ${title || 'Untitled'}
Description: ${description || 'No description'}
Type: ${memoryType || 'moment'}
Labels/Tags: ${aiLabels.length > 0 ? aiLabels.join(', ') : 'None'}

Available moods (pick exactly ONE):
POSITIVE:
- joyful: Happiness, celebration, laughter
- proud: Achievements, milestones, accomplishments
- grateful: Thankfulness, appreciation, blessings
- peaceful: Calm, serene, tranquil moments
- nostalgic: Fond memories, reminiscence
- loving: Love, affection, deep connection
- hopeful: Optimism, anticipation, dreams
- playful: Fun, lighthearted, spontaneous

MIXED/REFLECTIVE:
- bittersweet: Joy mixed with sadness, endings
- melancholy: Sadness, loss, grief
- reflective: Thoughtful, contemplative, introspective
- longing: Missing someone, yearning, wistful
- solemn: Serious, meaningful, reverent

Respond with ONLY valid JSON in this exact format:
{
  "mood": "joyful",
  "confidence": 0.85,
  "reasoning": "Brief explanation why this mood fits"
}

Rules:
- confidence should be 0.0 to 1.0
- Pick the SINGLE most dominant mood
- Be conservative with confidence (0.6-0.9 typical range)
- Don't shy away from negative moods when appropriate
- If unsure, lean toward "reflective" as a default`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in Gemini response:', text)
      return getFallbackMood(memoryType)
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    // Validate mood
    if (!VALID_MOODS.includes(parsed.mood)) {
      console.warn('Invalid mood from Gemini:', parsed.mood)
      return getFallbackMood(memoryType)
    }

    return {
      mood: parsed.mood as MoodType,
      confidence: Math.min(1, Math.max(0, parseFloat(parsed.confidence) || 0.7)),
      reasoning: parsed.reasoning || 'AI analysis'
    }
  } catch (error) {
    console.error('Mood analysis error:', error)
    return getFallbackMood(memoryType)
  }
}

/**
 * Fallback mood based on memory type
 */
function getFallbackMood(memoryType: string | null): MoodAnalysisResult {
  const typeToMood: Record<string, MoodType> = {
    'celebration': 'joyful',
    'milestone': 'proud',
    'trip': 'joyful',
    'everyday': 'peaceful',
    'moment': 'reflective',
    'wisdom': 'grateful',
    'memorial': 'solemn',
    'loss': 'melancholy'
  }

  return {
    mood: typeToMood[memoryType || 'moment'] || 'reflective',
    confidence: 0.5,
    reasoning: 'Fallback based on memory type'
  }
}

/**
 * Get mood color for styling
 */
export function getMoodColor(mood: MoodType | null): string {
  if (!mood || !MOOD_DEFINITIONS[mood]) return '#6B7280' // gray
  return MOOD_DEFINITIONS[mood].color
}

/**
 * Get mood styling classes
 */
export function getMoodStyles(mood: MoodType | null): { color: string; bgColor: string; label: string } {
  if (!mood || !MOOD_DEFINITIONS[mood]) {
    return { color: '#6B7280', bgColor: 'bg-gray-500/20', label: 'Untagged' }
  }
  const def = MOOD_DEFINITIONS[mood]
  return { color: def.color, bgColor: def.bgColor, label: def.label }
}
