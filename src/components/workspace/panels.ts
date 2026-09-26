import type { Component } from 'vue';

import type { PanelKind } from '@/core/workspace';
import CommandsPanel from '@/components/panels/CommandsPanel.vue';
import EventsPanel from '@/components/panels/EventsPanel.vue';
import OutputsPanel from '@/components/panels/OutputsPanel.vue';
import PointsPanel from '@/components/panels/PointsPanel.vue';
import SchematicPanel from '@/components/panels/SchematicPanel.vue';
import SensorsPanel from '@/components/panels/SensorsPanel.vue';
import ThrottlesPanel from '@/components/panels/ThrottlesPanel.vue';
import TrafficPanel from '@/components/panels/TrafficPanel.vue';

export interface PanelType {
  // Names the panel for screen readers and, later, the panel list.
  title: string;
  component: Component;
  // The smallest room the panel still works in. Inside that, each panel picks
  // its own size variant with container queries.
  minWidth: string;
  minHeight: string;
}

export const PANEL_TYPES: Record<PanelKind, PanelType> = {
  schematic: {
    title: 'Layout',
    component: SchematicPanel,
    minWidth: '20rem',
    minHeight: '16rem',
  },
  points: {
    title: 'Points',
    component: PointsPanel,
    minWidth: '16rem',
    minHeight: '12rem',
  },
  outputs: {
    title: 'Outputs',
    component: OutputsPanel,
    minWidth: '16rem',
    minHeight: '8rem',
  },
  sensors: {
    title: 'Sensors',
    component: SensorsPanel,
    minWidth: '16rem',
    minHeight: '8rem',
  },
  // No built-in layout places the log yet; the strip opens it from any of
  // them, and arranging panels will let an operator keep it on screen.
  events: {
    title: 'Events',
    component: EventsPanel,
    minWidth: '16rem',
    minHeight: '10rem',
  },
  throttles: {
    title: 'Throttles',
    component: ThrottlesPanel,
    minWidth: '18rem',
    minHeight: '16rem',
  },
  traffic: {
    title: 'Traffic',
    component: TrafficPanel,
    minWidth: '20rem',
    minHeight: '16rem',
  },
  commands: {
    title: 'Commands',
    component: CommandsPanel,
    minWidth: '20rem',
    minHeight: '16rem',
  },
};
