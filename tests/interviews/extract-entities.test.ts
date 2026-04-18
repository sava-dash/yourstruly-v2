import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseEntities,
  extractAndPersistWithMetrics,
} from '@/lib/interviews/extract-entities';

/**
 * Extraction itself requires the Anthropic SDK + a network round-trip, so
 * we don't exercise it here — that's the boundary we keep out of unit
 * tests. What we DO test is the surface that runs without a network call:
 *
 *   - parseEntities: defensive JSON parsing, shape validation
 *   - extractAndPersistWithMetrics: skip-and-log paths (empty + short text),
 *     since those are the contract /save-response relies on for fast,
 *     side-effect-free returns when there's nothing useful to extract.
 */

const fakeAdmin = {} as any;

describe('parseEntities', () => {
  it('parses bare JSON', () => {
    const result = parseEntities(JSON.stringify({
      topics: ['family dinner'],
      people: ['Grandma Rose'],
      times: ['the 1980s'],
      locations: ['Brooklyn'],
      summary: 'A weekly family dinner.',
    }));
    expect(result).not.toBeNull();
    expect(result!.topics).toEqual(['family dinner']);
    expect(result!.people).toEqual(['Grandma Rose']);
    expect(result!.summary).toBe('A weekly family dinner.');
    expect(typeof result!.extracted_at).toBe('string');
  });

  it('strips ```json code fences', () => {
    const fenced = '```json\n' + JSON.stringify({
      topics: ['t'],
      people: [],
      times: [],
      locations: [],
      summary: 's',
    }) + '\n```';
    const result = parseEntities(fenced);
    expect(result).not.toBeNull();
    expect(result!.topics).toEqual(['t']);
    expect(result!.summary).toBe('s');
  });

  it('extracts JSON embedded in stray prose', () => {
    const messy = 'Here is the JSON you asked for: ' + JSON.stringify({
      topics: ['ok'],
      people: [],
      times: [],
      locations: [],
      summary: 'fine',
    }) + ' — hope that helps!';
    const result = parseEntities(messy);
    expect(result).not.toBeNull();
    expect(result!.summary).toBe('fine');
  });

  it('returns null for unparseable input', () => {
    expect(parseEntities('hello')).toBeNull();
    expect(parseEntities('')).toBeNull();
    expect(parseEntities('{not valid')).toBeNull();
  });

  it('filters non-string array entries', () => {
    const result = parseEntities(JSON.stringify({
      topics: ['ok', 42, null, '', '  trim  '],
      people: [],
      times: [],
      locations: [],
      summary: 'x',
    }));
    expect(result!.topics).toEqual(['ok', '  trim  ']);
  });

  it('returns null when every field is empty', () => {
    const result = parseEntities(JSON.stringify({
      topics: [],
      people: [],
      times: [],
      locations: [],
      summary: '',
    }));
    expect(result).toBeNull();
  });

  it('accepts payloads with only a summary', () => {
    const result = parseEntities(JSON.stringify({
      topics: [],
      people: [],
      times: [],
      locations: [],
      summary: 'A short reflection.',
    }));
    expect(result).not.toBeNull();
    expect(result!.summary).toBe('A short reflection.');
  });
});

describe('extractAndPersistWithMetrics', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('skips and logs when transcript is empty', () => {
    extractAndPersistWithMetrics(fakeAdmin, {
      videoResponseId: 'vr-1',
      memoryId: 'm-1',
      transcript: '',
      sessionId: 's-1',
      userId: 'u-1',
    });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.outcome).toBe('skipped_no_text');
    expect(payload.input_length).toBe(0);
    expect(payload.video_response_id).toBe('vr-1');
    expect(payload.memory_id).toBe('m-1');
    expect(typeof payload.duration_ms).toBe('number');
  });

  it('skips and logs when transcript is below threshold', () => {
    extractAndPersistWithMetrics(fakeAdmin, {
      videoResponseId: 'vr-2',
      memoryId: null,
      transcript: 'too short',
    });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.outcome).toBe('skipped_short');
    expect(payload.input_length).toBe('too short'.length);
    expect(payload.memory_id).toBeNull();
    expect(payload.session_id).toBeNull();
    expect(payload.user_id).toBeNull();
  });

  it('does not call admin client on the skip paths', () => {
    // fakeAdmin has no `.from()` — if we ever reach DB calls the test crashes.
    expect(() => extractAndPersistWithMetrics(fakeAdmin, {
      videoResponseId: 'vr-3',
      memoryId: 'm-3',
      transcript: '',
    })).not.toThrow();
  });
});
