/**
 * Mint an ephemeral OpenAI Realtime *transcription-only* session for the
 * recording UIs. Replaces /api/deepgram/token. The browser opens a
 * WebSocket to wss://api.openai.com/v1/realtime?intent=transcription using
 * the returned clientSecret as a subprotocol — OPENAI_API_KEY never leaves
 * the server.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 });
  }

  const sessionRes = await fetch('https://api.openai.com/v1/realtime/transcription_sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'realtime=v1',
    },
    body: JSON.stringify({
      input_audio_format: 'pcm16',
      input_audio_transcription: { model: 'gpt-4o-transcribe' },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
    }),
  });

  if (!sessionRes.ok) {
    const detail = await sessionRes.text().catch(() => '');
    console.error('[realtime/transcribe-session] mint failed', sessionRes.status, detail.slice(0, 300));
    return NextResponse.json(
      { error: 'Could not mint transcription session' },
      { status: 502 },
    );
  }

  const session = await sessionRes.json();
  const clientSecret = session.client_secret?.value;
  const expiresAt = session.client_secret?.expires_at;
  if (!clientSecret) {
    return NextResponse.json({ error: 'Transcription session missing client_secret' }, { status: 502 });
  }

  return NextResponse.json({
    clientSecret,
    expiresAt,
    sessionId: session.id,
    wsUrl: 'wss://api.openai.com/v1/realtime?intent=transcription',
  });
}

// Some callers may issue GET (back-compat with /api/deepgram/token shape).
export const GET = POST;
