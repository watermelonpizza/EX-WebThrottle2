import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { LayoutDiagram } from '@/core/diagram';
import { EMULATOR_DEMO_DIAGRAM } from '@/core/diagram';
import { useConnectionStore } from '@/stores/connection';

export const BERTHS_KEY = 'exwt-berths';

// BOARD_NAME in emulator/config.h.
const EMULATOR_BOARD = 'HOST';

// Berth placements per diagram: which loco address sits in which berth.
type Placements = Record<string, Record<string, number>>;

function loadPlacements(): Placements {
  try {
    const saved = JSON.parse(localStorage.getItem(BERTHS_KEY) ?? '{}');

    return typeof saved === 'object' && saved !== null ? saved : {};
  } catch {
    return {};
  }
}

// The drawing of the layout, when there is one. The Command Station does not
// know its own track plan, so a diagram comes from outside it: the bundled
// sample for the host emulator today, a diagram editor saving to the browser
// and the Hub later. With no diagram, panels fall back to route tiles.
export const useDiagramStore = defineStore('diagram', () => {
  const connection = useConnectionStore();
  const placements = ref<Placements>(loadPlacements());

  const diagram = computed<LayoutDiagram | null>(() => {
    // The host emulator reports its board as HOST, and runs the demo layout
    // script this sample was drawn for. Real Command Stations have no diagram
    // until one is drawn for them.
    return connection.station?.microprocessor === EMULATOR_BOARD
      ? EMULATOR_DEMO_DIAGRAM
      : null;
  });

  function persist(): void {
    localStorage.setItem(BERTHS_KEY, JSON.stringify(placements.value));
  }

  // Placements are what the operator says, never detection: the berth shows a
  // train description until someone moves or clears it.
  function occupant(berthId: string): number | undefined {
    const current = diagram.value;

    return current ? placements.value[current.id]?.[berthId] : undefined;
  }

  function place(berthId: string, address: number | undefined): void {
    const current = diagram.value;

    if (!current) {
      return;
    }

    const berths = { ...placements.value[current.id] };

    // A loco can only be described in one place at a time.
    for (const [id, placed] of Object.entries(berths)) {
      if (placed === address) {
        delete berths[id];
      }
    }

    if (address === undefined) {
      delete berths[berthId];
    } else {
      berths[berthId] = address;
    }

    placements.value = { ...placements.value, [current.id]: berths };
    persist();
  }

  // The station's own description wins; the diagram's name fills the gap.
  function turnoutName(id: number, stationLabel = ''): string {
    return (
      stationLabel ||
      diagram.value?.turnouts.find((turnout) => turnout.id === id)?.name ||
      ''
    );
  }

  // What a sensor watches, by the diagram's name for that stretch of track.
  function sensorName(id: number): string {
    return (
      diagram.value?.sections.find((section) => section.sensor === id)
        ?.label ?? `Sensor ${id}`
    );
  }

  return { diagram, occupant, place, sensorName, turnoutName };
});
