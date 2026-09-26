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

  it('shows whole rows only when some functions have to be left out', () => {
    expect(fitKeys(ROOM, 32)).toEqual({ tight: true, limit: 20 });
    expect(fitKeys({ ...ROOM, available: 0 }, 32)).toEqual({
      tight: true,
      limit: 0,
    });
  });

  it('waits until the grid can be measured', () => {
    expect(fitKeys({ ...ROOM, columns: 0 }, 32)).toBeUndefined();
    expect(fitKeys({ ...ROOM, compact: 0 }, 32)).toBeUndefined();
  });
});
