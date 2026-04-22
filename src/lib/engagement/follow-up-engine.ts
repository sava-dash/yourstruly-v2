import type { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { validateAngle, type PromptAngle } from './angle-rotation';
import { scrubPromptText } from './seed-types';

/**
 * Deep follow-up engine.
 *
 * After a user answers a prompt with a substantial response (>200 chars),
 * this generates a targeted follow-up that references a specific detail
 * from their answer, creating the "journalist who was listening" effect.
 *
 * The follow-up is inserted as a high-priority prompt (95) so it appears
 * as the very next thing the user sees.
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const FOLLOW_UP_SYSTEM_PROMPT = `You are a warm, curious journalist friend. The user just answered a memory prompt and you were listening carefully.

Generate ONE follow-up question that proves you were listening without reciting their story back.

STYLE:
- ONE question. 1 to 2 sentences total. Short beats long.
- Open-ended. Leave them room to take it anywhere.
- Springboard, do not recite. Acknowledge ONE light detail (a name, a place, a thing they love) as a lead-in. Then ask something NEW and open about a neighboring area. Never re-interrogate the exact moment they just described.
- No "and then", no multi-part questions.
- Warm, curious. Never clinical, never instructional. Skip "describe" and "explain".

PUNCTUATION (strict, ASCII only):
- ZERO em-dashes. Do not emit "—" (U+2014) anywhere. No "--" double-hyphen either. Use a period, comma, or parentheses.
- Straight quotes only (" and '). No curly quotes.
- No ellipsis character. Write "..." as three ASCII dots if you must.

HUMAN VOICE (no AI slop):
- Forbidden words: vibrant, crucial, pivotal, delve, intricate, showcase, underscore, testament, enduring, tapestry, foster, resonate, nestled, breathtaking, stunning, profound, meaningful (as filler), deeply rooted, multifaceted.
- Avoid "serves as" / "stands as". Use "is" or "was".
- No rule-of-three lists. No "not just X, it's Y". No "at its core" / "what really matters" / "the real question is".
- No signposting. No "-ing" tails that pretend to add depth. End on the question.
- Plain everyday words. If a smart friend would not say it in conversation, do not write it.

GOOD vs BAD:
- BAD:  "After Uncle Tim told you that advice in Vegas, how did you react and feel?"
  GOOD: "Have you been back to Vegas since that trip with Uncle Tim?"
- BAD:  "When you sprained your ankle during that tennis match and still finished the set, what was going through your head?"
  GOOD: "What is it about tennis you keep coming back to?"
- BAD:  "You said your grandma made pot roast every Sunday and the whole family gathered. What did that tradition mean to you?"
  GOOD: "You mentioned Sundays at grandma's. What else do those afternoons bring back?"
- BAD:  "You told me about how Vermont in October took your breath away. Tell me more about that view."
  GOOD: "You mentioned Vermont. What places did you love exploring up there?"

If the response is too short, too generic, or there is nothing natural to spring off of, return null. Do not force a follow-up just to have one.

Return JSON only: {"follow_up": "question text", "angle": "people|place|event|feeling|object|turning_point"} or {"follow_up": null}`;

interface FollowUpResult {
  follow_up: string | null;
  angle?: string;
}

/**
 * Generate a follow-up question based on the user's answer to a prompt.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - The user's ID
 * @param answeredPromptId - The prompt that was just answered
 * @param responseText - The user's response text
 * @returns The follow-up question text, or null if none generated
 */
export async function generateFollowUp(
  supabase: SupabaseClient,
  userId: string,
  answeredPromptId: string,
  responseText: string
): Promise<string | null> {
  // Only generate follow-up for substantial responses
  if (!responseText || responseText.length <= 200) return null;

  try {
    // Fetch the original prompt text and user's tier
    const [promptRes, profileRes] = await Promise.all([
      supabase
        .from('engagement_prompts')
        .select('prompt_text, category')
        .eq('id', answeredPromptId)
        .single(),
      supabase
        .from('profiles')
        .select('prompt_tier')
        .eq('id', userId)
        .single(),
    ]);

    const promptText = promptRes.data?.prompt_text || '';
    const category = promptRes.data?.category || 'general';
    const tier = profileRes.data?.prompt_tier ?? 0;

    if (!promptText) return null;

    const userMessage = [
      `The original question was: "${promptText}"`,
      '',
      `Their response:`,
      `"${responseText.slice(0, 800)}"`,
    ].join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      temperature: 0.8,
      system: FOLLOW_UP_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const raw = textBlock?.type === 'text' ? textBlock.text : '';

    let parsed: FollowUpResult = { follow_up: null };
    try {
      const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const match = raw.match(/\{[\s\S]*"follow_up"[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* give up */ }
      }
    }

    if (!parsed.follow_up || parsed.follow_up.length < 20) return null;

    // Strip any em-dashes, curly quotes, ellipsis, and "--" that slipped
    // through the system-prompt rules before persisting.
    const cleanFollowUp = scrubPromptText(parsed.follow_up);
    if (cleanFollowUp.length < 20) return null;
    // Hard length cap: system prompt asks for 1 to 2 sentences. Anything
    // over 260 chars is a multi-sentence recitation. Drop it rather than
    // insert so the old long style can't leak back into the queue.
    if (cleanFollowUp.length > 260) return null;

    // Validate the angle
    const angle: PromptAngle = validateAngle(parsed.angle, []);

    // Insert the follow-up as a high-priority prompt
    const { error: insertError } = await supabase
      .from('engagement_prompts')
      .insert({
        user_id: userId,
        type: 'memory_prompt',
        category,
        prompt_text: cleanFollowUp,
        parent_prompt_id: answeredPromptId,
        is_follow_up: true,
        tier,
        angle,
        priority: 95,
        source: 'ai_follow_up',
        status: 'pending',
      });

    if (insertError) {
      console.error('[follow-up-engine] insert failed:', insertError);
      return null;
    }

    return cleanFollowUp;
  } catch (err) {
    console.error('[follow-up-engine] error:', err);
    return null;
  }
}

/**
 * Fire-and-forget wrapper that emits a structured log line for every
 * follow-up attempt. Never throws — safe to call without `await` and
 * without `.catch()`. The log line is JSON so it greps cleanly out of
 * server logs (CloudWatch, Vercel, etc.) without needing a DB table.
 *
 * Outcomes: `created` | `skipped_short` | `skipped_no_text` | `failed`
 */
export function generateFollowUpWithMetrics(
  supabase: SupabaseClient,
  userId: string,
  answeredPromptId: string,
  responseText: string
): void {
  const startedAt = Date.now();
  const inputLength = responseText?.length ?? 0;

  const log = (
    outcome: 'created' | 'skipped_short' | 'skipped_no_text' | 'failed',
    extra: Record<string, unknown> = {}
  ) => {
    const line = {
      tag: 'follow_up_engine',
      outcome,
      duration_ms: Date.now() - startedAt,
      input_length: inputLength,
      user_id: userId,
      prompt_id: answeredPromptId,
      ...extra,
    };
    if (outcome === 'failed') console.error(JSON.stringify(line));
    else console.log(JSON.stringify(line));
  };

  if (!responseText) return log('skipped_no_text');
  if (responseText.length <= 200) return log('skipped_short');

  generateFollowUp(supabase, userId, answeredPromptId, responseText)
    .then((followUp) => log(followUp ? 'created' : 'failed', { followUp_length: followUp?.length ?? 0 }))
    .catch((err) => log('failed', { error: err?.message ?? String(err) }));
}
