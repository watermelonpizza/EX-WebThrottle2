import { column, panel, row } from './layout';
import type { Preset } from './types';

// One preset per operating job. Weights are relative shares; each panel picks
// its own size variant from the room it is given.
export const PRESETS: Preset[] = [
  {
    id: 'drive',
    label: 'Drive',
    layout: panel('throttles'),
  },
  {
    id: 'points',
    label: 'Points',
    // The diagram, then a column of lists: points first as the ones worked
    // most, then the outputs and sensors a layout usually has fewer of.
    layout: row(
      [panel('schematic'), 2],
      [column([panel('points'), 3], [panel('outputs'), 2], [panel('sensors'), 2]), 1],
    ),
  },
  {
    id: 'control',
    label: 'Control',
    // The schematic takes about two thirds, the loco desk the rest.
    layout: row([panel('schematic'), 65], [panel('throttles'), 35]),
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    layout: row([panel('traffic'), 1], [panel('commands'), 1]),
  },
];

export const DEFAULT_PRESET = 'control';

export function findPreset(id: string): Preset {
  return (
    PRESETS.find((preset) => preset.id === id) ??
    (PRESETS.find((preset) => preset.id === DEFAULT_PRESET) as Preset)
  );
}
