import { describe, expect, it } from 'vitest';

import { Direction, decodeSpeedByte } from '../index';

describe('speed byte decoding', () => {
  it('decodes a stop in either direction', () => {
    expect(decodeSpeedByte(128)).toEqual({
      direction: Direction.FORWARD,
      speed: 0,
      estop: false,
    });
    expect(decodeSpeedByte(0)).toEqual({
      direction: Direction.REVERSE,
      speed: 0,
      estop: false,
    });
  });

  it('decodes speeds with the reverse range', () => {
    expect(decodeSpeedByte(2)).toEqual({
      direction: Direction.REVERSE,
      speed: 1,
      estop: false,
    });
    expect(decodeSpeedByte(127)).toEqual({
      direction: Direction.REVERSE,
      speed: 126,
      estop: false,
    });
  });

  it('decodes a forward speed byte', () => {
    expect(decodeSpeedByte(130)).toEqual({
      direction: Direction.FORWARD,
      speed: 1,
      estop: false,
    });
    expect(decodeSpeedByte(179)).toEqual({
      direction: Direction.FORWARD,
      speed: 50,
      estop: false,
    });
    expect(decodeSpeedByte(255)).toEqual({
      direction: Direction.FORWARD,
      speed: 126,
      estop: false,
    });
  });

  it('decodes an emergency stop byte', () => {
    expect(decodeSpeedByte(129)).toEqual({
      direction: Direction.FORWARD,
      speed: 0,
      estop: true,
    });
    expect(decodeSpeedByte(1)).toEqual({
      direction: Direction.REVERSE,
      speed: 0,
      estop: true,
    });
  });

  it('rejects bytes outside a single octet', () => {
    expect(() => decodeSpeedByte(-1)).toThrow();
    expect(() => decodeSpeedByte(256)).toThrow();
  });
});
