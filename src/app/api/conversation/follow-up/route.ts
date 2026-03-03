import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Exchange {
  question: string;
  response: string;
}

// POST /api/conversation/follow-up
// Generate contextual follow-up questions based on conversation history
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { exchanges, promptType, originalPrompt } = body;

    if (!exchanges || !Array.isArray(exchanges) || exchanges.length === 0) {
      return NextResponse.json({ error: 'Invalid exchanges data' }, { status: 400 });
    }

    // Build conversation context
    const conversationContext = exchanges.map((e: Exchange, i: number) => 
      `Q${i + 1}: ${e.question}\nA${i + 1}: ${e.response}`
    ).join('\n\n');

    // Determine follow-up strategy based on prompt type and exchange count
    const exchangeCount = exchanges.length;
    const maxExchanges = 5;
    
    if (exchangeCount >= maxExchanges) {
      return NextResponse.json({ 
        followUpQuestion: null,
        shouldEnd: true,
        reason: 'Maximum exchanges reached'
      });
    }

    // Get API key - try Gemini first, then Anthropic, then OpenAI
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    
    const systemPrompt = getSystemPromptForType(promptType, exchangeCount);
    const userPrompt = `Original prompt: ${originalPrompt}\n\nConversation so far:\n${conversationContext}\n\nGenerate a natural, conversational follow-up question that helps gather more details. Keep it warm and personal, like a friend asking about a memory. Output ONLY the question, nothing else.`;

    let followUpQuestion: string | null = null;

    // Try Gemini first
    if (GEMINI_API_KEY && !followUpQuestion) {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
              }],
              generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 150,
              }
            }),
          }
        );

        if (geminiResponse.ok) {
          const data = await geminiResponse.json();
          followUpQuestion = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          console.log('Gemini follow-up generated:', followUpQuestion);
        }
      } catch (e) {
        console.error('Gemini follow-up error:', e);
      }
    }

    // Try Anthropic (Claude) as fallback
    if (ANTHROPIC_API_KEY && !followUpQuestion) {
      try {
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 150,
            messages: [{
              role: 'user',
              content: `${systemPrompt}\n\n${userPrompt}`,
            }],
          }),
        });

        if (claudeResponse.ok) {
          const data = await claudeResponse.json();
          followUpQuestion = data.content?.[0]?.text?.trim();
          console.log('Claude follow-up generated:', followUpQuestion);
        }
      } catch (e) {
        console.error('Claude follow-up error:', e);
      }
    }

    // If no AI available or failed, use smart fallbacks
    if (!followUpQuestion) {
      followUpQuestion = getFallbackQuestion(promptType, exchangeCount);
    }

    // Extract mentioned entities from the conversation for tagging
    const lastResponse = exchanges[exchanges.length - 1]?.response || '';
    const extractedEntities = extractEntities(lastResponse);

    return NextResponse.json({
      followUpQuestion,
      shouldEnd: false,
      exchangeCount: exchangeCount + 1,
      maxExchanges,
      extractedEntities, // { names: [], locations: [], times: [] }
    });

  } catch (error) {
    console.error('Follow-up generation error:', error);
    
    // Return a graceful fallback if everything fails
    return NextResponse.json({
      followUpQuestion: "Is there anything else you'd like to add about this?",
      shouldEnd: false,
      warning: 'Using fallback question',
    });
  }
}

