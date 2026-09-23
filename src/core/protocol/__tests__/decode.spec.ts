import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { decodeMessage, decodeFrame, splitFrames } from '../index';
import { PowerState, TurnoutState } from '../index';
import { addLogSink, LogEntry } from '../../logging';

describe('splitFrames', () => {
  it('splits multiple frames on one line', () => {
    expect(splitFrames('<s>')).toEqual(['s']);
    expect(splitFrames('<iDCCEX V-4.2.20 / MEGA / Pololu / 5><H 1 1>')).toEqual(
      ['iDCCEX V-4.2.20 / MEGA / Pololu / 5', 'H 1 1'],
    );
  });

  it('returns no frames for garbage', () => {
    expect(splitFrames('Some serial monitor noise')).toEqual([]);
  });
});

describe('decodeFrame', () => {
  it('reports an empty frame separately from unknown', () => {
    expect(decodeFrame('')).toEqual({ kind: 'empty' });
  });

  it('parses system info', () => {
    const message = decodeFrame('iDCCEX V-4.2.20 / MEGA / Pololu / 5');
    expect(message).toMatchObject({
      kind: 'system-info',
      info: {
        version: '4.2.20',
        microprocessor: 'MEGA',
        motorDriver: 'Pololu',
        build: '5',
      },
    });
  });

  it('parses a power broadcast', () => {
    expect(decodeFrame('p1')).toMatchObject({
      kind: 'power',
      state: PowerState.ON,
    });
    expect(decodeFrame('p0')).toMatchObject({
      kind: 'power',
      state: PowerState.OFF,
    });
    expect(decodeFrame('p1 MAIN')).toMatchObject({
      kind: 'power',
      state: PowerState.ON,
      track: 'MAIN',
    });
  });

  it('parses a loco update broadcast', () => {
    expect(decodeFrame('l 3 0 143 1')).toMatchObject({
      kind: 'loco',
      loco: { address: 3, speedByte: 143, functionMap: 1 },
    });
  });

  it('parses a turnout state broadcast', () => {
    expect(decodeFrame('H 1 0')).toMatchObject({
      kind: 'turnout',
      id: 1,
      state: TurnoutState.CLOSED,
    });
    expect(decodeFrame('H 2 1')).toMatchObject({
      kind: 'turnout',
      id: 2,
      state: TurnoutState.THROWN,
    });
  });

  it('logs a warning when system info is announced but cannot be decoded', () => {
    const captured: LogEntry[] = [];
    const unsubscribe = addLogSink((entry) => captured.push(entry));

    decodeFrame('iSOMETHING');

    unsubscribe();

    expect(captured).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        event: 'protocol.decode.decodeSystemInfo.invalid_frame',
        context: { params: 'SOMETHING' },
      }),
    );
  });

  it('parses an error response', () => {
    expect(decodeFrame('X')).toEqual({ kind: 'error' });
  });

  it('returns unknown for unrecognised opcodes', () => {
    expect(decodeFrame('z 1 2')).toMatchObject({
      kind: 'unknown',
      opcode: 'z',
    });
  });
});

describe('warn logging for malformed frames', () => {
  let captured: LogEntry[] = [];
  let unsubscribe: () => void;

  beforeEach(() => {
    captured = [];

    unsubscribe = addLogSink((entry) => captured.push(entry));
  });

  afterEach(() => {
    unsubscribe();
  });

  it('logs when a power broadcast lacks a state', () => {
    decodeFrame('p');

    expect(captured).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        event: 'protocol.decode.decodeFrame.invalid_power',
      }),
    );
  });

  it('logs when a loco update is incomplete', () => {
    decodeFrame('l 3 0');

    expect(captured).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        event: 'protocol.decode.decodeFrame.invalid_loco_update',
      }),
    );
  });

  it('logs when a turnout broadcast is incomplete', () => {
    decodeFrame('H 1');

    expect(captured).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        event: 'protocol.decode.decodeFrame.invalid_turnout',
      }),
    );
  });
});

describe('decodeMessage', () => {
  it('parses every frame in a line', () => {
    const messages = decodeMessage(
      '<iDCCEX V-4.2.20 / MEGA / Pololu / 5><H 1 1><p1>',
    );
    expect(messages.map((message) => message.kind)).toEqual([
      'system-info',
      'turnout',
      'power',
    ]);
  });

  it('decodes an empty frame from empty brackets', () => {
    expect(decodeMessage('<>')).toEqual([{ kind: 'empty' }]);
  });
});
