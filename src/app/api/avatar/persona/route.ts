import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { synthesizePersona } from '@/lib/avatar/synthesize-persona';

/**
 * Avatar persona endpoint.
 *
 *   GET  → returns the cached Persona Card (synthesizing if missing).
 *   POST → forces a re-synthesis (use after the user adds significant new
 *          material or wants to refresh the avatar's voice).
 *
 * Both routes are auth-gated and scoped to the calling user's own persona.
 * Cross-user access (e.g., loved-one avatars) will get its own endpoint
 * once Phase 4.5 lands.
 */

// Parses ?contactId=... and verifies the contact belongs to ownerUserId
// before any expensive work. Returns:
//   - { ok: true, contactId: string }       loved-one persona
//   - { ok: true, contactId: null }         self persona
//   - { ok: false, status, error }          ownership check failed
async function resolveSubject(
  request: NextRequest,
  admin: ReturnType<typeof createAdminClient>,
  ownerUserId: string
): Promise<{ ok: true; contactId: string | null } | { ok: false; status: number; error: string }> {
  const contactId = new URL(request.url).searchParams.get('contactId');
  if (!contactId) return { ok: true, contactId: null };

  const { data: contact } = await (admin.from('contacts') as any)
    .select('id')
    .eq('id', contactId)
    .eq('user_id', ownerUserId)
    .maybeSingle();
  if (!contact) {
    return { ok: false, status: 404, error: 'Contact not found' };
  }
  return { ok: true, contactId };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const subj = await resolveSubject(request, admin, user.id);
  if (!subj.ok) return NextResponse.json({ error: subj.error }, { status: subj.status });

  let lookup = (admin.from('avatar_personas') as any)
    .select('persona_card, version, source_count, last_synthesized_at')
    .eq('user_id', user.id);
  lookup = subj.contactId
    ? lookup.eq('subject_contact_id', subj.contactId)
    : lookup.is('subject_contact_id', null);
  const { data: existing } = await lookup.maybeSingle();

  if (existing) {
    return NextResponse.json({
      persona: existing.persona_card,
      version: existing.version,
      sourceCount: existing.source_count,
      lastSynthesizedAt: existing.last_synthesized_at,
      synthesized: false,
      subjectContactId: subj.contactId,
    });
  }

  try {
    const result = await synthesizePersona(admin, user.id, { subjectContactId: subj.contactId });
    if (!result) {
      return NextResponse.json({
        persona: null,
        synthesized: false,
        reason: 'insufficient_source_material',
        hint: subj.contactId
          ? 'Send this contact a few interview questions and have them answer first — we need their voice on record before we can build their avatar.'
          : 'Add a few memories or answer a few engagement prompts so we have something to learn from.',
        subjectContactId: subj.contactId,
      });
    }
    return NextResponse.json({
      persona: result.persona,
      sourceCount: result.sourceCount,
      synthesized: true,
      subjectContactId: subj.contactId,
    });
  } catch (err) {
    console.error('[avatar/persona] GET synth error:', err);
    return NextResponse.json({ error: 'Persona synthesis failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const subj = await resolveSubject(request, admin, user.id);
  if (!subj.ok) return NextResponse.json({ error: subj.error }, { status: subj.status });

  try {
    const result = await synthesizePersona(admin, user.id, { subjectContactId: subj.contactId });
    if (!result) {
      return NextResponse.json({
        persona: null,
        synthesized: false,
        reason: 'insufficient_source_material',
        subjectContactId: subj.contactId,
      });
    }
    return NextResponse.json({
      persona: result.persona,
      sourceCount: result.sourceCount,
      synthesized: true,
      subjectContactId: subj.contactId,
    });
  } catch (err) {
    console.error('[avatar/persona] POST synth error:', err);
    return NextResponse.json({ error: 'Persona synthesis failed' }, { status: 500 });
  }
}
