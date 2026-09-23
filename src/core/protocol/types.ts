// Values match what goes on the wire: direction and power/turnout states use
// the exact numbers the DCC-EX protocol sends (1=forward/on/thrown, 0=the rest),
// so they can be written to and read from messages without conversion.

export enum Direction {
  REVERSE = 0,
  FORWARD = 1,
}

export enum PowerState {
  OFF = 0,
  ON = 1,
}

export enum TurnoutState {
  CLOSED = 0,
  THROWN = 1,
}

export interface SystemInfo {
  version: string;
  microprocessor: string;
  motorDriver: string;
  build: string;
}

export interface LocoState {
  address: number;
  // DCC speed-step encoded byte with direction and stop value packed in —
  // decode with the speed module before displaying.
  speedByte: number;
  functionMap: number;
}

export type ProtocolMessage =
  | { kind: 'empty' }
  | { kind: 'system-info'; info: SystemInfo }
  | { kind: 'power'; state: PowerState; track?: string }
  | { kind: 'loco'; loco: LocoState }
  | { kind: 'turnout'; id: number; state: TurnoutState }
  | { kind: 'error' }
  | {
      kind: 'unknown';
      opcode: string;
      params: string[];
      raw: string;
    };
