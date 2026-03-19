import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeMood } from '@/lib/ai/moodAnalysis';

interface Exchange {
  question: string;
  response: string;
  audioUrl?: string;
}

// POST /api/conversation/save
// Save complete conversation to memories/knowledge entries
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { promptId, promptType, exchanges, summary, expectedXp, photoId,
      location_name, location_lat, location_lng, memory_date } = body;

    if (!exchanges || !Array.isArray(exchanges) || exchanges.length === 0) {
      return NextResponse.json({ error: 'No exchanges provided' }, { status: 400 });
    }

    // Calculate metrics
    const wordCount = summary.split(/\s+/).filter((w: string) => w.length > 0).length;
    const audioUrls = exchanges
      .map((e: Exchange) => e.audioUrl)
      .filter(Boolean) as string[];

    // Get first audio URL for memory audio field
    const primaryAudioUrl = audioUrls[0] || null;

    // Create title from first question and response preview
    const title = generateTitle(exchanges[0], promptType);

    // Determine memory type based on prompt type
    const memoryType = getMemoryType(promptType);

    // Build the full story content for description
    const storyContent = generateMemoryContent(exchanges, summary);

    // Generate AI insights from the conversation
    const aiInsights = await generateAIInsights(exchanges, promptType);

    // Generate smart, searchable tags from content
    const smartTags = await generateSmartTags(exchanges, summary, promptType);
    
    // Combine with base tags (deduped)
    const tags = [...new Set([...smartTags, memoryType])].filter(Boolean);

    // Map prompt type to a display-friendly category
    const aiCategory = getAICategoryFromPromptType(promptType);

    // For wisdom entries, use AI to determine the best category
    let wisdomCategory: string | null = null;
    if (memoryType === 'wisdom') {
      wisdomCategory = await detectWisdomCategory(exchanges, summary);
    }

    // Fetch photo metadata for photo_backstory prompts (inherit date/location from EXIF)
    let photoMeta: any = null;
    const resolvedPhotoId = photoId || null;
    if (promptType === 'photo_backstory') {
      // Try photoId from body first, then from the prompt record
      let lookupPhotoId = resolvedPhotoId;
      if (!lookupPhotoId && promptId) {
        const { data: promptData2 } = await supabase
          .from('engagement_prompts')
          .select('photo_id')
          .eq('id', promptId)
          .single();
        lookupPhotoId = promptData2?.photo_id || null;
      }
      if (lookupPhotoId) {
        const { data: mediaData } = await supabase
          .from('memory_media')
          .select('taken_at, location_name, location_lat, location_lng')
          .eq('id', lookupPhotoId)
          .single();
        photoMeta = mediaData;
        console.log('Photo metadata for conversation save:', photoMeta);
      }
    }

    // Resolve location/date: prefer explicit body params > photo metadata > defaults
    const resolvedDate = memory_date || photoMeta?.taken_at || new Date().toISOString().split('T')[0];
    const resolvedLocationName = location_name || photoMeta?.location_name || null;
    const resolvedLocationLat = location_lat || photoMeta?.location_lat || null;
    const resolvedLocationLng = location_lng || photoMeta?.location_lng || null;

    // Create memory record - use existing columns
    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        title,
        description: storyContent,        // Full Q&A content
        ai_summary: aiInsights,            // AI-generated insights
        memory_type: memoryType,
        ai_category: wisdomCategory || aiCategory, // Use wisdom category if detected, else general category
        audio_url: primaryAudioUrl,
        tags: wisdomCategory ? [...tags, wisdomCategory] : tags,
        memory_date: resolvedDate,
        location_name: resolvedLocationName,
        location_lat: resolvedLocationLat,
        location_lng: resolvedLocationLng,
      })
      .select()
      .single();

    if (memoryError) {
      console.error('Failed to create memory:', memoryError);
      return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 });
    }
    
    console.log('Created memory:', { id: memory.id, title, memory_type: memoryType, tags });

    // Auto-detect mood using AI (non-blocking)
    try {
      const moodResult = await analyzeMood(
        title,
        storyContent,
        memoryType,
        tags
      );
      
      if (moodResult?.mood) {
        await supabase
          .from('memories')
          .update({
            mood: moodResult.mood,
            mood_confidence: moodResult.confidence,
            mood_override: false
          })
          .eq('id', memory.id);
        
        console.log('Auto-detected mood:', moodResult.mood, 'confidence:', moodResult.confidence);
      }
    } catch (moodError) {
      console.error('Mood detection failed (non-critical):', moodError);
      // Non-critical - continue without mood
    }

    // Link photo if this is a photo_backstory prompt
    if (promptType === 'photo_backstory' && photoId) {
      await supabase
        .from('memory_media')
        .update({ memory_id: memory.id })
        .eq('id', photoId);
      console.log('Linked photo to memory:', photoId);
    }

    // Also check if the prompt has a photo_id we should link
    if (promptId) {
      const { data: promptData } = await supabase
        .from('engagement_prompts')
        .select('photo_id, photo_url')
        .eq('id', promptId)
        .single();
      
      if (promptData?.photo_id) {
        await supabase
          .from('memory_media')
          .update({ memory_id: memory.id })
          .eq('id', promptData.photo_id);
        console.log('Linked prompt photo to memory:', promptData.photo_id);
      }
    }

    // Mark original prompt as answered
    if (promptId) {
      await supabase
        .from('engagement_prompts')
        .update({
          status: 'answered',
          answered_at: new Date().toISOString(),
          response_type: 'voice',
          response_text: summary,
        })
        .eq('id', promptId);
    }

    // Create knowledge entry if applicable
    let knowledgeEntryId = null;
    const knowledgeCategory = getKnowledgeCategory(promptType);
    
    if (knowledgeCategory) {
      const { data: knowledgeEntry, error: knowledgeError } = await supabase
        .from('knowledge_entries')
        .insert({
          user_id: user.id,
          category: knowledgeCategory,
          prompt_text: exchanges[0]?.question || title,
          response_text: summary,
          audio_url: primaryAudioUrl,
          word_count: wordCount,
          memory_id: memory.id,
          is_featured: false,
        })
        .select()
        .single();

      if (!knowledgeError && knowledgeEntry) {
        knowledgeEntryId = knowledgeEntry.id;
      }
    }

    // Award XP for conversation (use expectedXp from prompt type if provided)
    const xpAmount = calculateXP(exchanges.length, wordCount, expectedXp || 15);
    
    try {
      await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: xpAmount,
        p_reason: 'conversation_complete',
        p_metadata: {
          memory_id: memory.id,
          prompt_type: promptType,
          exchange_count: exchanges.length,
        },
      });
    } catch (xpError) {
      console.error('Failed to award XP:', xpError);
      // Non-critical error, continue
    }

    // Update engagement stats
    try {
      await supabase.rpc('update_engagement_stats', {
        p_user_id: user.id,
        p_prompts_answered: 1,
        p_input_type: 'voice',
      });
    } catch (statsError) {
      console.error('Failed to update stats:', statsError);
      // Non-critical error
    }

    return NextResponse.json({
      success: true,
      memoryId: memory.id,
      knowledgeEntryId,
      xpAwarded: xpAmount,
      title,
      wordCount,
    });

  } catch (error) {
    console.error('Save conversation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateTitle(firstExchange: Exchange, promptType: string): string {
  // Use the question (prompt) as the title, not the response
  const question = firstExchange.question;
  
  // Remove common question prefixes for cleaner titles
  let title = question
    .replace(/^(tell me about|what is|what are|what was|what were|how did|how do|describe|share)\s+/i, '')
    .replace(/\?$/, '');
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Truncate if too long
  if (title.length > 60) {
    title = title.slice(0, 60) + '...';
  }
  
  return title;
}

function getMemoryType(promptType: string): string {
  const typeMap: Record<string, string> = {
    photo_backstory: 'story',
    memory_prompt: 'memory',
    knowledge: 'wisdom',
    favorites_firsts: 'favorite',
    recipes_wisdom: 'recipe',
    connect_dots: 'connection',
    highlight: 'highlight',
    postscript: 'postscript',
  };
  return typeMap[promptType] || 'memory';
}

function getKnowledgeCategory(promptType: string): string | null {
  const categoryMap: Record<string, string> = {
    knowledge: 'life_lessons',
    recipes_wisdom: 'practical',
    memory_prompt: 'life_lessons',
    photo_backstory: 'life_lessons',
  };
  return categoryMap[promptType] || null;
}

function getAICategoryFromPromptType(promptType: string): string {
  // Map prompt types to user-friendly category names for display
  const categoryMap: Record<string, string> = {
    photo_backstory: 'Photo Stories',
    memory_prompt: 'Personal Memories',
    knowledge: 'Life Wisdom',
    favorites_firsts: 'Favorites & Firsts',
    recipes_wisdom: 'Recipes & Tips',
    connect_dots: 'Connections',
    highlight: 'Highlights',
    postscript: 'Future Messages',
    quick_question: 'Quick Answers',
    missing_info: 'Contact Info',
  };
  return categoryMap[promptType] || 'Memories';
}

function generateMemoryContent(exchanges: Exchange[], summary: string): string {
  const qaSection = exchanges.map((e, i) => {
    let qa = `**Q${i + 1}:** ${e.question}\n\n**A${i + 1}:** ${e.response}`;
    // Include audio URL if present (for later playback)
    if (e.audioUrl) {
      qa += `\n\n🎙️ [Audio](${e.audioUrl})`;
    }
    return qa;
  }).join('\n\n---\n\n');

  return `## Summary\n\n${summary}\n\n## Conversation\n\n${qaSection}`;
}

function calculateXP(exchangeCount: number, wordCount: number, baseXp: number = 15): number {
  // Return exactly the expected XP from prompt type config
  // This ensures the XP matches what's shown on the tile
  return baseXp;
}

async function generateAIInsights(exchanges: Exchange[], promptType: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  // Build conversation context
  const conversationText = exchanges.map((e, i) => 
    `Q: ${e.question}\nA: ${e.response}`
  ).join('\n\n');

  const prompt = `Analyze this conversation and extract 2-3 brief insights.

CONVERSATION:
${conversationText}

Output format (keep each under 15 words):
- **Theme**: [Main topic in 5-10 words]
- **Feeling**: [Core emotion/value in 5 words]  
- **Takeaway**: [Key lesson in 10 words]

Be specific to what they said. No generic advice. Output ONLY the bullets.`;

  // Try Gemini
  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 300,
            }
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const insights = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (insights) {
          console.log('AI insights generated:', insights.slice(0, 100));
          return insights;
        }
      }
    } catch (e) {
      console.error('Gemini insights error:', e);
    }
  }

  // Fallback: Simple summary from first response
  const firstResponse = exchanges[0]?.response || '';
  const preview = firstResponse.slice(0, 200) + (firstResponse.length > 200 ? '...' : '');
  return `- **Key Theme**: ${preview}`;
}

