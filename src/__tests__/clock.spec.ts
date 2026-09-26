import { effectScope } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { clockTime, logTime } from '@/composables/useClock';

describe('clock formatting', () => {
  it('formats time for the clock and traffic log', () => {
    const date = new Date('2026-01-02T13:14:15');

    expect(clockTime(date.getTime())).toBe('13:14');
    expect(logTime(date.getTime())).toBe('13:14:15');
  });

  it('updates a mounted clock on its interval', async () => {
    vi.useFakeTimers();
    const { useClock } = await import('@/composables/useClock');
    const scope = effectScope();
    const clock = scope.run(() => useClock());

    vi.advanceTimersByTime(5000);
    expect(clock?.value).toMatch(/^\d{2}:\d{2}$/);
    scope.stop();
    vi.useRealTimers();
  });
});
