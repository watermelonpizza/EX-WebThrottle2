import { defineStore } from 'pinia';
import { ref } from 'vue';

import { DEFAULT_FUNCTIONS } from '@/core/loco/functions';
import type { FunctionDef } from '@/core/loco/functions';

export const MAPS_KEY = 'exwt-maps';

export interface LocoMap {
  id: string;
  name: string;
  // The 32 broadcast functions a loco shows. A map may store a partial list;
  // fullFunctions() fills the gaps from the default definitions.
  functions: FunctionDef[];
}

function loadMaps(): LocoMap[] {
  try {
    const saved = JSON.parse(localStorage.getItem(MAPS_KEY) ?? '[]');

    return Array.isArray(saved) ? (saved as LocoMap[]) : [];
  } catch {
    // A corrupted settings blob must not stop the app booting.
    return [];
  }
}

export const useMapsStore = defineStore('maps', () => {
  const maps = ref<LocoMap[]>(loadMaps());

  function persist(): void {
    localStorage.setItem(MAPS_KEY, JSON.stringify(maps.value));
  }

  function fullFunctions(id: string): FunctionDef[] {
    const override = maps.value.find((map) => map.id === id);

    return DEFAULT_FUNCTIONS.map(
      (def) =>
        override?.functions.find((candidate) => candidate.fn === def.fn) ?? def,
    );
  }

  function createMap(name: string, functions: FunctionDef[]): string {
    const id = `map-${Date.now()}`;

    maps.value.push({ id, name, functions });
    persist();

    return id;
  }

  function updateMap(id: string, name: string, functions: FunctionDef[]): void {
    const map = maps.value.find((candidate) => candidate.id === id);

    if (!map) return;

    map.name = name;
    map.functions = functions;
    persist();
  }

  function deleteMap(id: string): void {
    maps.value = maps.value.filter((map) => map.id !== id);
    persist();
  }

  return { maps, fullFunctions, createMap, updateMap, deleteMap };
});
