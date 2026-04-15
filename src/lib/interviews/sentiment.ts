/**
 * Lightweight, dependency-free sentiment classifier for interview responses.
 *
 * Returns one dominant tone with a confidence score so the AI follow-up
 * prompt can be steered ("they sound sad — be tender", etc.).
 *
 * This is intentionally cheap (keyword/phrase scoring). It's a steering
 * signal, not a diagnostic — when in doubt it falls back to "neutral".
 */

export type Tone =
  | 'joy'
  | 'sorrow'
  | 'pride'
  | 'nostalgia'
  | 'humor'
  | 'neutral';

export interface SentimentResult {
  tone: Tone;
  confidence: number; // 0..1
  scores: Record<Tone, number>;
}

const KEYWORDS: Record<Exclude<Tone, 'neutral'>, RegExp[]> = {
  joy: [
    /\bloved?\b/i, /\bwonderful\b/i, /\bhappiest?\b/i, /\bjoy(ful)?\b/i,
    /\bbeautiful\b/i, /\bamazing\b/i, /\bdelight(ed|ful)?\b/i,
    /\bbest day\b/i, /\bso happy\b/i, /\bbliss(ful)?\b/i,
  ],
  sorrow: [
    /\bmissed?\b/i, /\blost\b/i, /\bpassed away\b/i, /\bheartbroken\b/i,
    /\bgrie(f|ving|ved)\b/i, /\bcried\b/i, /\bcrying\b/i, /\btears?\b/i,
    /\bso sad\b/i, /\bbroke my heart\b/i, /\bnever (saw|got) (her|him|them)\b/i,
    /\bfuneral\b/i, /\b(she|he|they) died\b/i,
  ],
  pride: [
    /\bproud\b/i, /\baccomplished\b/i, /\bfirst time I\b/i,
    /\bachiev(ed|ement)\b/i, /\b(graduated|earned|won)\b/i,
    /\bbiggest accomplishment\b/i, /\bmade it\b/i,
  ],
  nostalgia: [
    /\bremember when\b/i, /\bback then\b/i, /\bused to\b/i,
    /\bthose days\b/i, /\bwhen I was (young|little|a kid)\b/i,
    /\blong time ago\b/i, /\bgrowing up\b/i, /\bold days\b/i,
  ],
  humor: [
    /\bhaha+\b/i, /\bfunny\b/i, /\balways laughed\b/i, /\bhilarious\b/i,
    /\bcrack(ed)? up\b/i, /\b(ha){2,}\b/i, /\blol\b/i,
    /\bcouldn'?t stop laughing\b/i,
  ],
};

/**
 * Classify the dominant emotional tone of a single response.
 * Returns "neutral" with low confidence when no signals are present.
 */
export function classifySentiment(text: string): SentimentResult {
  const scores: Record<Tone, number> = {
    joy: 0, sorrow: 0, pride: 0, nostalgia: 0, humor: 0, neutral: 0,
  };

  if (!text || typeof text !== 'string') {
    return { tone: 'neutral', confidence: 0, scores };
  }

  const cleaned = text.trim();
  if (cleaned.length === 0) {
    return { tone: 'neutral', confidence: 0, scores };
  }

  for (const [tone, patterns] of Object.entries(KEYWORDS) as Array<
    [Exclude<Tone, 'neutral'>, RegExp[]]
  >) {
    for (const re of patterns) {
      const matches = cleaned.match(re);
      if (matches) scores[tone] += matches.length;
    }
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return { tone: 'neutral', confidence: 0.2, scores };
  }

  let bestTone: Tone = 'neutral';
  let bestScore = 0;
  for (const [tone, score] of Object.entries(scores) as Array<[Tone, number]>) {
    if (score > bestScore) {
      bestScore = score;
      bestTone = tone;
    }
  }

  // Confidence = best / total, capped at 0.95
  const confidence = Math.min(0.95, bestScore / total);
  return { tone: bestTone, confidence, scores };
}

/**
 * Tone-specific instruction fragment to append to the AI system prompt.
 */
export function toneSystemPromptAddition(tone: Tone): string {
  switch (tone) {
    case 'sorrow':
      return `\n\nTONE GUIDANCE: They sound sad. Gently ask who or what helped them get through it, or who they would want to remember it with. Be tender, never clinical. Avoid "how do you feel?" — instead, invite a memory of comfort or care.`;
    case 'joy':
      return `\n\nTONE GUIDANCE: They sound joyful. Match their warmth — ask what made this moment shine, or who they'd most love to share it with again.`;
    case 'pride':
      return `\n\nTONE GUIDANCE: They sound proud of this moment. Ask who they would most want to share this accomplishment with, or who first believed in them.`;
    case 'nostalgia':
      return `\n\nTONE GUIDANCE: They sound nostalgic. Invite a sensory detail from that era — a smell, a song, the way a room looked — to deepen the memory.`;
    case 'humor':
      return `\n\nTONE GUIDANCE: They are being playful. Match the lightness — ask what made it so funny, or who they always laugh about this with.`;
    case 'neutral':
    default:
      return `\n\nTONE GUIDANCE: Their tone is even. Gently invite more colour — a person, a place, or a feeling tied to this memory.`;
  }
}
