import type { LayoutNode, PanelKind, PanelNode, SplitNode } from './types';

const PANEL_KINDS: PanelKind[] = [
  'schematic',
  'points',
  'outputs',
  'sensors',
  'events',
  'throttles',
  'traffic',
  'commands',
];

export function panel(kind: PanelKind, id: string = kind): PanelNode {
  return { type: 'panel', id, kind };
}

export function row(...children: [LayoutNode, number][]): SplitNode {
  return split('row', children);
}

export function column(...children: [LayoutNode, number][]): SplitNode {
  return split('column', children);
}

function split(
  direction: SplitNode['direction'],
  children: [LayoutNode, number][],
): SplitNode {
  return {
    type: 'split',
    direction,
    children: children.map(([node, weight]) => ({ node, weight })),
  };
}

// Panels in reading order: left to right, then top to bottom. Narrow screens
// stack a layout's panels in this order.
export function panelsIn(node: LayoutNode): PanelNode[] {
  if (node.type === 'panel') {
    return [node];
  }

  return node.children.flatMap(child => panelsIn(child.node));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Saved layouts come back from browser storage (and later the Hub), so they
// are checked before use rather than trusted.
export function isLayoutNode(value: unknown): value is LayoutNode {
  if (!isRecord(value)) {
    return false;
  }

  if (value.type === 'panel') {
    return (
      typeof value.id === 'string'
      && PANEL_KINDS.includes(value.kind as PanelKind)
    );
  }

  if (value.type !== 'split') {
    return false;
  }

  return (
    (value.direction === 'row' || value.direction === 'column')
    && Array.isArray(value.children)
    && value.children.length > 0
    && value.children.every(
      child =>
        isRecord(child)
        && typeof child.weight === 'number'
        && child.weight > 0
        && isLayoutNode(child.node),
    )
  );
}
