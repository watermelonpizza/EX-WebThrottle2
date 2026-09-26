import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import type { FunctionDef } from '@/core/loco/functions';
import { useMapsStore, MAPS_KEY } from '@/stores/maps';

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

describe('maps store', () => {
  it('starts empty', () => {
    expect(useMapsStore().maps).toEqual([]);
  });

  it('creates, updates and deletes maps', () => {
    const maps = useMapsStore();
    const custom: FunctionDef[] = [
      { fn: 2, label: 'Whistle', momentary: true },
    ];

    const id = maps.createMap('Steam sound', custom);

    expect(maps.maps).toEqual([{ id, name: 'Steam sound', functions: custom }]);

    maps.updateMap(id, 'Renamed', []);
    expect(maps.maps[0].name).toBe('Renamed');
    maps.updateMap('missing', 'Ignored', []);
    expect(maps.maps[0].name).toBe('Renamed');

    maps.deleteMap(id);
    expect(maps.maps).toHaveLength(0);
  });

  it('gives a desk the keys a map keeps, in function order', () => {
    const maps = useMapsStore();
    const id = maps.createMap('Shunter', [
      { fn: 2, label: 'Horn', momentary: true },
      { fn: 0, label: 'Lights', momentary: false },
      { fn: 1, label: 'Sound', momentary: false, hidden: true },
    ]);

    expect(maps.visibleFunctions(id).map((def) => def.label)).toEqual([
      'Lights',
      'Horn',
    ]);
    // No map, or one that has gone: the full default range.
    expect(maps.visibleFunctions('default')).toHaveLength(32);
    expect(maps.mapName(id)).toBe('Shunter');
    expect(maps.mapName('missing')).toBe('Default');
  });

  it('lays out every function for editing, hiding the ones a map left out', () => {
    const maps = useMapsStore();
    const id = maps.createMap('Shunter', [
      { fn: 0, label: 'Lights', momentary: false },
    ]);
    const fresh = maps.editableFunctions();
    const edited = maps.editableFunctions(id);

    expect(fresh).toHaveLength(32);
    expect(fresh.every((def) => !def.hidden)).toBe(true);
    expect(edited[0]).toEqual({ fn: 0, label: 'Lights', momentary: false });
    expect(edited.slice(1).every((def) => def.hidden)).toBe(true);
  });

  it('persists maps to localStorage', () => {
    const maps = useMapsStore();

    maps.createMap('Persisted', []);

    expect(JSON.parse(localStorage.getItem(MAPS_KEY) ?? '[]')).toHaveLength(1);
  });

  it('tolerates a corrupted blob', () => {
    localStorage.setItem(MAPS_KEY, '{not json');

    expect(useMapsStore().maps).toEqual([]);
  });
});
