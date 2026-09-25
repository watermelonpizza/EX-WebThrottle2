import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { TurnoutState } from '@/core/protocol';
import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { useInventoryStore } from '@/stores/inventory';

async function connect() {
  const connection = useConnectionStore();
  const inventory = useInventoryStore();
  const station = new MockTransport();

  await connection.connect(station);
  await flushPromises();

  return { connection, inventory, station };
}

describe('inventory store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('asks the station what it has as soon as it is connected', async () => {
    const { station } = await connect();

    expect(station.sent).toContain('<JT>');
    expect(station.sent).toContain('<Z>');
    expect(station.sent).toContain('<Q>');
  });

  it('builds the turnout list and asks each one for its description', async () => {
    const { inventory, station } = await connect();

    station.receives('<jT 1 2>');
    await flushPromises();

    expect(station.sent).toContain('<JT 1>');
    expect(station.sent).toContain('<JT 2>');
    expect(inventory.turnouts.map((turnout) => turnout.id)).toEqual([1, 2]);

    station.receives('<jT 1 C "Yard entry"><jT 2 T "">');
    await flushPromises();

    expect(inventory.turnouts).toEqual([
      { id: 1, label: 'Yard entry', state: TurnoutState.CLOSED },
      { id: 2, label: '', state: TurnoutState.THROWN },
    ]);
  });

  it('follows turnout broadcasts and forgets turnouts the station drops', async () => {
    const { inventory, station } = await connect();

    station.receives('<jT 1 2>');
    station.receives('<H 1 1>');
    await flushPromises();

    expect(inventory.turnouts[0]?.state).toBe(TurnoutState.THROWN);

    station.receives('<jT 2>');
    await flushPromises();

    expect(inventory.turnouts.map((turnout) => turnout.id)).toEqual([2]);
  });

  it('reads output and sensor state from the station', async () => {
    const { inventory, station } = await connect();

    station.receives('<Y 11 101 0 0><Y 10 100 0 1><q 20><Q 21>');
    await flushPromises();

    expect(inventory.outputs).toEqual([
      { id: 10, active: true },
      { id: 11, active: false },
    ]);
    expect(inventory.sensors).toEqual([
      { id: 20, active: false },
      { id: 21, active: true },
    ]);

    station.receives('<Y 10 0>');
    await flushPromises();

    expect(inventory.outputs[0]?.active).toBe(false);
  });

  it('switches turnouts and outputs to the opposite of the state it knows', async () => {
    const { inventory, station } = await connect();

    station.receives('<jT 1><jT 1 C ""><Y 10 100 0 0>');
    await flushPromises();

    inventory.toggleTurnout(1);
    inventory.toggleOutput(10);

    expect(station.sent).toContain('<T 1 T>');
    expect(station.sent).toContain('<Z 10 1>');
  });

  it('forgets everything when the connection goes away', async () => {
    const { connection, inventory, station } = await connect();

    station.receives('<jT 1><jT 1 C ""><Y 10 100 0 0><q 20>');
    await flushPromises();

    await connection.disconnect();
    await flushPromises();

    expect(inventory.turnouts).toEqual([]);
    expect(inventory.outputs).toEqual([]);
    expect(inventory.sensors).toEqual([]);
  });
});
