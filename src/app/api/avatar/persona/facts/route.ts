import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Manual fact CRUD for the avatar's knowledge panel.
 *
 *   POST   /api/avatar/persona/facts   { fact, contactId? }   → adds a fact
 *   DELETE /api/avatar/persona/facts   { fact, contactId? }   → removes a fact
 *
 * Manual facts live inside `persona_card.manual_facts` (a JSONB string[]).
 * Re-synthesis preserves them; the LLM never overwrites this slot.
 *
 * Both verbs verify ownership of the optional contact subject before any
 * mutation, mirroring /api/chat and /api/avatar/persona.
 */

const MAX_FACT_LENGTH = 240;
const MAX_FACTS = 50;

async function resolveSubjectFromBody(
  request: NextRequest,
  admin: ReturnType<typeof createAdminClient>,
  ownerUserId: string
): Promise<
  | { ok: true; contactId: string | null; fact: string }
  | { ok: false; status: number; error: string }
> {
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return { ok: false, status: 400, error: 'Body must be JSON' };
  }
  const fact = typeof body?.fact === 'string' ? body.fact.trim() : '';
  if (!fact) return { ok: false, status: 400, error: 'fact required' };
  if (fact.length > MAX_FACT_LENGTH) {
    return { ok: false, status: 400, error: `fact must be ≤ ${MAX_FACT_LENGTH} chars` };
  }

  const contactId =
    typeof body?.contactId === 'string' && body.contactId.length > 0 ? body.contactId : null;
  if (contactId) {
    const { data: contact } = await (admin.from('contacts') as any)
      .select('id')
      .eq('id', contactId)
      .eq('user_id', ownerUserId)
      .maybeSingle();
    if (!contact) return { ok: false, status: 404, error: 'Contact not found' };
  }
  return { ok: true, contactId, fact };
}

async function loadPersonaRow(
  admin: ReturnType<typeof createAdminClient>,
  ownerUserId: string,
  contactId: string | null
) {
  const base = (admin.from('avatar_personas') as any)
    .select('id, persona_card')
    .eq('user_id', ownerUserId);
  const query = contactId
    ? base.eq('subject_contact_id', contactId)
    : base.is('subject_contact_id', null);
  const { data } = await query.maybeSingle();
  return data;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const resolved = await resolveSubjectFromBody(request, admin, user.id);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

  const row = await loadPersonaRow(admin, user.id, resolved.contactId);
  if (!row) {
    // Adding a fact before the persona has been synthesized is a UX trap —
    // the prompt builder needs an existing card to render alongside.
    // Tell the caller to synthesize first.
    return NextResponse.json(
      {
        error: 'no_persona',
        hint: 'Open this avatar to synthesize a persona first, then add facts.',
      },
      { status: 409 }
    );
  }

  const card = (row.persona_card as any) || {};
  const existingFacts: string[] = Array.isArray(card.manual_facts) ? card.manual_facts : [];
  // Dedupe (case-insensitive) so the same fact isn't added twice.
  const lower = resolved.fact.toLowerCase();
  if (existingFacts.some((f) => typeof f === 'string' && f.toLowerCase() === lower)) {
    return NextResponse.json({ ok: true, manual_facts: existingFacts, deduped: true });
  }
  if (existingFacts.length >= MAX_FACTS) {
    return NextResponse.json(
      { error: `max ${MAX_FACTS} manual facts; remove some before adding more` },
      { status: 400 }
    );
  }
  const nextFacts = [...existingFacts, resolved.fact];
  const nextCard = { ...card, manual_facts: nextFacts };

  const { error: updErr } = await (admin.from('avatar_personas') as any)
    .update({ persona_card: nextCard, updated_at: new Date().toISOString() })
    .eq('id', row.id);
  if (updErr) {
    console.error('[persona/facts] POST update error:', updErr);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, manual_facts: nextFacts });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const resolved = await resolveSubjectFromBody(request, admin, user.id);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

  const row = await loadPersonaRow(admin, user.id, resolved.contactId);
  if (!row) return NextResponse.json({ ok: true, manual_facts: [] });

  const card = (row.persona_card as any) || {};
  const existingFacts: string[] = Array.isArray(card.manual_facts) ? card.manual_facts : [];
  const lower = resolved.fact.toLowerCase();
  const nextFacts = existingFacts.filter((f) => typeof f === 'string' && f.toLowerCase() !== lower);
  if (nextFacts.length === existingFacts.length) {
    return NextResponse.json({ ok: true, manual_facts: existingFacts, removed: false });
  }
  const nextCard = { ...card, manual_facts: nextFacts };

  const { error: updErr } = await (admin.from('avatar_personas') as any)
    .update({ persona_card: nextCard, updated_at: new Date().toISOString() })
    .eq('id', row.id);
  if (updErr) {
    console.error('[persona/facts] DELETE update error:', updErr);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, manual_facts: nextFacts, removed: true });
}
