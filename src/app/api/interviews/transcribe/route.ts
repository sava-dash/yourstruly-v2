import { NextRequest, NextResponse } from 'next/server';
import { transcribeBuffer, getWordCount } from '@/lib/ai/transcription';
import type { TranscriptionResponse } from '@/types/api';

/**
 * POST /api/interviews/transcribe
 * 
 * Transcribe audio for interview responses.
 * NOTE: No auth required - used by external interview links.
 * Uses shared transcription lib.
 */
export async function POST(request: NextRequest): Promise<NextResponse<TranscriptionResponse | { error: string }>> {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Smaller limit for interviews (25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = audioFile.type || 'audio/webm';

    // Transcribe using shared lib (no storage for interviews - handled separately)
    const result = await transcribeBuffer(buffer, mimeType);
    
    return NextResponse.json({
      transcription: result.transcription,
      provider: result.provider,
      confidence: result.confidence,
      duration: result.duration,
      wordCount: getWordCount(result.transcription),
      warning: result.warning,
    });

  } catch (error) {
    console.error('Interview transcription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
