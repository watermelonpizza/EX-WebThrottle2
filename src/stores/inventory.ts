import { defineStore } from 'pinia';
import type { Ref } from 'vue';
import { ref, watch } from 'vue';

import {
  TurnoutState,
  requestOutputList,
  requestSensorStates,
  requestTurnout,
  requestTurnoutList,
  setOutput,
  setTurnout,
} from '@/core/protocol';

import { useConnectionStore } from '@/stores/connection';

export interface TurnoutEntry {
  id: number;
  // Description the station reports, empty unless the layout gives one.
  label: string;
  // Closed until the station says otherwise; `reported` below tells a real
  // position from that placeholder.
  thrown: boolean;
  // When the station last reported the points moving to the other position,
  // whoever moved them, so a drawing can show them changing over. Unset until
  // they first move while connected.
  movedAt?: number;
}

export interface OutputEntry {
  id: number;
  active: boolean;
}

export interface SensorEntry {
  id: number;
  active: boolean;
}

function upsert<T extends { id: number }>(
  list: Ref<T[]>,
  id: number,
  create: () => T,
): T {
  const existing = list.value.find(entry => entry.id === id);

  if (existing) {
    return existing;
  }

  const added = create();

  list.value.push(added);
  list.value.sort((first, second) => first.id - second.id);

  return added;
}

// What the command station has configured: turnouts, outputs, and sensors. The
// station is the only source — nothing is invented here, so an empty list means
// it reported nothing rather than that nothing exists. Routes and automations
// are absent on purpose: they need EXRAIL on the station side.
export const useInventoryStore = defineStore('inventory', () => {
  const connection = useConnectionStore();

  const turnouts = ref<TurnoutEntry[]>([]);
  const outputs = ref<OutputEntry[]>([]);
  const sensors = ref<SensorEntry[]>([]);

  // Turnouts whose position the station has reported at least once. Before
  // that an entry's position is a placeholder, so the first report is not a
  // move.
  const reported = new Set<number>();

  function turnout(id: number): TurnoutEntry {
    return upsert(turnouts, id, () => ({
      id,
      label: '',
      thrown: false,
    }));
  }

  function report(id: number, state: TurnoutState): TurnoutEntry {
    const entry = turnout(id);
    const thrown = state === TurnoutState.THROWN;

    if (reported.has(id) && entry.thrown !== thrown) {
      entry.movedAt = Date.now();
    }

    entry.thrown = thrown;
    reported.add(id);

    return entry;
  }

  function enumerate(): void {
    connection.send(requestTurnoutList());
    connection.send(requestOutputList());
    connection.send(requestSensorStates());
  }

  connection.onMessage((message) => {
    if (message.kind === 'turnout-list') {
      // The list is the station's whole visible set, so anything missing from it
      // is gone. Each listed turnout is then asked for its description.
      turnouts.value = turnouts.value.filter(entry =>
        message.ids.includes(entry.id));

      for (const id of message.ids) {
        turnout(id);
        connection.send(requestTurnout(id));
      }

      return;
    }

    if (message.kind === 'turnout-detail') {
      report(message.id, message.state).label = message.label;

      return;
    }

    if (message.kind === 'turnout') {
      report(message.id, message.state);

      return;
    }

    if (message.kind === 'output') {
      upsert(outputs, message.id, () => ({
        id: message.id,
        active: false,
      })).active = message.active;

      return;
    }

    if (message.kind === 'sensor') {
      upsert(sensors, message.id, () => ({
        id: message.id,
        active: false,
      })).active = message.active;
    }
  });

  watch(
    () => connection.status,
    (status) => {
      if (status === 'connected') {
        enumerate();

        return;
      }

      if (status === 'disconnected') {
        reported.clear();
        turnouts.value = [];
        outputs.value = [];
        sensors.value = [];
      }
    },
  );

  // The panel showing all this can be opened long after connecting, so ask the
  // station straight away when it is already there.
  if (connection.status === 'connected') {
    enumerate();
  }

  // Both switches only send: the station answers with <H …> / <Y …>, and that
  // answer is what updates the state shown here.
  function toggleTurnout(id: number): void {
    const entry = turnouts.value.find(candidate => candidate.id === id);

    if (!entry) {
      return;
    }

    connection.send(
      setTurnout(id, entry.thrown ? TurnoutState.CLOSED : TurnoutState.THROWN),
    );
  }

  function toggleOutput(id: number): void {
    const entry = outputs.value.find(candidate => candidate.id === id);

    if (!entry) {
      return;
    }

    connection.send(setOutput(id, !entry.active));
  }

  return { turnouts, outputs, sensors, toggleTurnout, toggleOutput };
});
