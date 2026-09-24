import { describe, expect, it } from 'vitest';

import { extractFrames } from '../index';

describe('extractFrames', () => {
  it('extracts frames and drops everything outside the brackets', () => {
    expect(extractFrames('noise<p1><l 3 0 143 1>tail<H 1 0>')).toEqual({
      frames: ['p1', 'l 3 0 143 1', 'H 1 0'],
      rest: '',
    });
  });

  it('keeps a frame still arriving in rest', () => {
    expect(extractFrames('<iDCCEX V-4.2.2')).toEqual({
      frames: [],
      rest: '<iDCCEX V-4.2.2',
    });
  });

  it('continues a partial frame from the previous chunk', () => {
    const first = extractFrames('<iDCCEX V-4.2.2');

    expect(extractFrames(first.rest + '0 / MEGA / Pololu / 5><p1>')).toEqual({
      frames: ['iDCCEX V-4.2.20 / MEGA / Pololu / 5', 'p1'],
      rest: '',
    });
  });

  it('returns empty frames for empty brackets', () => {
    expect(extractFrames('<>')).toEqual({ frames: [''], rest: '' });
  });

  it('returns nothing when there are no brackets at all', () => {
    expect(extractFrames('plain text')).toEqual({ frames: [], rest: '' });
  });
});
