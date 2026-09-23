import { describe, expect, it } from 'vitest';

import {
  Direction,
  emergencyStop,
  forgetLoco,
  powerOff,
  powerOn,
  requestLocoUpdate,
  requestSystemInfo,
  setLocoFunction,
  setLocoSpeed,
} from '../index';

describe('encode', () => {
  it('encodes power commands', () => {
    expect(powerOn()).toBe('<1>');
    expect(powerOff()).toBe('<0>');
  });

  it('encodes emergency stop', () => {
    expect(emergencyStop()).toBe('<!>');
  });

  it('encodes system info request', () => {
    expect(requestSystemInfo()).toBe('<s>');
  });

  it('encodes loco update request', () => {
    expect(requestLocoUpdate(3)).toBe('<t 3>');
  });

  it('encodes forget loco', () => {
    expect(forgetLoco()).toBe('<->');
    expect(forgetLoco(3)).toBe('<- 3>');
  });

  it('encodes loco speed with direction', () => {
    expect(setLocoSpeed(3, 50, Direction.FORWARD)).toBe('<t 3 50 1>');
    expect(setLocoSpeed(3, 0, Direction.REVERSE)).toBe('<t 3 0 0>');
    expect(setLocoSpeed(3, -1, Direction.FORWARD)).toBe('<t 3 -1 1>');
  });

  it('encodes loco function with state', () => {
    expect(setLocoFunction(4, 1, true)).toBe('<F 4 1 1>');
    expect(setLocoFunction(4, 1, false)).toBe('<F 4 1 0>');
  });

  it('rejects invalid cab addresses', () => {
    expect(() => setLocoSpeed(0, 50, Direction.FORWARD)).toThrow();
    expect(() => setLocoSpeed(10294, 50, Direction.FORWARD)).toThrow();
    expect(() => setLocoFunction(3.5, 1, true)).toThrow();
  });

  it('rejects invalid speeds', () => {
    expect(() => setLocoSpeed(3, 128, Direction.FORWARD)).toThrow();
    expect(() => setLocoSpeed(3, -2, Direction.FORWARD)).toThrow();
  });

  it('rejects invalid functions', () => {
    expect(() => setLocoFunction(3, 69, true)).toThrow();
    expect(() => setLocoFunction(3, -1, true)).toThrow();
  });
});
