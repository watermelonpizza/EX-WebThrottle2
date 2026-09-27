import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';

import { PowerState, powerOff, powerOn, powerTrack } from '@/core/protocol';
import { useConnectionStore } from '@/stores/connection';

export type AllTracksState = 'on' | 'off' | 'mixed';

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
    const existing = tracks.value.find(entry => entry.letter === letter);

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

  // Every track at once. Once the station has listed its tracks, this is what
  // their own reports add up to; before that only a bare <p1>/<p0> says.
  const allTracks = computed<AllTracksState>(() => {
    if (tracks.value.length === 0) {
      return master.value === PowerState.ON ? 'on' : 'off';
    }

    const on = tracks.value.filter(entry => entry.on).length;

    if (on === 0) {
      return 'off';
    }

    return on === tracks.value.length ? 'on' : 'mixed';
  });

  function setMaster(state: PowerState): void {
    connection.send(state === PowerState.ON ? powerOn() : powerOff());
  }

  // Off while any track has power, on only when every track is off: when the
  // tracks disagree, cutting power is the safe way round.
  function toggleAll(): void {
    setMaster(allTracks.value === 'off' ? PowerState.ON : PowerState.OFF);
  }

  function setTrack(letter: string, state: PowerState): void {
    connection.send(powerTrack(letter, state === PowerState.ON));
  }

  // Only sends: the station's <p…> broadcast is what changes the switch.
  function toggleTrack(letter: string): void {
    const entry = tracks.value.find(candidate => candidate.letter === letter);

    setTrack(letter, entry?.on ? PowerState.OFF : PowerState.ON);
  }

  return {
    master,
    tracks,
    allTracks,
    setMaster,
    toggleAll,
    setTrack,
    toggleTrack,
  };
});
