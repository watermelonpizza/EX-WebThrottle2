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
