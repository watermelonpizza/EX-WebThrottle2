import { describe, expect, it } from 'vitest';

import { DEFAULT_FUNCTIONS, decodeFunctionMap } from '../functions';

describe('default function map', () => {
  it('covers all 32 broadcast function flags in order', () => {
    expect(DEFAULT_FUNCTIONS.map(fn => fn.fn)).toEqual(Array.from({ length: 32 }, (_, i) => i));
  });

  it('marks only the horn as momentary', () => {
    expect(DEFAULT_FUNCTIONS.filter(fn => fn.momentary)).toEqual([expect.objectContaining({ fn: 2, label: 'Horn' })]);
  });
});

describe('decodeFunctionMap', () => {
  it('decodes every flag bit into one of 32 states', () => {
    const states = decodeFunctionMap(0b101);

    expect(states).toEqual([true, false, true, ...new Array(29).fill(false)]);
  });

  it('ignores functions above 31, outside the broadcast range', () => {
    const states = decodeFunctionMap(0x1_0000_0000);

    expect(states.every(state => state === false)).toBe(true);
  });
});
