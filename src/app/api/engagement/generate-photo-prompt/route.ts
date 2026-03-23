import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAIPrompt } from '@/lib/prompts/registry';

/**
 * POST /api/engagement/generate-photo-prompt
 *
 * Called after a photo is uploaded (onboarding or gallery).
 * Uses Gemini to analyze the photo and create a personalized
 * engagement prompt like "Who are the people in this photo?"
 * or "What were you celebrating here?"
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mediaId, photoUrl, takenAt, isOnboarding = false } = body;

    if (!mediaId || !photoUrl) {
      return NextResponse.json({ error: 'mediaId and photoUrl required' }, { status: 400 });
    }

    // Get user profile for personalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, interests, life_goals')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name?.split(' ')[0] || 'there';

    // Use Gemini vision to analyze the photo and generate a question
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    let promptText = 'What\'s the story behind this photo?';
    let promptType: 'photo_backstory' | 'photo_people' | 'photo_memory' = 'photo_backstory';

    if (GEMINI_API_KEY) {
      try {
        // Fetch image as base64
        const imgResponse = await fetch(photoUrl);
        if (imgResponse.ok) {
          const imgBuffer = await imgResponse.arrayBuffer();
          const imgBase64 = Buffer.from(imgBuffer).toString('base64');
          const mimeType = imgResponse.headers.get('content-type') || 'image/jpeg';

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { inlineData: { mimeType, data: imgBase64 } },
                    {
                      text: `You are helping someone document their life story. Look at this photo and generate ONE warm question to prompt them to share the story behind it.

CRITICAL RULES - never assume:
- NEVER assume the people in the photo are the user themselves
- NEVER say "you" when referring to people in the photo unless it's clearly a selfie
- Always ask WHO people are before asking about their experience
- If people are visible: ask "Who are the people in this photo?" or "Who is this a photo of?" or "What's the story behind this moment?"
- If it looks like a wedding: ask "Whose wedding is this?" NOT "How did you feel getting married?"
- If it's a landscape/place: ask "Where was this taken?" or "What memories do you have of this place?"
- If it's food/objects: ask "What's the story behind this?"
- Be warm and curious, like a friend looking at a photo album
- Keep it under 20 words
- Output ONLY the question, nothing else`
                    }
                  ]
                }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const generated = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (generated) {
              promptText = generated;
              // Detect type based on content
              if (generated.toLowerCase().includes('who') || generated.toLowerCase().includes('people') || generated.toLowerCase().includes('person')) {
                promptType = 'photo_people';
              } else {
                promptType = 'photo_backstory';
              }
            }
          }
        }
      } catch (e) {
        console.error('Gemini photo analysis failed:', e);
      }
    }

    // Create engagement prompt via registry (tracks source + lineage)
    const prompt = await createAIPrompt({
      userId: user.id,
      promptText,
      type: promptType,
      category: 'photos',
      photoId: mediaId,
      priority: isOnboarding ? 10 : 5,
      source: isOnboarding ? 'onboarding_upload' : 'photo_upload',
      generatedBy: GEMINI_API_KEY ? 'gemini' : 'fallback',
      metadata: {
        photo_url: photoUrl,
        taken_at: takenAt,
        is_onboarding: isOnboarding,
      },
    });

    return NextResponse.json({
      success: true,
      promptId: prompt?.id,
      promptText,
    });

  } catch (error) {
    console.error('Generate photo prompt error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
