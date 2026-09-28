import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import type { SavedLoco } from '@/core/loco/backup';
import type { FunctionDef } from '@/core/loco/functions';
import {
  DEFAULT_FUNCTIONS,
  decodeFunctionMap,
  parseRosterFunctions,
} from '@/core/loco/functions';
import type { LocoState } from '@/core/protocol';
import {
  Direction,
  decodeSpeedByte,
  emergencyStopAll,
  forgetLoco,
  requestCabList,
  requestLocoUpdate,
  requestRosterDefaults,
  requestRosterList,
  requestRosterLoco,
  setLocoFunction,
  setLocoSpeed,
} from '@/core/protocol';
import { useConnectionStore } from '@/stores/connection';
import { STATION_MAP, useMapsStore } from '@/stores/maps';
import { loadSaved } from '@/stores/saved';

export const ROSTER_KEY = 'exwt-roster';

const BROADCAST_FUNCTIONS = 32;

// The kinds of loco WebThrottle-EX offered, kept so its locos come over as
// they were.
export const LOCO_TYPES = ['Diesel', 'Steam', 'Electric', 'Other'] as const;

export type RosterLoco = SavedLoco;

// Extra details about a saved loco, all optional.
export type LocoDetails = Pick<SavedLoco, 'type' | 'brand' | 'decoder'>;

// A loco in the Command Station's own roster (ROSTER lines in its EXRAIL
// script), shared by every Throttle on it. The name is empty until the
// station has been asked about it.
export interface StationLoco {
  address: number;
  name: string;
  functions: FunctionDef[];
}

export interface Throttle extends RosterLoco {
  // Speed in the 0..126 range the <t> command accepts; emergency stop shows
  // speed 0 with estop set so the panel can render the stop distinctly.
  speed: number;
  forward: boolean;
  estop: boolean;
  // Live function states reconciled from the <l> broadcast.
  functions: boolean[];
}

// A loco the Command Station has reported this session, driven here or not.
export interface LayoutLoco {
  address: number;
  speed: number;
  forward: boolean;
}

// A loco moving on the layout, by name where it is saved and by address where
// it is not.
export interface MovingLoco extends LayoutLoco {
  name: string;
}

function direction(forward: boolean): Direction {
  return forward ? Direction.FORWARD : Direction.REVERSE;
}

