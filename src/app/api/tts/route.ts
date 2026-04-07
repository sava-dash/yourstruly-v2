import { NextResponse } from 'next/server';

// TTS endpoint disabled — pending VibeVoice (Microsoft) self-hosted integration.
// Returns 503 so any stray client call fails fast and visibly.
// Previous implementation used Deepgram Aura (Delia) + Google Translate TTS fallback.
export async function GET() {
  return NextResponse.json(
    { error: 'TTS temporarily disabled — VibeVoice integration pending' },
    { status: 503 }
  );
}
