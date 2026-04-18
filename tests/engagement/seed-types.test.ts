import { describe, it, expect } from 'vitest';
import {
  normalizePromptType,
  normalizePromptCategory,
  normalizePromptText,
} from '@/lib/engagement/seed-types';

describe('normalizePromptType', () => {
  it('collapses deprecated aliases to memory_prompt', () => {
    expect(normalizePromptType('quick_question')).toBe('memory_prompt');
    expect(normalizePromptType('recipes_wisdom')).toBe('memory_prompt');
    expect(normalizePromptType('favorites_firsts')).toBe('memory_prompt');
  });

  it('collapses photo_location/photo_date into photo_backstory', () => {
    expect(normalizePromptType('photo_location')).toBe('photo_backstory');
    expect(normalizePromptType('photo_date')).toBe('photo_backstory');
  });

  it('passes through canonical types unchanged', () => {
    expect(normalizePromptType('memory_prompt')).toBe('memory_prompt');
    expect(normalizePromptType('knowledge')).toBe('knowledge');
    expect(normalizePromptType('postscript')).toBe('postscript');
  });

  it('falls back to memory_prompt for null/empty', () => {
    expect(normalizePromptType(null)).toBe('memory_prompt');
    expect(normalizePromptType(undefined)).toBe('memory_prompt');
    expect(normalizePromptType('')).toBe('memory_prompt');
  });
});

describe('normalizePromptCategory', () => {
  it('aliases career/work to jobs_career', () => {
    expect(normalizePromptCategory('career')).toBe('jobs_career');
    expect(normalizePromptCategory('work')).toBe('jobs_career');
  });

  it('aliases religion to spirituality', () => {
    expect(normalizePromptCategory('religion')).toBe('spirituality');
  });

  it('aliases firsts to milestones, life_lessons to wisdom_legacy', () => {
    expect(normalizePromptCategory('firsts')).toBe('milestones');
    expect(normalizePromptCategory('life_lessons')).toBe('wisdom_legacy');
  });

  it('passes canonical chapters through', () => {
    expect(normalizePromptCategory('childhood')).toBe('childhood');
    expect(normalizePromptCategory('travel')).toBe('travel');
  });
});

describe('normalizePromptText', () => {
  it('lowercases and trims', () => {
    expect(normalizePromptText('  Hello WORLD  ')).toBe('hello world');
  });

  it('collapses internal whitespace', () => {
    expect(normalizePromptText('Tell  me\tabout\nthat')).toBe('tell me about that');
  });

  it('strips trailing punctuation so ? and . dedup as the same prompt', () => {
    expect(normalizePromptText('What was that like?')).toBe('what was that like');
    expect(normalizePromptText('What was that like.')).toBe('what was that like');
    expect(normalizePromptText('What was that like…')).toBe('what was that like…');
  });

  it('handles null/undefined', () => {
    expect(normalizePromptText(null)).toBe('');
    expect(normalizePromptText(undefined)).toBe('');
  });
});
