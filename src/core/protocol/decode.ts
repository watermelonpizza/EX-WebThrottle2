import {
  PowerState,
  ProtocolMessage,
  SystemInfo,
  TrackState,
  TurnoutState,
} from './types';
import {
  INFO_TURNOUTS,
  OPCODE_INFO,
  OPCODE_LOCO_UPDATE,
  OPCODE_OUTPUT,
  OPCODE_POWER,
  OPCODE_SENSOR,
  OPCODE_SENSOR_INACTIVE,
  OPCODE_SYSTEM_INFO,
  OPCODE_TRACK_LIST,
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

function decodeTurnoutInfo(params: string): ProtocolMessage {
  // <jT id T|C "description"> describes one turnout. The description is only
  // filled in by EX-RAIL layouts, so it is optional.
  const detail = /^(\d+) ([TC])(?: "(.*)")?$/.exec(params.trim());

  if (detail) {
    return {
      kind: 'turnout-detail',
      id: Number(detail[1]),
      state: detail[2] === 'T' ? TurnoutState.THROWN : TurnoutState.CLOSED,
      label: detail[3] ?? '',
    };
  }

  const ids = params.trim().split(/\s+/).filter(Boolean).map(Number);

  // <jT id id id> lists the turnouts the station is willing to show, and a bare
  // <jT> means it has none. Anything else — <jT id X> for an id it will not
  // report — is left in the traffic log only.
  if (ids.every((id) => Number.isInteger(id))) {
    return { kind: 'turnout-list', ids };
  }

  return { kind: 'ignored' };
}

// Takes a whole bracketed frame as it arrived, for example "<p1>".
export function decodeFrame(frame: string): ProtocolMessage {
  const body = frame.slice(1, -1);

  if (body.length === 0) {
    return { kind: 'ignored' };
  }

  const opcode = body[0];

  if (opcode === OPCODE_SYSTEM_INFO) {
    const info = decodeSystemInfo(body.slice(1));

    if (info) {
      return { kind: 'system-info', info };
    }
  }

  if (opcode === OPCODE_INFO && body[1] === INFO_TURNOUTS) {
    return decodeTurnoutInfo(body.slice(2));
  }

  const params = body.slice(1).trim().split(/\s+/).filter(Boolean);

  if (opcode === OPCODE_POWER) {
    // Power state changes are broadcast as <p0> / <p1> (with optional track)
    // plus a running power report per track in <pA>/<pa> style — the letter's
    // case carries the state (DCC-EX sends uppercase when on, lowercase off).
    const state = toNumber(params[0]);

    if (params.length === 1 && /^[A-Ha-h]$/.test(params[0])) {
      const letter = params[0].toUpperCase();

      return {
        kind: 'power',
        state: params[0] === letter ? PowerState.ON : PowerState.OFF,
        track: letter,
      };
    }

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

  if (opcode === OPCODE_TRACK_LIST) {
    // Track assignments reported as <= A MAIN> (letter + what it is wired as).
    const [letter, mode] = params;

    if (letter && /^[A-H]$/.test(letter) && mode) {
      const track: TrackState = { letter, mode };

      return { kind: 'track', track };
    } else {
      log.warn('protocol.decode.decodeFrame.invalid_track', {
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

  // <H id state> — turnout state broadcast; state 1 = thrown. Frames with more
  // fields are turnout definitions (<H id DCC addr sub>), which the app does
  // not model, so they are passed over rather than reported as malformed.
  if (opcode === OPCODE_TURNOUT && params.length <= 2) {
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

  // <Y id active> answers a change and <Y id pin flags active> lists a
  // configured output; the state is the last field either way.
  if (opcode === OPCODE_OUTPUT && (params.length === 2 || params.length === 4)) {
    const id = toNumber(params[0]);
    const active = toNumber(params[params.length - 1]);

    if (id !== undefined && active !== undefined) {
      return { kind: 'output', id, active: active === 1 };
    } else {
      log.warn('protocol.decode.decodeFrame.invalid_output', {
        frame,
      });
    }
  }

  // <Q id> for an active sensor and <q id> for an inactive one. Three-field
  // <Q id pin pullup> frames are sensor definitions, which are not modelled.
  if (
    (opcode === OPCODE_SENSOR || opcode === OPCODE_SENSOR_INACTIVE) &&
    params.length === 1
  ) {
    const id = toNumber(params[0]);

    if (id !== undefined) {
      return { kind: 'sensor', id, active: opcode === OPCODE_SENSOR };
    } else {
      log.warn('protocol.decode.decodeFrame.invalid_sensor', {
        frame,
      });
    }
  }

  return { kind: 'ignored' };
}
