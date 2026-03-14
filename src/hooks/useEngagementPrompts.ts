'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EngagementPrompt, PromptResponse, EngagementStats } from '@/types/engagement';

interface UseEngagementPromptsReturn {
  prompts: EngagementPrompt[];
  isLoading: boolean;
  error: Error | null;
  stats: EngagementStats | null;
  shuffle: () => Promise<void>;
  answerPrompt: (promptId: string, response: PromptResponse) => Promise<void>;
  skipPrompt: (promptId: string) => Promise<void>;
  dismissPrompt: (promptId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useEngagementPrompts(count: number = 5, lifeChapter: string | null = null): UseEngagementPromptsReturn {
  const [prompts, setPrompts] = useState<EngagementPrompt[]>([]);
  const [stats, setStats] = useState<EngagementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isFetching = useRef(false);

  const supabase = createClient();

  // Fetch prompts with related data
  const fetchPrompts = useCallback(async (regenerate: boolean = false) => {
    // Prevent concurrent fetches
    if (isFetching.current) return;
    isFetching.current = true;
    
    try {
      setIsLoading(true);
      setError(null);

      // Use getSession instead of getUser to avoid lock contention
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');
      const user = session.user;

      // Call the shuffle function to get/generate prompts
      const { data: rawPrompts, error: fetchError } = await supabase
        .rpc('shuffle_engagement_prompts', {
          p_user_id: user.id,
          p_count: count,
          p_regenerate: regenerate,
          p_life_chapter: lifeChapter,
        });

      if (fetchError) throw fetchError;

      if (!rawPrompts || rawPrompts.length === 0) {
        setPrompts([]);
        await fetchStats();
        return;
      }

      // Collect IDs we need to fetch
      const photoIds = rawPrompts
        .filter((p: any) => p.photo_id)
        .map((p: any) => p.photo_id);
      
      const contactIds = rawPrompts
        .filter((p: any) => p.contact_id)
        .map((p: any) => p.contact_id);

      // Fetch related photos
      let photosMap: Record<string, string> = {};
      if (photoIds.length > 0) {
        const { data: photos } = await supabase
          .from('memory_media')
          .select('id, file_url')
          .in('id', photoIds);
        
        if (photos) {
          photosMap = Object.fromEntries(
            photos.map((p: any) => [p.id, p.file_url])
          );
        }
      }

      // Fetch related contacts
      let contactsMap: Record<string, { name: string; photo?: string }> = {};
      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, full_name, avatar_url')
          .in('id', contactIds);
        
        if (contacts && contacts.length > 0) {
          contactsMap = Object.fromEntries(
            contacts.map((c: any) => [c.id, { name: c.full_name, photo: c.avatar_url }])
          );
        }
      }

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
        photoUrl: p.photo_id ? photosMap[p.photo_id] : undefined,
        photoId: p.photo_id,
        contactId: p.contact_id,
        contactName: p.contact_id ? contactsMap[p.contact_id]?.name : undefined,
        contactPhotoUrl: p.contact_id ? contactsMap[p.contact_id]?.photo : undefined,
        memoryId: p.memory_id,
        missingField: p.missing_field,
        metadata: p.metadata,
        personalizationContext: p.personalization_context,
        createdAt: p.created_at,
      }));

      setPrompts(transformedPrompts);
      await fetchStats();

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
  const answerPrompt = useCallback(async (promptId: string, response: PromptResponse) => {
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
          responseData: response.data,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Answer prompt API error:', error);
        throw new Error(error.details || error.error || 'Failed to answer prompt');
      }

      const result = await res.json();
      console.log('Answer prompt result:', result);

      // Remove from local state
      setPrompts(prev => prev.filter(p => p.id !== promptId));

      // Refresh stats
      await fetchStats();

      // Fetch more if running low
      if (prompts.length <= 2) {
        await fetchPrompts();
      }
      
      // Return the result so caller can get memoryId, etc.
      return result;

    } catch (err) {
      console.error('Failed to answer prompt:', err);
      throw err;
    }
  }, [prompts.length, fetchPrompts]);

  // Skip a prompt
  const skipPrompt = useCallback(async (promptId: string) => {
    try {
      const { error: skipError } = await supabase
        .rpc('skip_prompt', {
          p_prompt_id: promptId,
          p_cooldown_days: 7,
        });

      if (skipError) throw skipError;

      // Remove from local state
      setPrompts(prev => prev.filter(p => p.id !== promptId));

      // Fetch replacement
      if (prompts.length <= 2) {
        await fetchPrompts();
      }

    } catch (err) {
      console.error('Failed to skip prompt:', err);
      throw err;
    }
  }, [prompts.length, fetchPrompts, supabase]);

  // Dismiss a prompt (don't show again)
  const dismissPrompt = useCallback(async (promptId: string) => {
    try {
      const { error: dismissError } = await supabase
        .rpc('dismiss_prompt', {
          p_prompt_id: promptId,
        });

      if (dismissError) throw dismissError;

      // Remove from local state
      setPrompts(prev => prev.filter(p => p.id !== promptId));

      // Fetch replacement
      if (prompts.length <= 2) {
        await fetchPrompts();
      }

    } catch (err) {
      console.error('Failed to dismiss prompt:', err);
      throw err;
    }
  }, [prompts.length, fetchPrompts, supabase]);

  // Fetch prompts when category changes
  useEffect(() => {
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
  }, [lifeChapter, fetchPrompts]); // Re-fetch when category changes

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
