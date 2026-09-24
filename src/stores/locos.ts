import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

import { decodeFunctionMap } from '@/core/loco/functions';
import type { LocoState } from '@/core/protocol';
import {
  Direction,
  decodeSpeedByte,
  forgetLoco,
  requestLocoUpdate,
  setLocoFunction,
  setLocoSpeed,
} from '@/core/protocol';
import { useConnectionStore } from '@/stores/connection';

export const ROSTER_KEY = 'exwt-roster';

const BROADCAST_FUNCTIONS = 32;

export interface RosterLoco {
  address: number;
  name: string;
  mapId: string;
}

export interface Throttle extends RosterLoco {
  // Speed in the 0..126 range the <t> command accepts; emergency stop shows
  // speed 0 with estop set so the panel can render the stop distinctly.
  speed: number;
  direction: Direction;
  estop: boolean;
  // Live function states reconciled from the <l> broadcast.
  functions: boolean[];
}

// Saved-loco list, local-first. If Hub ever backs this the store keeps its
// shape and swaps the persistence calls, so the UI is not coupled to storage.
function loadRoster(): RosterLoco[] {
  try {
    const saved = JSON.parse(localStorage.getItem(ROSTER_KEY) ?? '[]');

    return Array.isArray(saved) ? (saved as RosterLoco[]) : [];
  } catch {
    return [];
  }
}

export const useLocosStore = defineStore('locos', () => {
  const connection = useConnectionStore();
  const roster = ref<RosterLoco[]>(loadRoster());
  const throttles = ref<Throttle[]>([]);

  function persist(): void {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster.value));
  }

  function rosterEntry(address: number): RosterLoco | undefined {
    return roster.value.find((loco) => loco.address === address);
  }

  // State is per-connection: a fresh connect starts from a clean throttle
  // table, and the command station slots are gone anyway.
  watch(
    () => connection.status,
    (status) => {
      if (status === 'disconnected') throttles.value = [];
    },
  );

  // Broadcasts are authoritative: apply every <l> update for a loco we are
  // driving. Other cabs stay invisible until acquired. Watch the message count
  // (a primitive) rather than the array: the store reassigns messages.value on
  // connect, and a deep watch on the array does not survive that detach. A
  // length counter tracks progress so in-place pushes are only handled once.
  let appliedMessages = 0;

  watch(
    () => connection.messages.length,
    () => {
      const messages = connection.messages;

      for (const message of messages.slice(appliedMessages)) {
        if (message.kind === 'loco') reconcile(message.loco);
      }

      appliedMessages = messages.length;
    },
  );

  function reconcile(loco: LocoState): void {
    const throttle = throttles.value.find(
      (candidate) => candidate.address === loco.address,
    );

    if (!throttle) return;

    const { speed, direction, estop } = decodeSpeedByte(loco.speedByte);

    throttle.speed = speed;
    throttle.direction = direction;
    throttle.estop = estop;
    throttle.functions = decodeFunctionMap(loco.functionMap);
  }

  function acquire(address: number, mapId = 'default'): void {
    const existing = throttles.value.find(
      (candidate) => candidate.address === address,
    );

    if (existing) {
      // Already driving: re-ask for a fresh state.
      connection.send(requestLocoUpdate(address));

      return;
    }

    const saved = rosterEntry(address);

    throttles.value.push({
      address,
      name: saved?.name ?? `Loco ${address}`,
      mapId: saved?.mapId ?? mapId,
      speed: 0,
      direction: Direction.FORWARD,
      estop: false,
      functions: new Array<boolean>(BROADCAST_FUNCTIONS).fill(false),
    });

    connection.send(requestLocoUpdate(address));
  }

  function release(address: number): void {
    throttles.value = throttles.value.filter(
      (candidate) => candidate.address !== address,
    );

    // Free the command-station slot too, so the layout has one less throttle.
    connection.send(forgetLoco(address));
  }

  function setMap(address: number, mapId: string): void {
    const throttle = throttles.value.find(
      (candidate) => candidate.address === address,
    );

    if (!throttle) return;

    throttle.mapId = mapId;

    // Keep a saved loco's map choice for the next session.
    const saved = rosterEntry(address);

    if (saved) {
      saved.mapId = mapId;
      persist();
    }
  }

  function setSpeed(address: number, speed: number): void {
    const throttle = throttles.value.find(
      (candidate) => candidate.address === address,
    );

    if (!throttle) return;

    connection.send(setLocoSpeed(address, speed, throttle.direction));
    throttle.speed = speed;
    throttle.estop = false;
  }

  function setDirection(address: number, direction: Direction): void {
    const throttle = throttles.value.find(
      (candidate) => candidate.address === address,
    );

    if (!throttle) return;

    connection.send(setLocoSpeed(address, throttle.speed, direction));
    throttle.direction = direction;
  }

  function emergencyStop(address: number): void {
    const throttle = throttles.value.find(
      (candidate) => candidate.address === address,
    );

    if (!throttle) return;

    connection.send(setLocoSpeed(address, -1, throttle.direction));
    throttle.speed = 0;
    throttle.estop = true;
  }

  function setFunction(address: number, fn: number, state: boolean): void {
    const throttle = throttles.value.find(
      (candidate) => candidate.address === address,
    );

    if (!throttle) return;

    connection.send(setLocoFunction(address, fn, state));
    throttle.functions[fn] = state;
  }

  function toggleFunction(address: number, fn: number): void {
    const throttle = throttles.value.find(
      (candidate) => candidate.address === address,
    );

    if (!throttle) return;

    setFunction(address, fn, !throttle.functions[fn]);
  }

  function saveLoco(address: number, name: string, mapId = 'default'): boolean {
    const existing = rosterEntry(address);

    if (existing) {
      existing.name = name;
      existing.mapId = mapId;
    } else {
      roster.value.push({ address, name, mapId });
    }

    persist();

    return true;
  }

  function removeLoco(address: number): void {
    roster.value = roster.value.filter(
      (candidate) => candidate.address !== address,
    );
    persist();
  }

  return {
    roster,
    throttles,
    acquire,
    release,
    setSpeed,
    setDirection,
    emergencyStop,
    setMap,
    setFunction,
    toggleFunction,
    saveLoco,
    removeLoco,
  };
});
