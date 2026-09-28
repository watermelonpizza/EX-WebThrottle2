import { describe, expect, it } from 'vitest';

import { DEFAULT_FUNCTIONS, decodeFunctionMap, parseRosterFunctions } from '../functions';

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

describe('parseRosterFunctions', () => {
  it('numbers the names from F0', () => {
    expect(parseRosterFunctions('Lights/Bell')).toEqual([
      { fn: 0, label: 'Lights', momentary: false },
      { fn: 1, label: 'Bell', momentary: false },
    ]);
  });

  it('marks a name starting with * as one you hold down', () => {
    expect(parseRosterFunctions('Lights/*Horn')[1]).toEqual({ fn: 1, label: 'Horn', momentary: true });
  });

  it('leaves out a function with no name', () => {
    expect(parseRosterFunctions('Lights//Horn').map(def => def.fn)).toEqual([0, 2]);
  });

  it('has no functions for an empty list', () => {
    expect(parseRosterFunctions('')).toEqual([]);
  });

  it('stops at F31, the last function the broadcast carries', () => {
    expect(parseRosterFunctions(Array.from({ length: 40 }, (_, fn) => `F${fn}`).join('/')).at(-1)?.fn).toBe(31);
  });
});
