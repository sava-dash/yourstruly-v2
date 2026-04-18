import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFollowUpWithMetrics } from '@/lib/engagement/follow-up-engine';

/**
 * The threshold-and-logging behavior of generateFollowUpWithMetrics is the
 * surface-level guarantee callers depend on:
 *   - <=200 chars => skipped, no Anthropic call
 *   - empty text  => skipped, no Anthropic call
 *   - logs JSON with outcome + duration_ms + input_length
 *
 * The Anthropic call path requires network + API key, which is exactly the
 * boundary we don't want to cross in unit tests, so we only assert the
 * skip-and-log paths here.
 */

const fakeSupabase = {} as any;

describe('generateFollowUpWithMetrics', () => {
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

  it('skips and logs when responseText is empty', () => {
    generateFollowUpWithMetrics(fakeSupabase, 'user-1', 'prompt-1', '');
    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.outcome).toBe('skipped_no_text');
    expect(payload.input_length).toBe(0);
    expect(payload.user_id).toBe('user-1');
    expect(payload.prompt_id).toBe('prompt-1');
    expect(typeof payload.duration_ms).toBe('number');
  });

  it('skips and logs when responseText is below the 200-char threshold', () => {
    generateFollowUpWithMetrics(fakeSupabase, 'user-1', 'prompt-1', 'short answer');
    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.outcome).toBe('skipped_short');
    expect(payload.input_length).toBe('short answer'.length);
  });

  it('does not throw on the synchronous skip paths', () => {
    expect(() =>
      generateFollowUpWithMetrics(fakeSupabase, 'u', 'p', '')
    ).not.toThrow();
    expect(() =>
      generateFollowUpWithMetrics(fakeSupabase, 'u', 'p', 'tiny')
    ).not.toThrow();
  });
});
