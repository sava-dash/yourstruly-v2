import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { GetPromptsResponse, ShufflePromptsRequest } from '@/types/engagement';

// GET /api/engagement/prompts
// Returns personalized prompts for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get count from query params
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '5');
    const regenerate = searchParams.get('regenerate') === 'true';

    // Call the shuffle function
    const { data: prompts, error: promptsError } = await supabase
      .rpc('get_engagement_prompts_v2', {
        p_user_id: user.id,
        p_count: count,
        p_regenerate: regenerate,
      });

    if (promptsError) {
      console.error('Failed to fetch prompts:', promptsError);
      return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
    }

    // Fetch engagement stats
    const { data: stats } = await supabase
      .from('engagement_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Mark prompts as shown to prevent repetition
    if (prompts && prompts.length > 0) {
      const promptIds = prompts.map((p: any) => p.id);
      // Non-critical, ignore errors
      try {
        await supabase.rpc('mark_prompts_shown', { p_prompt_ids: promptIds });
      } catch {
        // Ignore - this is non-critical
      }
    }

    // Enrich prompts with related data (photos, contacts)
    const enrichedPrompts = await Promise.all(
      (prompts || []).map(async (prompt: any) => {
        let photoUrl = null;
        let contactName = null;
        let contactPhotoUrl = null;

        // Fetch photo if present
        if (prompt.photo_id) {
          const { data: photo } = await supabase
            .from('memory_media')
            .select('file_url')
            .eq('id', prompt.photo_id)
            .single();
          photoUrl = photo?.file_url;
        }

        // Fetch contact if present
        if (prompt.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('full_name, avatar_url')
            .eq('id', prompt.contact_id)
            .single();
          contactName = contact?.full_name;
          contactPhotoUrl = contact?.avatar_url;
        }

        return {
          ...prompt,
          photo_url: photoUrl,
          contact_name: contactName,
          contact_photo_url: contactPhotoUrl,
        };
      })
    );

    const response: GetPromptsResponse = {
      prompts: enrichedPrompts,
      stats: stats ? {
        totalAnswered: stats.total_prompts_answered,
        totalSkipped: stats.total_prompts_skipped,
        currentStreakDays: stats.current_streak_days,
        longestStreakDays: stats.longest_streak_days,
        knowledgeEntries: stats.total_knowledge_entries,
        preferredInputType: stats.preferred_input_type,
        lastEngagementDate: stats.last_engagement_date,
      } : {
        totalAnswered: 0,
        totalSkipped: 0,
        currentStreakDays: 0,
        longestStreakDays: 0,
        knowledgeEntries: 0,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Engagement prompts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/engagement/prompts
// Shuffle and get new prompts
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ShufflePromptsRequest = await request.json();
    const count = body.count || 5;

    // Generate new prompts
    const { data: generated, error: genError } = await supabase
      .rpc('generate_engagement_prompts', {
        p_user_id: user.id,
        p_count: 20, // Generate more than we need
      });

    if (genError) {
      console.error('Failed to generate prompts:', genError);
    }

    // Fetch shuffled prompts
    const { data: prompts, error: fetchError } = await supabase
      .rpc('get_engagement_prompts_v2', {
        p_user_id: user.id,
        p_count: count,
        p_regenerate: true,
      });

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to shuffle prompts' }, { status: 500 });
    }

    return NextResponse.json({ prompts });

  } catch (error) {
    console.error('Shuffle prompts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
