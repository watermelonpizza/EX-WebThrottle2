import { describe, expect, it } from 'vitest';

import { fitKeys } from '@/components/throttle/fit-keys';

// Four keys a row; 204px of room (200 plus one gap) fits four roomy rows of
// 44 + 4 or five compact rows of 32 + 4.
const ROOM = { available: 200, rowGap: 4, columns: 4, roomy: 44, compact: 32 };

describe('fitting function keys to a desk', () => {
  it('keeps keys a control high when every function fits that way', () => {
    expect(fitKeys(ROOM, 16)).toEqual({ tight: false, limit: undefined });
  });

  it('tightens the keys when that is what lets every function fit', () => {
    expect(fitKeys(ROOM, 20)).toEqual({ tight: true, limit: undefined });
  });

  it.each([
    { room: ROOM, limit: 20, when: 'five compact rows fit' },
    { room: { ...ROOM, available: 0 }, limit: 0, when: 'no row fits' },
  ])('shows only whole rows, $limit keys, when $when', ({ room, limit }) => {
    expect(fitKeys(room, 32)).toEqual({ tight: true, limit });
  });

  it.each([
    { room: { ...ROOM, columns: 0 }, missing: 'the column count' },
    { room: { ...ROOM, compact: 0 }, missing: 'the compact key height' },
  ])('waits until it can measure $missing', ({ room }) => {
    expect(fitKeys(room, 32)).toBeUndefined();
  });
});
