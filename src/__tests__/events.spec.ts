import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { useEventsStore } from '@/stores/events';
import { useLocosStore } from '@/stores/locos';

async function connect() {
  const connection = useConnectionStore();
  const events = useEventsStore();
  const locos = useLocosStore();
  const station = new MockTransport();

  await connection.connect(station);
  await flushPromises();

  return { connection, events, locos, station };
}

function texts(events: ReturnType<typeof useEventsStore>): string[] {
  return events.events.map((event) => event.text);
}

describe('events store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('puts turnout and sensor changes into plain words, newest first', async () => {
    const { events, station } = await connect();

    // The first reports after connecting only say how things are.
    station.receives('<H 2 0>');
    station.receives('<q 20>');
    await flushPromises();

    expect(events.events).toEqual([]);

    station.receives('<H 2 1>');
    station.receives('<Q 20>');
    // Repeating a state is not a change.
    station.receives('<Q 20>');
    await flushPromises();

    expect(texts(events)).toEqual(['Sensor 20 occupied', 'Turnout 2 thrown']);
  });

  it('credits a speed change to another Throttle only when this browser did not ask for it', async () => {
    const { events, locos, station } = await connect();

    locos.acquire(3);
    locos.setSpeed(3, 20);
    // The station echoes our own command: not news.
    // Forward speed n is sent as 129 + n (see core/protocol/speed.ts).
    station.receives('<l 3 0 149 0>');
    await flushPromises();

    expect(texts(events)).not.toContain('Loco 3 set to 20 by another Throttle');

    // Someone else then moves the same loco.
    station.receives('<l 3 0 169 0>');
    await flushPromises();

    expect(texts(events)[0]).toBe('Loco 3 set to 40 by another Throttle');
  });

  it('does not report the answer to asking after a loco', async () => {
    const { events, locos, station } = await connect();

    // Picking up a loco another Throttle has running asks for its state.
    locos.acquire(12);
    station.receives('<l 12 0 169 0>');
    await flushPromises();

    expect(events.events).toEqual([]);

    // Its next change is news.
    station.receives('<l 12 0 139 0>');
    await flushPromises();

    expect(texts(events)[0]).toBe('Loco 12 set to 10 by another Throttle');
  });

  it('reports an emergency stop and forgets everything on disconnect', async () => {
    const { connection, events, station } = await connect();

    station.receives('<l 5 0 129 0>');
    await flushPromises();

    expect(texts(events)[0]).toBe('Loco 5 emergency stopped');

    await connection.disconnect();

    expect(events.events).toEqual([]);
  });
});
