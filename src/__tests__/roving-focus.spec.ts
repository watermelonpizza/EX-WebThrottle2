import { describe, expect, it } from 'vitest';

import { rovingTarget } from '@/composables/useRovingFocus';

// Ten keys in rows of four: 0–3, 4–7, then 8 and 9.
describe('roving focus', () => {
  it.each([
    ['ArrowRight', 1, 2],
    ['ArrowRight', 9, 9],
    ['ArrowLeft', 1, 0],
    ['ArrowLeft', 0, 0],
    ['ArrowDown', 1, 5],
    ['ArrowDown', 7, 7],
    ['ArrowUp', 5, 1],
    ['ArrowUp', 2, 2],
    ['Home', 6, 0],
    ['End', 2, 9],
  ])('moves %s from key %i to key %i', (key, from, to) => {
    expect(rovingTarget(key, from, 10, 4)).toBe(to);
  });

  it('leaves every other key to the item itself', () => {
    expect(rovingTarget('Enter', 3, 10, 4)).toBeUndefined();
  });
});
