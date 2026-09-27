import type { EffectScope, Ref } from 'vue';
import { effectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clockTime, logTime, useClock } from '@/composables/useClock';

const AT = new Date('2026-01-02T13:14:15').getTime();

describe('clock formatting', () => {
  it.each([
    { use: 'the clock', format: clockTime, expected: '13:14' },
    { use: 'the traffic log', format: logTime, expected: '13:14:15' },
  ])('formats the time for $use as $expected', ({ format, expected }) => {
    expect(format(AT)).toBe(expected);
  });
});

describe('a mounted clock', () => {
  let scope: EffectScope;
  let clock: Ref<string> | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AT);
    scope = effectScope();
    clock = scope.run(() => useClock());
  });

  afterEach(() => {
    scope.stop();
    vi.useRealTimers();
  });

  it('shows the time it was mounted', () => {
    expect(clock?.value).toBe('13:14');
  });

  it('moves on with the time of day', () => {
    vi.advanceTimersByTime(60_000);

    expect(clock?.value).toBe('13:15');
  });
});
