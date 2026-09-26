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
    const power = usePowerStore();
    const station = new MockTransport();

    await connection.connect(station);
    station.receives('<= A MAIN><= B PROG>');

    expect(power.master).toBe(PowerState.OFF);
    expect(power.tracks).toEqual([
      { letter: 'A', name: 'Main', on: false },
      { letter: 'B', name: 'Programming', on: false },
    ]);
  });

  it('tracks master and per-track power from broadcasts', async () => {
    const connection = useConnectionStore();
    const power = usePowerStore();

    const station = new MockTransport();

    await connection.connect(station);
    station.receives('<= A MAIN><= B PROG>');

    station.receives('<p1>');
    await flushPromises();

    expect(power.master).toBe(PowerState.ON);
    expect(power.tracks.map((track) => track.on)).toEqual([true, true]);

    station.receives('<pb>');
    await flushPromises();

    expect(power.master).toBe(PowerState.ON);
    expect(power.tracks).toEqual([
      { letter: 'A', name: 'Main', on: true },
      { letter: 'B', name: 'Programming', on: false },
    ]);
  });

  it('keeps unknown modes and ignores invalid track letters', async () => {
    const connection = useConnectionStore();
    const power = usePowerStore();
    const station = new MockTransport();

    await connection.connect(station);
    station.receives('<= C CUSTOM><p1 Z><pC><p1><p0>');
    await flushPromises();

    expect(power.tracks[0]).toEqual({
      letter: 'C',
      name: 'CUSTOM',
      on: false,
    });
  });

  it('clears power state after disconnect and sends off commands', async () => {
    const connection = useConnectionStore();
    const power = usePowerStore();
    const station = new MockTransport();

    await connection.connect(station);
    station.receives('<= A MAIN><p1>');
    await flushPromises();
    power.setMaster(PowerState.OFF);
    power.setTrack('A', PowerState.ON);
    await connection.disconnect();

    expect(station.sent).toContain('<0>');
    expect(station.sent).toContain('<1 A>');
    expect(power.tracks).toEqual([]);
  });

  it('adds the tracks up for the all-tracks switch, cutting power when they disagree', async () => {
    const connection = useConnectionStore();
    const power = usePowerStore();
    const station = new MockTransport();

    await connection.connect(station);

    // Before the tracks are listed, only the bare broadcast says.
    station.receives('<p1>');
    await flushPromises();
    expect(power.allTracks).toBe('on');

    station.receives('<= A MAIN><= B PROG><pA><pb>');
    await flushPromises();
    expect(power.allTracks).toBe('mixed');

    power.toggleAll();
    expect(station.sent.at(-1)).toBe('<0>');

    station.receives('<p0>');
    await flushPromises();
    expect(power.allTracks).toBe('off');

    power.toggleAll();
    expect(station.sent.at(-1)).toBe('<1>');

    station.receives('<p1>');
    await flushPromises();
    expect(power.allTracks).toBe('on');
  });

  it('toggles one track to the opposite of what the station last reported', async () => {
    const connection = useConnectionStore();
    const power = usePowerStore();
    const station = new MockTransport();

    await connection.connect(station);
    station.receives('<= A MAIN><= B PROG><pA><pb>');
    await flushPromises();

    power.toggleTrack('A');
    expect(station.sent.at(-1)).toBe('<0 A>');

    power.toggleTrack('B');
    expect(station.sent.at(-1)).toBe('<1 B>');
  });

  it('sends the right commands for master and track switches', async () => {
    const connection = useConnectionStore();
    const power = usePowerStore();
    const emulator = new MockTransport();

    await connection.connect(emulator);

    power.setMaster(PowerState.ON);
    power.setTrack('A', PowerState.OFF);

    expect(emulator.sent).toContain('<1>');
    expect(emulator.sent).toContain('<0 A>');
  });
});
