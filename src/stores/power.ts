import { computed } from 'vue';
import { defineStore } from 'pinia';

import { PowerState, powerOff, powerOn, powerTrack } from '@/core/protocol';
import { useConnectionStore } from '@/stores/connection';

export interface TrackState {
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

  const master = computed(() => {
    const last = [...connection.messages]
      .reverse()
      .find(
        (message) => message.kind === 'power' && message.track === undefined,
      );

    return last?.kind === 'power' ? last.state : PowerState.OFF;
  });

  const tracks = computed<TrackState[]>(() => {
    const known = new Map<string, TrackState>();

    for (const message of connection.messages) {
      if (message.kind === 'track') {
        const letter = message.track.letter;

        known.set(letter, {
          letter,
          name: trackName(message.track.mode),
          on: known.get(letter)?.on ?? false,
        });
      } else if (message.kind === 'power' && message.track !== undefined) {
        if (/^[A-H]$/.test(message.track)) {
          const letter = message.track;

          known.set(letter, {
            letter,
            name: known.get(letter)?.name ?? 'Track',
            on: message.state === PowerState.ON,
          });
        }
      } else if (message.kind === 'power') {
        // A bare <p1>/<p0> switches every track the station reports.
        for (const track of known.values()) {
          track.on = message.state === PowerState.ON;
        }
      }
    }

    return [...known.values()];
  });

  function setMaster(state: PowerState): void {
    connection.send(state === PowerState.ON ? powerOn() : powerOff());
  }

  function setTrack(letter: string, state: PowerState): void {
    connection.send(powerTrack(letter, state === PowerState.ON));
  }

  return { master, tracks, setMaster, setTrack };
});
