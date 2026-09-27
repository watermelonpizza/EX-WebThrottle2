import type { TurnoutEntry } from '@/stores/inventory';

// Real points take a moment to move, so a drawn turnout changes over the same
// way: the new route flashes off and on three times, then stays lit. The
// drawing starts this whenever the Command Station reports a move, from this
// Throttle or any other, even when the station reports it instantly.
export const CHANGEOVER_MS = 2400;
export const CHANGEOVER_FLASHES = 3;

export function changingOver(turnout: TurnoutEntry | undefined): boolean {
  return (
    turnout?.movedAt !== undefined
    && Date.now() - turnout.movedAt < CHANGEOVER_MS
  );
}

// Handed to CSS, so the flash and the script share one timing.
export const CHANGEOVER_STYLE = {
  '--changeover-flash': `${CHANGEOVER_MS / CHANGEOVER_FLASHES}ms`,
  '--changeover-flashes': CHANGEOVER_FLASHES,
};
