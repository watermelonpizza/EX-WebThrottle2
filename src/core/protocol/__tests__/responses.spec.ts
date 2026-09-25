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

  it('explains power replies and track-specific status frames', () => {
    expect(describeResponse('<p1 MAIN>')?.parameters).toEqual([
      expect.objectContaining({ name: 'State', value: '1' }),
      expect.objectContaining({ name: 'Track', value: 'MAIN' }),
    ]);
    expect(describeResponse('<pa>')?.parameters).toContainEqual(
      expect.objectContaining({ name: 'State', value: 'off' }),
    );
  });

  it('explains the values in a loco update', () => {
    expect(describeResponse('<l 4 0 134 5>')?.parameters).toEqual([
      expect.objectContaining({ name: 'Loco address', value: '4' }),
      expect.objectContaining({ name: 'Register', value: '0' }),
      expect.objectContaining({ name: 'Speed byte', value: '134' }),
      expect.objectContaining({ name: 'Function map', value: '5' }),
    ]);
  });

  it('distinguishes turnout details from turnout-id lists', () => {
    expect(describeResponse('<jT 3 C "Yard entry">')).toMatchObject({
      summary: 'Turnout details',
      parameters: [
        { name: 'Turnout id', value: '3' },
        { name: 'State', value: 'C' },
        { name: 'Description', value: 'Yard entry' },
      ],
    });
    expect(describeResponse('<jT 1 3>')?.parameters[0]).toMatchObject({
      name: 'Turnout ids',
      value: '1 3',
    });
  });

  it('explains output and sensor state responses', () => {
    expect(describeResponse('<Y 10 1>')?.parameters).toContainEqual(
      expect.objectContaining({ name: 'State', value: '1' }),
    );
    expect(describeResponse('<Q 20>')?.summary).toBe('Sensor active');
    expect(describeResponse('<q 20>')?.summary).toBe('Sensor clear');
  });

  it('leaves unlisted frames to the caller', () => {
    expect(describeResponse('<unlisted response>')).toBeUndefined();
  });
});
