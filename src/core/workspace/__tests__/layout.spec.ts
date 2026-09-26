import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PRESET,
  PRESETS,
  column,
  findPreset,
  isLayoutNode,
  panel,
  panelsIn,
  row,
} from '../index';

describe('workspace layout', () => {
  it('lists panels in reading order, left to right then top to bottom', () => {
    const layout = row(
      [panel('schematic'), 2],
      [column([panel('points'), 1], [panel('sensors'), 1]), 1],
    );

    expect(panelsIn(layout).map((node) => node.kind)).toEqual([
      'schematic',
      'points',
      'sensors',
    ]);
  });

  it('accepts a well-formed saved layout and rejects anything else', () => {
    expect(isLayoutNode(row([panel('throttles'), 1]))).toBe(true);

    expect(isLayoutNode({ type: 'panel', id: 'x', kind: 'teapot' })).toBe(
      false,
    );
    expect(
      isLayoutNode({ type: 'split', direction: 'row', children: [] }),
    ).toBe(false);
    expect(
      isLayoutNode({
        type: 'split',
        direction: 'diagonal',
        children: [{ node: panel('points'), weight: 1 }],
      }),
    ).toBe(false);
    expect(
      isLayoutNode({
        type: 'split',
        direction: 'row',
        children: [{ node: panel('points'), weight: 0 }],
      }),
    ).toBe(false);
    expect(isLayoutNode(null)).toBe(false);
  });

  it('has a valid layout for every role preset, with unique panel ids', () => {
    for (const preset of PRESETS) {
      expect(isLayoutNode(preset.layout)).toBe(true);

      const ids = panelsIn(preset.layout).map((node) => node.id);

      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('falls back to the default preset for an unknown id', () => {
    expect(findPreset('points').id).toBe('points');
    expect(findPreset('not-a-role').id).toBe(DEFAULT_PRESET);
  });
});
