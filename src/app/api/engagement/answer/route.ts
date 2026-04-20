import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractAndPersistWithMetrics } from '@/lib/interviews/extract-entities'
import { generateEmbedding } from '@/lib/ai/providers'

const AnswerSchema = z.object({
  promptId: z.string().uuid().optional(),
  promptType: z.enum(['knowledge', 'memory', 'reflection', 'gratitude']),
  responseType: z.string().min(1).max(50),
  responseText: z.string().min(1).max(5000),
  contactId: z.string().uuid().optional(),
})

/**
 * POST /api/engagement/answer
 * Save a text response to an engagement prompt as a memory
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = AnswerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const {
      promptId,
      promptType,
      responseType,
      responseText,
      contactId,
    } = parsed.data

    // Determine memory type based on prompt type
    const memoryType = promptType === 'knowledge' ? 'wisdom' : 'memory'

    // Generate a title from the response
    const title = responseText.length > 60 
      ? responseText.substring(0, 60) + '...'
      : responseText

    // Create memory from the response
    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        title,
        description: responseText,
        memory_type: memoryType,
        memory_date: new Date().toISOString().split('T')[0],
        ai_labels: {
          source: 'engagement_prompt',
          prompt_id: promptId,
          prompt_type: promptType,
          response_type: responseType,
          contact_id: contactId || null,
        },
      })
      .select('id')
      .single()

    if (memoryError) {
      console.error('Failed to create memory:', memoryError)
      return NextResponse.json(
        { error: 'Failed to save response', details: memoryError.message },
        { status: 500 }
      )
    }

    // Mark the engagement prompt as answered if it exists
    if (promptId) {
      await supabase
        .from('engagement_prompts')
        .update({ 
          status: 'answered',
          answered_at: new Date().toISOString(),
        })
        .eq('id', promptId)
        .eq('user_id', user.id)
    }

    // Fire-and-forget entity extraction so the avatar's RAG pipeline
    // gets people / places / times / topics for this engagement answer.
    // Uses admin client because the request will return before the
    // background work finishes and we don't want the user's per-request
    // supabase client GC'd mid-update.
    extractAndPersistWithMetrics(createAdminClient(), {
      videoResponseId: null,
      memoryId: memory.id,
      transcript: responseText,
      userId: user.id,
    })

    // Auto-embed so the memory is immediately retrievable in RAG.
    ;(async () => {
      try {
        const text = [
          `Memory: ${title}`,
          responseText,
          `Category: ${memoryType}`,
        ].filter(Boolean).join(' | ')
        const embedding = await generateEmbedding(text)
        await createAdminClient().from('memories')
          .update({ embedding, embedding_text: text })
          .eq('id', memory.id)
      } catch (err) {
        console.error('[engagement/answer] embed failed:', err instanceof Error ? err.message : err)
      }
    })()

    // Award XP
    const xpAmount = promptType === 'knowledge' ? 15 : 10
    try {
      await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_action: 'answer_engagement',
        p_metadata: { 
          prompt_type: promptType,
          memory_id: memory.id,
        },
      })
    } catch (xpError) {
      console.error('XP award error:', xpError)
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      memoryId: memory.id,
      xpAwarded: xpAmount,
    })

  } catch (error) {
    console.error('Engagement answer error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
