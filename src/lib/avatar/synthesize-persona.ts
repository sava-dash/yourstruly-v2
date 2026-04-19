import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Persona Card synthesizer for the Avatar mode.
 *
 * Reads the user's profile + a representative slice of their richer memories
 * (transcripts, longer engagement responses) and asks Claude Sonnet to
 * distill a Persona Card the system-prompt builder can hand to the chat
 * runtime. The result is JSONB-friendly and intentionally loose — fields
 * can be added without a migration.
 *
 * Synthesis is **on-demand**: triggered the first time a user opens Avatar
 * mode, then refreshed on a cadence + when a meaningful number of new
 * memories have landed (`source_count` watermark).
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

// Cap how many memories we sample into a single synthesis pass. Sonnet has
// plenty of context but we still want bounded latency + cost. Sampling
// happens randomly within the most-recent N so the persona evolves with
// fresh material rather than always anchoring on the oldest memories.
const MEMORY_SAMPLE_SIZE = 30;
const MAX_MEMORY_CHARS = 800;

const SYSTEM_PROMPT = `You are distilling a person's Persona Card from samples of their memories and profile.

The Persona Card will later be used to make an AI speak in first person AS this person — not about them. Your job is to capture HOW they speak and WHAT consistently matters to them, not to summarize their life.

Return STRICT JSON with this exact shape (no prose, no code fences):
{
  "voice_description":  string,         // 1-2 sentences. Tone, warmth, rhythm. ("warm and concrete; favors short sentences with a pause before the punchline.")
  "recurring_themes":   [string, ...],  // 3-7 themes that surface across multiple memories ("family resilience", "small-town roots")
  "signature_phrases":  [string, ...],  // 0-5 phrases or word choices the person uses noticeably ("honest to goodness", "the long way around"). Empty array if none clearly stand out.
  "life_facts":         [string, ...],  // 5-12 short factual anchors ("grew up in Akron in the 60s", "two daughters named Mei and Lin")
  "tone_guidance":      string,         // 1-2 sentences. How they handle hard topics, humor, advice-giving.
  "vocabulary_notes":   string          // 1 sentence. Do they reach for sensory imagery? Avoid jargon? Use specific names?
}

Rules:
- Use the speaker's own phrasing where possible. Don't invent details.
- Empty arrays are fine when nothing reliable stands out — guessing creates a wrong avatar.
- Prefer specific over generic ("Akron in the 60s" beats "the Midwest").
- "voice_description" should describe HOW they sound, not WHAT they care about.`;

export interface PersonaCard {
  voice_description: string;
  recurring_themes: string[];
  signature_phrases: string[];
  life_facts: string[];
  /** Facts the user added manually via the knowledge panel. Preserved
   *  across re-synthesis (synth only overwrites the LLM-derived fields). */
  manual_facts?: string[];
  tone_guidance: string;
  vocabulary_notes: string;
  synthesized_from: { memories: number };
}

export interface SynthesizePersonaResult {
  persona: PersonaCard;
  sourceCount: number;
}

/**
 * Pull a representative sample of the user's content for synthesis.
 *
 * Strategy: prefer rich content (longer text). Pull profile + memories with
 * non-trivial content; randomize within the top N most recent so each
 * regen sees fresh material rather than always the oldest entries.
 */
async function gatherSelfCorpus(admin: SupabaseClient, userId: string) {
  const { data: profile } = await (admin.from('profiles') as any)
    .select('full_name, display_name, bio, personality, interests, mottos, life_goals, religion')
    .eq('id', userId)
    .single();

  const { data: memories } = await (admin.from('memories') as any)
    .select('title, content, metadata, memory_type, created_at')
    .eq('user_id', userId)
    .not('content', 'is', null)
    .order('created_at', { ascending: false })
    .limit(MEMORY_SAMPLE_SIZE * 2);

  const ranked = (memories || [])
    .filter((m: any) => typeof m.content === 'string' && m.content.length >= 80)
    .sort(() => Math.random() - 0.5)
    .slice(0, MEMORY_SAMPLE_SIZE);

  return { profile: profile || null, memories: ranked };
}

/**
 * Pull a contact's interview transcripts as the synthesis corpus.
 *
 * The "profile" here is the contact card (relationship, location, dates).
 * The "memories" are their video_responses (transcripts + entities). We
 * verify ownership via the WHERE clause so a contact owned by another
 * account is invisible to this synthesizer.
 *
 * Returns null if the contact doesn't belong to ownerUserId.
 */