// Wisdom categories for auto-detection
const WISDOM_CATEGORIES = [
  'life_lessons',    // Hard-earned wisdom and insights
  'relationships',   // Love, friendship, and connection
  'career',          // Professional wisdom and advice
  'parenting',       // Raising children, family values
  'health',          // Physical and mental wellbeing
  'spirituality',    // Faith, purpose, meaning
  'creativity',      // Art, expression, imagination
  'family',          // Family traditions and bonds
  'values',          // Core beliefs and principles
  'recipes',         // Recipes and culinary wisdom
  'advice',          // Guidance for others
  'other',           // Doesn't fit other categories
];

async function detectWisdomCategory(exchanges: Exchange[], summary: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  // Build conversation context
  const conversationText = exchanges.map((e) => 
    `Q: ${e.question}\nA: ${e.response}`
  ).join('\n\n');

  const prompt = `Categorize this wisdom/advice conversation into exactly ONE category.

CATEGORIES:
- life_lessons: Hard-earned wisdom, life insights, mistakes learned from
- relationships: Love, friendship, dating, marriage, connection with others
- career: Work, professional advice, business, success, money
- parenting: Raising children, being a parent, family values
- health: Physical wellness, mental health, exercise, diet, aging
- spirituality: Faith, religion, purpose, meaning of life, meditation
- creativity: Art, music, writing, expression, hobbies, imagination
- family: Family traditions, relatives, ancestry, heritage
- values: Core beliefs, ethics, principles, what matters most
- recipes: Cooking, recipes, food traditions, culinary tips
- advice: General guidance, recommendations, tips for others
- other: Doesn't clearly fit other categories

CONVERSATION:
${conversationText}

SUMMARY:
${summary}

Reply with ONLY the category name (e.g., "life_lessons"). No explanation.`;

  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 50,
            }
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const category = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
        
        // Validate it's a valid category
        if (category && WISDOM_CATEGORIES.includes(category)) {
          console.log('AI detected wisdom category:', category);
          return category;
        }
      }
    } catch (e) {
      console.error('Gemini category detection error:', e);
    }
  }

  // Fallback: Use keyword-based detection
  const text = (conversationText + ' ' + summary).toLowerCase();
  
  if (/\b(child|kids?|parent|son|daughter|raise|raising)\b/.test(text)) return 'parenting';
  if (/\b(love|marriage|dating|relationship|spouse|partner)\b/.test(text)) return 'relationships';
  if (/\b(job|career|work|business|money|success|professional)\b/.test(text)) return 'career';
  if (/\b(health|exercise|diet|wellness|mental|stress|body)\b/.test(text)) return 'health';
  if (/\b(god|faith|pray|spiritual|church|believe|purpose|meaning)\b/.test(text)) return 'spirituality';
  if (/\b(recipe|cook|bake|food|kitchen|ingredient)\b/.test(text)) return 'recipes';
  if (/\b(art|music|creative|write|paint|design|imagine)\b/.test(text)) return 'creativity';
  if (/\b(family|tradition|heritage|ancestor|generation)\b/.test(text)) return 'family';
  if (/\b(value|believe|principle|ethics|moral|important)\b/.test(text)) return 'values';
  
  return 'life_lessons'; // Default fallback
}

