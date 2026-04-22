'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchPromptEnrichmentMaps } from '@/lib/engagement/enrich-prompts';
import { rankPrompts, type StreakStatus } from '@/lib/engagement/prompt-scoring';
import type { EngagementPrompt, PromptResponse, EngagementStats } from '@/types/engagement';

interface UseEngagementPromptsReturn {
  prompts: EngagementPrompt[];
  isLoading: boolean;
  error: Error | null;
  stats: EngagementStats | null;
  shuffle: () => Promise<void>;
  answerPrompt: (promptId: string, response: PromptResponse, opts?: { skipXp?: boolean }) => Promise<any>;
  skipPrompt: (promptId: string) => Promise<void>;
  dismissPrompt: (promptId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Best-effort streak classification from the cached EngagementStats. The
 * server is the source of truth; this is only used as a scoring hint, so
 * if anything's missing we degrade to 'none'.
 */
function deriveStreakStatus(stats: EngagementStats | null): StreakStatus {
  if (!stats) return 'none';
  const streak = stats.currentStreakDays ?? 0;
  if (streak <= 0) return 'none';
  const today = new Date().toISOString().split('T')[0];
  const last = stats.lastEngagementDate;
  if (!last) return 'none';
  if (last === today) return 'active_engaged_today';
  // Last engagement was earlier than today and streak is still positive ⇒
  // user hasn't yet engaged today; pick morning vs evening by current hour.
  const hour = new Date().getHours();
  return hour < 18 ? 'active_not_engaged_today_morning' : 'active_not_engaged_today_evening';
}

export function useEngagementPrompts(count: number = 5, lifeChapter: string | null = null): UseEngagementPromptsReturn {
  const [prompts, setPrompts] = useState<EngagementPrompt[]>([]);
  const [stats, setStats] = useState<EngagementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isFetching = useRef(false);
  const hasTriedAiFallback = useRef(false);
  const hasTriedSeedFallback = useRef(false);
  const promptsRef = useRef(prompts);
  promptsRef.current = prompts;

  const supabase = createClient();

  // Fetch prompts with related data.
  // `background=true` skips the loading state so the feed doesn't
  // flash to skeletons while the user is mid-interaction.
  const fetchPrompts = useCallback(async (regenerate: boolean = false, background: boolean = false) => {
    // Prevent concurrent fetches
    if (isFetching.current) return;
    isFetching.current = true;

    // A manual regenerate re-arms the AI fallback so the user can
    // trigger another batch after tapping Shuffle.
    if (regenerate) hasTriedAiFallback.current = false;

    try {
      if (!background) setIsLoading(true);
      setError(null);

      // Use getSession instead of getUser to avoid lock contention
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');
      const user = session.user;

      // Pull any still-pending prompt (seed_library, template, system, AI) —
      // not just `source = 'seed_library'`. The old filter hid every
      // chapter-specific row that generate_engagement_prompts materialized
      // from prompt_templates, so chapters like high_school/college/teenage
      // fell through to the sparse AI fallback even though 50+ templates
      // existed for each chapter. Ordered by priority DESC so the
      // "We Were Listening" first-session sequence still serves in order.
      let rawPrompts: any[] | null = null;
      let fetchError: any = null;

      // Exclude anything we just rendered. Without this, priority-DESC
      // returns the same top-N rows on every shuffle / LoadMoreSentinel
      // hit — the user sees "new cards" reload to the same cards. The
      // 6-hour window mirrors shuffle_engagement_prompts (the legacy RPC)
      // so both lanes rotate through the pool at the same rate.
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

      let seedQuery = supabase
        .from('engagement_prompts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .or(`shown_at.is.null,shown_at.lt.${sixHoursAgo}`);

      if (lifeChapter) {
        seedQuery = seedQuery.or(
          `category.eq.${lifeChapter},life_chapter.eq.${lifeChapter}`
        );
      }

      const { data: seedPrompts, error: seedErr } = await seedQuery
        .order('priority', { ascending: false })
        .limit(count);

      if (!seedErr && seedPrompts && seedPrompts.length > 0) {
        // Use seed_library prompts directly (bypass old shuffle RPC)
        rawPrompts = seedPrompts;
      } else {
        // Seed library exhausted or not yet populated.
        // Try the NEW AI engine first (journalist-friend spec),
        // then fall back to old shuffle RPC only if AI also fails.
        if (!hasTriedAiFallback.current) {
          hasTriedAiFallback.current = true;
          try {
            const genRes = await fetch('/api/engagement/generate-ai-prompts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ count: 15, chapter: lifeChapter || undefined }),
            });
            const genData = await genRes.json().catch(() => ({}));
            if (genRes.ok && (genData?.generated ?? 0) > 0) {
              // Re-fetch the newly generated prompts
              const { data: freshPrompts } = await supabase
                .from('engagement_prompts')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .order('priority', { ascending: false })
                .limit(count);
              rawPrompts = freshPrompts;
            }
          } catch (e) {
            console.error('[useEngagementPrompts] New AI generation failed', e);
          }
        }

        // If still no prompts, fall back to old shuffle RPC
        if (!rawPrompts || rawPrompts.length === 0) {
          const { data: rpcData, error: rpcErr } = await supabase
            .rpc('shuffle_engagement_prompts', {
              p_user_id: user.id,
              p_count: count,
              p_regenerate: regenerate,
              p_life_chapter: lifeChapter,
            });
          rawPrompts = rpcData;
          fetchError = rpcErr;
        }
      }

      if (fetchError) throw fetchError;

      if (!rawPrompts || rawPrompts.length === 0) {
        // Genuinely empty pool — fall through to the AI generator so the
        // user never runs out of cards. We only try once per mount to
        // avoid infinite loops if the endpoint fails.
        // Try seed-first-session bootstrap before AI fallback
        if (!hasTriedSeedFallback.current) {
          hasTriedSeedFallback.current = true;
          try {
            const seedRes = await fetch('/api/engagement/seed-first-session', { method: 'POST' });
            const seedData = await seedRes.json().catch(() => ({}));
            if (seedRes.ok && (seedData?.seeded ?? 0) > 0) {
              isFetching.current = false;
              await fetchPrompts(true);
              return;
            }
          } catch (seedErr) {
            console.error('[useEngagementPrompts] Seed fallback failed', seedErr);
          }
        }

        if (!hasTriedAiFallback.current) {
          hasTriedAiFallback.current = true;
          try {
            const genRes = await fetch('/api/engagement/generate-ai-prompts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ count: 25, chapter: lifeChapter || undefined }),
            });
            const genData = await genRes.json().catch(() => ({}));
            if (genRes.ok && (genData?.generated ?? 0) > 0) {
              // Re-run shuffle now that fresh rows exist
              isFetching.current = false;
              await fetchPrompts(true);
              return;
            }
          } catch (aiErr) {
            console.error('[useEngagementPrompts] AI fallback failed', aiErr);
          }
        }
        setPrompts([]);
        await fetchStats();
        return;
      }

      // Fetch photo + contact lookup maps (shared helper)
      const { photosMap, photoMetaMap, contactsMap } =
        await fetchPromptEnrichmentMaps(supabase, rawPrompts);

      // Transform data with resolved URLs
      const transformedPrompts: EngagementPrompt[] = rawPrompts.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        type: p.type,
        category: p.category,
        lifeChapter: p.life_chapter,
        promptText: p.prompt_text,
        status: p.status,
        priority: p.priority,
        source: p.source,
        tier: p.tier ?? 0,
        photoUrl: p.photo_id ? photosMap[p.photo_id] : undefined,
        photoId: p.photo_id,
        photoMetadata: p.photo_id ? photoMetaMap[p.photo_id] : undefined,
        contactId: p.contact_id,
        contactName: p.contact_id ? contactsMap[p.contact_id]?.name : undefined,
        contactPhotoUrl: p.contact_id ? contactsMap[p.contact_id]?.photo : undefined,
        memoryId: p.memory_id,
        missingField: p.missing_field,
        metadata: p.metadata,
        personalizationContext: p.personalization_context,
        createdAt: p.created_at,
      }));

      // Client-side dedup: only remove exact duplicate prompt_text. The
      // legacy BLOCKED_PATTERNS filter was disabled at the SQL level in
      // 20260322_relationship_prompts_and_cleanup.sql — duplicating the
      // block on the client was just discarding rows for no reason.
      const seenTexts = new Set<string>();
      const dedupedPrompts = transformedPrompts.filter(p => {
        const text = p.promptText?.toLowerCase().trim();
        if (!text || seenTexts.has(text)) return false;
        seenTexts.add(text);
        return true;
      });

      // Tier-aware sorting: tier ASC → priority DESC → random within same bucket
      const sorted = dedupedPrompts.sort((a, b) => {
        const tierA = (a as any).tier ?? 0;
        const tierB = (b as any).tier ?? 0;
        if (tierA !== tierB) return tierA - tierB;
        const prioA = a.priority ?? 0;
        const prioB = b.priority ?? 0;
        if (prioA !== prioB) return prioB - prioA; // DESC
        return Math.random() - 0.5;
      });

      // Apply PROMPT-ORDERING-STRATEGY scoring on top of tier sort: re-ranks
      // within tiers using time-of-day, freshness, photo relevance, and
      // variety so the queue reads more like a human producer ordered it.
      // Recently-shown types come from the queue we're replacing so the
      // first item of the new queue isn't a clone of the last item of the
      // previous one.
      const recentlyShownTypes = promptsRef.current.slice(-3).map((p) => p.type);
      const ranked = rankPrompts(sorted, {
        recentlyShownTypes,
        streakStatus: deriveStreakStatus(stats),
      });

      setPrompts(ranked);
      await fetchStats();

      // Stamp shown_at on every row we just surfaced so the next shuffle
      // advances through the pool instead of re-serving the same
      // priority-DESC top-N. Fire-and-forget: if this fails the user still
      // gets cards, they just won't rotate until the 6-hour cooldown.
      // shuffle_engagement_prompts (legacy RPC) already stamps internally,
      // so double-stamping is harmless when that lane wins.
      const shownIds = ranked.map((p) => p.id).filter(Boolean);
      if (shownIds.length > 0) {
        supabase
          .from('engagement_prompts')
          .update({ shown_at: new Date().toISOString() })
          .in('id', shownIds)
          .then(({ error: stampErr }) => {
            if (stampErr) console.error('[useEngagementPrompts] shown_at stamp failed', stampErr);
          });
      }

    } catch (err) {
      console.error('Failed to fetch prompts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch prompts'));
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [count, lifeChapter, supabase]);

  // Fetch engagement stats
  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const user = session.user;

      // Record daily activity to keep streak current
      try {
        await supabase.rpc('record_daily_activity', {
          p_user_id: user.id,
          p_activity_type: 'app_usage',
        });
      } catch {}

      const { data, error: statsError } = await supabase
        .from('engagement_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Handle missing table gracefully (406 = table doesn't exist, 42P01 = relation does not exist)
      if (statsError && statsError.code !== 'PGRST116') {
        if (statsError.code === '42P01' || statsError.message?.includes('406')) {
          console.warn('engagement_stats table not configured, using defaults');
          return;
        }
        console.error('Stats error:', statsError);
        return;
      }

      if (data) {
        setStats({
          totalAnswered: data.total_prompts_answered || 0,
          totalSkipped: data.total_prompts_skipped || 0,
          currentStreakDays: data.current_streak_days || 0,
          longestStreakDays: data.longest_streak_days || 0,
          knowledgeEntries: data.total_knowledge_entries || 0,
          preferredInputType: data.preferred_input_type,
          lastEngagementDate: data.last_engagement_date,
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Shuffle (get new prompts)
  const shuffle = useCallback(async () => {
    await fetchPrompts(true);
  }, [fetchPrompts]);

  // Answer a prompt - calls API route which handles all the saving logic
  const answerPrompt = useCallback(async (promptId: string, response: PromptResponse, opts?: { skipXp?: boolean }) => {
    try {
      // Call the API route (not just the RPC) so it can handle
      // creating knowledge entries, updating photos, etc.
      const res = await fetch(`/api/engagement/prompts/${promptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseType: response.type,
          responseText: response.text,
          responseAudioUrl: response.audioUrl,
          responseVideoUrl: response.videoUrl,
          responseData: response.data,
          skipXp: opts?.skipXp === true,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Answer prompt API error:', error);
        throw new Error(error.details || error.error || 'Failed to answer prompt');
      }

      const result = await res.json();

      // Remove from local state
      setPrompts(prev => {
        const filtered = prev.filter(p => p.id !== promptId);
        // Fetch more if running low (using fresh count, not stale closure)
        if (filtered.length <= 2) {
          // Schedule fetch after state settles
          setTimeout(() => fetchPrompts(false, true), 100);
        }
        return filtered;
      });

      // Refresh stats
      await fetchStats();
      
      // Return the result so caller can get memoryId, etc.
      return result;

    } catch (err) {
      console.error('Failed to answer prompt:', err);
      throw err;
    }
  }, [fetchPrompts]);

  // Skip a prompt
  const skipPrompt = useCallback(async (promptId: string) => {
    try {
      const { error: skipError } = await supabase
        .rpc('skip_prompt', {
          p_prompt_id: promptId,
          p_cooldown_days: 7,
        });

      if (skipError) throw skipError;

      // Remove from local state, fetch more if running low
      setPrompts(prev => {
        const filtered = prev.filter(p => p.id !== promptId);
        if (filtered.length <= 2) {
          setTimeout(() => fetchPrompts(false, true), 100);
        }
        return filtered;
      });

    } catch (err) {
      console.error('Failed to skip prompt:', err);
      throw err;
    }
  }, [fetchPrompts, supabase]);

  // Dismiss a prompt (don't show again)
  const dismissPrompt = useCallback(async (promptId: string) => {
    try {
      const { error: dismissError } = await supabase
        .rpc('dismiss_prompt', {
          p_prompt_id: promptId,
        });

      if (dismissError) throw dismissError;

      // Remove from local state, fetch more if running low
      setPrompts(prev => {
        const filtered = prev.filter(p => p.id !== promptId);
        if (filtered.length <= 2) {
          setTimeout(() => fetchPrompts(false, true), 100);
        }
        return filtered;
      });

    } catch (err) {
      console.error('Failed to dismiss prompt:', err);
      throw err;
    }
  }, [fetchPrompts, supabase]);

  // Fetch prompts when category changes.
  // Force-reset `isFetching` so the new fetch isn't skipped when the
  // previous (different-category) fetch is still in flight. The old
  // results are stale and will be overwritten by the new fetch.
  useEffect(() => {
    isFetching.current = false;
    hasTriedAiFallback.current = false;

    const checkAuthAndFetch = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          fetchPrompts();
        } else {
          setPrompts([]);
          setStats(null);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setIsLoading(false);
      }
    };
    checkAuthAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifeChapter, count]); // Re-fetch when category/count changes

  return {
    prompts,
    isLoading,
    error,
    stats,
    shuffle,
    answerPrompt,
    skipPrompt,
    dismissPrompt,
    refetch: () => fetchPrompts(false),
  };
}
