import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Advancement rules:
 * Tier 0 -> 1: 5 answered prompts
 * Tier 1 -> 2: 15 answered + >= 3 contacts
 * Tier 2 -> 3: 40 answered + >= 5 memories
 * Tier 3 -> 4: 100 answered + >= 20 memories
 */
const TIER_RULES: {
  from: number;
  to: number;
  answeredMin: number;
  extra?: { table: string; minCount: number };
}[] = [
  { from: 0, to: 1, answeredMin: 5 },
  { from: 1, to: 2, answeredMin: 15, extra: { table: 'contacts', minCount: 3 } },
  { from: 2, to: 3, answeredMin: 40, extra: { table: 'memories', minCount: 5 } },
  { from: 3, to: 4, answeredMin: 100, extra: { table: 'memories', minCount: 20 } },
];

export async function checkAndAdvanceTier(
  supabase: SupabaseClient,
  userId: string
): Promise<{ advanced: boolean; newTier: number }> {
  // Read current tier + answered count
  const { data: profile } = await supabase
    .from('profiles')
    .select('prompt_tier, prompts_answered_count')
    .eq('id', userId)
    .single();

  if (!profile) return { advanced: false, newTier: 0 };

  const currentTier: number = profile.prompt_tier ?? 0;
  const answered: number = profile.prompts_answered_count ?? 0;

  const rule = TIER_RULES.find((r) => r.from === currentTier);
  if (!rule) return { advanced: false, newTier: currentTier };

  // Check answered threshold
  if (answered < rule.answeredMin) return { advanced: false, newTier: currentTier };

  // Check extra criteria (contact/memory counts)
  if (rule.extra) {
    const { count } = await supabase
      .from(rule.extra.table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((count ?? 0) < rule.extra.minCount) {
      return { advanced: false, newTier: currentTier };
    }
  }

  // Advance: update tier
  const newTier = rule.to;
  await supabase
    .from('profiles')
    .update({ prompt_tier: newTier })
    .eq('id', userId);

  // Seed next-tier prompts from library
  const { data: seeds } = await supabase
    .from('prompt_seed_library')
    .select('*')
    .eq('tier', newTier)
    .eq('is_active', true);

  if (seeds && seeds.length > 0) {
    // Load user data for placeholder resolution
    const { data: prof } = await supabase
      .from('profiles')
      .select('hometown, interests, why_here, locations_lived')
      .eq('id', userId)
      .single();

    const { data: contacts } = await supabase
      .from('contacts')
      .select('full_name')
      .eq('user_id', userId)
      .limit(5);

    const place = prof?.locations_lived?.[0] ?? prof?.hometown ?? 'your hometown';
    const person = contacts?.[0]?.full_name ?? 'someone close to you';
    const interest = prof?.interests?.[0] ?? 'something you love';
    const whyText = prof?.why_here ?? 'preserving memories';

    const resolve = (text: string): string =>
      text
        .replace(/\{place\}/gi, place)
        .replace(/\{person_name\}/gi, person)
        .replace(/\{interest\}/gi, interest)
        .replace(/\{why_text\}/gi, whyText);

    const now = new Date().toISOString();
    const rows = seeds.map((s: any, i: number) => ({
      user_id: userId,
      type: 'memory_prompt',
      prompt_text: resolve(s.text),
      tier: newTier,
      angle: s.angle,
      anti_repeat_group: s.anti_repeat_group || null,
      priority: 70,
      sort_order: i + 1,
      source: 'seed_library',
      status: 'pending',
      created_at: now,
    }));

    await supabase.from('engagement_prompts').insert(rows);
  }

  return { advanced: true, newTier };
}
