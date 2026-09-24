import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';

import { Direction } from '@/core/protocol';
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
        direction: Direction.FORWARD,
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
    expect(emulator.sent).toEqual(['<s>', '<=>', '<t 3>', '<t 4>', '<t 3>']);
  });

  it('reconciles speed, direction and functions from broadcasts', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    locos.acquire(3);

    await broadcast(emulator, '<l 3 0 134 5>\n');

    expect(locos.throttles[0]).toEqual(
      expect.objectContaining({
        speed: 5,
        direction: Direction.FORWARD,
        estop: false,
      }),
    );
    expect(locos.throttles[0].functions[0]).toBe(true);
    expect(locos.throttles[0].functions[2]).toBe(true);
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
    locos.setDirection(3, Direction.REVERSE);
    locos.emergencyStop(3);

    expect(emulator.sent).toContain('<t 3 12 1>');
    expect(emulator.sent).toContain('<t 3 12 0>');
    expect(emulator.sent).toContain('<t 3 -1 0>');

    const throttle = locos.throttles[0];

    expect(throttle.speed).toBe(0);
    expect(throttle.estop).toBe(true);
    expect(throttle.direction).toBe(Direction.REVERSE);
  });

  it('toggles and sets functions with native function commands', async () => {
    const { emulator } = await connectedSetup();
    const locos = useLocosStore();

    locos.acquire(3);
    locos.toggleFunction(3, 0);

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

    expect(JSON.parse(localStorage.getItem('exwt-roster') ?? '[]')).toEqual([
      expect.objectContaining({ address: 42, name: 'Flying Scotsman' }),
    ]);

    locos.acquire(42);

    expect(locos.throttles[0].name).toBe('Flying Scotsman');
    expect(emulator.sent).toContain('<t 42>');

    locos.removeLoco(42);
    expect(locos.roster).toEqual([]);
  });
});
