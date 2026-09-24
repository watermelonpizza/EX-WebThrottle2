import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { PowerState } from '@/core/protocol';
import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { usePowerStore } from '@/stores/power';

describe('power store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('assumes everything off until broadcasts arrive', async () => {
    const connection = useConnectionStore();
    await connection.connect(new MockTransport());
    const power = usePowerStore();

    expect(power.master).toBe(PowerState.OFF);
    expect(power.tracks).toEqual([
      { letter: 'A', name: 'Main', on: false },
      { letter: 'B', name: 'Programming', on: false },
    ]);
  });

  it('tracks master and per-track power from broadcasts', async () => {
    const connection = useConnectionStore();
    await connection.connect(new MockTransport());
    const power = usePowerStore();

    connection.send('<1>');
    await flushPromises();

    expect(power.master).toBe(PowerState.ON);
    expect(power.tracks.map((track) => track.on)).toEqual([true, true]);

    connection.send('<0 B>');
    await flushPromises();

    expect(power.master).toBe(PowerState.ON);
    expect(power.tracks).toEqual([
      { letter: 'A', name: 'Main', on: true },
      { letter: 'B', name: 'Programming', on: false },
    ]);
  });

  it('sends the right commands for master and track switches', async () => {
    const connection = useConnectionStore();
    const emulator = new MockTransport();
    await connection.connect(emulator);
    const power = usePowerStore();

    power.setMaster(PowerState.ON);
    power.setTrack('A', PowerState.OFF);

    expect(emulator.sent).toContain('<1>');
    expect(emulator.sent).toContain('<0 A>');
  });
});
