/**
 * Mint an ephemeral OpenAI Realtime session for a full voice agent
 * (round-trip voice in/voice out). The browser uses the returned
 * `clientSecret` to open a WebRTC or WebSocket connection directly to
 * OpenAI without ever seeing OPENAI_API_KEY.
 *
 * Replaces the PersonaPlex hook for round-trip voice chat.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_MODEL = 'gpt-4o-realtime-preview';
// Warm female American English — see useOpenAIRealtimeVoice / TTS defaults.
const DEFAULT_VOICE = 'coral';
const ALLOWED_VOICES = new Set([
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse',
]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 });
  }

  let body: { instructions?: string; voice?: string; model?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const voice = body.voice && ALLOWED_VOICES.has(body.voice) ? body.voice : DEFAULT_VOICE;
  const model = body.model || DEFAULT_MODEL;

  const sessionRes = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'realtime=v1',
    },
    body: JSON.stringify({
      model,
      voice,
      modalities: ['audio', 'text'],
      ...(body.instructions ? { instructions: body.instructions } : {}),
    }),
  });

  if (!sessionRes.ok) {
    const detail = await sessionRes.text().catch(() => '');
    console.error('[realtime/session] mint failed', sessionRes.status, detail.slice(0, 300));
    return NextResponse.json(
      { error: 'Could not mint Realtime session' },
      { status: 502 },
    );
  }

  const session = await sessionRes.json();
  const clientSecret = session.client_secret?.value;
  const expiresAt = session.client_secret?.expires_at;

  if (!clientSecret) {
    return NextResponse.json({ error: 'Realtime session missing client_secret' }, { status: 502 });
  }

  return NextResponse.json({
    clientSecret,
    expiresAt,
    model,
    voice,
    sessionId: session.id,
  });
}
