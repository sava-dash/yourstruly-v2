import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { TranscriptEntry } from '@/types/voice'

/**
 * POST /api/voice/memory
 * Creates a memory from a voice conversation transcript
 * 
 * Body:
 *   - transcript: TranscriptEntry[] - The conversation transcript
 *   - topic?: string - Optional topic
 *   - contactId?: string - Optional contact ID
 *   - durationSeconds: number - Session duration
 *   - questionCount: number - Number of questions asked
 *   - generateTitle?: boolean - Whether to generate a title
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      transcript,
      topic,
      contactId,
      durationSeconds,
      questionCount,
      generateTitle = true,
      audioUrl,
    } = body as {
      transcript: TranscriptEntry[]
      topic?: string
      contactId?: string
      durationSeconds: number
      questionCount: number
      generateTitle?: boolean
      audioUrl?: string
    }

    // Validate transcript
    if (!transcript || !Array.isArray(transcript) || transcript.length < 2) {
      return NextResponse.json(
        { error: 'Invalid transcript - at least one exchange required' },
        { status: 400 }
      )
    }

    // Build memory content from transcript
    const memoryContent = buildMemoryContent(transcript)
    
    // Generate title if requested
    let title = topic || 'Voice Memory'
    if (generateTitle) {
      try {
        title = await generateMemoryTitle(transcript, topic)
      } catch (err) {
        console.error('Title generation failed:', err)
        // Fall back to topic or default
        title = topic || extractFallbackTitle(transcript)
      }
    }

    // Create the memory
    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        title,
        description: memoryContent,
        memory_type: 'voice',
        memory_date: new Date().toISOString().split('T')[0],
        audio_url: audioUrl || null,
        ai_labels: {
          transcript,
          duration_seconds: durationSeconds,
          question_count: questionCount,
          topic,
          voice_session: true,
          contact_id: contactId || null,
        },
      })
      .select('id')
      .single()

    if (memoryError) {
      console.error('Memory creation error:', memoryError)
      return NextResponse.json(
        { error: 'Failed to create memory', details: memoryError.message },
        { status: 500 }
      )
    }

    // Also create a knowledge_entry so voice conversations appear in the Wisdom page
    let knowledgeEntryId: string | null = null
    try {
      // Extract first Q&A for the knowledge entry
      const firstAssistant = transcript.find(t => t.role === 'assistant')
      const firstUser = transcript.find(t => t.role === 'user')
      const promptText = firstAssistant?.text || topic || title
      const responseText = transcript
        .filter(t => t.role === 'user')
        .map(t => t.text)
        .join(' ')

      const { data: knowledgeEntry, error: keError } = await supabase
        .from('knowledge_entries')
        .insert({
          user_id: user.id,
          category: 'life_lessons',
          prompt_text: promptText,
          response_text: responseText || null,
          audio_url: audioUrl || null,
          memory_id: memory.id,
          word_count: responseText.split(/\s+/).filter((w: string) => w.length > 0).length,
          is_featured: false,
        })
        .select('id')
        .single()

      if (!keError && knowledgeEntry) {
        knowledgeEntryId = knowledgeEntry.id
      }
    } catch (keError) {
      console.error('Knowledge entry creation error (non-fatal):', keError)
    }

    // Award XP for creating a memory via voice
    try {
      await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_action: 'create_memory_voice',
        p_metadata: { memory_id: memory.id, duration_seconds: durationSeconds },
      })
    } catch (xpError) {
      console.error('XP award error:', xpError)
      // Non-fatal, continue
    }

    return NextResponse.json({
      success: true,
      memoryId: memory.id,
      knowledgeEntryId,
      title,
      description: memoryContent,
    })

  } catch (error) {
    console.error('Voice memory creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Build memory content from transcript as structured Q&A exchanges
 * Pairs assistant messages (questions) with user messages (answers)
 * Format matches /api/conversation/save for consistent playback
 */
function buildMemoryContent(transcript: TranscriptEntry[]): string {
  // Build exchanges by pairing assistant (question) + user (answer)
  const exchanges: { question: string; answer: string }[] = []
  
  for (let i = 0; i < transcript.length; i++) {
    const entry = transcript[i]
    if (entry.role === 'assistant') {
      // Look for the next user message as the answer
      const nextUser = transcript.slice(i + 1).find(e => e.role === 'user')
      if (nextUser) {
        exchanges.push({
          question: entry.text.trim(),
          answer: nextUser.text.trim(),
        })
      }
    }
  }

  if (exchanges.length === 0) {
    // Fallback: just use user responses as narrative
    const userResponses = transcript
      .filter(entry => entry.role === 'user')
      .map(entry => entry.text.trim())
      .filter(text => text.length > 0)
    return userResponses.join('\n\n') || 'No content captured'
  }

  // Build summary from user responses
  const summary = exchanges
    .map(e => {
      let text = e.answer
      if (!text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?')) {
        text += '.'
      }
      return text
    })
    .join(' ')

  // Build Q&A section matching the format parsed by wisdom detail page
  const qaSection = exchanges.map((e, i) => {
    return `**Q${i + 1}:** ${e.question}\n\n**A${i + 1}:** ${e.answer}`
  }).join('\n\n---\n\n')

  return `## Summary\n\n${summary}\n\n## Conversation\n\n${qaSection}`
}

/**
 * Generate a memory title using Gemini
 */
async function generateMemoryTitle(
  transcript: TranscriptEntry[],
  topic?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // Extract user content for title generation
  const userContent = transcript
    .filter(t => t.role === 'user')
    .map(t => t.text)
    .join(' ')
    .substring(0, 1000) // Limit context

  const prompt = `Based on this memory, create a short, evocative title (3-7 words) that captures the essence of the story. Be warm and personal, not clinical.

${topic ? `Topic: ${topic}\n` : ''}Memory: ${userContent}

Title:`

  const result = await model.generateContent(prompt)
  const title = result.response.text().trim()
  
  // Clean up the title
  return title
    .replace(/["']/g, '')
    .replace(/\.$/, '')
    .substring(0, 100) // Max length
}

/**
 * Extract a fallback title from the first substantial user message
 */
function extractFallbackTitle(transcript: TranscriptEntry[]): string {
  const firstUserMessage = transcript.find(t => t.role === 'user')
  if (!firstUserMessage) return 'Voice Memory'
  
  const words = firstUserMessage.text.split(' ').slice(0, 5).join(' ')
  return words + (firstUserMessage.text.split(' ').length > 5 ? '...' : '')
}
