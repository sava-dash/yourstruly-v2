import { describe, it, expect } from 'vitest';
import {
  rankPrompts,
  scorePrompt,
  type ScoringContext,
} from '@/lib/engagement/prompt-scoring';
import type { EngagementPrompt } from '@/types/engagement';

const baseTime = new Date('2026-04-18T20:00:00Z'); // 8pm UTC

function makePrompt(overrides: Partial<EngagementPrompt> = {}): EngagementPrompt {
  return {
    id: 'p1',
    userId: 'u1',
    type: 'memory_prompt',
    promptText: 'Tell me about your hometown',
    status: 'pending',
    priority: 70,
    createdAt: baseTime.toISOString(),
    ...overrides,
  } as EngagementPrompt;
}

describe('scorePrompt', () => {
  it('returns base priority when no signals match', () => {
    const ctx: ScoringContext = { now: new Date(2026, 3, 18, 15, 0, 0) }; // 3pm
    // memory_prompt at 3pm has no PHOTO/QUICK/REFLECTIVE bonus
    const score = scorePrompt(makePrompt({ priority: 50 }), ctx);
    expect(score).toBe(50);
  });

  it('penalizes back-to-back same type by -20', () => {
    const ctx: ScoringContext = {
      recentlyShownTypes: ['memory_prompt'],
      now: new Date(2026, 3, 18, 15, 0, 0),
    };
    const score = scorePrompt(makePrompt({ priority: 70 }), ctx);
    expect(score).toBe(50);
  });

  it('boosts photo_backstory in afternoon hours', () => {
    const now = new Date(2026, 3, 18, 15, 0, 0); // 3pm local
    const photoCtx: ScoringContext = { now };
    // createdAt > 48h ago so freshness bonus is 0 and we isolate the
    // time-of-day + photo_relevance contribution.
    const stale = new Date(now.getTime() - 1000 * 60 * 60 * 72).toISOString();
    const photo = makePrompt({
      type: 'photo_backstory',
      priority: 70,
      photoId: 'pic1',
      createdAt: stale,
    });
    const score = scorePrompt(photo, photoCtx);
    // priority 70
    //   + time-of-day 10 (PHOTO_TYPES in 12-17 bucket)
    //   + photo_relevance 10 (photo_backstory)
    //   + streak_risk 10   (default streakStatus 'none' boosts photo_backstory)
    expect(score).toBe(100);
  });

  it('rewards freshness for prompts created in the last 24h', () => {
    const ctx: ScoringContext = { now: baseTime };
    const fresh = makePrompt({ createdAt: baseTime.toISOString() });
    const stale = makePrompt({
      createdAt: new Date(baseTime.getTime() - 1000 * 60 * 60 * 72).toISOString(),
    });
    expect(scorePrompt(fresh, ctx)).toBeGreaterThan(scorePrompt(stale, ctx));
  });

  it('demotes deep types in quiet hours', () => {
    const ctx: ScoringContext = { now: new Date(2026, 3, 18, 3, 0, 0) }; // 3am local
    const score = scorePrompt(makePrompt({ priority: 70 }), ctx);
    // memory_prompt is not daily_checkin, so quiet hours give -15
    expect(score).toBe(55);
  });
});

describe('rankPrompts', () => {
  it('returns input as-is when length <= 1', () => {
    const single = [makePrompt()];
    expect(rankPrompts(single)).toEqual(single);
  });

  it('orders by descending score', () => {
    const high = makePrompt({ id: 'high', priority: 90 });
    const low = makePrompt({ id: 'low', priority: 10 });
    const ranked = rankPrompts([low, high], { now: new Date(2026, 3, 18, 15, 0, 0) });
    expect(ranked.map((p) => p.id)).toEqual(['high', 'low']);
  });

  it('avoids back-to-back same type when an alternative is within 8 points', () => {
    const a1 = makePrompt({ id: 'a1', type: 'memory_prompt', priority: 100 });
    const a2 = makePrompt({ id: 'a2', type: 'memory_prompt', priority: 95 });
    const b1 = makePrompt({ id: 'b1', type: 'knowledge', priority: 94 });
    const ranked = rankPrompts([a1, a2, b1], { now: new Date(2026, 3, 18, 15, 0, 0) });
    expect(ranked[0].id).toBe('a1');
    // a2 would be back-to-back memory_prompt; b1 (knowledge, 94) is within 8 of a2 (95)
    expect(ranked[1].id).toBe('b1');
    expect(ranked[2].id).toBe('a2');
  });

  it('keeps duplicates if no alt is within 8 points', () => {
    const a1 = makePrompt({ id: 'a1', type: 'memory_prompt', priority: 100 });
    const a2 = makePrompt({ id: 'a2', type: 'memory_prompt', priority: 90 });
    const farB = makePrompt({ id: 'b1', type: 'knowledge', priority: 50 });
    const ranked = rankPrompts([a1, a2, farB], { now: new Date(2026, 3, 18, 15, 0, 0) });
    expect(ranked[0].id).toBe('a1');
    expect(ranked[1].id).toBe('a2');
    expect(ranked[2].id).toBe('b1');
  });
});
