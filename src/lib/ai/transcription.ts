/**
 * Audio transcription utility
 * Uses the same provider priority as /api/conversation/transcribe:
 * 1. Gemini (preferred - you have this key)
 * 2. OpenAI Whisper (fallback)
 * 3. Deepgram (fallback)
 */

/**
 * Transcribe audio from a URL
 * @param audioUrl - URL to the audio file
 * @returns Transcribed text
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  // Fetch the audio file
  const response = await fetch(audioUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.statusText}`)
  }
  
  const audioBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(audioBuffer)
  const mimeType = response.headers.get('content-type') || 'audio/webm'
  
  // Try Gemini first (consistent with /api/conversation/transcribe)
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  if (GEMINI_API_KEY) {
    try {
      console.log('Attempting Gemini transcription...')
      
      const audioBase64 = buffer.toString('base64')
      
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: audioBase64,
                  }
                },
                {
                  text: "Transcribe this audio recording exactly as spoken. Output ONLY the transcription text, nothing else. If the audio is unclear or empty, output an empty string."
                }
              ]
            }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 2048,
            }
          }),
        }
      )
      
      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json()
        const transcription = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
        console.log('Gemini transcription successful, length:', transcription.length)
        return transcription
      } else {
        console.warn('Gemini transcription failed, trying Whisper...')
      }
    } catch (geminiError) {
      console.error('Gemini transcription error:', geminiError)
    }
  }
  
  // Try OpenAI Whisper as fallback
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (OPENAI_API_KEY) {
    try {
      const whisperFormData = new FormData()
      whisperFormData.append('file', new Blob([buffer], { type: mimeType }), 'audio.webm')
      whisperFormData.append('model', 'whisper-1')
      whisperFormData.append('response_format', 'json')
      
      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: whisperFormData,
      })
      
      if (whisperResponse.ok) {
        const whisperData = await whisperResponse.json()
        console.log('Whisper transcription successful')
        return whisperData.text || ''
      }
    } catch (whisperError) {
      console.error('Whisper transcription error:', whisperError)
    }
  }
  
  // Try Deepgram as final fallback
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
  if (DEEPGRAM_API_KEY) {
    try {
      const deepgramResponse = await fetch(
        'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true',
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            'Content-Type': mimeType,
          },
          body: buffer,
        }
      )
      
      if (deepgramResponse.ok) {
        const data = await deepgramResponse.json()
        const transcription = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
        console.log('Deepgram transcription successful')
        return transcription
      }
    } catch (deepgramError) {
      console.error('Deepgram transcription error:', deepgramError)
    }
  }
  
  throw new Error('All transcription providers failed')
}
