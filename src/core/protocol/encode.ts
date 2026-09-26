import { Direction, TurnoutState } from './types';
import {
  DIAGNOSTIC_CABS,
  INFO_TURNOUTS,
  OPCODE_DIAGNOSTIC,
  OPCODE_EMERGENCY_STOP_ALL,
  OPCODE_FORGET,
  OPCODE_FUNCTION,
  OPCODE_INFO_REQUEST,
  OPCODE_LOCO,
  OPCODE_OUTPUT_SET,
  OPCODE_POWER_OFF,
  OPCODE_POWER_ON,
  OPCODE_SENSOR,
  OPCODE_SYSTEM_INFO_REQUEST,
  OPCODE_TRACK_LIST,
  OPCODE_TURNOUT_SET,
} from './constants';

// Range limits are set by the DCC-EX Native Commands Summary Reference:
// - cab 10293 is the largest supported (long) DCC address
// - <t> speed accepts 0..127, with -1 meaning emergency stop
// - <F> functions cover 0..68 (the RCN-212/217 extended function range)

const MAX_CAB = 10293;
const MIN_SPEED = -1;
const MAX_SPEED = 127;
const MAX_FUNCTION = 68;

// Turnout, output, and sensor ids are held as 16-bit signed values by the
// command station's parser, so 32767 is the highest it can take.
const MAX_OBJECT_ID = 32767;

function assertObjectId(id: number): void {
  if (!Number.isInteger(id) || id < 0 || id > MAX_OBJECT_ID) {
    throw new Error(`id must be an integer from 0 to ${MAX_OBJECT_ID}`);
  }
}

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

export function requestSystemInfo(): string {
  return `<${OPCODE_SYSTEM_INFO_REQUEST}>`;
}

export function requestLocoUpdate(cab: number): string {
  assertCab(cab);

  return `<${OPCODE_LOCO} ${cab}>`;
}

// Asks which locos the command station is driving, from any throttle. Only
// the addresses are read from the answer; <t cab> then asks each one's state.
export function requestCabList(): string {
  return `<${OPCODE_DIAGNOSTIC} ${DIAGNOSTIC_CABS}>`;
}

export function forgetLoco(cab: number): string {
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

export function emergencyStopAll(): string {
  return `<${OPCODE_EMERGENCY_STOP_ALL}>`;
}

export function requestTurnoutList(): string {
  return `<${OPCODE_INFO_REQUEST}${INFO_TURNOUTS}>`;
}

// Asking about one turnout adds its description to the state the list gives.
export function requestTurnout(id: number): string {
  assertObjectId(id);

  return `<${OPCODE_INFO_REQUEST}${INFO_TURNOUTS} ${id}>`;
}

export function setTurnout(id: number, state: TurnoutState): string {
  assertObjectId(id);

  return `<${OPCODE_TURNOUT_SET} ${id} ${state === TurnoutState.THROWN ? 'T' : 'C'}>`;
}

export function requestOutputList(): string {
  return `<${OPCODE_OUTPUT_SET}>`;
}

export function setOutput(id: number, active: boolean): string {
  assertObjectId(id);

  return `<${OPCODE_OUTPUT_SET} ${id} ${active ? 1 : 0}>`;
}

export function requestSensorStates(): string {
  return `<${OPCODE_SENSOR}>`;
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
