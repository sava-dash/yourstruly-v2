import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get Deepgram WebSocket URL with authentication
// This keeps the API key server-side while allowing browser WebSocket connection
export async function GET() {
  // Require authentication — never expose API keys to unauthenticated callers
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Deepgram not configured' }, { status: 503 });
  }

  // Return the API key for WebSocket connection
  // TODO: Use Deepgram's temporary token API (/v1/manage/keys) for short-lived tokens
  return NextResponse.json({
    apiKey,
    wsUrl: 'wss://api.deepgram.com/v1/listen',
  });
}
