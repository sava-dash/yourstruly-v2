import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/avatar/personas
 *
 * Returns the list of avatars the calling user can talk to:
 *   - "self"  — always present, represents the user themselves
 *   - one entry per contact who has at least one transcribed video_response
 *
 * Each entry includes whether the persona has been synthesized yet (so the
 * UI can show a "first-time setup" hint in the picker) and a coarse
 * source_count for ordering. We don't return the persona_card itself —
 * that comes from /api/avatar/persona?contactId= when the user actually
 * picks the avatar.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1. Cached personas owned by this user (self + any synthesized contact).
  const { data: cached } = await (admin.from('avatar_personas') as any)
    .select('subject_contact_id, source_count, last_synthesized_at')
    .eq('user_id', user.id);

  const cachedMap = new Map<string | null, { source_count: number; last_synthesized_at: string }>(
    (cached || []).map((c: any) => [c.subject_contact_id, c])
  );

  // 2. Contacts with interview content the user could chat with even if
  //    no persona has been synthesized yet. Group-by in JS because supabase
  //    doesn't expose count(distinct) cleanly.
  const { data: responses } = await (admin.from('video_responses') as any)
    .select('contact_id')
    .eq('user_id', user.id)
    .not('transcript', 'is', null);

  const responseCounts = new Map<string, number>();
  for (const r of responses || []) {
    if (!r.contact_id) continue;
    responseCounts.set(r.contact_id, (responseCounts.get(r.contact_id) || 0) + 1);
  }

  // 3. Hydrate contact display info.
  const contactIds = Array.from(responseCounts.keys());
  const { data: contacts } = contactIds.length > 0
    ? await (admin.from('contacts') as any)
        .select('id, full_name, nickname, relationship_type, avatar_url')
        .in('id', contactIds)
        .eq('user_id', user.id)
    : { data: [] };

  // 4. Compose response.
  const selfCached = cachedMap.get(null);
  const personas = [
    {
      kind: 'self' as const,
      subjectContactId: null,
      displayName: 'You',
      relationship: null,
      avatarUrl: null,
      synthesized: !!selfCached,
      sourceCount: selfCached?.source_count ?? 0,
      lastSynthesizedAt: selfCached?.last_synthesized_at ?? null,
      transcriptCount: null, // self avatars draw on memories, not transcripts
    },
    ...((contacts || []) as any[]).map((c: any) => {
      const cachedRow = cachedMap.get(c.id);
      return {
        kind: 'contact' as const,
        subjectContactId: c.id,
        displayName: c.nickname || c.full_name,
        relationship: c.relationship_type ?? null,
        avatarUrl: c.avatar_url ?? null,
        synthesized: !!cachedRow,
        sourceCount: cachedRow?.source_count ?? 0,
        lastSynthesizedAt: cachedRow?.last_synthesized_at ?? null,
        transcriptCount: responseCounts.get(c.id) ?? 0,
      };
    }),
  ];

  return NextResponse.json({ personas });
}
