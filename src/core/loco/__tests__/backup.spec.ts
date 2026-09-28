import { describe, expect, it } from 'vitest';

import type { Backup } from '../backup';
import { readBackup, writeBackup } from '../backup';

const BACKUP: Backup = {
  locos: [{ address: 3, name: 'Shunter', mapId: 'map-1', type: 'Diesel', brand: 'Bachmann', decoder: 'ESU LokPilot' }],
  maps: [{ id: 'map-1', name: 'Class 08', functions: [{ fn: 0, label: 'Lights', momentary: false, hidden: false }] }],
};

// What WebThrottle-EX's "Backup app settings" writes (exportAppData in
// storageController.js).
const LEGACY = JSON.stringify([
  {
    maps: [
      {
        mname: 'Class 08',
        fnData: {
          f0: [0, 0, 'Lights', 1],
          f1: [0, 1, 'Horn', 1],
          f2: [0, 0, 'Bell', 0],
          f3: [0, 0, '', 1],
          f40: [0, 0, 'Too high', 1],
        },
      },
    ],
  },
  {
    locos: [
      { name: 'Shunter', cv: '3', type: 'Diesel', brand: 'Bachmann', decoder: 'ESU', map: 'Class 08' },
      { name: 'Express', cv: '7', type: 'Steam', brand: '', decoder: '', map: 'Default' },
      { name: 'No address', cv: '', map: 'Default' },
    ],
  },
  { preferences: { scontroller: 'vertical' } },
]);

describe('reading a backup file', () => {
  it('reads back what was written', () => {
    expect(readBackup(writeBackup(BACKUP))).toEqual(BACKUP);
  });

  it.each([
    { what: 'text that is not JSON', file: 'not json' },
    { what: 'JSON from some other app', file: '{"hello": "world"}' },
    { what: 'a list of something else', file: '[1, 2, 3]' },
  ])('turns down $what', ({ file }) => {
    expect(readBackup(file)).toBeUndefined();
  });

  it.each([
    { what: 'an address of 0', loco: { address: 0, name: 'Zero' } },
    { what: 'an address past the largest', loco: { address: 10294, name: 'Far' } },
    { what: 'no name', loco: { address: 3, name: ' ' } },
    { what: 'something that is not a loco', loco: 'Shunter' },
  ])('leaves out a loco with $what', ({ loco }) => {
    expect(readBackup(JSON.stringify({ app: 'EX-WebThrottle', locos: [loco] }))?.locos).toEqual([]);
  });

  it('gives a loco without a map the default one', () => {
    const file = JSON.stringify({ app: 'EX-WebThrottle', locos: [{ address: 3, name: 'Shunter' }] });

    expect(readBackup(file)?.locos[0]?.mapId).toBe('default');
  });

  it('leaves out a function outside F0–F31', () => {
    const file = JSON.stringify({
      app: 'EX-WebThrottle',
      maps: [{ id: 'm', name: 'Map', functions: [{ fn: 32, label: 'Out of range' }, { fn: 1.5 }, 'F2'] }],
    });

    expect(readBackup(file)?.maps[0]?.functions).toEqual([]);
  });

  it('leaves out a map with no name', () => {
    const file = JSON.stringify({ app: 'EX-WebThrottle', maps: [{ id: 'm', name: '' }, 7] });

    expect(readBackup(file)?.maps).toEqual([]);
  });
});

describe('reading a WebThrottle-EX AppData.json', () => {
  const backup = readBackup(LEGACY);

  it('brings its locos over with their details', () => {
    expect(backup?.locos[0]).toEqual({
      address: 3,
      name: 'Shunter',
      mapId: 'legacy-0',
      type: 'Diesel',
      brand: 'Bachmann',
      decoder: 'ESU',
    });
  });

  it('gives a loco on the Default map the default one', () => {
    expect(backup?.locos[1]?.mapId).toBe('default');
  });

  it('leaves out a loco with no address', () => {
    expect(backup?.locos.map(loco => loco.name)).toEqual(['Shunter', 'Express']);
  });

  it('brings its function maps over, numbered from F0', () => {
    expect(backup?.maps[0]?.functions.map(def => def.fn)).toEqual([0, 1, 2, 3]);
  });

  it('keeps which functions are held down', () => {
    expect(backup?.maps[0]?.functions[1]).toEqual({ fn: 1, label: 'Horn', momentary: true, hidden: false });
  });

  it.each([
    { what: 'one it did not show', fn: 2 },
    { what: 'one with no label', fn: 3 },
  ])('hides $what', ({ fn }) => {
    expect(backup?.maps[0]?.functions.find(def => def.fn === fn)?.hidden).toBe(true);
  });

  it('reads a file whose maps or locos are empty', () => {
    expect(readBackup('[{"maps": null}, {"locos": null}, {"preferences": null}]')).toEqual({ locos: [], maps: [] });
  });

  it('leaves out a map without its functions', () => {
    expect(readBackup('[{"maps": [{"mname": "Bare"}, {"fnData": {}}]}]')?.maps).toEqual([]);
  });
});