/**
 * Generate 4-5 useful, searchable tags from conversation content
 * Tags should help users find this memory later
 */
async function generateSmartTags(
  exchanges: Exchange[], 
  summary: string, 
  promptType: string
): Promise<string[]> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  // Build conversation context
  const conversationText = exchanges.map((e) => 
    `Q: ${e.question}\nA: ${e.response}`
  ).join('\n\n');

  const prompt = `Generate 4-5 searchable tags for this memory/story. Tags should help someone find it later.

GOOD TAGS:
- People mentioned by name or relationship (e.g., "grandma", "dad", "uncle-joe", "childhood-friend")
- Specific places (e.g., "chicago", "grandmas-house", "summer-cabin")
- Time periods or life stages (e.g., "1980s", "childhood", "college-years", "first-job")
- Emotions or themes (e.g., "funny", "bittersweet", "life-lesson", "family-tradition")
- Activities or topics (e.g., "cooking", "road-trip", "holiday", "career-advice")

BAD TAGS (avoid):
- Generic words like "memory", "story", "conversation"
- Single letters or numbers
- Overly long phrases

CONVERSATION:
${conversationText}

SUMMARY:
${summary}

PROMPT TYPE: ${promptType}

Reply with ONLY a comma-separated list of 4-5 lowercase tags with hyphens instead of spaces.
Example: grandma, sunday-dinners, 1970s, family-recipes, love`;

  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 100,
            }
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const tagString = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (tagString) {
          // Parse comma-separated tags, clean them up
          const tags = tagString
            .split(',')
            .map((t: string) => t.trim().toLowerCase().replace(/\s+/g, '-'))
            .filter((t: string) => t.length >= 2 && t.length <= 30)
            .slice(0, 5);
          
          if (tags.length >= 3) {
            console.log('AI generated tags:', tags);
            return tags;
          }
        }
      }
    } catch (e) {
      console.error('Gemini tag generation error:', e);
    }
  }

  // Fallback: Extract tags from content using heuristics
  const text = (conversationText + ' ' + summary).toLowerCase();
  const fallbackTags: string[] = [];
  
  // Extract potential people (relationship words)
  const peopleMatches = text.match(/\b(mom|dad|mother|father|grandma|grandmother|grandpa|grandfather|brother|sister|aunt|uncle|cousin|friend|husband|wife|son|daughter)\b/g);
  if (peopleMatches) {
    fallbackTags.push(...[...new Set(peopleMatches)].slice(0, 2));
  }
  
  // Extract potential places
  const placeMatches = text.match(/\b(home|house|school|church|park|beach|mountain|city|town|neighborhood)\b/g);
  if (placeMatches) {
    fallbackTags.push(...[...new Set(placeMatches)].slice(0, 1));
  }
  
  // Extract time references
  const timeMatches = text.match(/\b(childhood|teenager|college|young|1\d{3}0s|19[5-9]\d|20[0-2]\d)\b/g);
  if (timeMatches) {
    fallbackTags.push(...[...new Set(timeMatches)].slice(0, 1));
  }
  
  // Add prompt type as tag if not too generic
  if (!['memory_prompt', 'knowledge'].includes(promptType)) {
    fallbackTags.push(promptType.replace(/_/g, '-'));
  }
  
  // Ensure minimum tags
  if (fallbackTags.length < 3) {
    fallbackTags.push('personal-story');
  }
  
  return [...new Set(fallbackTags)].slice(0, 5);
}
