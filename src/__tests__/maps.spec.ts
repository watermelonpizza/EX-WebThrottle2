import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import type { FunctionDef } from '@/core/loco/functions';
import { MAPS_KEY, STATION_MAP, useMapsStore } from '@/stores/maps';

describe('maps store', () => {
  let maps: ReturnType<typeof useMapsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    maps = useMapsStore();
  });

  it('starts empty', () => {
    expect(maps.maps).toEqual([]);
  });

  it('names the Command Station\'s own function names', () => {
    expect(maps.mapName(STATION_MAP)).toBe('Command Station roster');
  });

  describe('importing maps, with one called Class 08 here', () => {
    const lights: FunctionDef[] = [{ fn: 0, label: 'Lights', momentary: false }];
    let here: string;
    let ids: Map<string, string>;

    beforeEach(() => {
      here = maps.createMap('Class 08', []);
      ids = maps.importMaps([
        { id: 'a', name: 'Class 08', functions: lights },
        { id: 'b', name: 'Class 37', functions: lights },
      ]);
    });

    it('replaces the functions of the one with the same name', () => {
      expect(maps.maps[0]?.functions).toEqual(lights);
    });

    it('adds the others', () => {
      expect(maps.maps.map(map => map.name)).toEqual(['Class 08', 'Class 37']);
    });

    it('gives each imported map the id it has here', () => {
      expect([ids.get('a'), ids.get('b')]).toEqual([here, maps.maps[1]?.id]);
    });

    it('deletes them all when the maps are cleared', () => {
      maps.clearAll();

      expect([maps.maps, localStorage.getItem(MAPS_KEY)]).toEqual([[], null]);
    });
  });

  it('tolerates a corrupted blob', () => {
    localStorage.setItem(MAPS_KEY, '{not json');
    setActivePinia(createPinia());

    expect(useMapsStore().maps).toEqual([]);
  });

  describe('with a map created', () => {
    const custom: FunctionDef[] = [{ fn: 2, label: 'Whistle', momentary: true }];
    let id: string;

    beforeEach(() => {
      id = maps.createMap('Steam sound', custom);
    });

    it('lists it', () => {
      expect(maps.maps).toEqual([{ id, name: 'Steam sound', functions: custom }]);
    });

    it('saves it to localStorage', () => {
      expect(JSON.parse(localStorage.getItem(MAPS_KEY) ?? '[]')).toHaveLength(1);
    });

    it('renames it', () => {
      maps.updateMap(id, 'Renamed', []);

      expect(maps.maps[0]?.name).toBe('Renamed');
    });

    it('ignores an update for a map that does not exist', () => {
      maps.updateMap('missing', 'Ignored', []);

      expect(maps.maps[0]?.name).toBe('Steam sound');
    });

    it('deletes it', () => {
      maps.deleteMap(id);

      expect(maps.maps).toHaveLength(0);
    });
  });

  describe('with a map that hides F1', () => {
    let id: string;

    beforeEach(() => {
      id = maps.createMap('Shunter', [
        { fn: 2, label: 'Horn', momentary: true },
        { fn: 0, label: 'Lights', momentary: false },
        { fn: 1, label: 'Sound', momentary: false, hidden: true },
      ]);
    });

    it('gives a desk the keys the map keeps, in function order', () => {
      expect(maps.visibleFunctions(id).map(def => def.label)).toEqual(['Lights', 'Horn']);
    });

    it('names the map', () => {
      expect(maps.mapName(id)).toBe('Shunter');
    });
  });

  // No map, or one that has gone: the full default range.
  it.each(['default', 'missing'])('gives a desk all 32 keys for the %s map', (id) => {
    expect(maps.visibleFunctions(id)).toHaveLength(32);
  });

  it('calls a map that has gone Default', () => {
    expect(maps.mapName('missing')).toBe('Default');
  });

  describe('laying out functions to edit a new map', () => {
    let fresh: FunctionDef[];

    beforeEach(() => {
      fresh = maps.editableFunctions();
    });

    it('lists all 32', () => {
      expect(fresh).toHaveLength(32);
    });

    it('shows every one', () => {
      expect(fresh.every(def => !def.hidden)).toBe(true);
    });
  });

  describe('laying out functions to edit a map that keeps only F0', () => {
    let edited: FunctionDef[];

    beforeEach(() => {
      edited = maps.editableFunctions(maps.createMap('Shunter', [{ fn: 0, label: 'Lights', momentary: false }]));
    });

    it('keeps the map\'s own F0', () => {
      expect(edited[0]).toEqual({ fn: 0, label: 'Lights', momentary: false });
    });

    it('hides the functions it left out', () => {
      expect(edited.slice(1).every(def => def.hidden)).toBe(true);
    });
  });
});
