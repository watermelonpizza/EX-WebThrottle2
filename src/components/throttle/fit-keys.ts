// The room a loco desk measured for its function keys, in pixels.
export interface KeyRoom {
  // Height left for the key grid, from its top to the desk's padding.
  available: number;
  rowGap: number;
  columns: number;
  // Row heights with keys a control high (roomy) or a touch target high.
  roomy: number;
  compact: number;
}

export interface KeyFit {
  tight: boolean;
  // How many keys to show; undefined shows them all.
  limit: number | undefined;
}

// How many function keys fit in whole rows. A sliced half-row must never be
// the only sign that more functions exist, so the desk shows complete rows and
// offers the full list when some are left out. Keys are a control high when
// the whole set fits that way, and a touch target high (tight) when it would
// not. Undefined means the grid could not be measured yet.
export function fitKeys(room: KeyRoom, count: number): KeyFit | undefined {
  if (!room.columns || !room.roomy || !room.compact) {
    return undefined;
  }

  const rows = (height: number) =>
    Math.max(
      0,
      Math.floor((room.available + room.rowGap) / (height + room.rowGap)),
    );

  if (rows(room.roomy) * room.columns >= count) {
    return { tight: false, limit: undefined };
  }

  const fit = rows(room.compact) * room.columns;

  return { tight: true, limit: fit >= count ? undefined : fit };
}
