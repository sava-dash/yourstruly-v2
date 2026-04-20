import type { SupabaseClient } from '@supabase/supabase-js';
import { generateEmbedding, generateChatResponse } from '@/lib/ai/providers';

/**
 * Shared RAG runtime for /api/chat (Concierge) and /api/avatar/* (Avatar).
 *
 * Lifts the embed-search-format-respond pipeline out of the original
 * /api/chat handler so both modes share the same retrieval/persistence
 * plumbing. The only thing modes differ on is the system prompt and the
 * optional Avatar persona context block.
 *
 * Caller responsibilities:
 *   - auth (we expect an authenticated supabase client + userId)
 *   - choosing the system prompt (we just receive it)
 *   - any mode-specific UI affordances
 *
 * What this returns:
 *   - the assistant's reply
 *   - the (possibly newly created) sessionId
 *   - the source rows used for the answer (for citations)
 */

export type ChatMode = 'concierge' | 'avatar';

export interface RunRagChatArgs {
  supabase: SupabaseClient;
  userId: string;
  message: string;
  systemPrompt: string;
  mode: ChatMode;
  sessionId?: string | null;
  /** Optional extra context block prepended above retrieved memories
   *  (used for Avatar persona context). */
  personaContext?: string;
  /** Hard cap on retrieved memory rows — keeps prompt size bounded. */
  searchLimit?: number;
  /** When true, skip the embed + vector retrieve step entirely and use
   *  ONLY personaContext as the context. Loved-one avatars set this so
   *  we don't accidentally retrieve owner content while talking AS the
   *  contact. */
  skipRetrieval?: boolean;
  /** Optional contact subject for loved-one avatar threads. Used for
   *  session scoping; doesn't change the prompt itself (caller bakes
   *  that into systemPrompt + personaContext). */
  subjectContactId?: string | null;
  /** Anthropic generation knobs. */
  maxTokens?: number;
  temperature?: number;
}

export interface RunRagChatResult {
  message: string;
  sessionId: string | null;
  sources: Array<{
    type: string;
    id: string;
    title: string;
    similarity?: number;
  }>;
}

const DEFAULT_SEARCH_LIMIT = 8;
const HISTORY_TURN_LIMIT = 10;
// Retrieval threshold — rows below this cosine similarity never enter
// the prompt. Tighter value = fewer irrelevant memories in context.
// 0.4 sits just above "distantly thematic" — empirically the band
// where results start being about the question rather than the vibe.
const MATCH_THRESHOLD = 0.4;
// Citation threshold — only memories at least THIS similar make it into
// the source-chip UI. Retrieval can still feed slightly-lower-scoring
// rows into the prompt context (they help with grounding), but we don't
// surface them as "here's what I drew from" unless they're genuinely on-topic.
const CITATION_THRESHOLD = 0.5;
// Cap displayed source chips — the model rarely actually draws on more
// than 2-3 per answer; showing more just looks like guesswork.
const MAX_DISPLAYED_SOURCES = 3;

/**
 * Pull the top-k semantically similar rows from the user's content.
 * Returns [] on error so the chat still completes (degrades to no-context).
 */
async function searchUserContent(
  supabase: SupabaseClient,
  userId: string,
  queryEmbedding: number[],
  limit: number
) {
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  const { data, error } = await supabase.rpc('search_user_content', {
    query_embedding: embeddingStr,
    search_user_id: userId,
    match_threshold: MATCH_THRESHOLD,
    match_count: limit,
  });
  if (error) {
    console.error('[rag-runtime] search error:', error);
    return [];
  }
  return data || [];
}

/**
 * Format retrieved rows into a context block. Groups by content_type so the
 * model sees a tidy "## Memories / ## People / ## Postscripts" outline rather
 * than an unsorted list of records.
 */