// Extract names, locations, and time references from text
function extractEntities(text: string): { names: string[], locations: string[], times: string[] } {
  const names: string[] = [];
  const locations: string[] = [];
  const times: string[] = [];

  // Common name patterns (capitalized words that look like names)
  // This is a simple heuristic - could be enhanced with NLP
  const namePattern = /\b(my\s+)?(mother|father|mom|dad|grandma|grandmother|grandpa|grandfather|brother|sister|aunt|uncle|cousin|wife|husband|son|daughter|friend|neighbor)\s+([A-Z][a-z]+)?/gi;
  const nameMatches = text.match(namePattern);
  if (nameMatches) {
    names.push(...nameMatches.map(n => n.trim()));
  }

  // Standalone capitalized names (e.g., "John", "Mary")
  const standaloneNames = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g);
  if (standaloneNames) {
    // Filter out common non-name words
    const nonNames = ['The', 'And', 'But', 'This', 'That', 'When', 'Where', 'What', 'How', 'Why', 'I', 'We', 'They', 'It', 'Yes', 'No', 'Christmas', 'Easter', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const potentialNames = standaloneNames.filter(n => !nonNames.includes(n));
    names.push(...potentialNames);
  }

  // Location patterns
  const locationPattern = /\b(?:in|at|from|near|to)\s+([A-Z][a-zA-Z\s]+)(?:,|\.|$)/g;
  let locMatch;
  while ((locMatch = locationPattern.exec(text)) !== null) {
    if (locMatch[1] && locMatch[1].length > 2) {
      locations.push(locMatch[1].trim());
    }
  }

  // Time patterns
  const timePatterns = [
    /\b(19\d{2}|20[0-2]\d)s?\b/g,  // Years like 1985, 1990s
    /\b(in|around|during)\s+(the\s+)?(early|mid|late)?\s*(\d{2}s|'?\d{2}s?)\b/gi, // "in the '80s", "during the early 90s"
    /\bwhen\s+I\s+was\s+(\d+|a\s+\w+)\b/gi, // "when I was 10", "when I was a child"
    /\b(childhood|teenager|young|growing\s+up|as\s+a\s+kid)\b/gi, // Life stage references
  ];
  
  for (const pattern of timePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      times.push(...matches);
    }
  }

  // Deduplicate
  return {
    names: [...new Set(names)],
    locations: [...new Set(locations)],
    times: [...new Set(times)],
  };
}

function getFallbackQuestion(promptType: string, exchangeCount: number): string {
  const fallbacks: Record<string, string[]> = {
    photo_backstory: [
      "Who else was there that day? Tell me about them.",
      "When you look at this photo, what's the first feeling that comes up?",
      "What was happening in your life around this time?",
      "What do you wish your family knew about this moment?",
      "Is there anything else about this memory you want to preserve? Or would you like to save what we've captured?"
    ],
    memory_prompt: [
      "Can you paint the picture for me - where were you and what did it look like?",
      "How did this experience shape who you became?",
      "Who was most important in this memory? Tell me about them.",
      "When you think back on this, what emotion hits you first?",
      "Is there anything else your family should know? Or shall we save this beautiful memory?"
    ],
    knowledge: [
      "What happened that taught you this lesson?",
      "Can you remember a specific moment when this clicked for you?",
      "Who do you most hope will hear this wisdom?",
      "How has living by this changed your life?",
      "Anything else you want to add? Or ready to save this for your family?"
    ],
    interview: [
      "Tell me more about that - what was it like?",
      "Who else was part of this? What were they like?",
      "How did that make you feel at the time?",
      "What would you want your loved ones to understand about this?",
      "Is there anything else you'd like to share? Or would you like to save this story?"
    ],
    default: [
      "Can you help me picture that? What did it look like?",
      "How did that make you feel?",
      "Who else was there? Tell me about them.",
      "What do you want your family to know about this?",
      "Anything else to add? Or shall we save this memory?"
    ]
  };

  const questions = fallbacks[promptType] || fallbacks.default;
  const index = Math.min(exchangeCount, questions.length - 1);
  return questions[index];
}

