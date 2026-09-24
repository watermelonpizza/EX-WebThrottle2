export interface FunctionDef {
  // 0..31 — the 32 flag bits a command station packs into the <l> broadcast
  // (RCN-212 function range). Higher functions exist on the wire via <F>, but
  // the broadcast only reflects 0..31, so that is what a map covers.
  fn: number;
  label: string;
  // Momentary functions follow the "press and hold" DCC behaviour (horn,
  // whistle) and are released by pointer-up rather than toggled.
  momentary: boolean;
}

export const DEFAULT_FUNCTIONS: FunctionDef[] = [
  { fn: 0, label: 'Headlight', momentary: false },
  { fn: 1, label: 'Bell', momentary: false },
  { fn: 2, label: 'Horn', momentary: true },
];

for (let fn = 3; fn <= 31; fn++) {
  DEFAULT_FUNCTIONS.push({ fn, label: `F${fn}`, momentary: false });
}

// The loco state broadcast reports all 32 function flags in one bitmask.
export function decodeFunctionMap(functionMap: number): boolean[] {
  const states = new Array<boolean>(32).fill(false);

  for (let fn = 0; fn < 32; fn++) {
    states[fn] = ((functionMap >> fn) & 1) !== 0;
  }

  return states;
}