async function gatherContactCorpus(
  admin: SupabaseClient,
  ownerUserId: string,
  subjectContactId: string
) {
  const { data: contact } = await (admin.from('contacts') as any)
    .select('full_name, nickname, relationship_type, relationship_details, date_of_birth, city, state, country')
    .eq('id', subjectContactId)
    .eq('user_id', ownerUserId)
    .maybeSingle();
  if (!contact) return null;

  const { data: responses } = await (admin.from('video_responses') as any)
    .select('transcript, ai_summary, extracted_entities, session_question_id, created_at')
    .eq('contact_id', subjectContactId)
    .eq('user_id', ownerUserId)
    .not('transcript', 'is', null)
    .order('created_at', { ascending: false })
    .limit(MEMORY_SAMPLE_SIZE * 2);

  const sessionQuestionIds = (responses || [])
    .map((r: any) => r.session_question_id)
    .filter((id: any): id is string => typeof id === 'string');

  let questionMap = new Map<string, string>();
  if (sessionQuestionIds.length > 0) {
    const { data: questions } = await (admin.from('session_questions') as any)
      .select('id, question_text')
      .in('id', sessionQuestionIds);
    questionMap = new Map(
      (questions || []).map((q: any) => [q.id as string, q.question_text as string])
    );
  }

  const ranked = (responses || [])
    .filter((r: any) => typeof r.transcript === 'string' && r.transcript.length >= 80)
    .sort(() => Math.random() - 0.5)
    .slice(0, MEMORY_SAMPLE_SIZE)
    .map((r: any) => ({
      title: r.session_question_id ? (questionMap.get(r.session_question_id) || 'Interview answer') : 'Interview answer',
      content: r.transcript,
      metadata: r.extracted_entities || {},
    }));

  // Re-shape the contact into a profile-like object so buildUserMessage
  // can treat both corpora identically.
  const profile = {
    full_name: contact.nickname || contact.full_name,
    bio: contact.relationship_details || null,
    personality: [] as string[],
    interests: [] as string[],
    mottos: [] as string[],
    life_goals: [] as string[],
    religion: null as string | null,
    relationship_type: contact.relationship_type,
    location: [contact.city, contact.state, contact.country].filter(Boolean).join(', '),
    date_of_birth: contact.date_of_birth,
  };

  return { profile, memories: ranked };
}

function buildUserMessage(profile: any, memories: any[]): string {
  const parts: string[] = [];

  if (profile) {
    parts.push('## Profile');
    if (profile.full_name) parts.push(`Name: ${profile.full_name}`);
    if (profile.relationship_type) parts.push(`Relationship to the YoursTruly user: ${profile.relationship_type}`);
    if (profile.bio) parts.push(`Bio: ${profile.bio}`);
    if (profile.location) parts.push(`Location: ${profile.location}`);
    if (profile.date_of_birth) parts.push(`Born: ${profile.date_of_birth}`);
    if (Array.isArray(profile.personality) && profile.personality.length > 0) {
      parts.push(`Personality traits: ${profile.personality.join(', ')}`);
    }
    if (Array.isArray(profile.interests) && profile.interests.length > 0) {
      parts.push(`Interests: ${profile.interests.join(', ')}`);
    }
    if (Array.isArray(profile.mottos) && profile.mottos.length > 0) {
      parts.push(`Mottos: ${profile.mottos.join(' | ')}`);
    }
    if (Array.isArray(profile.life_goals) && profile.life_goals.length > 0) {
      parts.push(`Life goals: ${profile.life_goals.join(' | ')}`);
    }
    if (profile.religion) parts.push(`Religion / beliefs: ${profile.religion}`);
    parts.push('');
  }

  if (memories.length > 0) {
    parts.push('## Memory samples (verbatim — these are HOW they tell stories)');
    for (const m of memories) {
      const trimmed = (m.content || '').slice(0, MAX_MEMORY_CHARS);
      parts.push(`### ${m.title || 'Untitled'}`);
      parts.push(trimmed);
      // Surface the entity extraction so the model has structured anchors.
      if (m.metadata?.people_mentioned?.length) {
        parts.push(`(People: ${m.metadata.people_mentioned.join(', ')})`);
      }
      if (m.metadata?.locations_mentioned?.length) {
        parts.push(`(Places: ${m.metadata.locations_mentioned.join(', ')})`);
      }
      parts.push('');
    }
  }

  return parts.join('\n');
}

/**
 * Defensive JSON parse for the Persona Card. Handles bare JSON, fenced JSON,
 * and JSON embedded in prose. Rejects payloads missing the required string
 * scalars so downstream consumers can rely on the shape.
 */
