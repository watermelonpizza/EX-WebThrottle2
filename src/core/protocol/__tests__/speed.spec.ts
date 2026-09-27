import { describe, expect, it } from 'vitest';

import { Direction, decodeSpeedByte } from '../index';

// Bit 7 is the direction; the low seven bits are 0 for stop, 1 for an
// emergency stop, and speed + 1 above that.
describe('speed byte decoding', () => {
  it.each([
    { byte: 128, reads: 'stopped forward', direction: Direction.FORWARD, speed: 0, estop: false },
    { byte: 0, reads: 'stopped in reverse', direction: Direction.REVERSE, speed: 0, estop: false },
    { byte: 2, reads: 'speed 1 in reverse', direction: Direction.REVERSE, speed: 1, estop: false },
    { byte: 127, reads: 'speed 126 in reverse', direction: Direction.REVERSE, speed: 126, estop: false },
    { byte: 130, reads: 'speed 1 forward', direction: Direction.FORWARD, speed: 1, estop: false },
    { byte: 179, reads: 'speed 50 forward', direction: Direction.FORWARD, speed: 50, estop: false },
    { byte: 255, reads: 'speed 126 forward', direction: Direction.FORWARD, speed: 126, estop: false },
    { byte: 129, reads: 'an emergency stop forward', direction: Direction.FORWARD, speed: 0, estop: true },
    { byte: 1, reads: 'an emergency stop in reverse', direction: Direction.REVERSE, speed: 0, estop: true },
  ])('reads $byte as $reads', ({ byte, direction, speed, estop }) => {
    expect(decodeSpeedByte(byte)).toEqual({ direction, speed, estop });
  });

  it.each([-1, 256])('rejects %i, outside a single octet', (byte) => {
    expect(() => decodeSpeedByte(byte)).toThrow();
  });
});
