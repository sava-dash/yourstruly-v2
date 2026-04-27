/**
 * Streaming TTS proxy backed by OpenAI /v1/audio/speech.
 * Auth-gated; OPENAI_API_KEY never leaves the server.
 *
 * Contract preserved for the existing useTTS hook:
 *   GET /api/tts?text=...
 *   POST /api/tts  body: { text, voice?, model? }
 *
 * Returns audio/mpeg streamed straight from OpenAI.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_MODEL = 'gpt-4o-mini-tts';
// Default OpenAI voice — kept in sync with /api/realtime/session.
const DEFAULT_VOICE = 'alloy';
const ALLOWED_VOICES = new Set([
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'nova',
]);
const ALLOWED_MODELS = new Set(['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts']);

async function synth(text: string, voice: string, model: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 });
  }
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: 'text too long (max 4000 chars)' }, { status: 400 });
  }

  const resolvedVoice = ALLOWED_VOICES.has(voice) ? voice : DEFAULT_VOICE;
  const resolvedModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

  const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: resolvedModel,
      voice: resolvedVoice,
      input: text,
      response_format: 'mp3',
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    console.error('[tts] upstream failed', upstream.status, detail.slice(0, 300));
    return NextResponse.json({ error: 'TTS upstream failed' }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600, immutable',
    },
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const text = url.searchParams.get('text') || '';
  const voice = url.searchParams.get('voice') || DEFAULT_VOICE;
  const model = url.searchParams.get('model') || DEFAULT_MODEL;
  return synth(text, voice, model);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  return synth(
    String(body.text ?? ''),
    String(body.voice ?? DEFAULT_VOICE),
    String(body.model ?? DEFAULT_MODEL),
  );
}
