import { Direction } from './types';
import {
  OPCODE_EMERGENCY_STOP,
  OPCODE_FORGET,
  OPCODE_FUNCTION,
  OPCODE_LOCO,
  OPCODE_POWER_OFF,
  OPCODE_POWER_ON,
  OPCODE_SYSTEM_INFO_REQUEST,
  OPCODE_TRACK_LIST,
} from './constants';

// Range limits are set by the DCC-EX Native Commands Summary Reference:
// - cab 10293 is the largest supported (long) DCC address
// - <t> speed accepts 0..127, with -1 meaning emergency stop
// - <F> functions cover 0..68 (the RCN-212/217 extended function range)

const MAX_CAB = 10293;
const MIN_SPEED = -1;
const MAX_SPEED = 127;
const MAX_FUNCTION = 68;

function assertCab(cab: number): void {
  if (!Number.isInteger(cab) || cab < 1 || cab > MAX_CAB) {
    throw new Error(`cab address must be an integer from 1 to ${MAX_CAB}`);
  }
}

function assertSpeed(speed: number): void {
  if (!Number.isInteger(speed) || speed < MIN_SPEED || speed > MAX_SPEED) {
    throw new Error(
      `speed must be an integer from ${MIN_SPEED} to ${MAX_SPEED}`,
    );
  }
}

export function powerOn(): string {
  return `<${OPCODE_POWER_ON}>`;
}

export function powerOff(): string {
  return `<${OPCODE_POWER_OFF}>`;
}

// Power a single track output by its command-station letter (A–H). The bare
// <1>/<0> commands above switch every track at once.
export function powerTrack(letter: string, on: boolean): string {
  if (!/^[A-H]$/.test(letter)) {
    throw new Error(`track letter must be A to H`);
  }

  return `<${on ? OPCODE_POWER_ON : OPCODE_POWER_OFF} ${letter}>`;
}

export function requestTrackState(): string {
  return `<${OPCODE_TRACK_LIST}>`;
}

export function emergencyStop(): string {
  return `<${OPCODE_EMERGENCY_STOP}>`;
}

export function requestSystemInfo(): string {
  return `<${OPCODE_SYSTEM_INFO_REQUEST}>`;
}

export function requestLocoUpdate(cab: number): string {
  assertCab(cab);

  return `<${OPCODE_LOCO} ${cab}>`;
}

export function forgetLoco(cab?: number): string {
  if (cab === undefined) {
    return `<${OPCODE_FORGET}>`;
  }

  assertCab(cab);

  return `<${OPCODE_FORGET} ${cab}>`;
}

export function setLocoSpeed(
  cab: number,
  speed: number,
  direction: Direction,
): string {
  assertCab(cab);
  assertSpeed(speed);

  return `<${OPCODE_LOCO} ${cab} ${speed} ${direction}>`;
}

export function setLocoFunction(
  cab: number,
  funct: number,
  state: boolean,
): string {
  assertCab(cab);

  if (!Number.isInteger(funct) || funct < 0 || funct > MAX_FUNCTION) {
    throw new Error(`function must be an integer from 0 to ${MAX_FUNCTION}`);
  }

  return `<${OPCODE_FUNCTION} ${cab} ${funct} ${state ? 1 : 0}>`;
}
