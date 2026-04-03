/**
 * Essence Fingerprint - 48-Dimension Psychological Model
 * 
 * This module converts profile data into a unique 48-value vector
 * representing a person's psychological essence across 5 layers.
 */

// Layer definitions with dimension names
export const ESSENCE_LAYERS = {
  temperament: {
    name: 'Temperament',
    color: '#2D5A3D',
    dimensions: [
      'openness', 'conscientiousness', 'extraversion', 'agreeableness',
      'emotionalVolatility', 'riskTolerance', 'dominance', 'impulseRegulation'
    ]
  },
  motivation: {
    name: 'Motivation', 
    color: '#C4A235',
    dimensions: [
      'power', 'achievement', 'belonging', 'autonomy', 'security',
      'meaning', 'status', 'novelty', 'stability', 'impact'
    ]
  },
  cognitiveStyle: {
    name: 'Cognitive Style',
    color: '#B8562E',
    dimensions: [
      'analytical', 'intuitive', 'systems', 'narrative', 'futureOriented',
      'presentFocused', 'abstract', 'concrete', 'certaintySeeking', 'exploratory'
    ]
  },
  emotionalSignature: {
    name: 'Emotional Signature',
    color: '#8DACAB',
    dimensions: [
      'baselinePositivity', 'variability', 'recoverySpeed', 'gratitude', 'angerThreshold',
      'empathy', 'suppression', 'joy', 'stressTolerance', 'vulnerability'
    ]
  },
  socialPattern: {
    name: 'Social Pattern',
    color: '#4A3552',
    dimensions: [
      'validationSeeking', 'independence', 'conflictAvoidance', 'assertiveness', 'leadership',
      'audienceCalibration', 'humorWarmth', 'boundaries', 'attachmentSecurity', 'adaptability'
    ]
  }
} as const

export type EssenceLayer = keyof typeof ESSENCE_LAYERS
export type EssenceVector = number[] // 48 values, 0-1 scale

// MBTI personality mappings to temperament traits
const MBTI_MAPPINGS: Record<string, Partial<Record<string, number>>> = {
  'INTJ': { openness: 0.8, conscientiousness: 0.9, extraversion: 0.2, dominance: 0.7, riskTolerance: 0.6 },
  'INTP': { openness: 0.9, conscientiousness: 0.5, extraversion: 0.2, riskTolerance: 0.7, impulseRegulation: 0.4 },
  'ENTJ': { openness: 0.7, conscientiousness: 0.9, extraversion: 0.8, dominance: 0.9, riskTolerance: 0.7 },
  'ENTP': { openness: 0.9, conscientiousness: 0.4, extraversion: 0.7, riskTolerance: 0.9, impulseRegulation: 0.3 },
  'INFJ': { openness: 0.8, agreeableness: 0.8, extraversion: 0.3, emotionalVolatility: 0.6, dominance: 0.4 },
  'INFP': { openness: 0.9, agreeableness: 0.7, extraversion: 0.2, emotionalVolatility: 0.7, impulseRegulation: 0.5 },
  'ENFJ': { openness: 0.7, agreeableness: 0.9, extraversion: 0.8, dominance: 0.6, emotionalVolatility: 0.5 },
  'ENFP': { openness: 0.95, agreeableness: 0.7, extraversion: 0.8, riskTolerance: 0.8, impulseRegulation: 0.3 },
  'ISTJ': { openness: 0.3, conscientiousness: 0.95, extraversion: 0.2, dominance: 0.5, impulseRegulation: 0.9 },
  'ISFJ': { openness: 0.3, conscientiousness: 0.8, extraversion: 0.2, agreeableness: 0.9, emotionalVolatility: 0.4 },
  'ESTJ': { openness: 0.3, conscientiousness: 0.9, extraversion: 0.7, dominance: 0.8, riskTolerance: 0.5 },
  'ESFJ': { openness: 0.4, conscientiousness: 0.7, extraversion: 0.8, agreeableness: 0.9, dominance: 0.5 },
  'ISTP': { openness: 0.5, conscientiousness: 0.5, extraversion: 0.2, riskTolerance: 0.8, impulseRegulation: 0.6 },
  'ISFP': { openness: 0.7, agreeableness: 0.7, extraversion: 0.3, emotionalVolatility: 0.6, riskTolerance: 0.5 },
  'ESTP': { openness: 0.5, conscientiousness: 0.4, extraversion: 0.9, riskTolerance: 0.95, impulseRegulation: 0.2 },
  'ESFP': { openness: 0.6, agreeableness: 0.7, extraversion: 0.95, riskTolerance: 0.7, impulseRegulation: 0.3 },
}

