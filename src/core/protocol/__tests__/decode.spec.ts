import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PowerState,
  RouteState,
  RouteType,
  TurnoutState,
  decodeFrame,
} from '../index';
import { extractFrames } from '../../transport';

const CAB_TABLE = '<* LocoSlots 2/120 size=56b\n Loco=14    s=23  f=0 t=23  mA=255 mD=255\n'
  + ' Loco=12    s=169 f=0 t=169 mA=255 mD=255\n*>';

describe('decodeFrame', () => {
  it.each([
    {
      frame: '<iDCCEX V-4.2.20 / MEGA / Pololu / 5>',
      what: 'system info',
      message: {
        kind: 'system-info',
        info: { version: '4.2.20', microprocessor: 'MEGA', motorDriver: 'Pololu', build: '5' },
      },
    },
    { frame: '<p1>', what: 'power on', message: { kind: 'power', state: PowerState.ON } },
    { frame: '<p0>', what: 'power off', message: { kind: 'power', state: PowerState.OFF } },
    { frame: '<p1 MAIN>', what: 'power on for the MAIN track', message: { kind: 'power', state: PowerState.ON, track: 'MAIN' } },
    { frame: '<pA>', what: 'power on for track A', message: { kind: 'power', state: PowerState.ON, track: 'A' } },
    { frame: '<pa>', what: 'power off for track A', message: { kind: 'power', state: PowerState.OFF, track: 'A' } },
    { frame: '<= A MAIN>', what: 'track A assigned as MAIN', message: { kind: 'track', track: { letter: 'A', mode: 'MAIN' } } },
    { frame: '<= B PROG>', what: 'track B assigned as PROG', message: { kind: 'track', track: { letter: 'B', mode: 'PROG' } } },
    { frame: '<l 3 0 143 1>', what: 'a loco update', message: { kind: 'loco', loco: { address: 3, speedByte: 143, functionMap: 1 } } },
    { frame: CAB_TABLE, what: 'the addresses in the loco table <D CABS> answers with', message: { kind: 'cab-list', addresses: [14, 12] } },
    { frame: '<* LocoSlots 0/120 size=56b\n*>', what: 'an empty loco table', message: { kind: 'cab-list', addresses: [] } },
    { frame: '<H 1 0>', what: 'a closed turnout', message: { kind: 'turnout', id: 1, state: TurnoutState.CLOSED } },
    { frame: '<H 2 1>', what: 'a thrown turnout', message: { kind: 'turnout', id: 2, state: TurnoutState.THROWN } },
    { frame: '<jT 1 2 17>', what: 'a turnout list', message: { kind: 'turnout-list', ids: [1, 2, 17] } },
    { frame: '<jT>', what: 'an empty turnout list', message: { kind: 'turnout-list', ids: [] } },
    {
      frame: '<jT 1 T "">',
      what: 'a thrown turnout with no description',
      message: { kind: 'turnout-detail', id: 1, state: TurnoutState.THROWN, label: '' },
    },
    {
      frame: '<jT 3 C "Yard entry">',
      what: 'a closed turnout with its description',
      message: { kind: 'turnout-detail', id: 3, state: TurnoutState.CLOSED, label: 'Yard entry' },
    },
    { frame: '<Y 10 1>', what: 'an output change', message: { kind: 'output', id: 10, active: true } },
    { frame: '<Y 11 101 0 0>', what: 'an output listing', message: { kind: 'output', id: 11, active: false } },
    { frame: '<jA 101 102 201>', what: 'a list of routes and automations', message: { kind: 'route-list', ids: [101, 102, 201] } },
    { frame: '<jA>', what: 'an empty route list, as without EXRAIL', message: { kind: 'route-list', ids: [] } },
    {
      frame: '<jA 101 R "Main line">',
      what: 'a route and its description',
      message: { kind: 'route-detail', id: 101, type: RouteType.ROUTE, label: 'Main line' },
    },
    {
      frame: '<jA 201 A "Stop at Platform 1">',
      what: 'an automation and its description',
      message: { kind: 'route-detail', id: 201, type: RouteType.AUTOMATION, label: 'Stop at Platform 1' },
    },
    { frame: '<jB 201 1>', what: 'a route shown as active', message: { kind: 'route-state', id: 201, state: RouteState.ACTIVE } },
    { frame: '<jB 201 4>', what: 'a route shown as disabled', message: { kind: 'route-state', id: 201, state: RouteState.DISABLED } },
    { frame: '<jB 201 "Running">', what: 'a new caption for a route', message: { kind: 'route-caption', id: 201, caption: 'Running' } },
    { frame: '<jR 3 7>', what: 'the Command Station\'s roster', message: { kind: 'roster-list', addresses: [3, 7] } },
    { frame: '<jR>', what: 'an empty roster, as without ROSTER lines', message: { kind: 'roster-list', addresses: [] } },
    {
      frame: '<jR 3 "Shunter" "Lights/Bell/*Horn">',
      what: 'a roster loco with its function names',
      message: { kind: 'roster-loco', address: 3, name: 'Shunter', functions: 'Lights/Bell/*Horn' },
    },
    { frame: '<Q 20>', what: 'an active sensor, from the capital letter', message: { kind: 'sensor', id: 20, active: true } },
    { frame: '<q 20>', what: 'a clear sensor, from the small letter', message: { kind: 'sensor', id: 20, active: false } },
  ])('decodes $frame as $what', ({ frame, message }) => {
    expect(decodeFrame(frame)).toMatchObject(message);
  });

  it.each([
    { frame: '<>', why: 'it is empty' },
    { frame: '<* Default momentum=0/0 *>', why: 'it is a diagnostic reply other than the loco table' },
    { frame: '<jT 9 X>', why: 'it is the station refusing to report a turnout id' },
    { frame: '<jA 999 X "">', why: 'it is EXRAIL saying it has no such route' },
    { frame: '<jB 201 3>', why: 'it is a route state the app does not know' },
    { frame: '<jB x>', why: 'it is neither a route state nor a caption' },
    { frame: '<jR x>', why: 'it is neither a roster nor a roster loco' },
    { frame: '<H 1 DCC 10 0>', why: 'it is a turnout definition rather than a state' },
    { frame: '<Q 20 200 1>', why: 'it is a sensor definition, which the app does not model' },
    { frame: '<X>', why: 'the app does not act on it' },
    { frame: '<z 1 2>', why: 'the app does not act on it' },
    { frame: '<* New DCC queue slot *>', why: 'the app does not act on it' },
  ])('ignores $frame, as $why', ({ frame }) => {
    expect(decodeFrame(frame)).toEqual({ kind: 'ignored' });
  });
});

