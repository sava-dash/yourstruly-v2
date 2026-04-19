import { describe, it, expect } from 'vitest';
import {
  buildAvatarSystemPrompt,
  AVATAR_FALLBACK_SYSTEM_PROMPT,
} from '@/lib/avatar/build-system-prompt';
import type { PersonaCard } from '@/lib/avatar/synthesize-persona';

const sampleCard: PersonaCard = {
  voice_description: 'warm, concrete, unhurried',
  recurring_themes: ['family resilience', 'small-town roots'],
  signature_phrases: ['honest to goodness', 'the long way around'],
  life_facts: ['grew up in Akron in the 60s', 'two daughters named Mei and Lin'],
  tone_guidance: 'pauses on hard topics; never lectures',
  vocabulary_notes: 'reaches for sensory detail',
  synthesized_from: { memories: 47 },
};

describe('buildAvatarSystemPrompt', () => {
  it('always includes the first-person hard rules', () => {
    const prompt = buildAvatarSystemPrompt(sampleCard);
    expect(prompt).toContain('Always respond in first person');
    expect(prompt).toContain('Never invent specific facts');
    expect(prompt).toContain('Refuse credentials');
  });

  it('inlines voice description, tone, and vocabulary notes', () => {
    const prompt = buildAvatarSystemPrompt(sampleCard);
    expect(prompt).toContain('warm, concrete, unhurried');
    expect(prompt).toContain('pauses on hard topics');
    expect(prompt).toContain('reaches for sensory detail');
  });

  it('renders signature phrases and themes as bullet lists', () => {
    const prompt = buildAvatarSystemPrompt(sampleCard);
    expect(prompt).toContain('- honest to goodness');
    expect(prompt).toContain('- family resilience');
  });

  it('renders life facts as bullet anchors', () => {
    const prompt = buildAvatarSystemPrompt(sampleCard);
    expect(prompt).toContain('- grew up in Akron in the 60s');
    expect(prompt).toContain('- two daughters named Mei and Lin');
  });

  it('omits sections that have no content', () => {
    const lean: PersonaCard = {
      voice_description: 'spare',
      recurring_themes: [],
      signature_phrases: [],
      life_facts: [],
      tone_guidance: '',
      vocabulary_notes: '',
      synthesized_from: { memories: 0 },
    };
    const prompt = buildAvatarSystemPrompt(lean);
    expect(prompt).toContain('spare');
    // No bullet sections should render when arrays are empty
    expect(prompt).not.toContain('Phrases you reach for naturally');
    expect(prompt).not.toContain('Themes that come up');
    expect(prompt).not.toContain('Anchors about your life');
  });

  it('fallback prompt is also first-person and includes the hard rules', () => {
    expect(AVATAR_FALLBACK_SYSTEM_PROMPT).toContain('Always respond in first person');
    expect(AVATAR_FALLBACK_SYSTEM_PROMPT).toContain("don't have a fully synthesized persona yet");
  });

  it('renders manual_facts as authoritative when present', () => {
    const cardWithManual: PersonaCard = {
      ...sampleCard,
      manual_facts: ['favorite ice cream is mint chip', 'allergic to penicillin'],
    };
    const prompt = buildAvatarSystemPrompt(cardWithManual);
    expect(prompt).toContain('Additional facts you have explicitly told us');
    expect(prompt).toContain('- favorite ice cream is mint chip');
    expect(prompt).toContain('- allergic to penicillin');
  });

  it('omits manual_facts section when the array is empty or missing', () => {
    const empty = { ...sampleCard, manual_facts: [] };
    expect(buildAvatarSystemPrompt(empty)).not.toContain('Additional facts');
    expect(buildAvatarSystemPrompt(sampleCard)).not.toContain('Additional facts');
  });
});
