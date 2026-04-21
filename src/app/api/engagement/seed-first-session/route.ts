import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SeedPrompt, PromptAnchor, PromptAngle } from '@/lib/engagement/seed-types';

// POST /api/engagement/seed-first-session
// Idempotent: seeds the first-session prompt sequence from onboarding data.
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Idempotent guard: skip if user already has seed_library prompts
    // (allows re-seeding for users who only have old-style system prompts)
    const { count, error: countErr } = await supabase
      .from('engagement_prompts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('source', 'seed_library');

    if (countErr) {
      console.error('[seed-first-session] count check failed:', countErr);
      return NextResponse.json({ error: 'Failed to check existing prompts' }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json({ seeded: 0, reason: 'already_seeded' });
    }

    // Dismiss ALL old non-seed prompts so new seeds take priority
    await supabase
      .from('engagement_prompts')
      .update({ status: 'dismissed' })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .neq('source', 'seed_library');

    // Load onboarding data in parallel
    const [profileRes, contactsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, hometown, interests, hobbies, why_here, locations_lived, birth_date')
        .eq('id', user.id)
        .single(),
      supabase
        .from('contacts')
        .select('full_name, relationship_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(5),
    ]);

    const profile = profileRes.data ?? {} as any;
    const contacts = contactsRes.data ?? [];

    // Build placeholder resolution map
    const firstPlace = profile.locations_lived?.[0] ?? profile.hometown ?? null;
    const interests: string[] = profile.interests ?? [];
    const whyText: string = profile.why_here ?? '';

    // Compute decade from birth_date
    let decade: string | null = null;
    if (profile.birth_date) {
      const birthYear = new Date(profile.birth_date).getFullYear();
      const now = new Date().getFullYear();
      const age = now - birthYear;
      const decadeNum = Math.floor(age / 10) * 10;
      const decadeNames: Record<number, string> = {
        10: 'teens', 20: 'twenties', 30: 'thirties', 40: 'forties',
        50: 'fifties', 60: 'sixties', 70: 'seventies', 80: 'eighties',
        90: 'nineties',
      };
      decade = decadeNames[decadeNum] ?? `${decadeNum}s`;
    }

    // Load Tier 0 seed prompts
    const { data: seeds, error: seedErr } = await supabase
      .from('prompt_seed_library')
      .select('*')
      .eq('tier', 0)
      .eq('is_active', true);

    if (seedErr || !seeds || seeds.length === 0) {
      console.error('[seed-first-session] No tier-0 seeds found:', seedErr);
      return NextResponse.json({ error: 'No seed prompts available' }, { status: 500 });
    }

    const universals = seeds.filter((s: any) => !s.anchor);
    const anchored = seeds.filter((s: any) => !!s.anchor);

    // Group anchored by anchor type
    const byAnchor: Record<string, any[]> = {};
    for (const s of anchored) {
      const key = s.anchor as string;
      if (!byAnchor[key]) byAnchor[key] = [];
      byAnchor[key].push(s);
    }

    // Helper: pick + remove from array
    const pickFrom = (arr: any[]): any | null => {
      if (arr.length === 0) return null;
      const idx = Math.floor(Math.random() * arr.length);
      return arr.splice(idx, 1)[0];
    };

    // Helper: pick a universal with a specific angle
    const pickUniversal = (angle: PromptAngle): any | null => {
      const idx = universals.findIndex((s: any) => s.angle === angle);
      if (idx >= 0) return universals.splice(idx, 1)[0];
      return pickFrom(universals);
    };

    // Resolve placeholders in template text.
    // Returns null if anchored data is missing (caller should skip the prompt).
    const resolve = (text: string, anchor: string | null): string | null => {
      // Check if the prompt requires data we don't have — return null to skip
      if (anchor === 'place' && !firstPlace) return null;
      if (anchor === 'person' && contacts.length === 0) return null;
      if (anchor === 'interest' && interests.length === 0) return null;
      if (anchor === 'why_here' && !whyText) return null;

      return text
        .replace(/\{place\}/gi, firstPlace || '')
        .replace(/\{hometown\}/gi, firstPlace || '')
        .replace(/\{person_name\}/gi, contacts[0]?.full_name || '')
        .replace(/\{interest\}/gi, interests[0] || '')
        .replace(/\{why_text\}/gi, whyText || '')
        .replace(/\{decade\}/gi, 'when you were younger');
    };

    // Build the "We Were Listening" interleaved sequence (slots 1-10)
    type SlotDef = { anchor: string | null; angle: PromptAngle | null; contactIdx?: number };
    const slotDefs: SlotDef[] = [
      { anchor: 'place', angle: null },
      { anchor: null, angle: 'feeling' },
      { anchor: 'person', angle: null, contactIdx: 0 },
      { anchor: null, angle: 'event' },
      { anchor: 'interest', angle: null },
      { anchor: null, angle: 'place' },
      { anchor: 'why_here', angle: null },
      { anchor: null, angle: 'object' },
      { anchor: 'person', angle: null, contactIdx: 1 },
      { anchor: null, angle: 'turning_point' },
    ];

    const sequence: any[] = [];

    for (const slot of slotDefs) {
      let picked: any = null;

      if (slot.anchor) {
        // Check if we have data for this anchor type — skip anchored entirely if not
        const hasData =
          (slot.anchor === 'place' && firstPlace) ||
          (slot.anchor === 'person' && contacts.length > 0) ||
          (slot.anchor === 'interest' && interests.length > 0) ||
          (slot.anchor === 'why_here' && whyText);

        if (hasData) {
          const candidates = byAnchor[slot.anchor];
          if (candidates && candidates.length > 0) {
            picked = pickFrom(candidates);
            if (picked && slot.anchor === 'person') {
              const contact = contacts[slot.contactIdx ?? 0] ?? contacts[0];
              if (contact) {
                picked = { ...picked, text: picked.text.replace(/\{person_name\}/gi, contact.full_name) };
              }
            }
          }
        }
        // If no data for anchor or no candidates, use a universal instead
        if (!picked) {
          picked = pickFrom(universals);
        }
      } else {
        // Universal with preferred angle
        picked = pickUniversal(slot.angle!);
      }

      if (picked) {
        sequence.push(picked);
      }
    }

    // Positions 11-30: 20 more Tier 0 prompts (mixed)
    const remaining = [...universals, ...Object.values(byAnchor).flat()];
    // Shuffle remaining
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    const extras = remaining.slice(0, 20);

    // Build INSERT rows
    const now = new Date().toISOString();
    const rows: any[] = [];

    for (let i = 0; i < sequence.length; i++) {
      const seed = sequence[i];
      const resolved = resolve(seed.text, seed.anchor);
      if (!resolved) continue; // Skip if anchored data is missing
      rows.push({
        user_id: user.id,
        type: 'memory_prompt',
        prompt_text: resolved,
        tier: 0,
        angle: seed.angle,
        anti_repeat_group: seed.anti_repeat_group || null,
        priority: 100 - i,
        source: 'seed_library',
        status: 'pending',
        created_at: now,
      });
    }

    for (let i = 0; i < extras.length; i++) {
      const seed = extras[i];
      const resolved = resolve(seed.text, seed.anchor);
      if (!resolved) continue; // Skip if anchored data is missing
      const position = sequence.length + i + 1;
      rows.push({
        user_id: user.id,
        type: 'memory_prompt',
        prompt_text: resolved,
        tier: 0,
        angle: seed.angle,
        anti_repeat_group: seed.anti_repeat_group || null,
        priority: position <= 20 ? 90 - i : 80 - i,
        source: 'seed_library',
        status: 'pending',
        created_at: now,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ seeded: 0, reason: 'no_prompts_generated' });
    }

    // Insert all prompts
    const { error: insertErr } = await supabase
      .from('engagement_prompts')
      .insert(rows);

    if (insertErr) {
      console.error('[seed-first-session] insert failed:', insertErr);
      return NextResponse.json({ error: 'Failed to insert seed prompts' }, { status: 500 });
    }

    // Set prompt_tier = 0
    await supabase
      .from('profiles')
      .update({ prompt_tier: 0 })
      .eq('id', user.id);

    return NextResponse.json({ seeded: rows.length });

  } catch (error) {
    console.error('[seed-first-session] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
