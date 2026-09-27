import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PowerState, TurnoutState, decodeFrame } from '../index';
import { extractFrames } from '../../transport';

describe('decodeFrame', () => {
  it('ignores empty brackets', () => {
    expect(decodeFrame('<>')).toEqual({ kind: 'ignored' });
  });

  it('parses system info', () => {
    const message = decodeFrame('<iDCCEX V-4.2.20 / MEGA / Pololu / 5>');

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
    expect(decodeFrame('<p1>')).toMatchObject({
      kind: 'power',
      state: PowerState.ON,
    });
    expect(decodeFrame('<p0>')).toMatchObject({
      kind: 'power',
      state: PowerState.OFF,
    });
    expect(decodeFrame('<p1 MAIN>')).toMatchObject({
      kind: 'power',
      state: PowerState.ON,
      track: 'MAIN',
    });
    expect(decodeFrame('<pA>')).toMatchObject({
      kind: 'power',
      state: PowerState.ON,
      track: 'A',
    });
    expect(decodeFrame('<pa>')).toMatchObject({
      kind: 'power',
      state: PowerState.OFF,
      track: 'A',
    });
  });

  it('parses a track assignment', () => {
    expect(decodeFrame('<= A MAIN>')).toMatchObject({
      kind: 'track',
      track: { letter: 'A', mode: 'MAIN' },
    });
    expect(decodeFrame('<= B PROG>')).toMatchObject({
      kind: 'track',
      track: { letter: 'B', mode: 'PROG' },
    });
  });

  it('parses a loco update broadcast', () => {
    expect(decodeFrame('<l 3 0 143 1>')).toMatchObject({
      kind: 'loco',
      loco: { address: 3, speedByte: 143, functionMap: 1 },
    });
  });

  it('reads the addresses from the loco table <D CABS> answers with', () => {
    const table
      = '<* LocoSlots 2/120 size=56b\n Loco=14    s=23  f=0 t=23  mA=255 mD=255\n'
        + ' Loco=12    s=169 f=0 t=169 mA=255 mD=255\n*>';

    expect(decodeFrame(table)).toEqual({
      kind: 'cab-list',
      addresses: [14, 12],
    });
    expect(decodeFrame('<* LocoSlots 0/120 size=56b\n*>')).toEqual({
      kind: 'cab-list',
      addresses: [],
    });
    // Other diagnostic replies are not the loco table.
    expect(decodeFrame('<* Default momentum=0/0 *>')).toEqual({
      kind: 'ignored',
    });
  });

  it('parses a turnout state broadcast', () => {
    expect(decodeFrame('<H 1 0>')).toMatchObject({
      kind: 'turnout',
      id: 1,
      state: TurnoutState.CLOSED,
    });
    expect(decodeFrame('<H 2 1>')).toMatchObject({
      kind: 'turnout',
      id: 2,
      state: TurnoutState.THROWN,
    });
  });

  it('parses a turnout list', () => {
    expect(decodeFrame('<jT 1 2 17>')).toMatchObject({
      kind: 'turnout-list',
      ids: [1, 2, 17],
    });
    expect(decodeFrame('<jT>')).toMatchObject({
      kind: 'turnout-list',
      ids: [],
    });
  });

  it('parses one turnout with its description', () => {
    expect(decodeFrame('<jT 1 T "">')).toMatchObject({
      kind: 'turnout-detail',
      id: 1,
      state: TurnoutState.THROWN,
      label: '',
    });
    expect(decodeFrame('<jT 3 C "Yard entry">')).toMatchObject({
      kind: 'turnout-detail',
      id: 3,
      state: TurnoutState.CLOSED,
      label: 'Yard entry',
    });
  });

  it('ignores turnout frames it cannot act on', () => {
    // <jT id X> is the station refusing to report an id, and <H id DCC …> is a
    // turnout definition rather than a state.
    expect(decodeFrame('<jT 9 X>')).toEqual({ kind: 'ignored' });
    expect(decodeFrame('<H 1 DCC 10 0>')).toEqual({ kind: 'ignored' });
  });

  it('parses output states from a change and from a listing', () => {
    expect(decodeFrame('<Y 10 1>')).toMatchObject({
      kind: 'output',
      id: 10,
      active: true,
    });
    expect(decodeFrame('<Y 11 101 0 0>')).toMatchObject({
      kind: 'output',
      id: 11,
      active: false,
    });
  });

  it('parses sensor states from the letter case', () => {
    expect(decodeFrame('<Q 20>')).toMatchObject({
      kind: 'sensor',
      id: 20,
      active: true,
    });
    expect(decodeFrame('<q 20>')).toMatchObject({
      kind: 'sensor',
      id: 20,
      active: false,
    });
    // A sensor definition, which the app does not model.
    expect(decodeFrame('<Q 20 200 1>')).toEqual({ kind: 'ignored' });
  });

  it('logs a warning when system info is announced but cannot be decoded', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    decodeFrame('<iSOMETHING>');

    expect(warn).toHaveBeenCalledWith(
      'protocol.decode.decodeSystemInfo.invalid_frame',
      { params: 'SOMETHING' },
    );

    warn.mockRestore();
  });

  it('ignores frames the app does not act on', () => {
    expect(decodeFrame('<X>')).toEqual({ kind: 'ignored' });
    expect(decodeFrame('<z 1 2>')).toEqual({ kind: 'ignored' });
    expect(decodeFrame('<* New DCC queue slot *>')).toEqual({
      kind: 'ignored',
    });
  });
});

describe('warn logging for malformed frames', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('logs when a power broadcast lacks a state', () => {
    decodeFrame('<p>');

    expect(warn).toHaveBeenCalledWith(
      'protocol.decode.decodeFrame.invalid_power',
      expect.anything(),
    );
  });

  it('logs when a loco update is incomplete', () => {
    decodeFrame('<l 3 0>');

    expect(warn).toHaveBeenCalledWith(
      'protocol.decode.decodeFrame.invalid_loco_update',
      expect.anything(),
    );
  });

  it('logs when a turnout broadcast is incomplete', () => {
    decodeFrame('<H 1>');

    expect(warn).toHaveBeenCalledWith(
      'protocol.decode.decodeFrame.invalid_turnout',
      expect.anything(),
    );
  });

  it('logs when a track assignment lacks a letter or mode', () => {
    decodeFrame('<= 9>');

    expect(warn).toHaveBeenCalledWith(
      'protocol.decode.decodeFrame.invalid_track',
      expect.anything(),
    );
  });
});

describe('decodeMessage', () => {
  it('parses every frame in a line', () => {
    const frames = extractFrames(
      '<iDCCEX V-4.2.20 / MEGA / Pololu / 5><H 1 1><p1>',
    ).frames;

    expect(frames.map(decodeFrame).map(message => message.kind)).toEqual([
      'system-info',
      'turnout',
      'power',
    ]);
  });

  it('decodes empty brackets as ignored', () => {
    expect(extractFrames('<>').frames.map(decodeFrame)).toEqual([
      { kind: 'ignored' },
    ]);
  });
});
