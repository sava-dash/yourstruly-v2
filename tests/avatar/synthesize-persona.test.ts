import { describe, it, expect } from 'vitest';
import { parsePersonaCard } from '@/lib/avatar/synthesize-persona';

/**
 * The synthesizer end-to-end requires Anthropic + DB, so we don't exercise
 * it here. parsePersonaCard is the surface that runs without network and
 * is the contract the rest of the system depends on for shape safety.
 */

describe('parsePersonaCard', () => {
  const validPayload = JSON.stringify({
    voice_description: 'warm, concrete, unhurried',
    recurring_themes: ['family resilience', 'small-town roots'],
    signature_phrases: ['honest to goodness'],
    life_facts: ['grew up in Akron in the 60s'],
    tone_guidance: 'pauses on hard topics; never lectures',
    vocabulary_notes: 'reaches for sensory detail',
  });

  it('parses bare JSON and stamps source_count', () => {
    const card = parsePersonaCard(validPayload, 47);
    expect(card).not.toBeNull();
    expect(card!.voice_description).toBe('warm, concrete, unhurried');
    expect(card!.recurring_themes).toEqual(['family resilience', 'small-town roots']);
    expect(card!.synthesized_from).toEqual({ memories: 47 });
  });

  it('strips ```json fences', () => {
    const fenced = '```json\n' + validPayload + '\n```';
    const card = parsePersonaCard(fenced, 5);
    expect(card).not.toBeNull();
    expect(card!.life_facts).toEqual(['grew up in Akron in the 60s']);
  });

  it('extracts JSON embedded in stray prose', () => {
    const messy = 'Here you go: ' + validPayload + ' — let me know if you want changes.';
    const card = parsePersonaCard(messy, 5);
    expect(card).not.toBeNull();
    expect(card!.tone_guidance).toContain('hard topics');
  });

  it('returns null for unparseable input', () => {
    expect(parsePersonaCard('hello', 0)).toBeNull();
    expect(parsePersonaCard('', 0)).toBeNull();
    expect(parsePersonaCard('{not valid', 0)).toBeNull();
  });

  it('filters non-string array entries and trims fields', () => {
    const card = parsePersonaCard(JSON.stringify({
      voice_description: '  warm  ',
      recurring_themes: ['ok', 42, null, ''],
      signature_phrases: [],
      life_facts: ['a'],
      tone_guidance: 'g',
      vocabulary_notes: 'v',
    }), 1);
    expect(card!.voice_description).toBe('warm');
    expect(card!.recurring_themes).toEqual(['ok']);
    expect(card!.signature_phrases).toEqual([]);
  });

  it('rejects payloads with no voice and no facts and no themes', () => {
    const card = parsePersonaCard(JSON.stringify({
      voice_description: '',
      recurring_themes: [],
      signature_phrases: [],
      life_facts: [],
      tone_guidance: '',
      vocabulary_notes: '',
    }), 0);
    expect(card).toBeNull();
  });

  it('accepts payload with only life_facts', () => {
    const card = parsePersonaCard(JSON.stringify({
      voice_description: '',
      recurring_themes: [],
      signature_phrases: [],
      life_facts: ['born in 1962'],
      tone_guidance: '',
      vocabulary_notes: '',
    }), 1);
    expect(card).not.toBeNull();
    expect(card!.life_facts).toEqual(['born in 1962']);
  });
});