export function parsePersonaCard(raw: string, sourceCount: number): PersonaCard | null {
  const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
  let parsed: any = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { return null; }
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];

  const card: PersonaCard = {
    voice_description: str(parsed.voice_description),
    recurring_themes: arr(parsed.recurring_themes),
    signature_phrases: arr(parsed.signature_phrases),
    life_facts: arr(parsed.life_facts),
    tone_guidance: str(parsed.tone_guidance),
    vocabulary_notes: str(parsed.vocabulary_notes),
    synthesized_from: { memories: sourceCount },
  };

  // A persona with neither voice nor any facts isn't useful — leave the row
  // unwritten rather than poison the cache with an empty card.
  if (!card.voice_description && card.life_facts.length === 0 && card.recurring_themes.length === 0) {
    return null;
  }
  return card;
}

export interface SynthesizePersonaOptions {
  /** When set, synthesize a loved-one persona for that contact. The
   *  contact must belong to ownerUserId; otherwise null is returned. */
  subjectContactId?: string | null;
}

/**
 * End-to-end synthesis: gather corpus → call Claude → parse → upsert.
 *
 * Returns the new card + the source count so callers can decide whether
 * to invalidate their cached system prompt.
 *
 * Throws on infrastructure errors (auth, DB) so callers can surface them;
 * returns null if there genuinely isn't enough source material OR if the
 * subject contact isn't owned by ownerUserId.
 */
export async function synthesizePersona(
  admin: SupabaseClient,
  ownerUserId: string,
  opts: SynthesizePersonaOptions = {}
): Promise<SynthesizePersonaResult | null> {
  const subjectContactId = opts.subjectContactId ?? null;

  const corpus = subjectContactId
    ? await gatherContactCorpus(admin, ownerUserId, subjectContactId)
    : await gatherSelfCorpus(admin, ownerUserId);

  // gatherContactCorpus returns null when the contact doesn't belong to
  // ownerUserId — we propagate that as "no persona available" rather
  // than leak ownership info to the caller.
  if (!corpus) return null;

  const { profile, memories } = corpus;
  if (!profile && memories.length === 0) return null;

  const userMessage = buildUserMessage(profile, memories);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1500,
    temperature: 0.4,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const raw = textBlock?.type === 'text' ? textBlock.text : '';
  if (!raw) return null;

  const card = parsePersonaCard(raw, memories.length);
  if (!card) return null;

  // Upsert one row per (owner, subject). Bump version so cached system
  // prompts know to refresh. Use the partial unique indexes from the
  // 4.5 migration as the upsert key — selected via a manual select+update
  // here because supabase-js's onConflict doesn't accept partial indexes.
  const { data: existing } = subjectContactId
    ? await (admin.from('avatar_personas') as any)
        .select('id, version, persona_card')
        .eq('user_id', ownerUserId)
        .eq('subject_contact_id', subjectContactId)
        .maybeSingle()
    : await (admin.from('avatar_personas') as any)
        .select('id, version, persona_card')
        .eq('user_id', ownerUserId)
        .is('subject_contact_id', null)
        .maybeSingle();

  // Preserve any manually-added facts across re-synthesis. The LLM doesn't
  // generate manual_facts; they only come from the user's knowledge panel.
  // Wiping them on every regen would silently destroy user input.
  const preservedManualFacts = Array.isArray(existing?.persona_card?.manual_facts)
    ? (existing!.persona_card!.manual_facts as string[]).filter((f) => typeof f === 'string' && f.trim().length > 0)
    : [];
  if (preservedManualFacts.length > 0) {
    card.manual_facts = preservedManualFacts;
  }

  const nextVersion = (existing?.version ?? 0) + 1;
  const nowIso = new Date().toISOString();
  const baseRow = {
    user_id: ownerUserId,
    subject_contact_id: subjectContactId,
    persona_card: card,
    version: nextVersion,
    source_count: memories.length,
    last_synthesized_at: nowIso,
    updated_at: nowIso,
  };

  if (existing?.id) {
    const { error: updErr } = await (admin.from('avatar_personas') as any)
      .update(baseRow)
      .eq('id', existing.id);
    if (updErr) {
      console.error('[synthesize-persona] update error:', updErr);
      throw updErr;
    }
  } else {
    const { error: insErr } = await (admin.from('avatar_personas') as any)
      .insert(baseRow);
    if (insErr) {
      console.error('[synthesize-persona] insert error:', insErr);
      throw insErr;
    }
  }

  return { persona: card, sourceCount: memories.length };
}
