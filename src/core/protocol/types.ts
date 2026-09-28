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

// How EXRAIL lists an entry in <jA id R|A "description">.
export enum RouteType {
  ROUTE = 'R',
  AUTOMATION = 'A',
}

// How throttles should show a route's button, as EXRAIL broadcasts it in
// <jB id state> (manageRouteState in CommandStation-EX EXRAIL2.cpp).
export enum RouteState {
  INACTIVE = 0,
  ACTIVE = 1,
  HIDDEN = 2,
  DISABLED = 4,
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

export interface TrackState {
  // The command station's letter for this track output (A–H).
  letter: string;
  // What the track is wired as, reported by the station: MAIN, PROG, …
  mode: string;
}

// Only the broadcasts the app acts on get a shape; everything else decodes to
// "ignored" (DCC-EX clients are required to discard frames they do not model).
// The raw text of every frame is kept by the connection store's traffic log.
export type ProtocolMessage =
  | { kind: 'system-info'; info: SystemInfo }
  | { kind: 'power'; state: PowerState; track?: string }
  | { kind: 'track'; track: TrackState }
  | { kind: 'loco'; loco: LocoState }
  | { kind: 'cab-list'; addresses: number[] }
  | { kind: 'turnout'; id: number; state: TurnoutState }
  | { kind: 'turnout-list'; ids: number[] }
  | { kind: 'turnout-detail'; id: number; state: TurnoutState; label: string }
  | { kind: 'route-list'; ids: number[] }
  | { kind: 'route-detail'; id: number; type: RouteType; label: string }
  | { kind: 'route-state'; id: number; state: RouteState }
  | { kind: 'route-caption'; id: number; caption: string }
  | { kind: 'roster-list'; addresses: number[] }
  | { kind: 'roster-loco'; address: number; name: string; functions: string }
  | { kind: 'output'; id: number; active: boolean }
  | { kind: 'sensor'; id: number; active: boolean }
  | { kind: 'ignored' };
