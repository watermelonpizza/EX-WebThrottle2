import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { PowerState, TurnoutState, decodeSpeedByte } from '@/core/protocol';
import { useConnectionStore } from '@/stores/connection';
import { useDiagramStore } from '@/stores/diagram';

export interface LayoutEvent {
  // Unique for the session, so a list can key two identical changes apart.
  id: number;
  at: number;
  text: string;
}

// Enough to scroll back through a session's recent changes without growing
// for ever.
const MAX_EVENTS = 50;

// <t cab speed dir> as this browser sends it; -1 is an emergency stop.
const SPEED_COMMAND = /^<t (\d+) (-?\d+) [01]>$/;

// <t cab> asks after a loco without changing it.
const LOCO_QUESTION = /^<t (\d+)>$/;

// What just changed on the layout, in plain words, newest first. Everything
// here comes from the Command Station's broadcasts, so changes made by other
// Throttles show up too.
export const useEventsStore = defineStore('events', () => {
  const connection = useConnectionStore();
  const diagram = useDiagramStore();

  const events = ref<LayoutEvent[]>([]);
  let nextId = 0;

  // How far the operator has read: changes after this are new to them. Any
  // view of the log that is on screen marks what it shows as read, so the
  // strip's count and an Events panel agree.
  const readAt = ref(0);

  const unread = computed(
    () => events.value.filter((event) => event.at > readAt.value).length,
  );

  function markRead(): void {
    readAt.value = events.value[0]?.at ?? readAt.value;
  }

  // The last speed this browser asked for, per loco, so a broadcast that
  // disagrees can be put down to another Throttle.
  const requested = new Map<number, number>();

  // Locos this browser has just asked after: the answer says how the loco
  // already is, so it is not news.
  const asked = new Set<number>();

  // The last state the station reported for each turnout, output, sensor and
  // track. The first report after connecting (the answer to "what have you
  // got?") only sets the scene, and a report that repeats the state is not a
  // change either, so neither is logged.
  const last = new Map<string, unknown>();

  function changed(key: string, value: unknown): boolean {
    const known = last.has(key);
    const before = last.get(key);

    last.set(key, value);

    return known && before !== value;
  }

  function add(text: string): void {
    events.value = [
      { id: nextId++, at: Date.now(), text },
      ...events.value,
    ].slice(0, MAX_EVENTS);
  }

  connection.onSent((command) => {
    const match = SPEED_COMMAND.exec(command);

    if (match) {
      requested.set(Number(match[1]), Math.max(0, Number(match[2])));
    }

    const question = LOCO_QUESTION.exec(command);

    if (question) {
      asked.add(Number(question[1]));
    }
  });

  connection.onMessage((message) => {
    if (message.kind === 'turnout-detail') {
      changed(`turnout-${message.id}`, message.state);

      return;
    }

    if (message.kind === 'turnout') {
      if (changed(`turnout-${message.id}`, message.state)) {
        add(
          `Turnout ${message.id} ${message.state === TurnoutState.THROWN ? 'thrown' : 'closed'}`,
        );
      }

      return;
    }

    if (message.kind === 'output') {
      if (changed(`output-${message.id}`, message.active)) {
        add(`Output ${message.id} ${message.active ? 'on' : 'off'}`);
      }

      return;
    }

    if (message.kind === 'sensor') {
      if (changed(`sensor-${message.id}`, message.active)) {
        add(
          `${diagram.sensorName(message.id)} ${message.active ? 'occupied' : 'clear'}`,
        );
      }

      return;
    }

    if (message.kind === 'power') {
      const state = message.state === PowerState.ON ? 'on' : 'off';

      if (changed(`power-${message.track ?? 'all'}`, message.state)) {
        add(
          message.track
            ? `Track ${message.track} power ${state}`
            : `Track power ${state}`,
        );
      }

      return;
    }

    if (message.kind !== 'loco') {
      return;
    }

    const { address } = message.loco;
    const { speed, estop } = decodeSpeedByte(message.loco.speedByte);

    if (asked.delete(address)) {
      requested.set(address, speed);

      return;
    }

    if (estop) {
      add(`Loco ${address} emergency stopped`);
      requested.set(address, 0);

      return;
    }

    const before = requested.get(address);

    // A loco nobody here has driven yet only matters once it is moving.
    if (before === undefined ? speed > 0 : speed !== before) {
      add(`Loco ${address} set to ${speed} by another Throttle`);
      requested.set(address, speed);
    }
  });

  watch(
    () => connection.status,
    (status) => {
      if (status === 'disconnected') {
        events.value = [];
        readAt.value = 0;
        requested.clear();
        asked.clear();
        last.clear();
      }
    },
  );

  return { events, readAt, unread, markRead };
});
