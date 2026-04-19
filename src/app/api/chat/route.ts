import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { checkProviderConfig } from '@/lib/ai/providers';
import { runRagChat, type ChatMode } from '@/lib/ai/rag-runtime';
import { synthesizePersona } from '@/lib/avatar/synthesize-persona';
import {
  buildAvatarSystemPrompt,
  AVATAR_FALLBACK_SYSTEM_PROMPT,
} from '@/lib/avatar/build-system-prompt';

// ─── Concierge system prompt ────────────────────────────────────────────────
// (Unchanged from the pre-refactor handler so existing Concierge behavior
// is identical — the rag-runtime extraction is a pure plumbing change.)
const CONCIERGE_SYSTEM_PROMPT = `You are the AI Concierge for YoursTruly — a digital legacy platform where people preserve memories, stories, and connections with loved ones.

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

You're their companion AND their guide to the platform.`;

// ─── Concierge-only: support knowledge lookup ───────────────────────────────
// Avatar mode never returns platform help (it's the user, not an assistant),
// so this stays scoped to /api/chat rather than the shared rag-runtime.
async function buildSupportContext(supabase: any, message: string): Promise<string> {
  try {
    const messageLower = message.toLowerCase();
    const { data: supportArticles } = await supabase
      .from('support_knowledge')
      .select('title, content, category')
      .eq('is_active', true)
      .order('sort_order');

    if (!supportArticles?.length) return '';

    const matched = supportArticles.filter((article: any) => {
      const titleMatch = article.title
        .toLowerCase()
        .split(' ')
        .some((w: string) => w.length > 3 && messageLower.includes(w));
      return titleMatch;
    }).slice(0, 3);

    const isSupport = /\b(how|help|what is|where|can i|how do|feature|setting|problem|issue|tutorial)\b/i.test(message);
    const supportKnowledge = isSupport
      ? (matched.length > 0 ? matched : supportArticles.slice(0, 3))
      : matched;

    if (supportKnowledge.length === 0) return '';

    return '\n\n## Platform Knowledge\n' + supportKnowledge.map((a: any) =>
      `### ${a.title}\n${a.content}`
    ).join('\n\n');
  } catch {
    return '';
  }
}

// ─── Avatar persona lookup (with auto-synth on first use) ───────────────────
async function loadAvatarSystemPrompt(userId: string): Promise<string> {
  const admin = createAdminClient();

  // Cheap path: read the cached card.
  const { data: existing } = await (admin.from('avatar_personas') as any)
    .select('persona_card')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.persona_card) {
    return buildAvatarSystemPrompt(existing.persona_card);
  }

  // Expensive path: synthesize on first use. Synthesis can fail gracefully
  // (no source material) — we fall back to the generic first-person prompt
  // so the user still gets *some* avatar behavior.
  try {
    const result = await synthesizePersona(admin, userId);
    if (result?.persona) return buildAvatarSystemPrompt(result.persona);
  } catch (err) {
    console.error('[chat] persona synthesis failed:', err);
  }
  return AVATAR_FALLBACK_SYSTEM_PROMPT;
}

export async function POST(request: NextRequest) {
  try {
    const config = checkProviderConfig();
    if (!config.embeddings || !config.chat) {
      return NextResponse.json({
        error: `AI not configured: ${config.errors.join(', ')}. Add API keys in Settings.`,
      }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, sessionId } = body;
    // Default to 'concierge' so existing clients keep working without changes.
    const mode: ChatMode = body?.mode === 'avatar' ? 'avatar' : 'concierge';

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Compose the system prompt + optional context delta per mode.
    let systemPrompt: string;
    let personaContext: string | undefined;

    if (mode === 'avatar') {
      systemPrompt = await loadAvatarSystemPrompt(user.id);
      // No persona context block needed — the persona IS the system prompt.
      personaContext = undefined;
    } else {
      systemPrompt = CONCIERGE_SYSTEM_PROMPT;
      // Concierge-only: append platform help articles to retrieved context.
      const supportContext = await buildSupportContext(supabase, message);
      personaContext = supportContext || undefined;
    }

    const result = await runRagChat({
      supabase,
      userId: user.id,
      message,
      systemPrompt,
      mode,
      sessionId,
      personaContext,
      // Avatar gets a slightly higher temperature so its voice feels less
      // robotic; Concierge stays deterministic for support answers.
      temperature: mode === 'avatar' ? 0.85 : 0.7,
      maxTokens: 1000,
    });

    return NextResponse.json({
      message: result.message,
      sessionId: result.sessionId,
      sources: result.sources,
      mode,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat. Check API keys.' },
      { status: 500 }
    );
  }
}

// Get chat history. Optionally filter by mode so the UI can list Concierge
// vs Avatar conversations independently.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const modeParam = searchParams.get('mode');

    if (sessionId) {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      return NextResponse.json({ messages });
    }

    let query = supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (modeParam === 'avatar' || modeParam === 'concierge') {
      query = query.eq('mode', modeParam);
    }
    const { data: sessions } = await query;

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}
