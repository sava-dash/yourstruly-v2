/**
 * Unified transcription service
 * 
 * Provider priority: Gemini → OpenAI Whisper → Deepgram
 * 
 * Usage:
 *   import { transcribeAudio, transcribeBuffer } from '@/lib/ai/transcription';
 *   
 *   // From URL
 *   const text = await transcribeAudio('https://...');
 *   
 *   // From buffer
 *   const result = await transcribeBuffer(buffer, 'audio/webm');
 */

export interface TranscriptionResult {
  transcription: string;
  provider?: 'gemini' | 'openai-whisper' | 'deepgram';
  confidence?: number;
  duration?: number;
  warning?: string;
}

/**
 * Transcribe audio from a URL
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = response.headers.get('content-type') || 'audio/webm';
  
  const result = await transcribeBuffer(buffer, mimeType);
  return result.transcription;
}

/**
 * Transcribe audio from a buffer
 */
export async function transcribeBuffer(
  buffer: Buffer, 
  mimeType: string
): Promise<TranscriptionResult> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  // No providers configured
  if (!GEMINI_API_KEY && !OPENAI_API_KEY && !DEEPGRAM_API_KEY) {
    console.warn('No transcription API configured');
    return { transcription: '', warning: 'Transcription service not configured' };
  }

  // Try Gemini first (preferred)
  if (GEMINI_API_KEY) {
    try {
      console.log('Attempting Gemini transcription...');
      const audioBase64 = buffer.toString('base64');
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { mimeType, data: audioBase64 } },
                { 
                  text: "Transcribe this audio recording exactly as spoken. Output ONLY the transcription text, nothing else. If the audio is unclear or empty, output an empty string." 
                }
              ]
            }],
            generationConfig: { temperature: 0, maxOutputTokens: 2048 }
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        console.log('Gemini transcription successful, length:', transcription.length);
        return { transcription, provider: 'gemini' };
      }
      console.warn('Gemini failed, trying next provider...');
    } catch (e) {
      console.error('Gemini error:', e);
    }
  }

  // Try OpenAI Whisper
  if (OPENAI_API_KEY) {
    try {
      console.log('Attempting Whisper transcription...');
      const formData = new FormData();
      // Convert Buffer to Uint8Array for Blob compatibility
      const uint8Array = new Uint8Array(buffer);
      formData.append('file', new Blob([uint8Array], { type: mimeType }), 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'json');
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Whisper transcription successful');
        return { transcription: data.text || '', provider: 'openai-whisper' };
      }
      console.warn('Whisper failed, trying next provider...');
    } catch (e) {
      console.error('Whisper error:', e);
    }
  }

  // Try Deepgram
  if (DEEPGRAM_API_KEY) {
    try {
      console.log('Attempting Deepgram transcription...');
      // Convert Buffer to Uint8Array for fetch body compatibility
      const uint8Array = new Uint8Array(buffer);
      const response = await fetch(
        'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true',
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            'Content-Type': mimeType,
          },
          body: uint8Array,
        }
      );

      if (response.ok) {
        const data = await response.json();
        const transcription = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
        console.log('Deepgram transcription successful');
        return {
          transcription,
          provider: 'deepgram',
          confidence: data.results?.channels?.[0]?.alternatives?.[0]?.confidence,
          duration: data.metadata?.duration,
        };
      }
    } catch (e) {
      console.error('Deepgram error:', e);
    }
  }

  return { transcription: '', warning: 'All transcription providers failed' };
}

/**
 * Get word count from transcription
 */
export function getWordCount(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}
