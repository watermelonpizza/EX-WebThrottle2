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
    const layout = row([panel('schematic'), 2], [column([panel('points'), 1], [panel('sensors'), 1]), 1]);

    expect(panelsIn(layout).map(node => node.kind)).toEqual(['schematic', 'points', 'sensors']);
  });

  it('accepts a well-formed saved layout', () => {
    expect(isLayoutNode(row([panel('throttles'), 1]))).toBe(true);
  });

  it.each([
    { layout: 'a panel of an unknown kind', node: { type: 'panel', id: 'x', kind: 'teapot' } },
    { layout: 'a split with no children', node: { type: 'split', direction: 'row', children: [] } },
    {
      layout: 'a split in an unknown direction',
      node: { type: 'split', direction: 'diagonal', children: [{ node: panel('points'), weight: 1 }] },
    },
    {
      layout: 'a split with a child of no weight',
      node: { type: 'split', direction: 'row', children: [{ node: panel('points'), weight: 0 }] },
    },
    { layout: 'nothing at all', node: null },
  ])('rejects $layout', ({ node }) => {
    expect(isLayoutNode(node)).toBe(false);
  });

  describe.each(PRESETS)('the $label preset', (preset) => {
    it('has a valid layout', () => {
      expect(isLayoutNode(preset.layout)).toBe(true);
    });

    it('gives every panel its own id', () => {
      const ids = panelsIn(preset.layout).map(node => node.id);

      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it('finds a preset by id', () => {
    expect(findPreset('points').id).toBe('points');
  });

  it('falls back to the default preset for an unknown id', () => {
    expect(findPreset('not-a-role').id).toBe(DEFAULT_PRESET);
  });
});