// Trait keywords mapped to essence dimensions
const TRAIT_MAPPINGS: Record<string, Partial<Record<string, number>>> = {
  // Personality traits
  'creative': { openness: 0.15, abstract: 0.1, exploratory: 0.1 },
  'ambitious': { achievement: 0.15, power: 0.1, impact: 0.1 },
  'empathetic': { empathy: 0.2, agreeableness: 0.1, vulnerability: 0.1 },
  'analytical': { analytical: 0.2, systems: 0.1, certaintySeeking: 0.05 },
  'adventurous': { novelty: 0.15, riskTolerance: 0.15, exploratory: 0.1 },
  'introverted': { extraversion: -0.2, independence: 0.1 },
  'extroverted': { extraversion: 0.2, validationSeeking: 0.05 },
  'loyal': { attachmentSecurity: 0.15, stability: 0.1 },
  'optimistic': { baselinePositivity: 0.2, joy: 0.1 },
  'perfectionist': { conscientiousness: 0.15, certaintySeeking: 0.1 },
  'curious': { openness: 0.15, exploratory: 0.15, novelty: 0.1 },
  'patient': { impulseRegulation: 0.15, stressTolerance: 0.1 },
  'resilient': { recoverySpeed: 0.2, stressTolerance: 0.15 },
  'compassionate': { empathy: 0.15, agreeableness: 0.15 },
  'confident': { dominance: 0.1, assertiveness: 0.15 },
  'humble': { dominance: -0.1, validationSeeking: -0.1 },
  'spontaneous': { impulseRegulation: -0.1, novelty: 0.1, riskTolerance: 0.1 },
  'organized': { conscientiousness: 0.15, systems: 0.1 },
  'independent': { independence: 0.2, autonomy: 0.15 },
  'social': { extraversion: 0.15, belonging: 0.1 },
  'thoughtful': { analytical: 0.1, narrative: 0.1 },
  'warm': { humorWarmth: 0.15, agreeableness: 0.1 },
  'driven': { achievement: 0.2, impact: 0.1 },
  'calm': { emotionalVolatility: -0.15, stressTolerance: 0.1 },
  'passionate': { emotionalVolatility: 0.1, meaning: 0.15 },
}

// Interest/hobby mappings
const INTEREST_MAPPINGS: Record<string, Partial<Record<string, number>>> = {
  // Creative pursuits
  'art': { openness: 0.1, abstract: 0.1 },
  'music': { openness: 0.1, narrative: 0.05 },
  'writing': { narrative: 0.15, abstract: 0.1 },
  'photography': { openness: 0.1, presentFocused: 0.1 },
  
  // Analytical pursuits
  'technology': { analytical: 0.1, systems: 0.1 },
  'science': { analytical: 0.15, certaintySeeking: 0.1 },
  'programming': { systems: 0.15, analytical: 0.1 },
  'mathematics': { analytical: 0.15, abstract: 0.1 },
  
  // Social activities
  'volunteering': { empathy: 0.1, impact: 0.15 },
  'teaching': { empathy: 0.1, leadership: 0.1 },
  'networking': { extraversion: 0.1, status: 0.1 },
  
  // Adventure
  'travel': { novelty: 0.15, exploratory: 0.1, riskTolerance: 0.05 },
  'sports': { riskTolerance: 0.1, achievement: 0.1 },
  'outdoors': { exploratory: 0.1, presentFocused: 0.1 },
  'hiking': { exploratory: 0.1, stressTolerance: 0.1 },
  
  // Introspective
  'reading': { narrative: 0.1, openness: 0.1 },
  'meditation': { impulseRegulation: 0.15, presentFocused: 0.1 },
  'yoga': { presentFocused: 0.1, stressTolerance: 0.1 },
  'philosophy': { abstract: 0.15, meaning: 0.1 },
  
  // Social/entertainment
  'gaming': { novelty: 0.05, systems: 0.1 },
  'cooking': { presentFocused: 0.1, belonging: 0.05 },
  'gardening': { presentFocused: 0.1, stability: 0.1 },
}

