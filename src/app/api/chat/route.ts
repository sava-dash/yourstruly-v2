import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding, generateChatResponse, checkProviderConfig } from '@/lib/ai/providers'

// System prompt for the AI — both personal companion and platform support
const SYSTEM_PROMPT = `You are the AI Concierge for YoursTruly — a digital legacy platform where people preserve memories, stories, and connections with loved ones.

You serve TWO roles:

ROLE 1 — PERSONAL COMPANION:
You have access to the user's personal content: memories, contacts, life events, pets, and more. When they ask about their life, draw from this context to give personalized, meaningful responses.

ROLE 2 — PLATFORM SUPPORT:
You know everything about how YoursTruly works. When users ask "how do I...", "what is...", "where can I find...", or need help with any feature, provide clear, helpful guidance based on the platform knowledge provided below.

Guidelines:
- Be warm and personal, like a trusted friend
- For personal questions: reference specific details from their memories and relationships
- For support questions: give clear, step-by-step answers about platform features
- If you don't have enough context, say so honestly but kindly
- Keep responses concise (2-3 paragraphs max)
- Use a conversational, caring tone

You're their companion AND their guide to the platform.`

// Search user's content using vector similarity
async function searchUserContent(
  supabase: any,
  userId: string,
  queryEmbedding: number[],
  limit: number = 8
) {
  // Format embedding for Postgres
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  const { data, error } = await supabase.rpc('search_user_content', {
    query_embedding: embeddingStr,
    search_user_id: userId,
    match_threshold: 0.25, // Lower threshold for better recall
    match_count: limit,
  })

  if (error) {
    console.error('Search error:', error)
    return []
  }

  return data || []
}

// Format search results into context for the AI
function formatContext(results: any[]): string {
  if (!results.length) {
    return 'No specific memories or information found for this query. You can still have a general conversation with the user about their life.'
  }

  const grouped: Record<string, any[]> = {}
  for (const r of results) {
    if (!grouped[r.content_type]) grouped[r.content_type] = []
    grouped[r.content_type].push(r)
  }

  let context = ''

  if (grouped.memory) {
    context += '## Relevant Memories\n'
    for (const m of grouped.memory) {
      context += `- "${m.title || 'Untitled memory'}" (${m.metadata?.date || 'Date unknown'})`
      if (m.metadata?.location) context += ` at ${m.metadata.location}`
      context += `\n  ${m.content || ''}\n`
    }
  }

  if (grouped.contact) {
    context += '\n## Relevant People\n'
    for (const c of grouped.contact) {
      context += `- ${c.title} (${c.metadata?.relationship || 'Contact'})`
      if (c.metadata?.birthday) context += ` - Birthday: ${c.metadata.birthday}`
      context += '\n'
      if (c.content) context += `  Notes: ${c.content}\n`
    }
  }

  if (grouped.postscript) {
    context += '\n## Relevant PostScripts (future messages)\n'
    for (const p of grouped.postscript) {
      context += `- "${p.title}" for ${p.metadata?.recipient || 'someone'}`
      if (p.metadata?.deliver_on) context += ` (delivers: ${p.metadata.deliver_on})`
      context += '\n'
    }
  }

  if (grouped.pet) {
    context += '\n## Pets\n'
    for (const pet of grouped.pet) {
      context += `- ${pet.title} (${pet.metadata?.species || 'pet'})`
      if (pet.metadata?.breed) context += ` - ${pet.metadata.breed}`
      context += '\n'
      if (pet.content) context += `  ${pet.content}\n`
    }
  }

  return context
}

export async function POST(request: NextRequest) {
  try {
    // Check AI provider configuration
    const config = checkProviderConfig()
    if (!config.embeddings || !config.chat) {
      return NextResponse.json({ 
        error: `AI not configured: ${config.errors.join(', ')}. Add API keys in Settings.`,
      }, { status: 503 })
    }

    const supabase = await createClient()

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, sessionId } = body

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Get or create chat session
    let currentSessionId = sessionId
    if (!currentSessionId) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, title: message.slice(0, 50) })
        .select()
        .single()
      currentSessionId = session?.id
    }

    // Save user message
    if (currentSessionId) {
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        user_id: user.id,
        role: 'user',
        content: message,
      })
    }

    // Get conversation history for context
    const { data: history } = currentSessionId ? await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true })
      .limit(10) : { data: [] }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(message)

    // Search for relevant personal content
    const searchResults = await searchUserContent(supabase, user.id, queryEmbedding)

    // Search for relevant support knowledge (keyword-based fallback + semantic)
    let supportContext = ''
    try {
      const messageLower = message.toLowerCase()
      const { data: supportArticles } = await supabase
        .from('support_knowledge')
        .select('title, content, category')
        .eq('is_active', true)
        .order('sort_order')

      if (supportArticles?.length) {
        // Keyword match: check if any keywords appear in the message
        const matched = supportArticles.filter(article => {
          const titleMatch = article.title.toLowerCase().split(' ').some((w: string) => w.length > 3 && messageLower.includes(w))
          return titleMatch
        }).slice(0, 3)

        // Also include articles whose content is likely relevant to support questions
        const isSupport = /\b(how|help|what is|where|can i|how do|feature|setting|problem|issue|tutorial)\b/i.test(message)
        const supportKnowledge = isSupport ? (matched.length > 0 ? matched : supportArticles.slice(0, 3)) : matched

        if (supportKnowledge.length > 0) {
          supportContext = '\n\n## Platform Knowledge\n' + supportKnowledge.map((a: any) =>
            `### ${a.title}\n${a.content}`
          ).join('\n\n')
        }
      }
    } catch {}

    // Build combined context
    const personalContext = formatContext(searchResults)
    const context = personalContext + supportContext

    // Build conversation history (excluding the message we just added)
    const conversationHistory = (history || [])
      .slice(0, -1)
      .map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }))

    // Generate response using Claude
    const assistantMessage = await generateChatResponse(message, {
      systemPrompt: SYSTEM_PROMPT,
      context,
      history: conversationHistory,
      maxTokens: 1000,
      temperature: 0.7,
    })

    // Save assistant response
    if (currentSessionId) {
      await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSessionId,
          user_id: user.id,
          role: 'assistant',
          content: assistantMessage,
          sources: searchResults.map((r: any) => ({
            type: r.content_type,
            id: r.id,
            title: r.title,
            similarity: r.similarity,
          })),
        })
    }

    return NextResponse.json({
      message: assistantMessage,
      sessionId: currentSessionId,
      sources: searchResults.slice(0, 5).map((r: any) => ({
        type: r.content_type,
        id: r.id,
        title: r.title,
      })),
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat. Check API keys.' },
      { status: 500 }
    )
  }
}

// Get chat history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (sessionId) {
      // Get messages for specific session
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      return NextResponse.json({ messages })
    } else {
      // Get all sessions
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20)

      return NextResponse.json({ sessions })
    }
  } catch (error) {
    console.error('Chat GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 })
  }
}
