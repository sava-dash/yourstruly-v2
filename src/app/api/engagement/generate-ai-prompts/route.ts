import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { getNextAngle, validateAngle, extractAntiRepeatGroup, extractSnowballHooks } from '@/lib/engagement/angle-rotation';

/**
 * POST /api/engagement/generate-ai-prompts
 *
 * Journalist-friend AI generation. Loads rich context about the user
 * (memories, answered prompts with responses, contacts, themes, angle
 * history) and generates tier-appropriate prompts that make the user
 * WANT to tell the story.
 *
 * Body: { count?: number, chapter?: string }
 * Response: { generated: number }
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

// Every category the CategoriesPanel knows about.
const VALID_CATEGORIES = [
  'childhood', 'teenage', 'high_school', 'school', 'college',
  'jobs_career', 'career', 'work',
  'relationships', 'family', 'marriage',
  'travel', 'adventure',
  'spirituality', 'religion',
  'wisdom_legacy', 'life_moments', 'life_lessons',
  'milestones', 'firsts', 'favorites_firsts',
  'hobbies', 'interests', 'skills', 'languages', 'personality',
  'recipes', 'recipes_wisdom', 'music', 'movies', 'books', 'favorites',
  'daily_checkin', 'memory', 'photo', 'wisdom', 'general',
];

const VALID_TYPES = [
  'memory_prompt', 'knowledge', 'connect_dots', 'highlight',
  'recipes_wisdom', 'favorites_firsts', 'postscript',
];

const TIER_INSTRUCTIONS: Record<number, string> = {
  0: 'Keep prompts broader. Use what you know about them but do not force specificity. Focus on universally meaningful moments.',
  1: 'Start weaving in their interests, places, and people. Still accessible but more personal.',
  2: 'Reference their contacts by name. Ask about specific relationships and shared moments. Build on what they have already told you.',
  3: 'Go deeper. Reference specific memories they have shared. Ask about the parts of the story they might have held back. "You mentioned X..." is powerful here.',
  4: 'Synthesize. Look across everything they have shared and find the patterns they might not see. Ask the questions that make someone pause and think. Beautiful, warm, existential.',
};

interface GeneratedPrompt {
  prompt_text: string;
  category: string;
  type: string;
  angle?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedCount = Math.min(Math.max(Number(body?.count) || 15, 1), 40);
    const requestedChapter: string | null =
      body?.chapter && typeof body.chapter === 'string' && VALID_CATEGORIES.includes(body.chapter)
        ? body.chapter
        : null;

    // -- Load rich context --------------------------------------------------
    const [
      profileRes,
      contactsRes,
      memoriesRes,
      answeredPromptsRes,
      recentAnglesRes,
      existingPromptsRes,
      photosWithExifRes,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, hometown, birth_date, personality_type, personality_traits, interests, hobbies, skills, life_goals, religions, favorite_quote, personal_motto, why_here, prompt_tier, prompt_themes')
        .eq('id', user.id)
        .single(),
      supabase
        .from('contacts')
        .select('full_name, relationship_type')
        .eq('user_id', user.id)
        .limit(20),
      supabase
        .from('memories')
        .select('title, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200),
      // Last 10 answered prompts with their response text
      supabase
        .from('engagement_prompts')
        .select('prompt_text, response_text, angle')
        .eq('user_id', user.id)
        .eq('status', 'answered')
        .order('answered_at', { ascending: false })
        .limit(10),
      // Last 10 angles for rotation
      supabase
        .from('engagement_prompts')
        .select('angle')
        .eq('user_id', user.id)
        .not('angle', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10),
      // Existing prompt texts for dedup
      supabase
        .from('engagement_prompts')
        .select('prompt_text')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      // Photos with EXIF metadata (date/location) for context-aware photo prompts
      supabase
        .from('memory_media')
        .select('id, taken_at, exif_lat, exif_lng, location_name')
        .eq('user_id', user.id)
        .not('taken_at', 'is', null)
        .order('taken_at', { ascending: false })
        .limit(20),
    ]);

    const profile = (profileRes.data as any) || {};
    const contacts = (contactsRes.data as any[]) || [];
    const memories = (memoriesRes.data as any[]) || [];
    const answeredPrompts = (answeredPromptsRes.data as any[]) || [];
    const photosWithExif = (photosWithExifRes.data as any[]) || [];
    const recentAngles = ((recentAnglesRes.data as any[]) || [])
      .map((p: any) => p.angle)
      .filter(Boolean);
    const existingPromptTexts = new Set(
      ((existingPromptsRes.data as any[]) || [])
        .map((p: any) => (p.prompt_text || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const tier: number = profile.prompt_tier ?? 0;
    const tierInstructions = TIER_INSTRUCTIONS[tier] || TIER_INSTRUCTIONS[0];

    // -- Build user context string ------------------------------------------
    const age = profile.birth_date
      ? String(Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / 31557600000))
      : 'unknown';

    const contactsList = contacts
      .map((c: any) => `${c.full_name}${c.relationship_type ? ` (${c.relationship_type.replace(/_/g, ' ')})` : ''}`)
      .join(', ');

    // Memory summaries: title + first 100 chars of description
    const memorySummaries = memories
      .slice(0, 10)
      .map((m: any) => {
        const title = (m.title || '').slice(0, 60);
        const desc = (m.description || '').slice(0, 100);
        return title ? `- ${title}${desc ? ': ' + desc : ''}` : null;
      })
      .filter(Boolean)
      .join('\n');

    // Recent answered prompts with response snippets
    const answeredSummaries = answeredPrompts
      .map((p: any) => {
        const q = (p.prompt_text || '').slice(0, 80);
        const a = (p.response_text || '').slice(0, 150);
        return `Q: ${q}\nA: ${a}`;
      })
      .join('\n\n');

    const recentAnglesList = recentAngles.join(', ');
    const nextAngleSuggestion = getNextAngle(recentAngles);
    const themes = Array.isArray(profile.prompt_themes)
      ? profile.prompt_themes.join(', ')
      : '';
    const interestsList = Array.isArray(profile.interests)
      ? profile.interests.join(', ')
      : '';

    // -- Build journalist-friend system prompt ------------------------------
    const chapterInstruction = requestedChapter
      ? `ALL ${requestedCount} prompts MUST be about the "${requestedChapter.replace(/_/g, ' ')}" chapter of life. Set category to "${requestedChapter}" for every prompt.`
      : `Spread prompts across different life chapters. Each prompt's category must be one of: ${VALID_CATEGORIES.join(', ')}.`;

    const systemPrompt = `You are a world-class journalist friend for Yours Truly. Your goal is to make the user WANT to tell the story. Not collect information. Make them feel heard and draw out the deeper version.

CURRENT TIER: ${tier}
${tierInstructions}

USER: ${profile.full_name || 'Unknown'}, age ${age}, from ${profile.hometown || 'unknown'}
INTERESTS: ${interestsList || 'not shared yet'}
WHY THEY JOINED: ${profile.why_here || 'not shared yet'}
CONTACTS: ${contactsList || 'none added yet'}

MEMORIES SHARED (${memories.length} total):
${memorySummaries || 'None yet.'}

PHOTOS WITH METADATA (${photosWithExif.length} photos have date/location):
${photosWithExif.length > 0 ? photosWithExif.slice(0, 10).map((p: any) => {
  const date = p.taken_at ? new Date(p.taken_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null;
  const loc = p.location_name || null;
  if (date && loc) return `- Photo from ${loc}, ${date}`;
  if (date) return `- Photo from ${date}`;
  if (loc) return `- Photo from ${loc}`;
  return null;
}).filter(Boolean).join('\n') : 'No geotagged photos yet.'}

IMPORTANT: When generating prompts about photos, use the date and location if available. Do NOT ask "where was this taken" if we already know the location. Instead, reference it: "This photo from {location} in {date}..." and ask about the story, feelings, and people.

${answeredSummaries ? `RECENT ANSWERS:\n${answeredSummaries}` : ''}

THEMES EMERGING: ${themes || 'none identified yet'}

RECENT PROMPT ANGLES: ${recentAnglesList || 'none yet'}
ROTATE TO: ${nextAngleSuggestion}

RULES:
- Generate ${requestedCount} prompts
- ${chapterInstruction}
- 2-4 sentences each with 2-3 "maybe" thought-seeds
- Suggest specific angles (people, feelings, sensory details, context) so the user cannot give a one-word answer
- End with open invitation ("What comes to mind?" / "Tell me about that.")
- ZERO em-dashes. No -- ever.
- No multi-part numbered questions
- No labels like "describe" or "explain"
- Rotate angles: people, place, event, feeling, object, turning_point
- Warm, curious, never clinical
- Never mention AI, prompts, or the app itself
- Avoid topics obviously covered by the memories listed
- Each prompt's type must be one of: ${VALID_TYPES.join(', ')}

TIER-SPECIFIC:
- Tier 0-1: broader prompts, use onboarding data lightly
- Tier 2: reference contacts by name, ask about specific relationships
- Tier 3: reference past answers. "You mentioned X. There is usually more to that story."
- Tier 4: synthesize across memories, find patterns, ask beautiful hard questions

Also return a "themes" array of 5-10 one-word themes you see emerging from their answers and memories (e.g., "family", "loss", "adventure", "faith", "hometown").

OUTPUT: JSON object: {"prompts": [{"prompt_text": "...", "category": "...", "type": "memory_prompt", "angle": "people|place|event|feeling|object|turning_point"}], "themes": ["word1", "word2", ...]}`;

    // -- Call Claude --------------------------------------------------------
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      temperature: 0.95,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Generate ${requestedCount} prompts for this user.` }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const raw = textBlock?.type === 'text' ? textBlock.text : '';

    // Parse response
    let parsed: { prompts?: GeneratedPrompt[]; themes?: string[] } = {};
    try {
      const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const match = raw.match(/\{[\s\S]*"prompts"[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* give up */ }
      }
    }

    const prompts = Array.isArray(parsed?.prompts) ? parsed.prompts : [];

    // -- Post-generation processing -----------------------------------------
    const toInsert = prompts
      .filter((p) => p && typeof p.prompt_text === 'string')
      .map((p) => {
        const promptText = p.prompt_text.trim().slice(0, 500);
        const category = requestedChapter
          ? requestedChapter
          : VALID_CATEGORIES.includes(p.category) ? p.category : 'wisdom_legacy';
        const type = VALID_TYPES.includes(p.type) ? p.type : 'memory_prompt';
        const angle = validateAngle(p.angle, recentAngles);
        const antiRepeatGroup = extractAntiRepeatGroup(promptText);
        const snowballHooks = extractSnowballHooks(promptText);

        return {
          user_id: user.id,
          type,
          category,
          prompt_text: promptText,
          tier,
          angle,
          anti_repeat_group: antiRepeatGroup,
          snowball_hooks: snowballHooks,
          priority: 70,
          source: 'ai_generated' as const,
          status: 'pending' as const,
        };
      })
      .filter((p) => p.prompt_text.length > 8)
      .filter((p) => !existingPromptTexts.has(p.prompt_text.toLowerCase()))
      .filter((p, i, arr) =>
        arr.findIndex((x) => x.prompt_text.toLowerCase() === p.prompt_text.toLowerCase()) === i
      );

    if (toInsert.length === 0) {
      return NextResponse.json({ generated: 0, reason: 'no_valid_prompts_parsed' });
    }

    const { error: insErr } = await supabase.from('engagement_prompts').insert(toInsert);
    if (insErr) {
      console.error('[generate-ai-prompts] insert failed', insErr);
      return NextResponse.json(
        { generated: 0, error: insErr.message },
        { status: 500 }
      );
    }

    // -- Update prompt_themes on profile ------------------------------------
    const extractedThemes = Array.isArray(parsed?.themes)
      ? parsed.themes.filter((t): t is string => typeof t === 'string' && t.length > 1).slice(0, 10)
      : [];

    if (extractedThemes.length > 0) {
      await supabase
        .from('profiles')
        .update({ prompt_themes: extractedThemes })
        .eq('id', user.id);
    }

    return NextResponse.json({ generated: toInsert.length });
  } catch (err: any) {
    console.error('[generate-ai-prompts] error', err);
    return NextResponse.json(
      { generated: 0, error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
