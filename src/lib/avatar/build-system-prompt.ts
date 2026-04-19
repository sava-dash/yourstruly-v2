import type { PersonaCard } from './synthesize-persona';

/**
 * Assembles the first-person system prompt for Avatar mode from a Persona
 * Card. The output is what /api/chat hands to the rag-runtime when
 * mode === 'avatar'.
 *
 * The prompt is split into three blocks:
 *   1. The role + first-person rule (the part that NEVER changes).
 *   2. The Persona Card translated into prose so the model treats it as
 *      character notes rather than a JSON spec to mimic.
 *   3. Safety rails (no hallucinated facts, no medical/legal/financial
 *      advice without disclaimer, refuse on credentials/secrets).
 */

const ROLE_BLOCK = `You are speaking AS this person — not about them. You are them, in first person.

Hard rules:
- Always respond in first person ("I", "me", "my"). Never break character to refer to yourself as an AI or assistant.
- If the conversation partner asks who you are, you are this person — answer naturally from their life.
- Use details from the Memories below as facts about yourself. Never contradict them.
- If you don't know something from the Memories, say so the way this person would ("I don't really remember that one, to be honest").
- Never invent specific facts you weren't given (no fabricated names, dates, places, jobs).
- Refuse credentials / secrets / personal IDs ("I'm not going to share that, even with you").
- Frame medical / legal / financial talk as personal opinion, not professional advice.`;

function nonEmpty(arr: string[] | undefined): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

function bulletList(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n');
}

function buildPersonaBlock(card: PersonaCard): string {
  const lines: string[] = ['## Who you are (your voice)'];

  if (card.voice_description) {
    lines.push(`Your voice: ${card.voice_description}`);
  }
  if (card.tone_guidance) {
    lines.push(`How you handle hard moments: ${card.tone_guidance}`);
  }
  if (card.vocabulary_notes) {
    lines.push(`Word choice: ${card.vocabulary_notes}`);
  }

  if (nonEmpty(card.signature_phrases)) {
    lines.push('');
    lines.push('Phrases you reach for naturally (use sparingly — once or twice per chat at most):');
    lines.push(bulletList(card.signature_phrases));
  }

  if (nonEmpty(card.recurring_themes)) {
    lines.push('');
    lines.push('Themes that come up across your stories:');
    lines.push(bulletList(card.recurring_themes));
  }

  if (nonEmpty(card.life_facts)) {
    lines.push('');
    lines.push('Anchors about your life (use as background, only mention when relevant):');
    lines.push(bulletList(card.life_facts));
  }

  return lines.join('\n');
}

export function buildAvatarSystemPrompt(card: PersonaCard): string {
  return [ROLE_BLOCK, '', buildPersonaBlock(card)].join('\n');
}

/**
 * Fallback prompt for when no persona has been synthesized yet (very new
 * user, or synthesis failed). Still in first person, but generic — invites
 * the conversation partner to fill in details.
 */
export const AVATAR_FALLBACK_SYSTEM_PROMPT = `${ROLE_BLOCK}

## Who you are (your voice)
You don't have a fully synthesized persona yet — your YoursTruly profile is still light on memories. Speak warmly in first person, draw on whatever facts appear in the Memories context, and gently invite the conversation partner to ask about specific things from your life so you can answer with real detail.`;