function getSystemPromptForType(promptType: string, exchangeCount: number): string {
  const basePrompt = `You are helping someone record their precious life stories for their family. Generate a natural, emotionally intelligent follow-up question.

CRITICAL RULES:
1. Ask ONE simple, clear question
2. Use warm, conversational language (like a close friend or loving family member would ask)
3. Keep it SHORT - under 20 words ideally
4. Reference something specific they just said
5. NEVER use awkward phrasing like "that [noun] you mentioned"
6. Output ONLY the question - no quotes, no preamble
7. Help them FEEL the memory - provoke emotion gently
8. Paint the FULL picture - gather sensory details

FOCUS RULES (CRITICAL):
- STAY ON TOPIC. Your question must relate to the original prompt and ongoing story.
- IGNORE any background noise, ambient speech, or interruptions in their response (like "hello" from someone passing by, or TV sounds)
- If their response contains unrelated speech (greetings, side conversations), filter it out and focus only on the story-relevant content
- If their response is mostly background noise/unrelated, ask them to continue the story: "Please tell me more about [the original topic]"
- NEVER ask about who they were greeting or what background sounds were

CONTEXT GATHERING PRIORITIES:
- If they mention a PERSON by name, ask who they are and their relationship
- If they mention a PLACE, ask them to describe it - what it looked like, smelled like
- If they mention a TIME/ERA, ask what life was like then
- If they describe an EMOTION, dig deeper - ask what made them feel that way
- If they skip over something interesting, circle back to it

GOOD examples:
- "What was going through your mind at that moment?"
- "Who is [name] to you? Tell me about them."
- "Can you describe that place for me? What did it look like?"
- "How old were you then? What was your life like?"
- "When you close your eyes and remember this, what do you see first?"
- "What's the one thing you most want your family to know about this?"

BAD examples (never do this):
- "That trip you mentioned, can you tell me more?" (awkward structure)
- "I'd love to hear more about what you described" (not a question)
- "Who were you saying hello to?" (asking about background noise)
- "The experience you shared sounds meaningful" (not a question)
\n`;

  const typeSpecificPrompts: Record<string, string> = {
    photo_backstory: `
This is about a PHOTO memory. Help them relive it.
Priority: WHO was there (get names, relationships), WHEN it was, WHERE it was taken, what made this moment SPECIAL.
Emotion focus: Joy, nostalgia, love, pride.`,

    memory_prompt: `
This is a LIFE memory. Help them paint the full picture.
Priority: SENSORY details (sights, sounds, smells), PEOPLE involved (names, relationships), the EMOTION of the moment.
Emotion focus: Help them feel what they felt then.`,

    knowledge: `
This is LIFE WISDOM they're passing down. Make it personal and meaningful.
Priority: The STORY behind the lesson, WHO taught them, HOW it changed their life.
Emotion focus: Pride, gratitude, hope for future generations.`,

    interview: `
This is a RECORDED INTERVIEW for their family. Every detail matters.
Priority: Named PEOPLE (ask who they are), PLACES (describe them), TIMES (what era, what was life like), EMOTIONS.
Emotion focus: Make them feel heard and valued. Their story matters.`,

    favorites_firsts: `
This is about FAVORITES or FIRSTS - formative moments.
Priority: WHY it was special, WHO they shared it with, how it FELT.
Emotion focus: Wonder, excitement, nostalgia.`,

    recipes_wisdom: `
This is about RECIPES or family TRADITIONS. Preserve the full story.
Priority: WHO passed it down, SPECIAL occasions, the MEANING behind it.
Emotion focus: Connection to ancestors, family love.`,

    default: `
Help them tell their FULL story. 
Priority: PEOPLE (names, relationships), PLACES (descriptions), TIME (context), EMOTIONS.
Always make them feel their story matters.`,
  };

  const typePrompt = typeSpecificPrompts[promptType] || typeSpecificPrompts.default;
  
  let exchangeGuidance = '';
  if (exchangeCount === 1) {
    exchangeGuidance = '\nThis is their first response. Dig deeper - ask about a specific person, place, or feeling they mentioned.';
  } else if (exchangeCount === 2) {
    exchangeGuidance = '\nGather more context. If they mentioned someone, ask who they are. If a place, ask them to describe it. Get sensory details.';
  } else if (exchangeCount === 3) {
    exchangeGuidance = '\nExplore the emotional heart of the story. What did this mean to them? How did it change them?';
  } else if (exchangeCount >= 4) {
    exchangeGuidance = '\nWrap up warmly. Ask: "Is there anything else you\'d like to share about this? Or would you like to save this memory?" Give them closure.';
  }

  return basePrompt + typePrompt + exchangeGuidance;
}
