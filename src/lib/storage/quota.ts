import type { SupabaseClient } from '@supabase/supabase-js'

const FREE_TIER_BYTES = 10 * 1024 * 1024 * 1024 // 10 GB

export interface StorageQuota {
  used: number
  limit: number
  remaining: number
}

/**
 * Computes storage used + the tier limit for a user. Used is derived from
 * memory_media.file_size (the canonical source) plus a rough estimate for
 * knowledge_entries audio (which lives outside memory_media).
 *
 * The limit is pulled from the user's active subscription plan; falls back
 * to the 10 GB free tier for users without a subscription row yet.
 */
export async function getStorageQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<StorageQuota> {
  const [{ data: media }, { data: knowledge }, { data: subRow }] = await Promise.all([
    supabase
      .from('memory_media')
      .select('file_size')
      .eq('user_id', userId)
      .not('file_size', 'is', null),
    supabase
      .from('knowledge_entries')
      .select('audio_url')
      .eq('user_id', userId),
    supabase
      .from('user_subscriptions')
      .select('plan:subscription_plans(storage_limit_bytes)')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  let used = 0
  for (const m of media || []) used += (m.file_size as number) || 0

  // knowledge audio clips aren't tracked in memory_media; budget ~150KB each
  const audioCount = (knowledge || []).filter(
    k => typeof k.audio_url === 'string' && k.audio_url.includes('supabase'),
  ).length
  used += audioCount * 150 * 1024

  const plan = Array.isArray((subRow as any)?.plan)
    ? (subRow as any).plan[0]
    : (subRow as any)?.plan
  const limit = (plan?.storage_limit_bytes as number) || FREE_TIER_BYTES

  return { used, limit, remaining: Math.max(0, limit - used) }
}
