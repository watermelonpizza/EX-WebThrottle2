import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { FunctionDef } from '@/core/loco/functions';
import { DEFAULT_FUNCTIONS } from '@/core/loco/functions';
import { loadSaved } from '@/stores/saved';

export const MAPS_KEY = 'exwt-maps';

export interface LocoMap {
  id: string;
  name: string;
  // The functions this loco has. One the map does not list is one the loco
  // lacks, so the desk leaves it out.
  functions: FunctionDef[];
}

export const useMapsStore = defineStore('maps', () => {
  const maps = ref<LocoMap[]>(
    loadSaved<LocoMap[]>(MAPS_KEY, [], Array.isArray),
  );

  function persist(): void {
    localStorage.setItem(MAPS_KEY, JSON.stringify(maps.value));
  }

  function createMap(name: string, functions: FunctionDef[]): string {
    const id = `map-${Date.now()}`;

    maps.value.push({ id, name, functions });
    persist();

    return id;
  }

  function updateMap(id: string, name: string, functions: FunctionDef[]): void {
    const map = maps.value.find((candidate) => candidate.id === id);

    if (!map) {
      return;
    }

    map.name = name;
    map.functions = functions;
    persist();
  }

  function deleteMap(id: string): void {
    maps.value = maps.value.filter((map) => map.id !== id);
    persist();
  }

  function findMap(id: string | undefined): LocoMap | undefined {
    return maps.value.find((map) => map.id === id);
  }

  function mapName(id: string): string {
    return findMap(id)?.name ?? 'Default';
  }

  // The keys a desk shows, in function order. A custom map lists the functions
  // this loco has; the default shows the full broadcast range so nothing is
  // out of reach.
  function visibleFunctions(id: string): FunctionDef[] {
    const map = findMap(id);

    return map
      ? map.functions
          .filter((def) => !def.hidden)
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

      const own = map.functions.find((candidate) => candidate.fn === def.fn);

      return own ? { ...own } : { ...def, hidden: true };
    });
  }

  return {
    maps,
    createMap,
    updateMap,
    deleteMap,
    mapName,
    visibleFunctions,
    editableFunctions,
  };
});
