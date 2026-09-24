import { describe, expect, it } from 'vitest';

import { DEFAULT_FUNCTIONS, decodeFunctionMap } from '../functions';

describe('default function map', () => {
  it('covers all 32 broadcast function flags in order', () => {
    expect(DEFAULT_FUNCTIONS).toHaveLength(32);
    expect(DEFAULT_FUNCTIONS.map((fn) => fn.fn)).toEqual(
      Array.from({ length: 32 }, (_, i) => i),
    );
  });

  it('marks only the horn as momentary', () => {
    expect(DEFAULT_FUNCTIONS.filter((fn) => fn.momentary)).toEqual([
      expect.objectContaining({ fn: 2, label: 'Horn' }),
    ]);
  });
});

describe('decodeFunctionMap', () => {
  it('decodes every flag bit', () => {
    const states = decodeFunctionMap(0b101);

    expect(states.length).toBe(32);
    expect(states[0]).toBe(true);
    expect(states[1]).toBe(false);
    expect(states[2]).toBe(true);
    expect(states.slice(3).every((state) => state === false)).toBe(true);
  });

  it('handles functions above 31 set outside the broadcast range', () => {
    const states = decodeFunctionMap(0x1_0000_0000);

    expect(states.every((state) => state === false)).toBe(true);
  });
});
