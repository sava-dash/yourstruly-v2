import OpenAI from 'openai';
import {
  EngineRequest,
  EngineResponse,
  EngineState,
  Fragment,
  MemoryCandidate,
  MessageClassification,
} from './types';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

function generateCandidateId(): string {
  return `mc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// What fragments are missing from the current candidate
function getMissingFragments(candidate: MemoryCandidate | null): string[] {
  if (!candidate)
    return ['event', 'location', 'person', 'time', 'emotion', 'meaning'];
  const have = new Set(candidate.fragments.map((f) => f.type));
  const priority = ['event', 'location', 'person', 'time', 'emotion', 'meaning'];
  return priority.filter((f) => !have.has(f as Fragment['type']));
}

// Determine engagement depth from message length patterns
function assessDepth(
  state: EngineState,
  userMessage: string,
): 'low' | 'medium' | 'high' {
  const userMessages = state.messages.filter((m) => m.role === 'user');
  const totalLength = userMessages.reduce(
    (sum, m) => sum + m.content.length,
    userMessage.length,
  );
  const avgLength = totalLength / (state.totalUserMessages + 1);
  if (avgLength > 200) return 'high';
  if (avgLength > 80) return 'medium';
  return 'low';
}

// Check if memory candidate has enough to save
function isMemorySaveReady(candidate: MemoryCandidate): boolean {
  const types = new Set(candidate.fragments.map((f) => f.type));
  const hasEvent = types.has('event');
  const hasTimeOrLocation = types.has('time') || types.has('location');
  const hasExtra = types.size >= 3;
  return hasEvent && hasTimeOrLocation && hasExtra;
}

export async function processMessage(
  request: EngineRequest,
): Promise<EngineResponse> {
  const { message, engineState, context, userName, userProfile } = request;
  const openai = getOpenAI();

  // Update depth assessment
  const depth = assessDepth(engineState, message);

  // Build conversation history for the prompt
  const historyText = engineState.messages
    .slice(-10) // last 10 messages for context window
    .map((m) => `${m.role === 'user' ? userName : 'AI'}: ${m.content}`)
    .join('\n');

  const missingFragments = getMissingFragments(engineState.activeCandidate);
  const existingFragments =
    engineState.activeCandidate?.fragments
      .map((f) => `${f.type}: ${f.value}`)
      .join(', ') || 'none yet';

  // Context-specific tone adjustments
  const contextTone = {
    onboarding:
      'This is their first interaction. Be extra warm and welcoming. Keep questions light but meaningful.',
    engagement:
      "This is a returning user. You may reference things they've shared before. Go deeper.",
    interview:
      'This is a structured life story session. Be thorough but never feel like an interrogation.',
  }[context];

  const depthInstruction = {
    low: 'Keep questions short and simple. One sentence max.',
    medium: 'Ask thoughtful questions. 1-2 sentences.',
    high: 'Ask reflective, deeper questions. The user is engaged and sharing openly.',
  }[depth];

  const questionCount = engineState.activeCandidate?.questionCount || 0;
  const questionLimitNote =
    questionCount >= 3
      ? 'you have asked 2-3 questions about this memory, DO NOT ask more. Just acknowledge warmly.'
      : 'collecting enough fragments, the UI will show a save button.';

  // Single structured prompt
  const systemPrompt = `You are a curious life historian helping ${userName} capture meaningful parts of their life on YoursTruly, a digital legacy platform.

PERSONALITY: Curious, warm, thoughtful, patient. You notice interesting details. You feel like a friend who listens well. NEVER feel like a form, survey, or interrogation.

CONTEXT: ${contextTone}
DEPTH: ${depthInstruction}

${userProfile?.whyHere ? `They said they're here because: "${userProfile.whyHere}"` : ''}
${userProfile?.interests?.length ? `Their interests: ${userProfile.interests.join(', ')}` : ''}

CONVERSATION SO FAR:
${historyText || '(first message)'}

CURRENT MEMORY BEING EXPLORED:
Fragments collected: ${existingFragments}
Missing: ${missingFragments.join(', ')}
Questions asked about this memory: ${questionCount}

RULES:
1. Classify the user's message as exactly one of: MEMORY, WISDOM, INTEREST, GENERAL
2. Extract any story fragments (event, location, person, time, emotion, meaning)
3. Generate ONE thoughtful response

CLASSIFICATION GUIDE:
- MEMORY: User describing something that happened (past event, story, experience)
- WISDOM: User expressing a belief, life lesson, philosophy, or value
- INTEREST: User mentioning hobbies, passions, curiosities
- GENERAL: Casual conversation, greetings, questions

RESPONSE RULES:
- Always: 1 brief acknowledgment + 1 thoughtful question
- For MEMORY: Ask about the NEXT missing fragment in priority order (event → location → person → time → emotion → meaning). Ask only ONE.
- For WISDOM: Ask about its origin — "When did you start thinking that way?" or "Was there a moment that shaped that view?"
- For INTEREST: Discover the origin story — "What first got you interested in that?"
- For GENERAL: Be conversational, gently steer toward stories
- After ${questionLimitNote}
- NEVER ask multiple questions at once
- NEVER ask "Can you elaborate?" or generic questions
- NEVER suggest wrapping up or saving — the UI handles that

Respond in this exact JSON format:
{
  "classification": "MEMORY" | "WISDOM" | "INTEREST" | "GENERAL",
  "fragments": [{"type": "event|location|person|time|emotion|meaning", "value": "extracted text", "confidence": 0.0-1.0}],
  "reply": "your response here",
  "wisdomStatement": null | "the wisdom/belief expressed (only if classification is WISDOM)"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    temperature: 0.8,
    max_tokens: 400,
    response_format: { type: 'json_object' },
  });

  // Parse response
  let parsed: {
    classification: MessageClassification;
    fragments: Fragment[];
    reply: string;
    wisdomStatement?: string | null;
  };

  try {
    parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch {
    parsed = {
      classification: 'GENERAL',
      fragments: [],
      reply: `That's really interesting, ${userName}. Tell me more about that.`,
    };
  }

  // Ensure valid classification
  const validClassifications: MessageClassification[] = [
    'MEMORY',
    'WISDOM',
    'INTEREST',
    'GENERAL',
  ];
  if (!validClassifications.includes(parsed.classification)) {
    parsed.classification = 'GENERAL';
  }

  // Ensure fragments is an array
  if (!Array.isArray(parsed.fragments)) {
    parsed.fragments = [];
  }

  // Update engine state
  const newState: EngineState = { ...engineState };
  newState.totalUserMessages += 1;
  newState.questionDepth = depth;

  // Add user message
  newState.messages = [
    ...engineState.messages,
    {
      role: 'user' as const,
      content: message,
      classification: parsed.classification,
      fragments: parsed.fragments,
    },
    { role: 'assistant' as const, content: parsed.reply },
  ];

  // Handle fragments — add to active candidate
  if (
    parsed.fragments.length > 0 &&
    (parsed.classification === 'MEMORY' || parsed.classification === 'INTEREST')
  ) {
    if (!newState.activeCandidate) {
      newState.activeCandidate = {
        id: generateCandidateId(),
        fragments: [],
        confidence: 0,
        questionCount: 0,
      };
    }

    // Merge fragments (don't duplicate types)
    const existingTypes = new Set(
      newState.activeCandidate.fragments.map((f) => f.type),
    );
    for (const frag of parsed.fragments) {
      if (!existingTypes.has(frag.type)) {
        newState.activeCandidate.fragments.push(frag);
        existingTypes.add(frag.type);
      }
    }

    // Update confidence based on fragment count
    newState.activeCandidate.confidence = Math.min(
      1,
      newState.activeCandidate.fragments.length / 4,
    );
    newState.activeCandidate.questionCount += 1;
  }

  // Handle wisdom
  if (parsed.classification === 'WISDOM' && parsed.wisdomStatement) {
    newState.wisdomEntries = [
      ...(engineState.wisdomEntries || []),
      { statement: parsed.wisdomStatement },
    ];
  }

  // Handle interests
  if (parsed.classification === 'INTEREST') {
    const interestFrags = parsed.fragments.filter(
      (f) => f.type === 'event' || f.type === 'meaning',
    );
    for (const f of interestFrags) {
      if (!newState.interestsMentioned.includes(f.value)) {
        newState.interestsMentioned = [
          ...newState.interestsMentioned,
          f.value,
        ];
      }
    }
  }

  // Check if save is ready
  let saveReady = false;
  let saveType: 'memory' | 'wisdom' | undefined;
  let candidateNarrative: string | undefined;

  if (parsed.classification === 'WISDOM' && parsed.wisdomStatement) {
    saveReady = true;
    saveType = 'wisdom';
  } else if (
    newState.activeCandidate &&
    isMemorySaveReady(newState.activeCandidate)
  ) {
    saveReady = true;
    saveType = 'memory';
    // Build narrative from fragments
    candidateNarrative = newState.activeCandidate.fragments
      .map((f) => `${f.type}: ${f.value}`)
      .join(' | ');
  }

  return {
    reply: parsed.reply,
    classification: parsed.classification,
    fragments: parsed.fragments,
    engineState: newState,
    saveReady,
    saveType,
    candidateNarrative,
  };
}
