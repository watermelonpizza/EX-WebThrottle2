import { describe, expect, it } from 'vitest';

import { decodeSpeedByte, encodeSpeedByte } from '../index';
import { Direction } from '../index';

describe('speed byte encoding', () => {
  it('stops in either direction', () => {
    expect(encodeSpeedByte(0, Direction.FORWARD)).toBe(128);
    expect(encodeSpeedByte(0, Direction.REVERSE)).toBe(0);
  });

  it('encodes speed with direction in the high bit', () => {
    expect(encodeSpeedByte(1, Direction.FORWARD)).toBe(130);
    expect(encodeSpeedByte(50, Direction.FORWARD)).toBe(179);
    expect(encodeSpeedByte(126, Direction.FORWARD)).toBe(255);
    expect(encodeSpeedByte(1, Direction.REVERSE)).toBe(2);
    expect(encodeSpeedByte(50, Direction.REVERSE)).toBe(51);
    expect(encodeSpeedByte(126, Direction.REVERSE)).toBe(127);
  });

  it('encodes emergency stop with direction', () => {
    expect(encodeSpeedByte(0, Direction.FORWARD, true)).toBe(129);
    expect(encodeSpeedByte(0, Direction.REVERSE, true)).toBe(1);
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

  it('round-trips', () => {
    for (let speed = 0; speed <= 126; speed++) {
      const decoded = decodeSpeedByte(
        encodeSpeedByte(speed, Direction.FORWARD),
      );
      expect(decoded.speed).toBe(speed);
    }
  });
});
