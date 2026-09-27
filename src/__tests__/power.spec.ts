import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { PowerState } from '@/core/protocol';
import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';
import { usePowerStore } from '@/stores/power';

type PowerStore = ReturnType<typeof usePowerStore>;

// Two tracks listed, A on and B off: the switches disagree.
const MIXED = '<= A MAIN><= B PROG><pA><pb>';

describe('power store', () => {
  let connection: ReturnType<typeof useConnectionStore>;
  let power: PowerStore;
  let station: MockTransport;

  async function receive(frames: string): Promise<void> {
    station.receives(frames);
    await flushPromises();
  }

  beforeEach(async () => {
    setActivePinia(createPinia());
    connection = useConnectionStore();
    power = usePowerStore();
    station = new MockTransport();
    await connection.connect(station);
  });

  describe('before any power broadcast', () => {
    beforeEach(() => receive('<= A MAIN><= B PROG>'));

    it('assumes the master switch is off', () => {
      expect(power.master).toBe(PowerState.OFF);
    });

    it('lists every track as off', () => {
      expect(power.tracks).toEqual([
        { letter: 'A', name: 'Main', on: false },
        { letter: 'B', name: 'Programming', on: false },
      ]);
    });
  });

  describe('after <p1>', () => {
    beforeEach(() => receive('<= A MAIN><= B PROG><p1>'));

    it('turns the master switch on', () => {
      expect(power.master).toBe(PowerState.ON);
    });

    it('turns every track on', () => {
      expect(power.tracks.map(track => track.on)).toEqual([true, true]);
    });
  });

  describe('after <p1> then <pb>', () => {
    beforeEach(async () => {
      await receive('<= A MAIN><= B PROG><p1>');
      await receive('<pb>');
    });

    it('leaves the master switch on', () => {
      expect(power.master).toBe(PowerState.ON);
    });

    it('turns only track B off', () => {
      expect(power.tracks).toEqual([
        { letter: 'A', name: 'Main', on: true },
        { letter: 'B', name: 'Programming', on: false },
      ]);
    });
  });

  describe('with an unusual track list', () => {
    beforeEach(() => receive('<= C CUSTOM><p1 Z><pC><p1><p0>'));

    it('names a track in a mode it does not know by the mode', () => {
      expect(power.tracks[0]?.name).toBe('CUSTOM');
    });

    it('ignores power for an invalid track letter', () => {
      expect(power.tracks.map(track => track.letter)).toEqual(['C']);
    });
  });

  it('forgets the tracks on disconnect', async () => {
    await receive('<= A MAIN><p1>');
    await connection.disconnect();

    expect(power.tracks).toEqual([]);
  });

  it.each([
    {
      state: 'on',
      when: 'only the bare broadcast has arrived',
      frames: '<p1>',
    },
    { state: 'mixed', when: 'the tracks disagree', frames: MIXED },
    {
      state: 'off',
      when: 'every track is off',
      frames: '<= A MAIN><= B PROG><p0>',
    },
    {
      state: 'on',
      when: 'every track is on',
      frames: '<= A MAIN><= B PROG><p1>',
    },
  ])('shows all tracks as $state when $when', async ({ state, frames }) => {
    await receive(frames);

    expect(power.allTracks).toBe(state);
  });

  it.each([
    { command: '<0>', when: 'the tracks disagree', frames: MIXED },
    {
      command: '<1>',
      when: 'every track is off',
      frames: '<= A MAIN><= B PROG><p0>',
    },
  ])(
    'sends $command from the all-tracks switch when $when',
    async ({ command, frames }) => {
      await receive(frames);
      power.toggleAll();

      expect(station.sent.at(-1)).toBe(command);
    },
  );

  it.each([
    { track: 'A', command: '<0 A>', last: 'on' },
    { track: 'B', command: '<1 B>', last: 'off' },
  ])(
    'toggles track $track, last reported $last, with $command',
    async ({ track, command }) => {
      await receive(MIXED);
      power.toggleTrack(track);

      expect(station.sent.at(-1)).toBe(command);
    },
  );

  it.each<{ command: string; target: string; send: (power: PowerStore) => void }>([
    { command: '<1>', target: 'every track on', send: store => store.setMaster(PowerState.ON) },
    { command: '<0>', target: 'every track off', send: store => store.setMaster(PowerState.OFF) },
    { command: '<1 A>', target: 'track A on', send: store => store.setTrack('A', PowerState.ON) },
    { command: '<0 A>', target: 'track A off', send: store => store.setTrack('A', PowerState.OFF) },
  ])('sends $command to turn $target', ({ command, send }) => {
    send(power);

    expect(station.sent.at(-1)).toBe(command);
  });
});
