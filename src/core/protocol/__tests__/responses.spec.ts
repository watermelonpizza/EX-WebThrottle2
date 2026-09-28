import { describe, expect, it } from 'vitest';

import { describeResponse } from '../responses';

describe('response catalog', () => {
  it('describes command-station identification fields', () => {
    expect(
      describeResponse('<iDCC-EX V-5.6.0 / HOST / No motor driver / G-abc123>'),
    ).toMatchObject({
      summary: 'Command-station identification',
      parameters: [
        { name: 'Version', value: '5.6.0' },
        { name: 'Processor', value: 'HOST' },
        { name: 'Motor driver', value: 'No motor driver' },
        { name: 'Build', value: 'G-abc123' },
      ],
    });
  });

  it('describes identification without a build suffix', () => {
    expect(
      describeResponse('<iDCC-EX V-5.6.6 / HOST / HOST_SHIELD>')?.parameters,
    ).toHaveLength(3);
  });

  it('describes the current firmware identification format with a build suffix', () => {
    expect(
      describeResponse(
        '<iDCC-EX V-5.6.6 / HOST / HOST_SHIELD G-master-202609231425Z>',
      ),
    ).toMatchObject({
      summary: 'Command-station identification',
      parameters: [
        { name: 'Version', value: '5.6.6' },
        { name: 'Processor', value: 'HOST' },
        { name: 'Motor driver', value: 'HOST_SHIELD' },
        { name: 'Build', value: 'G-master-202609231425Z' },
      ],
    });
  });

  it('describes virtual display updates and the text being displayed', () => {
    expect(describeResponse('<@ 0 2 "PWR Off">')).toMatchObject({
      summary: 'Virtual display update',
      parameters: [
        { name: 'Display', value: '0' },
        { name: 'Row', value: '2' },
        { name: 'Text', value: 'PWR Off' },
      ],
    });
  });

  it('explains a power reply for one track', () => {
    expect(describeResponse('<p1 MAIN>')?.parameters).toEqual([
      expect.objectContaining({ name: 'State', value: '1' }),
      expect.objectContaining({ name: 'Track', value: 'MAIN' }),
    ]);
  });

  it('explains a track-specific status frame', () => {
    expect(describeResponse('<pa>')?.parameters).toContainEqual(expect.objectContaining({ name: 'State', value: 'off' }));
  });

  it('explains the values in a loco update', () => {
    expect(describeResponse('<l 4 0 134 5>')?.parameters).toEqual([
      expect.objectContaining({ name: 'Loco address', value: '4' }),
      expect.objectContaining({ name: 'Register', value: '0' }),
      expect.objectContaining({ name: 'Speed byte', value: '134' }),
      expect.objectContaining({ name: 'Function map', value: '5' }),
    ]);
  });

  it('describes turnout details', () => {
    expect(describeResponse('<jT 3 C "Yard entry">')).toMatchObject({
      summary: 'Turnout details',
      parameters: [
        { name: 'Turnout id', value: '3' },
        { name: 'State', value: 'C' },
        { name: 'Description', value: 'Yard entry' },
      ],
    });
  });

  it('tells a turnout-id list apart from turnout details', () => {
    expect(describeResponse('<jT 1 3>')?.parameters[0]).toMatchObject({ name: 'Turnout ids', value: '1 3' });
  });

  it('explains an output state', () => {
    expect(describeResponse('<Y 10 1>')?.parameters).toContainEqual(expect.objectContaining({ name: 'State', value: '1' }));
  });

  it.each([
    { frame: '<Q 20>', summary: 'Sensor active' },
    { frame: '<q 20>', summary: 'Sensor clear' },
  ])('sums up $frame as "$summary"', ({ frame, summary }) => {
    expect(describeResponse(frame)?.summary).toBe(summary);
  });

  it.each<{ frame: string; what: string; pick: (response: ReturnType<typeof describeResponse>) => unknown; expected: unknown }>([
    { frame: '<p0>', what: 'what power off means', pick: r => r?.parameters[0]?.meaning, expected: 'Power is off.' },
    { frame: '<pA>', what: 'the track\'s power state', pick: r => r?.parameters[1]?.value, expected: 'on' },
    { frame: '<= A DC 12>', what: 'a DC track and its cab', pick: r => r?.parameters.length, expected: 3 },
    { frame: '<= B MAIN>', what: 'a track and its mode', pick: r => r?.parameters.length, expected: 2 },
    { frame: '<jT>', what: 'an empty turnout list', pick: r => r?.parameters[0]?.value, expected: '(none)' },
    { frame: '<jT 4 X>', what: 'a turnout that is not there', pick: r => r?.summary, expected: 'Turnout not available' },
    { frame: '<Y 10 100 0 1>', what: 'an output definition', pick: r => r?.parameters.length, expected: 4 },
    { frame: '<Q 20 21 1>', what: 'a sensor definition', pick: r => r?.parameters.length, expected: 3 },
    { frame: '<e 1 2 3>', what: 'the stored inventory counts', pick: r => r?.parameters.length, expected: 3 },
    { frame: '<!PAUSED>', what: 'that the layout is paused', pick: r => r?.parameters[0]?.meaning, expected: expect.stringContaining('paused') },
    { frame: '<!RESUMED>', what: 'that the layout is running', pick: r => r?.parameters[0]?.meaning, expected: expect.stringContaining('running') },
    { frame: '<O>', what: 'an OK reply, with nothing to add', pick: r => r?.parameters, expected: [] },
    { frame: '<X>', what: 'a failure reply, with nothing to add', pick: r => r?.parameters, expected: [] },
  ])('explains $what in $frame', ({ frame, pick, expected }) => {
    expect(pick(describeResponse(frame))).toEqual(expected);
  });

  it('describes route details', () => {
    expect(describeResponse('<jA 101 R "Main line">')).toMatchObject({
      summary: 'Route details',
      parameters: [
        { name: 'Route id', value: '101' },
        { name: 'Type', value: 'R', meaning: expect.stringContaining('A route') },
        { name: 'Description', value: 'Main line' },
      ],
    });
  });

  it('describes a route state broadcast', () => {
    expect(describeResponse('<jB 201 1>')).toMatchObject({
      summary: 'Route state',
      parameters: [
        { name: 'Route id', value: '201' },
        { name: 'State', value: '1', meaning: expect.stringContaining('Active') },
      ],
    });
  });

  it('describes a new DCC queue slot diagnostic', () => {
    expect(
      describeResponse('<* New DCC queue slot type=7 length=2 loco=0 q1=0 q2=5 created=5 *>'),
    ).toMatchObject({
      summary: 'New DCC queue slot',
      parameters: [
        { name: 'Type', value: '7', meaning: expect.stringContaining('Accessory switched on') },
        { name: 'Length', value: '2' },
        { name: 'Loco', value: '0', meaning: 'Not for one loco.' },
        { name: 'High-priority queue', value: '0' },
        { name: 'Low-priority queue', value: '5' },
        { name: 'Slots made', value: '5' },
      ],
    });
  });

  it.each<{ frame: string; what: string; pick: (response: ReturnType<typeof describeResponse>) => unknown; expected: unknown }>([
    { frame: '<jA 101 102 201>', what: 'a route list', pick: r => r?.parameters[0]?.value, expected: '101 102 201' },
    { frame: '<jA>', what: 'an empty route list', pick: r => r?.parameters[0]?.value, expected: '(none)' },
    { frame: '<jA 201 A "Stop at Platform 1">', what: 'an automation', pick: r => r?.parameters[1]?.meaning, expected: expect.stringContaining('An automation') },
    { frame: '<jA 999 X "">', what: 'a route that is not there', pick: r => r?.summary, expected: 'Route not available' },
    { frame: '<jR 3 7>', what: 'a roster', pick: r => r?.parameters[0]?.value, expected: '3 7' },
    { frame: '<jR>', what: 'an empty roster', pick: r => r?.parameters[0]?.value, expected: '(none)' },
    { frame: '<jR 3 "Shunter" "Lights/*Horn">', what: 'a roster loco', pick: r => r?.parameters[2]?.value, expected: 'Lights/*Horn' },
    { frame: '<jR 3 "Shunter" "">', what: 'a roster loco with no functions', pick: r => r?.parameters[2]?.value, expected: '(none)' },
    { frame: '<jB 201 0>', what: 'an inactive route', pick: r => r?.parameters[1]?.meaning, expected: expect.stringContaining('Inactive') },
    { frame: '<jB 201 2>', what: 'a hidden route', pick: r => r?.parameters[1]?.meaning, expected: expect.stringContaining('Hidden') },
    { frame: '<jB 201 4>', what: 'a disabled route', pick: r => r?.parameters[1]?.meaning, expected: expect.stringContaining('Disabled') },
    { frame: '<jB 201 3>', what: 'a route state it does not know', pick: r => r?.parameters[1]?.meaning, expected: expect.stringContaining('does not know') },
    { frame: '<jB 201 "Running">', what: 'a route caption', pick: r => r?.parameters[1], expected: expect.objectContaining({ name: 'Caption', value: 'Running' }) },
    { frame: '<* New DCC queue slot type=6 length=3 loco=3 q1=0 q2=7 created=7 *>', what: 'a queued loco packet', pick: r => r?.parameters[2]?.meaning, expected: 'DCC address the packet is for.' },
    { frame: '<* New DCC queue slot type=12 length=2 loco=0 q1=0 q2=0 created=0 *>', what: 'a packet type it does not know', pick: r => r?.parameters[0]?.meaning, expected: expect.stringContaining('does not know') },
    { frame: '<* License GPLv3 fsf.org (c) dcc-ex.com *>', what: 'any other diagnostic', pick: r => r?.parameters[0]?.value, expected: 'License GPLv3 fsf.org (c) dcc-ex.com' },
  ])('explains $what in $frame', ({ frame, pick, expected }) => {
    expect(pick(describeResponse(frame))).toEqual(expected);
  });

  it('leaves unlisted frames to the caller', () => {
    expect(describeResponse('<unlisted response>')).toBeUndefined();
  });
});
