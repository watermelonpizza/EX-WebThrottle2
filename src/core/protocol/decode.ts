import { PowerState, ProtocolMessage, SystemInfo, TurnoutState } from './types';
import {
  OPCODE_ERROR,
  OPCODE_LOCO_UPDATE,
  OPCODE_POWER,
  OPCODE_SYSTEM_INFO,
  OPCODE_TURNOUT,
} from './constants';
import { log } from '../logging';

function toNumber(value: string): number | undefined {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function decodeSystemInfo(params: string): SystemInfo | undefined {
  // Response shape: <iDCCEX version / microprocessor / motorController / build>
  // The body names the "DCCEX" client first, then slash-separated values, and
  // the version arrives prefixed with "V-".
  const body = params.replace(/^DCCEX\s*/i, '');

  const [version, microprocessor, motorDriver, build] = body
    .split('/')
    .map((part) => part.trim());

  if (!microprocessor || !motorDriver) {
    // The frame said "system info" but the microprocessor or motor driver was not found, so the raw frame is
    // kept alongside the failure for inspection.
    log.warn('protocol.decode.decodeSystemInfo.invalid_frame', {
      params,
    });

    return undefined;
  }

  return {
    version: version.replace(/^V-?/i, '').trim(),
    microprocessor,
    motorDriver,
    build: build ?? '',
  };
}

export function decodeFrame(frame: string): ProtocolMessage {
  if (frame.length === 0) {
    // An empty frame is a pair of brackets with nothing inside (< >), so it is
    // reported separately from an opcode we simply do not recognise.
    return { kind: 'empty' };
  }

  const opcode = frame[0];

  if (opcode === OPCODE_SYSTEM_INFO) {
    const info = decodeSystemInfo(frame.slice(1));

    if (info) return { kind: 'system-info', info };
  }

  const params = frame.slice(1).trim().split(/\s+/).filter(Boolean);

  if (opcode === OPCODE_POWER) {
    // Power state changes are broadcast as <p0> / <p1> (with optional track).
    const state = toNumber(params[0]);

    if (state !== undefined) {
      return {
        kind: 'power',
        state: state ? PowerState.ON : PowerState.OFF,
        track: params[1],
      };
    } else {
      log.warn('protocol.decode.decodeFrame.invalid_power', {
        frame,
      });
    }
  }

  if (opcode === OPCODE_LOCO_UPDATE) {
    // <l cab reg speedByte functMap> — "reg" is a legacy placeholder field
    // the command station keeps for compatibility; we do not use it.
    const address = toNumber(params[0]);
    const speedByte = toNumber(params[2]);
    const functionMap = toNumber(params[3]);

    if (
      address !== undefined &&
      speedByte !== undefined &&
      functionMap !== undefined
    ) {
      return { kind: 'loco', loco: { address, speedByte, functionMap } };
    } else {
      log.warn('protocol.decode.decodeFrame.invalid_loco_update', {
        frame,
      });
    }
  }

  if (opcode === OPCODE_TURNOUT) {
    // <H id state> — turnout state broadcast; state 1 = thrown.
    const id = toNumber(params[0]);
    const rawState = toNumber(params[1]);

    if (id !== undefined && rawState !== undefined) {
      return {
        kind: 'turnout',
        id,
        state: rawState === 1 ? TurnoutState.THROWN : TurnoutState.CLOSED,
      };
    } else {
      log.warn('protocol.decode.decodeFrame.invalid_turnout', {
        frame,
      });
    }
  }

  if (opcode === OPCODE_ERROR) {
    // <X> — the command station's generic "invalid command" response.
    return { kind: 'error' };
  }

  // Anything else passes through untyped so broadcasts we have not modelled
  // are ignored rather than treated as a problem (DCC-EX clients are required
  // to accept and discard broadcasts they do not understand).
  return { kind: 'unknown', opcode, params, raw: `<${frame}>` };
}
