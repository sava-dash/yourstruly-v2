import { describe, it, expect } from 'vitest';
import { formatRagContext } from '@/lib/ai/rag-runtime';

/**
 * runRagChat itself spans Anthropic + Supabase + RPC, so we don't unit-test
 * the orchestration here. formatRagContext is the pure function we DO test:
 * it owns the prompt-shape contract that the model sees, and grouping bugs
 * here would silently degrade both Concierge and Avatar quality.
 */

describe('formatRagContext', () => {
  it('returns a placeholder when no rows match', () => {
    const out = formatRagContext([]);
    expect(out).toContain('No specific memories');
  });

  it('groups memories under the Memories heading with title and date', () => {
    const out = formatRagContext([
      { content_type: 'memory', title: 'Fishing trip', content: 'Caught nothing.', metadata: { date: '1998-07-04' } },
    ]);
    expect(out).toContain('## Relevant Memories');
    expect(out).toContain('"Fishing trip"');
    expect(out).toContain('1998-07-04');
    expect(out).toContain('Caught nothing.');
  });

  it('surfaces extracted entity fields when present', () => {
    const out = formatRagContext([
      {
        content_type: 'memory',
        title: 'Sunday dinner',
        content: 'Grandma cooked her chicken.',
        metadata: {
          date: '1985',
          people_mentioned: ['Grandma Rose'],
          topics: ['family tradition'],
        },
      },
    ]);
    expect(out).toContain('People mentioned: Grandma Rose');
    expect(out).toContain('Topics: family tradition');
  });

  it('groups contacts and pets under their own headings', () => {
    const out = formatRagContext([
      { content_type: 'contact', title: 'Mom', metadata: { relationship: 'mother', birthday: '1955-03-12' } },
      { content_type: 'pet', title: 'Biscuit', metadata: { species: 'dog', breed: 'corgi' }, content: 'A loud little dog.' },
    ]);
    expect(out).toContain('## Relevant People');
    expect(out).toContain('Mom (mother)');
    expect(out).toContain('Birthday: 1955-03-12');
    expect(out).toContain('## Pets');
    expect(out).toContain('Biscuit (dog)');
    expect(out).toContain('corgi');
    expect(out).toContain('A loud little dog.');
  });

  it('groups postscripts with recipient and delivery date', () => {
    const out = formatRagContext([
      { content_type: 'postscript', title: 'For Maya', metadata: { recipient: 'Maya', deliver_on: '2030-06-01' } },
    ]);
    expect(out).toContain('## Relevant PostScripts');
    expect(out).toContain('"For Maya" for Maya');
    expect(out).toContain('delivers: 2030-06-01');
  });
});
