import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribeBuffer, getWordCount } from '@/lib/ai/transcription';
import type { TranscriptionResponse } from '@/types/api';

/**
 * POST /api/engagement/transcribe
 * 
 * Transcription endpoint for engagement prompts.
 * Uses unified transcription lib.
 */
export async function POST(request: NextRequest): Promise<NextResponse<TranscriptionResponse | { error: string }>> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (audioFile.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = audioFile.type || 'audio/webm';

    // Upload to storage
    const timestamp = Date.now();
    const extension = audioFile.name?.split('.').pop() || 'webm';
    const filename = `voice/${user.id}/${timestamp}.${extension}`;
    
    let audioUrl: string | undefined;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('memories')
      .upload(filename, buffer, { contentType: mimeType, upsert: false });

    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage.from('memories').getPublicUrl(filename);
      audioUrl = urlData.publicUrl;
    }

    // Transcribe using shared lib
    const result = await transcribeBuffer(buffer, mimeType);
    
    return NextResponse.json({
      url: audioUrl,
      transcription: result.transcription,
      provider: result.provider,
      confidence: result.confidence,
      duration: result.duration,
      wordCount: getWordCount(result.transcription),
      warning: result.warning,
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
