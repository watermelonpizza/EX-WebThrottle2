import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import type { FunctionDef } from '@/core/loco/functions';
import { useMapsStore, MAPS_KEY } from '@/stores/maps';

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

describe('maps store', () => {
  it('starts empty with the default map as the fallback', () => {
    const maps = useMapsStore();

    expect(maps.maps).toEqual([]);
    expect(maps.fullFunctions('default')).toHaveLength(32);
    expect(maps.fullFunctions('default').find((fn) => fn.fn === 2)).toEqual(
      expect.objectContaining({ label: 'Horn', momentary: true }),
    );
  });

  it('creates, updates and deletes maps', () => {
    const maps = useMapsStore();
    const custom: FunctionDef[] = [
      { fn: 2, label: 'Whistle', momentary: true },
    ];

    const id = maps.createMap('Steam sound', custom);

    expect(maps.maps).toHaveLength(1);

    // Partial maps fall back to the default labels for the rest.
    expect(maps.fullFunctions(id).find((fn) => fn.fn === 2)?.label).toBe(
      'Whistle',
    );
    expect(maps.fullFunctions(id).find((fn) => fn.fn === 0)?.label).toBe(
      'Headlight',
    );

    maps.updateMap(id, 'Renamed', []);
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
