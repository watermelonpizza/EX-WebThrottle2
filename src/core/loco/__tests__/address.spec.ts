import { describe, expect, it } from 'vitest';

import { MAX_CAB } from '../../protocol';
import { parseAddress } from '../address';

describe('parsing a typed loco address', () => {
  it('reads whole numbers from 1 to the largest address', () => {
    expect(parseAddress('3')).toBe(3);
    expect(parseAddress(' 42 ')).toBe(42);
    expect(parseAddress(String(MAX_CAB))).toBe(MAX_CAB);
  });

  it('refuses anything else', () => {
    for (const text of ['', '0', '-3', '3.5', 'three', String(MAX_CAB + 1)]) {
      expect(parseAddress(text)).toBeUndefined();
    }
  });
});
