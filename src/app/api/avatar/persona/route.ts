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

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: existing } = await (admin.from('avatar_personas') as any)
    .select('persona_card, version, source_count, last_synthesized_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      persona: existing.persona_card,
      version: existing.version,
      sourceCount: existing.source_count,
      lastSynthesizedAt: existing.last_synthesized_at,
      synthesized: false,
    });
  }

  // First read with no cache: synthesize once and return.
  try {
    const result = await synthesizePersona(admin, user.id);
    if (!result) {
      return NextResponse.json({
        persona: null,
        synthesized: false,
        reason: 'insufficient_source_material',
        hint: 'Add a few memories or answer a few engagement prompts so we have something to learn from.',
      });
    }
    return NextResponse.json({
      persona: result.persona,
      sourceCount: result.sourceCount,
      synthesized: true,
    });
  } catch (err) {
    console.error('[avatar/persona] GET synth error:', err);
    return NextResponse.json({ error: 'Persona synthesis failed' }, { status: 500 });
  }
}

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  try {
    const result = await synthesizePersona(admin, user.id);
    if (!result) {
      return NextResponse.json({
        persona: null,
        synthesized: false,
        reason: 'insufficient_source_material',
      });
    }
    return NextResponse.json({
      persona: result.persona,
      sourceCount: result.sourceCount,
      synthesized: true,
    });
  } catch (err) {
    console.error('[avatar/persona] POST synth error:', err);
    return NextResponse.json({ error: 'Persona synthesis failed' }, { status: 500 });
  }
}
