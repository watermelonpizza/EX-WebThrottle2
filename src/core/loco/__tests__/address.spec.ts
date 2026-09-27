import { describe, expect, it } from 'vitest';

import { MAX_CAB } from '../../protocol';
import { parseAddress } from '../address';

describe('parsing a typed loco address', () => {
  it.each([
    { text: '3', address: 3 },
    { text: ' 42 ', address: 42 },
    { text: String(MAX_CAB), address: MAX_CAB },
  ])('reads "$text" as $address', ({ text, address }) => {
    expect(parseAddress(text)).toBe(address);
  });

  it.each(['', '0', '-3', '3.5', 'three', String(MAX_CAB + 1)])('refuses "%s"', (text) => {
    expect(parseAddress(text)).toBeUndefined();
  });
});
