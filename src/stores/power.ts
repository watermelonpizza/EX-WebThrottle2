import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

import { PowerState, powerOff, powerOn, powerTrack } from '@/core/protocol';
import { useConnectionStore } from '@/stores/connection';

export interface TrackPower {
  // Command-station letter (A–H), used to address this track.
  letter: string;
  // Human label from what the station says the track is wired as.
  name: string;
  on: boolean;
}

const TRACK_NAMES: Record<string, string> = {
  MAIN: 'Main',
  PROG: 'Programming',
  EXT: 'External',
  DC: 'DC',
  DCX: 'DC (inverted)',
  BOOST: 'Booster',
  NONE: 'Off',
};

function trackName(mode: string): string {
  return TRACK_NAMES[mode] ?? mode;
}

// Command station power: one master switch for every track plus the individual
// track outputs it reports. State is derived from the connection's decoded
// broadcasts, so the status bar always mirrors what the station last said.

export const usePowerStore = defineStore('power', () => {
  const connection = useConnectionStore();

  const master = ref(PowerState.OFF);
  const tracks = ref<TrackPower[]>([]);

  function track(letter: string): TrackPower {
    const existing = tracks.value.find((entry) => entry.letter === letter);

    if (existing) {
      return existing;
    }

    const added: TrackPower = { letter, name: 'Track', on: false };

    tracks.value.push(added);

    return added;
  }

  connection.onMessage((message) => {
    if (message.kind === 'track') {
      track(message.track.letter).name = trackName(message.track.mode);

      return;
    }

    if (message.kind !== 'power') {
      return;
    }

    const on = message.state === PowerState.ON;
    const letter = message.track;

    if (letter === undefined) {
      master.value = message.state;

      // A bare <p1>/<p0> switches every track the station reports.
      for (const entry of tracks.value) {
        entry.on = on;
      }

      return;
    }

    if (/^[A-H]$/.test(letter)) {
      track(letter).on = on;
    }
  });

  watch(
    () => connection.status,
    (status) => {
      if (status !== 'disconnected') {
        return;
      }

      master.value = PowerState.OFF;
      tracks.value = [];
    },
  );

  function setMaster(state: PowerState): void {
    connection.send(state === PowerState.ON ? powerOn() : powerOff());
  }

  function setTrack(letter: string, state: PowerState): void {
    connection.send(powerTrack(letter, state === PowerState.ON));
  }

  return { master, tracks, setMaster, setTrack };
});