// Occupation cognitive style hints
const OCCUPATION_MAPPINGS: Record<string, Partial<Record<string, number>>> = {
  'engineer': { analytical: 0.15, systems: 0.15 },
  'developer': { analytical: 0.1, systems: 0.15 },
  'programmer': { analytical: 0.1, systems: 0.15 },
  'designer': { abstract: 0.15, intuitive: 0.1 },
  'artist': { abstract: 0.2, intuitive: 0.15 },
  'doctor': { analytical: 0.1, empathy: 0.1 },
  'nurse': { empathy: 0.15, presentFocused: 0.1 },
  'teacher': { narrative: 0.1, empathy: 0.1 },
  'professor': { analytical: 0.1, abstract: 0.1 },
  'lawyer': { analytical: 0.1, assertiveness: 0.1 },
  'manager': { leadership: 0.15, dominance: 0.1 },
  'executive': { leadership: 0.2, power: 0.15 },
  'entrepreneur': { riskTolerance: 0.15, autonomy: 0.15, novelty: 0.1 },
  'scientist': { analytical: 0.2, exploratory: 0.1 },
  'researcher': { analytical: 0.15, certaintySeeking: 0.1 },
  'writer': { narrative: 0.2, abstract: 0.1 },
  'counselor': { empathy: 0.2, intuitive: 0.1 },
  'therapist': { empathy: 0.2, intuitive: 0.1 },
  'consultant': { analytical: 0.1, audienceCalibration: 0.1 },
  'sales': { extraversion: 0.1, audienceCalibration: 0.15 },
  'marketing': { intuitive: 0.1, audienceCalibration: 0.1 },
}

// Life goal mappings
const GOAL_MAPPINGS: Record<string, Partial<Record<string, number>>> = {
  'success': { achievement: 0.15, power: 0.1 },
  'wealth': { security: 0.1, status: 0.1 },
  'family': { belonging: 0.15, stability: 0.1 },
  'impact': { impact: 0.2, meaning: 0.1 },
  'happiness': { baselinePositivity: 0.1, joy: 0.15 },
  'freedom': { autonomy: 0.2, independence: 0.1 },
  'knowledge': { openness: 0.1, exploratory: 0.1 },
  'creativity': { openness: 0.15, abstract: 0.1 },
  'health': { stability: 0.1, presentFocused: 0.1 },
  'adventure': { novelty: 0.15, riskTolerance: 0.1 },
  'leadership': { leadership: 0.2, dominance: 0.1 },
  'peace': { stressTolerance: 0.1, stability: 0.1 },
  'love': { belonging: 0.15, empathy: 0.1 },
  'growth': { openness: 0.1, futureOriented: 0.1 },
}

/**
 * Simple seeded random number generator
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return (seed / 0x7fffffff)
  }
}

/**
 * Convert a string to a numeric seed
 */
