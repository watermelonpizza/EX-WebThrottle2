import { column, panel, row } from './layout';
import type { Preset } from './types';

// The diagram with the EXRAIL routes and automations under it, so they sit in
// the same place on every preset that shows the layout.
const diagram = column(
  [panel('schematic'), 3],
  [row([panel('routes'), 1], [panel('automations'), 1]), 1],
);

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
      [diagram, 2],
      [
        column(
          [panel('points'), 3],
          [panel('outputs'), 2],
          [panel('sensors'), 2],
        ),
        1,
      ],
    ),
  },
  {
    id: 'control',
    label: 'Control',
    // The diagram takes about two thirds, the loco desk the rest.
    layout: row([diagram, 65], [panel('throttles'), 35]),
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
    PRESETS.find(preset => preset.id === id)
    ?? (PRESETS.find(preset => preset.id === DEFAULT_PRESET) as Preset)
  );
}
