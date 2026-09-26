import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { decodeFunctionMap } from '@/core/loco/functions';
import type { LocoState } from '@/core/protocol';
import {
  Direction,
  decodeSpeedByte,
  emergencyStopAll,
  forgetLoco,
  requestCabList,
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

// A loco the Command Station has reported this session, driven here or not.
export interface LayoutLoco {
  address: number;
  speed: number;
  direction: Direction;
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

  // What each loco on the layout is doing, from the last <l> broadcast for it.
  // On connecting the station is asked which locos it is driving, and then
  // each one's state; after that every change any Throttle makes is broadcast.
  const onLayout = ref<LayoutLoco[]>([]);

  function driving(address: number): boolean {
    return throttles.value.some((throttle) => throttle.address === address);
  }

  // Locos moving on the layout that this browser is not driving yet, such as
  // ones another Throttle started, so an operator can pick them all up.
  const moving = computed(() =>
    onLayout.value.filter((loco) => loco.speed > 0 && !driving(loco.address)),
  );

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
      if (status === 'disconnected') {
        throttles.value = [];
        onLayout.value = [];
      }

      if (status === 'connected') {
        connection.send(requestCabList());
      }
    },
  );

  // The store can be created after connecting (by the first panel that needs
  // it), so ask straight away when the station is already there.
  if (connection.status === 'connected') {
    connection.send(requestCabList());
  }

  // Broadcasts are authoritative: apply every <l> update to the loco's desk
  // if it is driven here, and note it on the layout either way. Other cabs get
  // no desk until acquired.
  connection.onMessage((message) => {
    if (message.kind === 'loco') {
      reconcile(message.loco);
    }

    // Asking after each loco only reads its state: nothing is acquired.
    if (message.kind === 'cab-list') {
      for (const address of message.addresses) {
        connection.send(requestLocoUpdate(address));
      }
    }
  });

  function reconcile(loco: LocoState): void {
    const { speed, direction, estop } = decodeSpeedByte(loco.speedByte);
    const seen = onLayout.value.find(
      (candidate) => candidate.address === loco.address,
    );

    if (seen) {
      seen.speed = speed;
      seen.direction = direction;
    } else {
      onLayout.value.push({ address: loco.address, speed, direction });
    }

    const throttle = throttles.value.find(
      (candidate) => candidate.address === loco.address,
    );

    if (!throttle) {
      return;
    }

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
    const seen = onLayout.value.find((loco) => loco.address === address);

    // A loco already running shows its speed straight away; the reply to
    // the request below confirms it.
    throttles.value.push({
      address,
      name: saved?.name ?? `Loco ${address}`,
      mapId: saved?.mapId ?? mapId,
      speed: seen?.speed ?? 0,
      direction: seen?.direction ?? Direction.FORWARD,
      estop: false,
      functions: new Array<boolean>(BROADCAST_FUNCTIONS).fill(false),
    });

    connection.send(requestLocoUpdate(address));
  }

  // Put several locos on desks at once: every saved loco, or everything
  // moving on the layout.
  function acquireAll(addresses: number[]): void {
    for (const address of addresses) {
      acquire(address);
    }
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

    if (!throttle) {
      return;
    }

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

    if (!throttle) {
      return;
    }

    connection.send(setLocoSpeed(address, speed, throttle.direction));
    throttle.speed = speed;
    throttle.estop = false;
  }

  function setDirection(address: number, direction: Direction): void {
    const throttle = throttles.value.find(
      (candidate) => candidate.address === address,
    );

    if (!throttle) {
      return;
    }

    connection.send(setLocoSpeed(address, throttle.speed, direction));
    throttle.direction = direction;
  }

  function emergencyStop(address: number): void {
    const throttle = throttles.value.find(
      (candidate) => candidate.address === address,
    );

    if (!throttle) {
      return;
    }

    connection.send(setLocoSpeed(address, -1, throttle.direction));
    throttle.speed = 0;
    throttle.estop = true;
  }

  // One command stops every loco on the layout, including ones driven from
  // other Throttles; the ones driven here show the stop straight away.
  function stopAll(): void {
    connection.send(emergencyStopAll());

    for (const throttle of throttles.value) {
      throttle.speed = 0;
      throttle.estop = true;
    }

    for (const loco of onLayout.value) {
      loco.speed = 0;
    }
  }

  function setFunction(address: number, fn: number, state: boolean): void {
    const throttle = throttles.value.find(
      (candidate) => candidate.address === address,
    );

    if (!throttle) {
      return;
    }

    connection.send(setLocoFunction(address, fn, state));
    throttle.functions[fn] = state;
  }

  function toggleFunction(address: number, fn: number): void {
    const throttle = throttles.value.find(
      (candidate) => candidate.address === address,
    );

    if (!throttle) {
      return;
    }

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
    onLayout,
    moving,
    acquire,
    acquireAll,
    release,
    setSpeed,
    setDirection,
    emergencyStop,
    stopAll,
    setMap,
    setFunction,
    toggleFunction,
    saveLoco,
    removeLoco,
  };
});
