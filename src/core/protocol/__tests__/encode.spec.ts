import { describe, expect, it } from 'vitest';

import {
  Direction,
  TurnoutState,
  emergencyStopAll,
  forgetLoco,
  powerOff,
  powerOn,
  powerTrack,
  requestCabList,
  requestLocoUpdate,
  requestOutputList,
  requestSensorStates,
  requestSystemInfo,
  requestTrackState,
  requestTurnout,
  requestTurnoutList,
  setLocoFunction,
  setLocoSpeed,
  setOutput,
  setTurnout,
} from '../index';

describe('encode', () => {
  it.each([
    { command: 'stop every loco', encode: () => emergencyStopAll(), expected: '<!>' },
    { command: 'power on', encode: () => powerOn(), expected: '<1>' },
    { command: 'power off', encode: () => powerOff(), expected: '<0>' },
    { command: 'power track A on', encode: () => powerTrack('A', true), expected: '<1 A>' },
    { command: 'power track H off', encode: () => powerTrack('H', false), expected: '<0 H>' },
    { command: 'request track state', encode: () => requestTrackState(), expected: '<=>' },
    { command: 'request system info', encode: () => requestSystemInfo(), expected: '<s>' },
    { command: 'request a loco update', encode: () => requestLocoUpdate(3), expected: '<t 3>' },
    { command: 'request the loco table', encode: () => requestCabList(), expected: '<D CABS>' },
    { command: 'forget a loco', encode: () => forgetLoco(3), expected: '<- 3>' },
    { command: 'set a speed forward', encode: () => setLocoSpeed(3, 50, Direction.FORWARD), expected: '<t 3 50 1>' },
    { command: 'stop in reverse', encode: () => setLocoSpeed(3, 0, Direction.REVERSE), expected: '<t 3 0 0>' },
    { command: 'emergency stop a loco', encode: () => setLocoSpeed(3, -1, Direction.FORWARD), expected: '<t 3 -1 1>' },
    { command: 'turn a function on', encode: () => setLocoFunction(4, 1, true), expected: '<F 4 1 1>' },
    { command: 'turn a function off', encode: () => setLocoFunction(4, 1, false), expected: '<F 4 1 0>' },
    { command: 'request the turnout list', encode: () => requestTurnoutList(), expected: '<JT>' },
    { command: 'request one turnout', encode: () => requestTurnout(4), expected: '<JT 4>' },
    { command: 'throw a turnout', encode: () => setTurnout(4, TurnoutState.THROWN), expected: '<T 4 T>' },
    { command: 'close a turnout', encode: () => setTurnout(4, TurnoutState.CLOSED), expected: '<T 4 C>' },
    { command: 'request the output list', encode: () => requestOutputList(), expected: '<Z>' },
    { command: 'turn an output on', encode: () => setOutput(10, true), expected: '<Z 10 1>' },
    { command: 'turn an output off', encode: () => setOutput(10, false), expected: '<Z 10 0>' },
    { command: 'request sensor states', encode: () => requestSensorStates(), expected: '<Q>' },
  ])('encodes $command as $expected', ({ encode, expected }) => {
    expect(encode()).toBe(expected);
  });

  it.each([
    { input: 'track letter I', encode: () => powerTrack('I', true) },
    { input: 'lower-case track letter a', encode: () => powerTrack('a', true) },
    { input: 'loco address 0', encode: () => setLocoSpeed(0, 50, Direction.FORWARD) },
    { input: 'loco address 10294', encode: () => setLocoSpeed(10294, 50, Direction.FORWARD) },
    { input: 'loco address 3.5', encode: () => setLocoFunction(3.5, 1, true) },
    { input: 'speed 128', encode: () => setLocoSpeed(3, 128, Direction.FORWARD) },
    { input: 'speed -2', encode: () => setLocoSpeed(3, -2, Direction.FORWARD) },
    { input: 'function 69', encode: () => setLocoFunction(3, 69, true) },
    { input: 'function -1', encode: () => setLocoFunction(3, -1, true) },
    { input: 'turnout id -1', encode: () => requestTurnout(-1) },
    { input: 'turnout id 32768', encode: () => setTurnout(32768, TurnoutState.THROWN) },
    { input: 'output id 1.5', encode: () => setOutput(1.5, true) },
  ])('rejects $input', ({ encode }) => {
    expect(encode).toThrow();
  });
});