describe('warn logging for malformed frames', () => {
  let warn: MockInstance;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it.each([
    {
      frame: '<iSOMETHING>',
      what: 'system info it cannot read',
      event: 'protocol.decode.decodeSystemInfo.invalid_frame',
      context: { params: 'SOMETHING' },
    },
    { frame: '<p>', what: 'a power broadcast with no state', event: 'protocol.decode.decodeFrame.invalid_power', context: expect.anything() },
    { frame: '<l 3 0>', what: 'an incomplete loco update', event: 'protocol.decode.decodeFrame.invalid_loco_update', context: expect.anything() },
    { frame: '<H 1>', what: 'an incomplete turnout broadcast', event: 'protocol.decode.decodeFrame.invalid_turnout', context: expect.anything() },
    { frame: '<= 9>', what: 'a track assignment with no letter or mode', event: 'protocol.decode.decodeFrame.invalid_track', context: expect.anything() },
  ])('logs $event for $what', ({ frame, event, context }) => {
    decodeFrame(frame);

    expect(warn).toHaveBeenCalledWith(event, context);
  });
});

describe('decodeMessage', () => {
  it('parses every frame in a line', () => {
    const frames = extractFrames('<iDCCEX V-4.2.20 / MEGA / Pololu / 5><H 1 1><p1>').frames;

    expect(frames.map(decodeFrame).map(message => message.kind)).toEqual(['system-info', 'turnout', 'power']);
  });

  it('decodes empty brackets as ignored', () => {
    expect(extractFrames('<>').frames.map(decodeFrame)).toEqual([{ kind: 'ignored' }]);
  });
});
