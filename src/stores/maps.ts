import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { SavedMap } from '@/core/loco/backup';
import type { FunctionDef } from '@/core/loco/functions';
import { DEFAULT_FUNCTIONS } from '@/core/loco/functions';
import { loadSaved } from '@/stores/saved';

export const MAPS_KEY = 'exwt-maps';

// The function names the Command Station's own roster gives a loco, rather
// than a map saved here; the locos store looks them up.
export const STATION_MAP = 'station';

export type LocoMap = SavedMap;

export const useMapsStore = defineStore('maps', () => {
  const maps = ref<LocoMap[]>(
    loadSaved<LocoMap[]>(MAPS_KEY, [], Array.isArray),
  );

  function persist(): void {
    localStorage.setItem(MAPS_KEY, JSON.stringify(maps.value));
  }

  function createMap(name: string, functions: FunctionDef[]): string {
    const id = `map-${Date.now()}-${maps.value.length}`;

    maps.value.push({ id, name, functions });
    persist();

    return id;
  }

  function updateMap(id: string, name: string, functions: FunctionDef[]): void {
    const map = maps.value.find(candidate => candidate.id === id);

    if (!map) {
      return;
    }

    map.name = name;
    map.functions = functions;
    persist();
  }

  function deleteMap(id: string): void {
    maps.value = maps.value.filter(map => map.id !== id);
    persist();
  }

  function findMap(id: string | undefined): LocoMap | undefined {
    return maps.value.find(map => map.id === id);
  }

  function mapName(id: string): string {
    if (id === STATION_MAP) {
      return 'Command Station roster';
    }

    return findMap(id)?.name ?? 'Default';
  }

  // Maps from a backup file join the ones here; one with the same name as a
  // map already here replaces its functions. Gives each backup map's id the
  // id it has here, for the locos that use it.
  function importMaps(imported: SavedMap[]): Map<string, string> {
    const ids = new Map<string, string>();

    for (const map of imported) {
      const same = maps.value.find(candidate => candidate.name === map.name);

      if (same) {
        same.functions = map.functions;
        ids.set(map.id, same.id);
      } else {
        ids.set(map.id, createMap(map.name, map.functions));
      }
    }

    persist();

    return ids;
  }

  function clearAll(): void {
    maps.value = [];
    localStorage.removeItem(MAPS_KEY);
  }

  // The keys a desk shows, in function order. A custom map lists the functions
  // this loco has; the default shows the full broadcast range so nothing is
  // out of reach.
  function visibleFunctions(id: string): FunctionDef[] {
    const map = findMap(id);

    return map
      ? map.functions
          .filter(def => !def.hidden)
          .sort((first, second) => first.fn - second.fn)
      : DEFAULT_FUNCTIONS;
  }

  // Every function F0–F31 as rows to edit. A new map starts with all of them
  // shown, to hide the ones the decoder lacks; a function an existing map
  // never listed is one it does not have.
  function editableFunctions(id?: string): FunctionDef[] {
    const map = findMap(id);

    return DEFAULT_FUNCTIONS.map((def) => {
      if (!map) {
        return { ...def, hidden: false };
      }

      const own = map.functions.find(candidate => candidate.fn === def.fn);

      return own ? { ...own } : { ...def, hidden: true };
    });
  }

  return {
    maps,
    createMap,
    updateMap,
    deleteMap,
    mapName,
    importMaps,
    clearAll,
    visibleFunctions,
    editableFunctions,
  };
});
