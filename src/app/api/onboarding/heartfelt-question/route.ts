import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Lazy init OpenAI
let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, whyHere, whatDrives, userName, conversation } = body;

    if (action === 'generate_initial') {
      return generateInitialQuestion(whyHere, whatDrives, userName);
    } else if (action === 'follow_up') {
      return generateFollowUp(whyHere, whatDrives, userName, conversation);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Heartfelt question error:', error);
    return NextResponse.json(
      { error: 'Failed to generate question' },
      { status: 500 }
    );
  }
}

async function generateInitialQuestion(
  whyHere: string,
  whatDrives: string[],
  userName: string
) {
  const openai = getOpenAI();

  const prompt = `You are a warm, empathetic conversation partner helping someone document their life story on YoursTruly, a legacy platform.

The person has shared:
- WHY THEY'RE HERE: "${whyHere}"
- WHAT DRIVES THEM (life goals): ${whatDrives.join(', ')}
- Their name: ${userName || 'Friend'}

Generate ONE deeply personal, thought-provoking opening question that:
1. Directly references what they shared (why they're here AND what drives them)
2. Invites them to share a specific memory, story, or feeling
3. Feels warm and genuine, not clinical or generic
4. Is open-ended but focused enough to prompt a meaningful response

The question should feel like it's coming from a caring friend who truly listened to what they shared.

Respond with ONLY the question, no preamble or explanation. Address them by name if provided.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 200,
  });

  const question = completion.choices[0]?.message?.content?.trim() || 
    `${userName ? userName + ', w' : 'W'}hat moment in your life shaped who you are today?`;

  return NextResponse.json({ question });
}

async function generateFollowUp(
  whyHere: string,
  whatDrives: string[],
  userName: string,
  conversation: Message[]
) {
  const openai = getOpenAI();

  // Format conversation history
  const conversationHistory = conversation
    .map(m => `${m.role === 'assistant' ? 'YoursTruly' : userName || 'User'}: ${m.content}`)
    .join('\n\n');

  const exchangeCount = conversation.filter(m => m.role === 'user').length;

  const prompt = `You are a warm, empathetic conversation partner on YoursTruly, a legacy documentation platform.

CONTEXT:
- Why they're here: "${whyHere}"
- What drives them: ${whatDrives.join(', ')}
- Their name: ${userName || 'Friend'}

CONVERSATION SO FAR:
${conversationHistory}

This is exchange #${exchangeCount}. ${exchangeCount >= 2 ? 'This could be a good stopping point, so offer a gentle way to wrap up OR go deeper based on their response.' : 'Continue exploring their story.'}

Generate a thoughtful follow-up that:
1. Acknowledges what they just shared with genuine warmth
2. ${exchangeCount >= 2 
    ? 'Either asks ONE final deeper question OR offers a meaningful reflection that could conclude the conversation' 
    : 'Asks ONE follow-up question that goes deeper into their story or connects to a related memory/feeling'}
3. Feels like a natural conversation, not an interview
4. Is concise but heartfelt

Respond with ONLY your message, no labels or formatting.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 250,
  });

  const response = completion.choices[0]?.message?.content?.trim() || 
    "Thank you for sharing that. Your story is already becoming part of your legacy.";

  return NextResponse.json({ response });
}
