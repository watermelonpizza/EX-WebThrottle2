import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { useLocosStore } from '@/stores/locos';

describe('locos store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  async function connectedSetup() {
    const connection = useConnectionStore();
    const emulator = new MockTransport();

    await connection.connect(emulator);

    return { connection, emulator };
  }

  async function broadcast(
    emulator: MockTransport,
    text: string,
  ): Promise<void> {
    emulator.receives(text);
    await flushPromises();
    await nextTick();
  }

  it('starts with an empty roster and no throttles', () => {
    const locos = useLocosStore();

    expect(locos.roster).toEqual([]);
    expect(locos.throttles).toEqual([]);
  });

  it('acquires a cab and asks the command station for its state', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    locos.acquire(3);

    expect(emulator.sent).toContain('<t 3>');
    expect(locos.throttles).toEqual([
      expect.objectContaining({
        address: 3,
        name: 'Loco 3',
        speed: 0,
        forward: true,
        functions: new Array(32).fill(false),
      }),
    ]);
  });

  it('re-acquiring an active cab only refreshes its state', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    locos.acquire(3);
    locos.acquire(4);
    locos.acquire(3);

    expect(locos.throttles).toHaveLength(2);
    expect(emulator.sent).toEqual([
      '<s>',
      '<=>',
      '<D CABS>',
      '<t 3>',
      '<t 4>',
      '<t 3>',
    ]);
  });

  it('reconciles repeated broadcasts and ignores commands for unknown cabs', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    await broadcast(emulator, '<l 9 0 2 0>');
    locos.setSpeed(9, 10);
    locos.setForward(9, false);
    locos.emergencyStop(9);
    locos.setFunction(9, 0, true);
    locos.setMap(9, 'missing');

    expect(locos.throttles).toEqual([]);
  });

  it('reconciles speed, direction and functions from broadcasts', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    locos.acquire(3);

    await broadcast(emulator, '<l 3 0 134 5>\n');

    expect(locos.throttles[0]).toEqual(
      expect.objectContaining({
        speed: 5,
        forward: true,
        estop: false,
      }),
    );
    expect(locos.throttles[0].functions[0]).toBe(true);
    expect(locos.throttles[0].functions[2]).toBe(true);

    await broadcast(emulator, '<l 3 0 23 0>\n');
    expect(locos.throttles[0]?.forward).toBe(false);
    expect(locos.throttles[0]?.speed).toBe(22);
  });

  it('ignores broadcasts for locos that are not being driven', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    await broadcast(emulator, '<l 9 0 2 0>\n');

    expect(locos.throttles).toEqual([]);
  });

  it('releases a cab and frees its command-station slot', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    locos.acquire(3);
    locos.release(3);

    expect(locos.throttles).toEqual([]);
    expect(emulator.sent).toContain('<- 3>');
  });

  it('sends speed and direction as native throttle commands', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    locos.acquire(3);
    locos.setSpeed(3, 12);
    locos.setForward(3, false);
    locos.emergencyStop(3);

    expect(emulator.sent).toContain('<t 3 12 1>');
    expect(emulator.sent).toContain('<t 3 12 0>');
    expect(emulator.sent).toContain('<t 3 -1 0>');

    const throttle = locos.throttles[0];

    expect(throttle.speed).toBe(0);
    expect(throttle.estop).toBe(true);
    expect(throttle.forward).toBe(false);
  });

  it('sets functions with native function commands', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    locos.acquire(3);
    locos.setFunction(3, 0, true);

    expect(emulator.sent).toContain('<F 3 0 1>');
    expect(locos.throttles[0].functions[0]).toBe(true);

    locos.setFunction(3, 0, false);

    expect(emulator.sent).toContain('<F 3 0 0>');
    expect(locos.throttles[0].functions[0]).toBe(false);
  });

  it('clears all throttles when the connection drops', async () => {
    const { connection } = await connectedSetup();
    const locos = useLocosStore();

    locos.acquire(3);
    await connection.disconnect();

    await nextTick();

    expect(locos.throttles).toEqual([]);
  });

  it('persists saved locos and reuses their name and map', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    locos.saveLoco(42, 'Flying Scotsman');
    locos.saveLoco(42, 'Updated Scotsman', 'shunter');

    expect(JSON.parse(localStorage.getItem('exwt-roster') ?? '[]')).toEqual([
      expect.objectContaining({ address: 42, name: 'Updated Scotsman' }),
    ]);

    locos.acquire(42);

    expect(locos.throttles[0].name).toBe('Updated Scotsman');
    locos.setMap(42, 'default');
    expect(locos.roster[0]?.mapId).toBe('default');
    expect(emulator.sent).toContain('<t 42>');

    locos.removeLoco(42);
    expect(locos.roster).toEqual([]);
  });

  it('drives by address, saving a named loco but never renaming a saved one', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    locos.saveLoco(12, 'Shunter');
    locos.drive(7, '  Yard pilot ');
    locos.drive(12, 'Something else');
    locos.drive(9);

    expect(emulator.sent).toEqual(
      expect.arrayContaining(['<t 7>', '<t 12>', '<t 9>']),
    );
    expect(locos.roster).toEqual([
      { address: 12, name: 'Shunter', mapId: 'default' },
      { address: 7, name: 'Yard pilot', mapId: 'default' },
    ]);
  });

  it('lists saved locos not yet on a desk, and the desks that are moving', async () => {
    await connectedSetup();
    const locos = useLocosStore();

    locos.saveLoco(3, 'Class 37');
    locos.saveLoco(8, 'Shunter');
    locos.acquire(3);
    locos.acquire(4);
    locos.setSpeed(4, 20);

    expect(locos.savedNotDriven.map((loco) => loco.address)).toEqual([8]);
    expect(locos.movingHere.map((throttle) => throttle.address)).toEqual([4]);
  });

  it('names locos moving on the layout from the saved list where it can', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    locos.saveLoco(12, 'Shunter');
    await broadcast(emulator, '<l 12 0 169 0><l 14 0 23 0>');

    expect(
      locos.moving.map(({ address, name, forward }) => [
        address,
        name,
        forward,
      ]),
    ).toEqual([
      [12, 'Shunter', true],
      [14, 'Loco 14', false],
    ]);
  });

  it('stops every loco on the layout with one command', async () => {
    const connection = useConnectionStore();
    const locos = useLocosStore();
    const station = new MockTransport();

    await connection.connect(station);
    locos.acquire(3);
    locos.acquire(8);
    locos.setSpeed(3, 40);
    locos.stopAll();

    expect(station.sent.at(-1)).toBe('<!>');
    expect(
      locos.throttles.every(
        (throttle) => throttle.estop && throttle.speed === 0,
      ),
    ).toBe(true);
  });

  it('finds the locos other Throttles are running and drives them all at once', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    // Asked on connecting; the answer's addresses are then asked after.
    expect(emulator.sent).toContain('<D CABS>');

    await broadcast(
      emulator,
      '<* LocoSlots 2/120 size=56b\n Loco=14 s=23 f=0\n Loco=12 s=169 f=0\n*>',
    );

    expect(emulator.sent).toContain('<t 14>');
    expect(emulator.sent).toContain('<t 12>');

    // Loco 12 forward at 40 (129 + 40), loco 14 reverse at 22 (1 + 22), and
    // loco 5 stopped.
    await broadcast(emulator, '<l 12 0 169 0><l 14 0 23 0><l 5 0 128 0>');

    expect(locos.moving.map((loco) => loco.address)).toEqual([12, 14]);
    expect(locos.throttles).toEqual([]);

    locos.acquireAll(locos.moving.map((loco) => loco.address));

    expect(
      locos.throttles.map((throttle) => [throttle.address, throttle.speed]),
    ).toEqual([
      [12, 40],
      [14, 22],
    ]);
    expect(locos.throttles[1]?.forward).toBe(false);
    // Driving them here takes them out of the list of locos to pick up.
    expect(locos.moving).toEqual([]);
  });
});
