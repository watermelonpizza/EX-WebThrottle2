import type { LayoutDiagram } from './types';

// Hand-drawn diagram of the host emulator's demo layout (emulator/layout.txt):
// a main line with a passing loop and a small yard. Turnout and sensor ids
// match the ones that layout script defines, so the drawing lights up from
// the emulator's real replies. Units are the drawing's own, sized to suit a
// landscape panel.
export const EMULATOR_DEMO_DIAGRAM: LayoutDiagram = {
  id: 'emulator-demo',
  name: 'Emulator demo layout',
  width: 993,
  height: 822,
  tracks: [
    {
      id: 'main-west',
      points: [
        { x: 22, y: 389 },
        { x: 205, y: 389 },
      ],
      buffers: ['start'],
    },
    {
      id: 'main-east',
      points: [
        { x: 770, y: 389 },
        { x: 958, y: 389 },
      ],
      buffers: ['end'],
    },
    {
      id: 'headshunt-west',
      points: [
        { x: 228, y: 152 },
        { x: 350, y: 152 },
      ],
      buffers: ['start'],
    },
    {
      id: 'headshunt-east',
      points: [
        { x: 618, y: 152 },
        { x: 740, y: 152 },
      ],
      buffers: ['end'],
    },
  ],
  turnouts: [
    {
      id: 1,
      name: 'Loop west',
      closed: [
        { x: 205, y: 389 },
        { x: 640, y: 389 },
      ],
      // The passing loop, round to turnout 2.
      thrown: [
        { x: 205, y: 389 },
        { x: 275, y: 312 },
        { x: 275, y: 230 },
        { x: 350, y: 152 },
        { x: 618, y: 152 },
        { x: 695, y: 230 },
        { x: 695, y: 312 },
        { x: 770, y: 389 },
      ],
    },
    {
      id: 2,
      name: 'Loop east',
      closed: [
        { x: 770, y: 389 },
        { x: 640, y: 389 },
      ],
      thrown: [
        { x: 770, y: 389 },
        { x: 695, y: 312 },
        { x: 695, y: 230 },
        { x: 618, y: 152 },
        { x: 350, y: 152 },
        { x: 275, y: 230 },
        { x: 275, y: 312 },
        { x: 205, y: 389 },
      ],
    },
    {
      id: 3,
      name: 'Yard throat',
      closed: [
        { x: 640, y: 389 },
        { x: 770, y: 389 },
      ],
      // Down into the yard.
      thrown: [
        { x: 640, y: 389 },
        { x: 770, y: 540 },
      ],
    },
    {
      id: 4,
      name: 'Yard road 1',
      closed: [
        { x: 770, y: 540 },
        { x: 835, y: 627 },
      ],
      thrown: [
        { x: 770, y: 540 },
        { x: 958, y: 540 },
      ],
      buffers: ['thrown'],
    },
    {
      id: 5,
      name: 'Yard road 2',
      closed: [
        { x: 835, y: 627 },
        { x: 958, y: 627 },
      ],
      // Round at 45° into a third yard road.
      thrown: [
        { x: 835, y: 627 },
        { x: 880, y: 672 },
        { x: 958, y: 672 },
      ],
      buffers: ['closed', 'thrown'],
    },
  ],
  sections: [
    {
      sensor: 20,
      label: 'Platform 1',
      labelAt: { x: 474, y: 363 },
      points: [
        { x: 346, y: 389 },
        { x: 611, y: 389 },
      ],
    },
    {
      sensor: 21,
      label: 'Loop',
      labelAt: { x: 484, y: 126 },
      points: [
        { x: 380, y: 152 },
        { x: 590, y: 152 },
      ],
    },
    {
      sensor: 22,
      label: 'Yard',
      labelAt: { x: 880, y: 514 },
      points: [
        { x: 800, y: 540 },
        { x: 950, y: 540 },
      ],
    },
  ],
  // One berth for every stretch of drawn track, so a loco can be placed
  // anywhere a train can stand. Turnout 2's legs draw the same track as
  // turnout 1's thrown leg (the loop) and turnout 3's closed leg.
  berths: [
    { id: 'west', label: 'West', on: 'main-west' },
    { id: 'platform-1', label: 'Platform 1', on: 'turnout-1-closed' },
    { id: 'main', label: 'Main line', on: 'turnout-3-closed' },
    { id: 'east', label: 'East', on: 'main-east' },
    { id: 'loop', label: 'Loop', on: 'turnout-1-thrown' },
    { id: 'headshunt-west', label: 'West headshunt', on: 'headshunt-west' },
    { id: 'headshunt-east', label: 'East headshunt', on: 'headshunt-east' },
    { id: 'yard-lead', label: 'Yard lead', on: 'turnout-3-thrown' },
    { id: 'yard-1', label: 'Yard road 1', on: 'turnout-4-thrown' },
    { id: 'yard-neck', label: 'Yard neck', on: 'turnout-4-closed' },
    { id: 'yard-2', label: 'Yard road 2', on: 'turnout-5-closed' },
    { id: 'yard-3', label: 'Yard road 3', on: 'turnout-5-thrown' },
  ],
};