export function formatRagContext(results: any[]): string {
  if (!results.length) {
    return 'No specific memories or information found for this query. You can still have a general conversation.';
  }

  const grouped: Record<string, any[]> = {};
  for (const r of results) {
    if (!grouped[r.content_type]) grouped[r.content_type] = [];
    grouped[r.content_type].push(r);
  }

  let context = '';

  if (grouped.memory) {
    context += '## Relevant Memories\n';
    for (const m of grouped.memory) {
      context += `- "${m.title || 'Untitled memory'}" (${m.metadata?.date || 'Date unknown'})`;
      if (m.metadata?.location) context += ` at ${m.metadata.location}`;
      context += `\n  ${m.content || ''}\n`;
      // Surface the new entity-extracted fields so the model can pull
      // people / topics into its answer (and the avatar can speak about
      // them in first person).
      if (m.metadata?.people_mentioned?.length) {
        context += `  People mentioned: ${m.metadata.people_mentioned.join(', ')}\n`;
      }
      if (m.metadata?.topics?.length) {
        context += `  Topics: ${m.metadata.topics.join(', ')}\n`;
      }
    }
  }

  if (grouped.contact) {
    context += '\n## Relevant People\n';
    for (const c of grouped.contact) {
      context += `- ${c.title} (${c.metadata?.relationship || 'Contact'})`;
      if (c.metadata?.birthday) context += ` - Birthday: ${c.metadata.birthday}`;
      context += '\n';
      if (c.content) context += `  Notes: ${c.content}\n`;
    }
  }

  if (grouped.postscript) {
    context += '\n## Relevant PostScripts (future messages)\n';
    for (const p of grouped.postscript) {
      context += `- "${p.title}" for ${p.metadata?.recipient || 'someone'}`;
      if (p.metadata?.deliver_on) context += ` (delivers: ${p.metadata.deliver_on})`;
      context += '\n';
    }
  }

  if (grouped.pet) {
    context += '\n## Pets\n';
    for (const pet of grouped.pet) {
      context += `- ${pet.title} (${pet.metadata?.species || 'pet'})`;
      if (pet.metadata?.breed) context += ` - ${pet.metadata.breed}`;
      context += '\n';
      if (pet.content) context += `  ${pet.content}\n`;
    }
  }

  return context;
}

export async function runRagChat(args: RunRagChatArgs): Promise<RunRagChatResult> {
  const {
    supabase,
    userId,
    message,
    systemPrompt,
    mode,
    sessionId: incomingSessionId,
    personaContext,
    searchLimit = DEFAULT_SEARCH_LIMIT,
    skipRetrieval = false,
    subjectContactId = null,
    maxTokens = 1000,
    temperature = 0.7,
  } = args;

  // Ensure we have a session in this mode (and scoped to the right
  // subject contact, if any).
  let sessionId = incomingSessionId || null;
  if (!sessionId) {
    const { data: created } = await (supabase.from('chat_sessions') as any)
      .insert({
        user_id: userId,
        title: message.slice(0, 50),
        mode,
        subject_contact_id: subjectContactId,
      })
      .select('id')
      .single();
    sessionId = created?.id ?? null;
  }

  // Persist the user's message.
  if (sessionId) {
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: userId,
      role: 'user',
      content: message,
    });
  }

  // Recent conversation history (excluding the message we just inserted).
  const { data: history } = sessionId
    ? await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(HISTORY_TURN_LIMIT)
    : { data: [] };

  const conversationHistory = (history || [])
    .slice(0, -1)
    .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Embed query → vector retrieve. Skipped for loved-one avatars: the
  // owner's content isn't relevant when speaking AS a different person.
  const searchResults = skipRetrieval
    ? []
    : await (async () => {
        const queryEmbedding = await generateEmbedding(message);
        return searchUserContent(supabase, userId, queryEmbedding, searchLimit);
      })();

  // Compose the context block. Avatar mode prepends a Persona Card section
  // so the persona stays visible to the model alongside the retrieved facts.
  const ragContext = skipRetrieval ? '' : formatRagContext(searchResults);
  const context = skipRetrieval
    ? (personaContext || '')
    : (personaContext ? `${personaContext}\n\n${ragContext}` : ragContext);

  const assistantMessage = await generateChatResponse(message, {
    systemPrompt,
    context,
    history: conversationHistory,
    maxTokens,
    temperature,
  });

  // Persist the assistant reply with its sources for later citation rendering.
  if (sessionId) {
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: userId,
      role: 'assistant',
      content: assistantMessage,
      sources: searchResults.map((r: any) => ({
        type: r.content_type,
        id: r.id,
        title: r.title,
        similarity: r.similarity,
      })),
    });
  }

  // Only surface chips for high-confidence matches — low-sim hits often
  // slid into the prompt context on vibe alone and shouldn't be cited.
  const displayedSources = searchResults
    .filter((r: any) => (r.similarity ?? 0) >= CITATION_THRESHOLD)
    .slice(0, MAX_DISPLAYED_SOURCES)
    .map((r: any) => ({
      type: r.content_type,
      id: r.id,
      title: r.title,
    }));

  return {
    message: assistantMessage,
    sessionId,
    sources: displayedSources,
  };
}
