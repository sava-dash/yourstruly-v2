import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Entity extraction for interview-response transcripts.
 *
 * After a transcript lands, we run a single LLM pass that pulls four
 * structured fields plus a one-line summary. The result gets persisted
 * to `video_responses.extracted_entities` (full payload) AND folded into
 * the related `memories.metadata` so a memory row becomes the
 * "comprehensive" searchable record without needing a join.
 *
 * The extraction is fire-and-forget from the perspective of /save-response
 * so the interviewee sees their answer save immediately.
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

// Texts shorter than this are noise (filler "um yeah ok"), not worth a
// round-trip. The follow-up engine uses 200 chars as its threshold; we go
// lower because entity extraction is useful even for shorter answers.
const MIN_TEXT_LENGTH = 40;

// Truncate inputs so a runaway transcript can't blow the model's context.
// 6000 chars is roughly 1500 tokens — well within Haiku's window with
// headroom for the system prompt and JSON response.
const MAX_TEXT_LENGTH = 6000;

const SYSTEM_PROMPT = `You extract structured entities from interview transcripts.

Return STRICT JSON with this exact shape:
{
  "topics":    [string, ...],   // 3-7 short topical phrases (2-4 words each)
  "people":    [string, ...],   // names or relationships ("Grandma Rose", "my brother")
  "times":     [string, ...],   // dates, years, decades, life stages ("the 1980s", "when I was 12")
  "locations": [string, ...],   // cities, countries, specific places ("Brooklyn", "the kitchen")
  "summary":   string           // ONE sentence (max 25 words) capturing the core memory
}

Rules:
- Use the speaker's own phrasing where possible. Don't invent details.
- Prefer specific over generic ("Grandma Rose" beats "a relative"; "Brooklyn" beats "the city").
- If a field has nothing concrete, return an empty array — never guess.
- Topics should describe the THEME (e.g. "family tradition"), not the time/place/people, which have their own arrays.
- Return JSON only. No prose, no code fences.`;

export interface ExtractedEntities {
  topics: string[];
  people: string[];
  times: string[];
  locations: string[];
  summary: string;
  extracted_at: string;
}

/**
 * Pure extraction. Returns the entities or null if the input was too short,
 * the model returned unparseable JSON, or the API call failed.
 */
export async function extractEntities(text: string): Promise<ExtractedEntities | null> {
  if (!text || text.length < MIN_TEXT_LENGTH) return null;

  const trimmed = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: trimmed }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const raw = textBlock?.type === 'text' ? textBlock.text : '';
    if (!raw) return null;

    return parseEntities(raw);
  } catch (err) {
    console.error('[extract-entities] anthropic error:', err);
    return null;
  }
}

/**
 * Defensive JSON parse. Handles bare JSON, code-fenced JSON, and JSON
 * embedded in stray prose. Validates the shape before returning so
 * downstream code can trust the field types.
 */
export function parseEntities(raw: string): ExtractedEntities | null {
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

  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  const topics = arr(parsed.topics);
  const people = arr(parsed.people);
  const times = arr(parsed.times);
  const locations = arr(parsed.locations);

  // Reject empty payloads — better to leave the column NULL than to store
  // a row that says "we tried and got nothing" indistinguishably from
  // "we haven't tried yet".
  if (!summary && topics.length === 0 && people.length === 0 && times.length === 0 && locations.length === 0) {
    return null;
  }

  return {
    topics,
    people,
    times,
    locations,
    summary,
    extracted_at: new Date().toISOString(),
  };
}

/**
 * Fire-and-forget extraction + persistence.
 *
 * Logs a structured JSON line per attempt (greppable from CloudWatch) with
 * outcome + duration_ms. Never throws — safe to call without `await` from
 * the request handler.
 *
 * On success: writes the full payload to whichever target rows are
 * provided. Both writes target the dedicated `extracted_entities` JSONB
 * column on each table — `memories` got the column in
 * 20260418_memories_entities_and_rag.sql; `video_responses` got it in
 * 20260418_video_response_entities.sql.
 *
 * Either target can be omitted (pass null) — engagement-card answers
 * create only a memory; loved-one interview saves create both.
 *
 * Outcomes: `extracted` | `skipped_short` | `skipped_no_text` | `failed_extract` | `failed_persist`
 */
export function extractAndPersistWithMetrics(
  admin: SupabaseClient,
  args: {
    videoResponseId: string | null;
    memoryId: string | null;
    transcript: string;
    sessionId?: string | null;
    userId?: string | null;
  }
): void {
  const { videoResponseId, memoryId, transcript, sessionId, userId } = args;
  const startedAt = Date.now();
  const inputLength = transcript?.length ?? 0;

  type Outcome = 'extracted' | 'skipped_short' | 'skipped_no_text' | 'failed_extract' | 'failed_persist';
  const log = (outcome: Outcome, extra: Record<string, unknown> = {}) => {
    const line = {
      tag: 'extract_entities',
      outcome,
      duration_ms: Date.now() - startedAt,
      input_length: inputLength,
      video_response_id: videoResponseId,
      memory_id: memoryId,
      session_id: sessionId ?? null,
      user_id: userId ?? null,
      ...extra,
    };
    if (outcome.startsWith('failed')) console.error(JSON.stringify(line));
    else console.log(JSON.stringify(line));
  };

  if (!transcript) return log('skipped_no_text');
  if (transcript.length < MIN_TEXT_LENGTH) return log('skipped_short');
  if (!videoResponseId && !memoryId) return log('skipped_no_text', { reason: 'no_target' });

  extractEntities(transcript)
    .then(async (entities) => {
      if (!entities) return log('failed_extract');

      try {
        if (videoResponseId) {
          const { error: vrErr } = await (admin.from('video_responses') as any)
            .update({ extracted_entities: entities })
            .eq('id', videoResponseId);
          if (vrErr) return log('failed_persist', { stage: 'video_responses', error: vrErr.message });
        }

        if (memoryId) {
          const { error: memErr } = await (admin.from('memories') as any)
            .update({ extracted_entities: entities })
            .eq('id', memoryId);
          if (memErr) return log('failed_persist', { stage: 'memories', error: memErr.message });
        }

        log('extracted', {
          topics: entities.topics.length,
          people: entities.people.length,
          times: entities.times.length,
          locations: entities.locations.length,
          summary_length: entities.summary.length,
        });
      } catch (err) {
        log('failed_persist', { error: err instanceof Error ? err.message : String(err) });
      }
    })
    .catch((err) => log('failed_extract', { error: err?.message ?? String(err) }));
}
