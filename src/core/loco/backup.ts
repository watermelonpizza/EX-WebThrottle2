import { parseAddress } from './address';
import type { FunctionDef } from './functions';

// A loco saved in this browser. Type, brand and decoder are only for the
// owner's own reference, as in WebThrottle-EX.
export interface SavedLoco {
  address: number;
  name: string;
  mapId: string;
  type?: string;
  brand?: string;
  decoder?: string;
}

// A function map: the functions a loco has. One it does not list is one the
// loco lacks, so its desk leaves it out.
export interface SavedMap {
  id: string;
  name: string;
  functions: FunctionDef[];
}

export interface Backup {
  locos: SavedLoco[];
  maps: SavedMap[];
}

// Names this app's own backup files, so one is known when it comes back.
const BACKUP_APP = 'EX-WebThrottle';
const BACKUP_FORMAT = 1;

// F0–F31, the functions the loco broadcast carries.
const MAX_FUNCTION = 31;

export function writeBackup(backup: Backup): string {
  return JSON.stringify(
    { app: BACKUP_APP, format: BACKUP_FORMAT, ...backup },
    null,
    2,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// A file is only ever read, never run, but it can hold anything: every entry
// is checked, and one that does not make sense is left out.
function readLoco(value: unknown): SavedLoco | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const address = parseAddress(String(value.address));
  const name = text(value.name);

  if (address === undefined || !name) {
    return undefined;
  }

  return {
    address,
    name,
    mapId: text(value.mapId) ?? 'default',
    type: text(value.type),
    brand: text(value.brand),
    decoder: text(value.decoder),
  };
}

function readFunction(value: unknown): FunctionDef | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { fn } = value;

  if (typeof fn !== 'number' || !Number.isInteger(fn) || fn < 0 || fn > MAX_FUNCTION) {
    return undefined;
  }

  return {
    fn,
    label: text(value.label) ?? `F${fn}`,
    momentary: value.momentary === true,
    hidden: value.hidden === true,
  };
}

function readMap(value: unknown): SavedMap | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = text(value.id);
  const name = text(value.name);

  if (!id || !name) {
    return undefined;
  }

  return {
    id,
    name,
    functions: list(value.functions)
      .map(readFunction)
      .filter(def => def !== undefined),
  };
}

// WebThrottle-EX keeps a map as { mname, fnData: { f0: [state, momentary,
// label, shown], … } } and a loco as { name, cv, type, brand, decoder, map },
// where cv is the address and map the map's name (storageController.js).
function readLegacyMap(value: unknown, index: number): SavedMap | undefined {
  if (!isRecord(value) || !isRecord(value.fnData)) {
    return undefined;
  }

  const name = text(value.mname);

  if (!name) {
    return undefined;
  }

  const functions: FunctionDef[] = [];

  for (const [key, entry] of Object.entries(value.fnData)) {
    const fn = Number(/^f(\d+)$/.exec(key)?.[1]);

    if (!Number.isInteger(fn) || fn > MAX_FUNCTION || !Array.isArray(entry)) {
      continue;
    }

    const label = text(entry[2]);

    // WebThrottle-EX only showed a key with a label that was marked shown.
    functions.push({
      fn,
      label: label ?? `F${fn}`,
      momentary: Number(entry[1]) === 1,
      hidden: Number(entry[3]) !== 1 || !label,
    });
  }

  return {
    id: `legacy-${index}`,
    name,
    functions: functions.sort((first, second) => first.fn - second.fn),
  };
}

// AppData.json is [{ maps }, { locos }, { preferences }]; each section is
// found by its name, and either can be null.
function section(sections: unknown[], name: 'maps' | 'locos'): unknown[] {
  const found = sections.find(entry => isRecord(entry) && name in entry);

  return isRecord(found) ? list(found[name]) : [];
}

function readLegacy(sections: unknown[]): Backup {
  const maps = section(sections, 'maps')
    .map(readLegacyMap)
    .filter(map => map !== undefined);

  const locos = section(sections, 'locos')
    .map((value) => {
      if (!isRecord(value)) {
        return undefined;
      }

      const map = maps.find(candidate => candidate.name === text(value.map));

      return readLoco({ ...value, address: value.cv, mapId: map?.id });
    })
    .filter(loco => loco !== undefined);

  return { locos, maps };
}

// This app's own backup, or the AppData.json WebThrottle-EX exports, so people
// can bring their locos and maps over when they switch. Undefined for a file
// that is neither.
export function readBackup(file: string): Backup | undefined {
  let parsed: unknown;

  try {
    parsed = JSON.parse(file);
  } catch {
    return undefined;
  }

  if (isRecord(parsed) && parsed.app === BACKUP_APP) {
    return {
      locos: list(parsed.locos).map(readLoco).filter(loco => loco !== undefined),
      maps: list(parsed.maps).map(readMap).filter(map => map !== undefined),
    };
  }

  if (Array.isArray(parsed) && parsed.some(entry => isRecord(entry) && ('maps' in entry || 'locos' in entry))) {
    return readLegacy(parsed);
  }

  return undefined;
}
