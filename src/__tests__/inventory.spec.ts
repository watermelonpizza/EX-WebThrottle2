import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { useInventoryStore } from '@/stores/inventory';

type InventoryStore = ReturnType<typeof useInventoryStore>;

describe('inventory store', () => {
  let connection: ReturnType<typeof useConnectionStore>;
  let inventory: InventoryStore;
  let station: MockTransport;

  async function receive(frames: string): Promise<void> {
    station.receives(frames);
    await flushPromises();
  }

  beforeEach(async () => {
    setActivePinia(createPinia());
    connection = useConnectionStore();
    inventory = useInventoryStore();
    station = new MockTransport();
    await connection.connect(station);
    await flushPromises();
  });

  it.each(['<JT>', '<Z>', '<Q>'])('asks the station for %s as soon as it is connected', (command) => {
    expect(station.sent).toContain(command);
  });

  describe('when the station lists turnouts 1 and 2', () => {
    beforeEach(() => receive('<jT 1 2>'));

    it('lists them', () => {
      expect(inventory.turnouts.map(turnout => turnout.id)).toEqual([1, 2]);
    });

    it.each(['<JT 1>', '<JT 2>'])('asks for each one\'s description with %s', (command) => {
      expect(station.sent).toContain(command);
    });

    it('fills in their descriptions and positions from the replies', async () => {
      await receive('<jT 1 C "Yard entry"><jT 2 T "">');

      expect(inventory.turnouts).toEqual([
        { id: 1, label: 'Yard entry', thrown: false },
        { id: 2, label: '', thrown: true },
      ]);
    });

    it('follows a turnout broadcast', async () => {
      await receive('<H 1 1>');

      expect(inventory.turnouts[0]?.thrown).toBe(true);
    });

    it('forgets a turnout the station drops from its list', async () => {
      await receive('<jT 2>');

      expect(inventory.turnouts.map(turnout => turnout.id)).toEqual([2]);
    });
  });

  describe('with turnout 1 first reported thrown', () => {
    beforeEach(() => receive('<jT 1><H 1 1>'));

    it('does not count the first report as a move', () => {
      expect(inventory.turnouts[0]?.movedAt).toBeUndefined();
    });

    it('does not count the same position reported again as a move', async () => {
      await receive('<H 1 1>');

      expect(inventory.turnouts[0]?.movedAt).toBeUndefined();
    });

    it('notes when the points move', async () => {
      await receive('<H 1 0>');

      expect(inventory.turnouts[0]?.movedAt).toEqual(expect.any(Number));
    });
  });

  describe('with outputs and sensors reported', () => {
    beforeEach(() => receive('<Y 11 101 0 0><Y 10 100 0 1><q 20><Q 21>'));

    it('lists the outputs in order with their state', () => {
      expect(inventory.outputs).toEqual([
        { id: 10, active: true },
        { id: 11, active: false },
      ]);
    });

    it('lists the sensors in order with their state', () => {
      expect(inventory.sensors).toEqual([
        { id: 20, active: false },
        { id: 21, active: true },
      ]);
    });

    it('follows an output change', async () => {
      await receive('<Y 10 0>');

      expect(inventory.outputs[0]?.active).toBe(false);
    });
  });

  it.each<{ item: string; command: string; toggle: (store: InventoryStore) => void }>([
    { item: 'a turnout', command: '<T 999 T>', toggle: store => store.toggleTurnout(999) },
    { item: 'an output', command: '<Z 999 1>', toggle: store => store.toggleOutput(999) },
  ])('does not switch $item the station has not reported', ({ command, toggle }) => {
    toggle(inventory);

    expect(station.sent).not.toContain(command);
  });

  describe('with turnout 1 closed and output 10 off', () => {
    beforeEach(() => receive('<jT 1><jT 1 C ""><Y 10 100 0 0>'));

    it.each<{ action: string; command: string; toggle: (store: InventoryStore) => void }>([
      { action: 'throws the turnout', command: '<T 1 T>', toggle: store => store.toggleTurnout(1) },
      { action: 'turns the output on', command: '<Z 10 1>', toggle: store => store.toggleOutput(10) },
    ])('$action with $command', ({ command, toggle }) => {
      toggle(inventory);

      expect(station.sent).toContain(command);
    });
  });

  describe('when the connection goes away', () => {
    beforeEach(async () => {
      await receive('<jT 1><jT 1 C ""><Y 10 100 0 0><q 20>');
      await connection.disconnect();
      await flushPromises();
    });

    it.each(['turnouts', 'outputs', 'sensors'] as const)('forgets the %s', (list) => {
      expect(inventory[list]).toEqual([]);
    });
  });
});
