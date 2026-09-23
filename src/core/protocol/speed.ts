import { Direction } from './types';

export interface DecodedSpeed {
  direction: Direction;
  speed: number;
  estop: boolean;
}

// The command station reports loco speed as one "speed byte" following the DCC
// speed-step standard (see the "Set Cab (Loco) Speed" section of the DCC-EX
// Native Commands Summary Reference). Direction, stop, emergency stop and speed
// are all packed into that single byte:
//
//   reverse: 0 = stop, 1 = emergency stop, 2..127 = speed 1..126
//   forward: 128 = stop, 129 = emergency stop, 130..255 = speed 1..126
//
// The byte therefore has no room for speed 0..126 as-is: each direction range
// squeezes speed 1 at the byte right after its reserved stop/e-stop pair.
export function decodeSpeedByte(speedByte: number): DecodedSpeed {
  if (!Number.isInteger(speedByte) || speedByte < 0 || speedByte > 255) {
    throw new Error('speed byte must be an integer from 0 to 255');
  }

  const estop = speedByte === 1 || speedByte === 129;
  const forward = speedByte >= 128;

  // Undo the packing above: subtract the reserved bytes that precede the run
  // of speed values in each direction range.
  const raw =
    forward && speedByte >= 130
      ? speedByte - 129
      : !forward && speedByte >= 2
        ? speedByte - 1
        : 0;

  return {
    direction: forward ? Direction.FORWARD : Direction.REVERSE,
    speed: estop ? 0 : raw,
    estop,
  };
}

// Inverse of decodeSpeedByte: same byte layout, built in the other direction.
export function encodeSpeedByte(
  speed: number,
  direction: Direction,
  estop = false,
): number {
  if (!Number.isInteger(speed) || speed < 0 || speed > 126) {
    throw new Error('speed must be an integer from 0 to 126');
  }

  if (estop) {
    return direction === Direction.FORWARD ? 129 : 1;
  }

  if (speed === 0) {
    return direction === Direction.FORWARD ? 128 : 0;
  }

  // Move speed 1..126 past the two reserved bytes: reverse lands on 2..127,
  // forward on 130..255.
  return direction === Direction.FORWARD ? 129 + speed : speed + 1;
}
