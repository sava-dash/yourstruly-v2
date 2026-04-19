import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Build the full context block for a loved-one avatar conversation.
 *
 * For self-avatars we use the existing pgvector search over the user's
 * memories. For loved-one avatars we don't have that — the contact's
 * content lives in `video_responses`, which isn't in the embeddings index
 * yet. Instead we pull every transcript for that contact (capped) and
 * fold them into the system context. Typical contact corpora are small
 * (5-30 interview answers), so this fits cheaply in Claude's window.
 *
 * The owner_user_id check on every query is the ownership boundary —
 * a contact owned by another account is invisible here even if its UUID
 * is guessed, because the FK chain goes through user_id-scoped rows.
 */

const MAX_TRANSCRIPTS = 25;
const MAX_TRANSCRIPT_CHARS = 1200;

export async function buildContactContext(
  admin: SupabaseClient,
  ownerUserId: string,
  subjectContactId: string
): Promise<string | null> {
  const { data: contact } = await (admin.from('contacts') as any)
    .select('full_name, nickname, relationship_type, date_of_birth, city, state, country')
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
    .limit(MAX_TRANSCRIPTS);

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

  const lines: string[] = [];
  lines.push('## Who you are');
  const displayName = contact.nickname || contact.full_name;
  lines.push(`Name: ${displayName}`);
  if (contact.relationship_type) {
    lines.push(`You are the YoursTruly user's ${contact.relationship_type}.`);
  }
  const loc = [contact.city, contact.state, contact.country].filter(Boolean).join(', ');
  if (loc) lines.push(`You live in: ${loc}`);
  if (contact.date_of_birth) lines.push(`You were born: ${contact.date_of_birth}`);

  if (responses && responses.length > 0) {
    lines.push('');
    lines.push('## Your interview answers (verbatim — these are facts about your life and HOW you tell stories)');
    for (const r of responses as any[]) {
      const question = r.session_question_id
        ? (questionMap.get(r.session_question_id) || 'A question they asked you')
        : 'A question they asked you';
      const transcript = (r.transcript || '').slice(0, MAX_TRANSCRIPT_CHARS);
      lines.push(`### Q: ${question}`);
      lines.push(`A: ${transcript}`);
      if (r.extracted_entities?.people?.length) {
        lines.push(`(People you mentioned: ${r.extracted_entities.people.join(', ')})`);
      }
      if (r.extracted_entities?.locations?.length) {
        lines.push(`(Places you mentioned: ${r.extracted_entities.locations.join(', ')})`);
      }
      lines.push('');
    }
  } else {
    lines.push('');
    lines.push('Note: no interview answers on file yet. Stay close to the relationship/location facts above and acknowledge gracefully when you don\'t know something.');
  }

  return lines.join('\n');
}
