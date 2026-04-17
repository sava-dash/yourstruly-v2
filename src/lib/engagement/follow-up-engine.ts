import type { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { validateAngle, type PromptAngle } from './angle-rotation';

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

Generate ONE follow-up question that proves you were listening. Your follow-up should:
- Be 2-3 sentences with thought-seeds (use "maybe" to suggest possibilities)
- Reference something specific they said (a name, place, feeling, or event)
- Gently ask them to go deeper into that detail
- Zero em-dashes. No -- ever.
- Warm, curious tone. Never clinical or mechanical.
- End with an open invitation like "What comes to mind?" or "Tell me about that."

If the response is too short, too generic, or there is nothing meaningful to follow up on, return null.

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

    // Validate the angle
    const angle: PromptAngle = validateAngle(parsed.angle, []);

    // Insert the follow-up as a high-priority prompt
    const { error: insertError } = await supabase
      .from('engagement_prompts')
      .insert({
        user_id: userId,
        type: 'memory_prompt',
        category,
        prompt_text: parsed.follow_up,
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

    return parsed.follow_up;
  } catch (err) {
    console.error('[follow-up-engine] error:', err);
    return null;
  }
}
