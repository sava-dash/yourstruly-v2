import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { getNextAngle, validateAngle, extractAntiRepeatGroup, extractSnowballHooks } from '@/lib/engagement/angle-rotation';
import { normalizePromptType, normalizePromptCategory, normalizePromptText, scrubPromptText, mapCategoryToLifeChapter } from '@/lib/engagement/seed-types';

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

// Types that historically doubled as categories. When the AI emits one of
// these as `type`, we collapse the type via TYPE_ALIASES and promote the
// label up to the `category` slot so the chapter taxonomy stays intact.
const TYPE_AS_CATEGORY = new Set(['recipes_wisdom', 'favorites_firsts']);

// Tier instructions lean heavily on a springboard-not-subject principle:
// past details earn the prompt, but the question stays open. Earlier copy
// pushed the model toward reciting specifics ("when you were in Vegas with
// Uncle Tim, how did you feel..."), which reads as surveillance not
// curiosity. Every AI-visible string here is ASCII-only so Haiku does not
// mirror em-dashes or curly quotes back into user-facing prompts.
const TIER_INSTRUCTIONS: Record<number, string> = {
  0: 'Ask universally meaningful open questions. Nothing user-specific. One clean question, no setup.',
  1: 'A light reference to an interest or place is fine as a lead-in. Keep the question itself broad and open.',
  2: 'You may name a contact, but do NOT package their relationship or a past story into the question. Name, then ask forward.',
  3: 'A gentle acknowledgement of a past share is okay. Something like "you mentioned Vermont" or "you said you love tennis". The question that follows must ask something new and open, never recite or re-interrogate the moment they already described.',
  4: 'Aim at patterns and themes, not specifics. Ask the big quiet questions that make someone pause. Do not summarize their life back to them.',
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
        .map((p: any) => normalizePromptText(p.prompt_text))
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
- Generate ${requestedCount} prompts.
- ${chapterInstruction}
- ONE question per prompt. 1 to 2 sentences total. Short beats long.
- Open-ended. The user should feel room to take it anywhere, not hemmed in.
- Use their details as a SPRINGBOARD, not the subject. A light "you mentioned Vermont" lead-in is fine. Then ask something new and open about that area, not about the specific moment they already shared.
- NEVER recite, restate, or re-interrogate a story they have told. Skip "after Uncle Tim told you that advice in Vegas, how did you feel" style prompts.
- One anchor max. Do not stack person + place + event into a single question.
- No multi-part questions. No "and then" or "or".
- No labels like "describe" or "explain". Ask, do not instruct.
- Warm, curious, never clinical. Never mention AI, prompts, or the app itself.
- Rotate angles: people, place, event, feeling, object, turning_point.
- Each prompt's type must be one of: ${VALID_TYPES.join(', ')}.

PUNCTUATION (strict, ASCII only):
- ZERO em-dashes. Do not emit the "—" character (U+2014) anywhere, ever.
- No "--" double-hyphen either. Use a period, comma, or parentheses.
- Straight quotes only. No curly quotes. Use " and ' (U+0022, U+0027), never " " ' '.
- No ellipsis character. Write "..." as three ASCII dots if you need it.

HUMAN VOICE (no AI slop):
- Forbidden words: vibrant, crucial, pivotal, delve, intricate, showcase, underscore, testament, enduring, tapestry, foster, resonate, nestled, breathtaking, stunning, profound, meaningful (as filler), deeply rooted, multifaceted.
- Avoid "serves as", "stands as". Use "is" or "was".
- Avoid rule-of-three lists ("warm, curious, and alive"). Pick one word or two.
- No "not just X, it's Y" parallelisms. No "at its core" / "what really matters" / "the real question is".
- No signposting ("let's dive in", "here's what to think about"). Just ask.
- No "-ing" tails that pretend to add depth ("...inviting reflection", "...highlighting the moment"). End on the question.
- Plain everyday words. If a smart friend would not say it in a coffee-shop conversation, do not write it.

GOOD vs BAD (internalize this pattern):
- BAD:  "After Uncle Tim told you that advice one night in Vegas, how did you react and feel?"
  GOOD: "Have you been back to Vegas since that trip with Uncle Tim?"
- BAD:  "When your tennis match went into the third set after you sprained your ankle, what was going through your head?"
  GOOD: "What is it about tennis you keep coming back to?"
- BAD:  "You said your grandma made pot roast every Sunday and the whole family gathered around the table. What did that mean to you?"
  GOOD: "You mentioned Sundays at grandma's. What else do those afternoons bring back?"
- BAD:  "Describe the exact feeling when you graduated from UVM in 2004."
  GOOD: "What stuck with you most from your time at UVM?"
- BAD:  "You mentioned Vermont and how the mountains in October took your breath away. Tell me about that view."
  GOOD: "You mentioned Vermont. What places did you like exploring up there?"

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
        // Scrub em-dashes, curly quotes, ellipsis, and double-hyphens
        // before anything else so dedup / length checks see the final text.
        const promptText = scrubPromptText(p.prompt_text).slice(0, 500);
        const rawCategory = requestedChapter
          ? requestedChapter
          : VALID_CATEGORIES.includes(p.category) ? p.category : 'wisdom_legacy';
        const rawType = VALID_TYPES.includes(p.type) ? p.type : 'memory_prompt';

        // Collapse deprecated/duplicate types & alias chapters before insert
        // so the queue stays on a single canonical taxonomy.
        const type = normalizePromptType(rawType);
        // If the original type carried category meaning (e.g. recipes_wisdom,
        // favorites_firsts), promote it to category when the AI didn't pick one.
        const promotedCategory = TYPE_AS_CATEGORY.has(rawType) ? rawType : rawCategory;
        const category = normalizePromptCategory(promotedCategory);

        const angle = validateAngle(p.angle, recentAngles);
        const antiRepeatGroup = extractAntiRepeatGroup(promptText);
        const snowballHooks = extractSnowballHooks(promptText);

        return {
          user_id: user.id,
          type,
          category,
          life_chapter: mapCategoryToLifeChapter(category, type),
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
      // Hard length cap. System prompt asks for 1 to 2 sentences; anything
      // over 260 chars is a multi-sentence recitation and gets dropped so
      // the queue doesn't drift back to the old long/story-reciting style.
      .filter((p) => p.prompt_text.length <= 260)
      .filter((p) => !existingPromptTexts.has(normalizePromptText(p.prompt_text)))
      .filter((p, i, arr) =>
        arr.findIndex((x) => normalizePromptText(x.prompt_text) === normalizePromptText(p.prompt_text)) === i
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
