import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { FunctionDef } from '@/core/loco/functions';
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

  return { maps, createMap, updateMap, deleteMap };
});