// Saved-loco list, local-first. If Hub ever backs this the store keeps its
// shape and swaps the persistence calls, so the UI is not coupled to storage.
export const useLocosStore = defineStore('locos', () => {
  const connection = useConnectionStore();
  const maps = useMapsStore();
  const roster = ref<RosterLoco[]>(
    loadSaved<RosterLoco[]>(ROSTER_KEY, [], Array.isArray),
  );
  const throttles = ref<Throttle[]>([]);

  // Listed afresh on every connection, like the rest of the inventory.
  const stationRoster = ref<StationLoco[]>([]);

  // The function names ROSTER(0, …) gives every loco without names of its
  // own; empty when the roster has no such line.
  const stationDefaults = ref<FunctionDef[]>([]);

  // What each loco on the layout is doing, from the last <l> broadcast for it.
  // On connecting the station is asked which locos it is driving, and then
  // each one's state; after that every change any Throttle makes is broadcast.
  const onLayout = ref<LayoutLoco[]>([]);

  function driving(address: number): boolean {
    return throttles.value.some(throttle => throttle.address === address);
  }

  // Locos moving on the layout that this browser is not driving yet, such as
  // ones another Throttle started, so an operator can pick them all up.
  const moving = computed<MovingLoco[]>(() =>
    onLayout.value
      .filter(loco => loco.speed > 0 && !driving(loco.address))
      .map(loco => ({ ...loco, name: nameOf(loco.address) })));

  // Saved locos that are not on a desk yet, ready to drive.
  const savedNotDriven = computed(() =>
    roster.value.filter(loco => !driving(loco.address)));

  // The Command Station's roster locos that are not saved here or on a desk.
  const stationNotDriven = computed(() =>
    stationRoster.value.filter(loco =>
      loco.name !== '' && !rosterEntry(loco.address) && !driving(loco.address)));

  // Locos driven here that are moving, which disconnecting would leave running.
  const movingHere = computed(() =>
    throttles.value.filter(throttle => throttle.speed > 0));

  function persist(): void {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster.value));
  }

  function rosterEntry(address: number): RosterLoco | undefined {
    return roster.value.find(loco => loco.address === address);
  }

  function stationEntry(address: number): StationLoco | undefined {
    return stationRoster.value.find(loco => loco.address === address);
  }

  // A loco saved here goes by the name its owner gave it; otherwise by the
  // name in the Command Station's roster, and otherwise by its address.
  function nameOf(address: number): string {
    return rosterEntry(address)?.name
      || stationEntry(address)?.name
      || `Loco ${address}`;
  }

  // The function names the Command Station's roster has for a loco: its own
  // entry's, else the roster's defaults, else none.
  function stationFunctions(address: number): FunctionDef[] {
    const own = stationEntry(address)?.functions ?? [];

    return own.length > 0 ? own : stationDefaults.value;
  }

  function hasStationFunctions(address: number): boolean {
    return stationFunctions(address).length > 0;
  }

  // The map a loco starts on: its own if it is saved here, the roster's
  // function names if the Command Station has some for it, else the default.
  function startingMap(address: number): string {
    return rosterEntry(address)?.mapId
      ?? (hasStationFunctions(address) ? STATION_MAP : 'default');
  }

  // The keys a desk shows for a loco on its map, in function order. A loco
  // set to the roster's names on a Command Station that has none for it (not
  // on its roster, or saved while on another station) gets every key.
  function functionsFor(address: number, mapId: string): FunctionDef[] {
    if (mapId !== STATION_MAP) {
      return maps.visibleFunctions(mapId);
    }

    const functions = stationFunctions(address);

    return functions.length > 0 ? functions : DEFAULT_FUNCTIONS;
  }

  // State is per-connection: a fresh connect starts from a clean throttle
  // table, and the command station slots are gone anyway.
  watch(
    () => connection.status,
    (status) => {
      if (status === 'disconnected') {
        throttles.value = [];
        onLayout.value = [];
        stationRoster.value = [];
        stationDefaults.value = [];
      }

      if (status === 'connected') {
        askStation();
      }
    },
  );

  function askStation(): void {
    connection.send(requestRosterList());
    connection.send(requestCabList());
  }

  // The store can be created after connecting (by the first panel that needs
  // it), so ask straight away when the station is already there.
  if (connection.status === 'connected') {
    askStation();
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

    // The list is the whole roster, so anything missing from it is gone.
    // Each loco on it is then asked its name and functions, and a 0 in it
    // (not a loco) for the default function names.
    if (message.kind === 'roster-list') {
      const addresses = message.addresses.filter(address => address > 0);

      stationRoster.value = addresses.map(address =>
        stationEntry(address) ?? { address, name: '', functions: [] });

      if (message.addresses.includes(0)) {
        connection.send(requestRosterDefaults());
      } else {
        stationDefaults.value = [];
      }

      for (const address of addresses) {
        connection.send(requestRosterLoco(address));
      }
    }

    if (message.kind === 'roster-loco') {
      learnStationLoco(message.address, message.name, message.functions);
    }
  });

  function learnStationLoco(address: number, name: string, functions: string): void {
    const entry = stationEntry(address);

    if (address === 0) {
      stationDefaults.value = parseRosterFunctions(functions);
    } else if (entry) {
      entry.name = name;
      entry.functions = parseRosterFunctions(functions);
    } else {
      return;
    }

    // A loco driven before the roster arrived picks up its name and keys,
    // unless it is saved here or has been given another map on its desk.
    for (const throttle of throttles.value) {
      if (rosterEntry(throttle.address) || (address !== 0 && throttle.address !== address)) {
        continue;
      }

      throttle.name = nameOf(throttle.address);

      if (throttle.mapId === 'default') {
        throttle.mapId = startingMap(throttle.address);
      }
    }
  }

  function reconcile(loco: LocoState): void {
    const decoded = decodeSpeedByte(loco.speedByte);
    const { speed, estop } = decoded;
    const forward = decoded.direction === Direction.FORWARD;
    const seen = onLayout.value.find(
      candidate => candidate.address === loco.address,
    );

    if (seen) {
      seen.speed = speed;
      seen.forward = forward;
    } else {
      onLayout.value.push({ address: loco.address, speed, forward });
    }

    const throttle = throttles.value.find(
      candidate => candidate.address === loco.address,
    );

    if (!throttle) {
      return;
    }

    throttle.speed = speed;
    throttle.forward = forward;
    throttle.estop = estop;
    throttle.functions = decodeFunctionMap(loco.functionMap);
  }

  function acquire(address: number): void {
    const existing = throttles.value.find(
      candidate => candidate.address === address,
    );

    if (existing) {
      // Already driving: re-ask for a fresh state.
      connection.send(requestLocoUpdate(address));

      return;
    }

    const seen = onLayout.value.find(loco => loco.address === address);

    // A loco already running shows its speed straight away; the reply to
    // the request below confirms it.
    throttles.value.push({
      address,
      name: nameOf(address),
      mapId: startingMap(address),
      speed: seen?.speed ?? 0,
      forward: seen?.forward ?? true,
      estop: false,
      functions: new Array<boolean>(BROADCAST_FUNCTIONS).fill(false),
    });

    connection.send(requestLocoUpdate(address));
  }

  // Drive a loco by address. A name typed with it saves the loco for next
  // time, one step rather than two; a saved loco keeps its own name and map.
  function drive(address: number, name = ''): void {
    if (!rosterEntry(address) && name.trim()) {
      saveLoco(address, name.trim());
    }

    acquire(address);
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
      candidate => candidate.address !== address,
    );

    // Free the command-station slot too, so the layout has one less throttle.
    connection.send(forgetLoco(address));
  }

  function setMap(address: number, mapId: string): void {
    const throttle = throttles.value.find(
      candidate => candidate.address === address,
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
      candidate => candidate.address === address,
    );

    if (!throttle) {
      return;
    }

    connection.send(setLocoSpeed(address, speed, direction(throttle.forward)));
    throttle.speed = speed;
    throttle.estop = false;
  }

  function setForward(address: number, forward: boolean): void {
    const throttle = throttles.value.find(
      candidate => candidate.address === address,
    );

    if (!throttle) {
      return;
    }

    connection.send(setLocoSpeed(address, throttle.speed, direction(forward)));
    throttle.forward = forward;
  }

  function emergencyStop(address: number): void {
    const throttle = throttles.value.find(
      candidate => candidate.address === address,
    );

    if (!throttle) {
      return;
    }

    connection.send(setLocoSpeed(address, -1, direction(throttle.forward)));
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
      candidate => candidate.address === address,
    );

    if (!throttle) {
      return;
    }

    connection.send(setLocoFunction(address, fn, state));
    throttle.functions[fn] = state;
  }

  function saveLoco(
    address: number,
    name: string,
    mapId = 'default',
    details: LocoDetails = {},
  ): boolean {
    const existing = rosterEntry(address);
    const loco = { address, name, mapId, ...details };

    if (existing) {
      Object.assign(existing, loco);
    } else {
      roster.value.push(loco);
    }

    persist();

    return true;
  }

  function removeLoco(address: number): void {
    roster.value = roster.value.filter(
      candidate => candidate.address !== address,
    );
    persist();
  }

  // Locos from a backup file join the saved ones; one with the same address
  // as a loco saved here replaces it.
  function importLocos(imported: RosterLoco[]): void {
    for (const loco of imported) {
      const { address, name, mapId, ...details } = loco;

      saveLoco(address, name, mapId, details);
    }
  }

  function clearSaved(): void {
    roster.value = [];
    localStorage.removeItem(ROSTER_KEY);
  }

  return {
    roster,
    stationRoster,
    throttles,
    onLayout,
    moving,
    savedNotDriven,
    stationNotDriven,
    movingHere,
    drive,
    acquire,
    acquireAll,
    release,
    setSpeed,
    setForward,
    emergencyStop,
    stopAll,
    setMap,
    setFunction,
    saveLoco,
    removeLoco,
    importLocos,
    clearSaved,
    functionsFor,
    hasStationFunctions,
  };
});
