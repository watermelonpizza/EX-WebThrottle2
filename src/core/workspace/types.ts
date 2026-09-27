// A workspace layout is plain data: a tree of splits with panels at the
// leaves. Built-in presets use it today; saved layouts, drag-to-dock and Hub
// sync later edit the same tree, so nothing that renders it has to change.

// Every kind of panel the console can show. The UI layer maps each kind to
// its component, title and size rules.
export type PanelKind =
  | 'schematic'
  | 'points'
  | 'outputs'
  | 'sensors'
  | 'routes'
  | 'automations'
  | 'events'
  | 'throttles'
  | 'traffic'
  | 'commands';

export interface PanelNode {
  type: 'panel';
  // Unique within one layout, so the same kind can appear twice later.
  id: string;
  kind: PanelKind;
}

export interface SplitChild {
  node: LayoutNode;
  // Share of the split's length; weights are relative, like CSS flex-grow.
  weight: number;
}

export interface SplitNode {
  type: 'split';
  // A row places children side by side, a column stacks them.
  direction: 'row' | 'column';
  children: SplitChild[];
}

export type LayoutNode = PanelNode | SplitNode;

export interface Preset {
  id: string;
  // The role or job this layout serves, shown as a tab.
  label: string;
  layout: LayoutNode;
}