function stringToSeed(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

/**
 * Extract MBTI type from personality string
 */
function extractMBTI(personalityType: string): string | null {
  if (!personalityType) return null
  const match = personalityType.match(/^([IE][NS][TF][JP])/i)
  return match ? match[1].toUpperCase() : null
}

/**
 * Match text against mapping keys (case-insensitive, partial match)
 */
function matchMappings(
  text: string,
  mappings: Record<string, Partial<Record<string, number>>>
): Partial<Record<string, number>> {
  const result: Record<string, number> = {}
  const lowerText = text.toLowerCase()
  
  for (const [key, values] of Object.entries(mappings)) {
    if (lowerText.includes(key.toLowerCase())) {
      for (const [dim, val] of Object.entries(values)) {
        if (val !== undefined) {
          result[dim] = (result[dim] || 0) + val
        }
      }
    }
  }
  
  return result
}

interface ProfileData {
  id?: string
  full_name?: string
  personality_type?: string
  personality_traits?: string[]
  interests?: string[]
  hobbies?: string[]
  occupation?: string
  life_goals?: string[]
  biography?: string
}

/**
 * Check if profile has meaningful data for essence generation
 */
export function hasProfileData(profile: ProfileData): boolean {
  return !!(
    profile.personality_type ||
    (profile.personality_traits && profile.personality_traits.length > 0) ||
    (profile.interests && profile.interests.length > 0) ||
    (profile.hobbies && profile.hobbies.length > 0) ||
    (profile.life_goals && profile.life_goals.length > 0) ||
    profile.occupation ||
    profile.biography
  )
}

/**
 * Generate essence vector from profile data
 * Returns neutral (all 0.5) vector if no profile data exists
 */
export function generateEssenceVector(profile: ProfileData): EssenceVector {
  // Initialize all 48 dimensions to 0.5 (neutral)
  const dimensions: Record<string, number> = {}
  const allDimensions = Object.values(ESSENCE_LAYERS).flatMap(l => l.dimensions)
  allDimensions.forEach(d => dimensions[d] = 0.5)
  
  // If no meaningful profile data, return completely neutral vector
  if (!hasProfileData(profile)) {
    return allDimensions.map(() => 0.5)
  }
  
  // Create seeded random for consistent uniqueness per user
  // IMPORTANT: Use profile.id as seed to ensure each user gets a unique fingerprint
  // If no profile.id, generate a random seed so empty profiles don't all look identical
  const seedSource = profile.id || profile.full_name || crypto.randomUUID()
  const seed = stringToSeed(seedSource)
  const random = seededRandom(seed)
  
  // Apply MBTI type if present
  const mbti = extractMBTI(profile.personality_type || '')
  if (mbti && MBTI_MAPPINGS[mbti]) {
    for (const [dim, val] of Object.entries(MBTI_MAPPINGS[mbti])) {
      if (val !== undefined) {
        dimensions[dim] = (dimensions[dim] || 0.5) + (val - 0.5) * 0.8
      }
    }
  }
  
  // Apply personality traits
  if (profile.personality_traits) {
    for (const trait of profile.personality_traits) {
      const matches = matchMappings(trait, TRAIT_MAPPINGS)
      for (const [dim, val] of Object.entries(matches)) {
        if (val !== undefined) dimensions[dim] = (dimensions[dim] || 0.5) + val
      }
    }
  }
  
  // Apply interests
  if (profile.interests) {
    for (const interest of profile.interests) {
      const matches = matchMappings(interest, INTEREST_MAPPINGS)
      for (const [dim, val] of Object.entries(matches)) {
        if (val !== undefined) dimensions[dim] = (dimensions[dim] || 0.5) + val
      }
    }
  }
  
  // Apply hobbies
  if (profile.hobbies) {
    for (const hobby of profile.hobbies) {
      const matches = matchMappings(hobby, INTEREST_MAPPINGS)
      for (const [dim, val] of Object.entries(matches)) {
        if (val !== undefined) dimensions[dim] = (dimensions[dim] || 0.5) + val
      }
    }
  }
  
  // Apply occupation hints
  if (profile.occupation) {
    const matches = matchMappings(profile.occupation, OCCUPATION_MAPPINGS)
    for (const [dim, val] of Object.entries(matches)) {
      if (val !== undefined) dimensions[dim] = (dimensions[dim] || 0.5) + val
    }
  }
  
  // Apply life goals
  if (profile.life_goals) {
    for (const goal of profile.life_goals) {
      const matches = matchMappings(goal, GOAL_MAPPINGS)
      for (const [dim, val] of Object.entries(matches)) {
        if (val !== undefined) dimensions[dim] = (dimensions[dim] || 0.5) + val
      }
    }
  }
  
  // Add controlled randomness for uniqueness (±0.1)
  for (const dim of allDimensions) {
    dimensions[dim] += (random() - 0.5) * 0.2
  }
  
  // Clamp all values to 0-1
  const vector: number[] = allDimensions.map(dim => 
    Math.max(0, Math.min(1, dimensions[dim]))
  )
  
  return vector
}

/**
 * Get layer values from full vector
 */
export function getLayerValues(vector: EssenceVector, layer: EssenceLayer): number[] {
  const layerInfo = ESSENCE_LAYERS[layer]
  const allDimensions = Object.values(ESSENCE_LAYERS).flatMap(l => l.dimensions)
  const startIndex = allDimensions.indexOf(layerInfo.dimensions[0])
  return vector.slice(startIndex, startIndex + layerInfo.dimensions.length)
}

/**
 * Get dominant trait for a layer
 */
export function getDominantTrait(vector: EssenceVector, layer: EssenceLayer): { name: string, value: number } {
  const layerInfo = ESSENCE_LAYERS[layer]
  const values = getLayerValues(vector, layer)
  const maxIndex = values.indexOf(Math.max(...values))
  return {
    name: layerInfo.dimensions[maxIndex],
    value: values[maxIndex]
  }
}

/**
 * Calculate dominant color based on which layers are most pronounced
 */
export function getDominantColors(vector: EssenceVector): string[] {
  const layerScores: { layer: EssenceLayer; score: number; color: string }[] = []
  
  for (const [key, info] of Object.entries(ESSENCE_LAYERS)) {
    const values = getLayerValues(vector, key as EssenceLayer)
    const avgDeviation = values.reduce((sum, v) => sum + Math.abs(v - 0.5), 0) / values.length
    layerScores.push({ layer: key as EssenceLayer, score: avgDeviation, color: info.color })
  }
  
  layerScores.sort((a, b) => b.score - a.score)
  return layerScores.slice(0, 3).map(l => l.color)
}
