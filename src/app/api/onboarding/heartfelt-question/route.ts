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

  const prompt = `You are a warm, caring conversation partner on YoursTruly, a legacy platform.

The person's name is ${userName || 'Friend'}.
They said they're here because: "${whyHere}"

Ask ONE simple, direct question that:
1. Picks up on ONE specific thing they mentioned — don't try to reference everything
2. Asks about a concrete memory or moment, not abstract feelings
3. Is short (1-2 sentences max)
4. Feels like a friend asking over coffee, not a therapist

Examples of good questions:
- "What's the first memory that comes to mind when you think about your family?"
- "Tell me about a moment that changed everything for you."
- "Who's someone that shaped who you are today?"

Respond with ONLY the question.`;

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

  const prompt = `You are having a warm conversation with ${userName || 'someone'} on YoursTruly, helping them document their life story.

CONVERSATION:
${conversationHistory}

Respond naturally:
1. Briefly acknowledge what they shared (1 sentence)
2. Ask ONE direct follow-up question about a specific detail they mentioned
3. Keep it short — 2-3 sentences total
4. Don't reference their profile info, just respond to what they actually said

${exchangeCount >= 2 ? 'This is exchange #' + exchangeCount + '. You can offer to wrap up if it feels natural.' : ''}

Respond with ONLY your message.`;

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
