import { beforeEach, describe, expect, it } from 'vitest';

import type { DiagramDrawing, LayoutDiagram } from '../index';
import {
  EMULATOR_DEMO_DIAGRAM,
  diagramLines,
  drawDiagram,
  pointAlong,
  sameLine,
} from '../index';

// One turnout: a straight closed leg and a diverging thrown leg.
const diagram: LayoutDiagram = {
  id: 'test',
  name: 'Test',
  width: 100,
  height: 100,
  tracks: [
    {
      id: 'approach',
      points: [
        { x: 0, y: 50 },
        { x: 20, y: 50 },
      ],
      buffers: ['start'],
    },
  ],
  turnouts: [
    {
      id: 7,
      closed: [
        { x: 20, y: 50 },
        { x: 100, y: 50 },
      ],
      thrown: [
        { x: 20, y: 50 },
        { x: 60, y: 10 },
      ],
    },
  ],
  sections: [
    {
      sensor: 3,
      label: 'Platform',
      labelAt: { x: 50, y: 40 },
      points: [
        { x: 40, y: 50 },
        { x: 80, y: 50 },
      ],
    },
  ],
  berths: [{ id: 'approach', label: 'Approach', on: 'approach' }],
};

// Draws the test diagram with every turnout reporting `thrown` and the given
// sensors active.
function draw(layout: LayoutDiagram, thrown: boolean | undefined, active: (id: number) => boolean = () => false): DiagramDrawing {
  return drawDiagram(layout, () => thrown, active);
}

// A siding off the end of the thrown leg: lit when the points are thrown, set
// against when they are closed.
const withSiding: LayoutDiagram = {
  ...diagram,
  tracks: [
    ...diagram.tracks,
    {
      id: 'siding',
      points: [
        { x: 60, y: 10 },
        { x: 90, y: 10 },
      ],
      buffers: ['end'],
    },
  ],
};

describe('diagram drawing', () => {
  const line = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it.each([
    { distance: 5, point: { x: 5, y: 0 }, where: 'on the first stretch' },
    { distance: 15, point: { x: 10, y: 5 }, where: 'round the corner' },
    { distance: 99, point: { x: 10, y: 10 }, where: 'at the end, when past it' },
  ])('finds the point $distance along a polyline $where', ({ distance, point }) => {
    expect(pointAlong(line, distance)).toEqual(point);
  });

  describe('with the turnout thrown', () => {
    let drawing: DiagramDrawing;

    beforeEach(() => {
      drawing = draw(diagram, true);
    });

    // Plain track leading to lit points is lit too: a train can run on it.
    it('lights the thrown leg and the track leading to it', () => {
      expect(Object.fromEntries(drawing.lines.map(drawn => [drawn.key, drawn.tone]))).toEqual({
        'approach': 'set',
        'turnout-7-closed': 'unset',
        'turnout-7-thrown': 'set',
      });
    });

    // Lit legs draw last, so they are never hidden under an unset one.
    it('draws the lit legs last', () => {
      expect(drawing.lines.at(-1)?.tone).toBe('set');
    });

    it('breaks the closed leg at the switch', () => {
      expect(drawing.gaps.map(({ key, from }) => ({ key, from }))).toEqual([
        { key: 'turnout-7-closed-gap', from: { x: 32, y: 50 } },
      ]);
    });
  });

  it('shows a turnout the station has not reported as unknown: nothing lit, no gap', () => {
    const drawing = draw(diagram, undefined);

    expect(drawing.lines.every(drawn => drawn.tone === 'idle')).toBe(true);
    expect(drawing.gaps).toHaveLength(0);
  });

  it.each([
    { thrown: true, tone: 'set', points: 'thrown' },
    { thrown: false, tone: 'unset', points: 'closed' },
  ])('shows plain track off the thrown leg as $tone when the points are $points', ({ thrown, tone }) => {
    expect(draw(withSiding, thrown).lines.find(drawn => drawn.key === 'siding')?.tone).toBe(tone);
  });

  // Its buffer stop reads in the same tone as the track it ends.
  it('draws a buffer stop in the tone of the track it ends', () => {
    expect(draw(withSiding, false).buffers.find(stop => stop.key === 'siding-end')?.tone).toBe('unset');
  });

  it('places a berth halfway along the line it names, and nowhere else', () => {
    const drawing = draw({ ...diagram, berths: [...diagram.berths, { id: 'nowhere', label: 'Nowhere', on: 'no-such-track' }] }, undefined);

    expect(drawing.berths).toEqual([{ id: 'approach', label: 'Approach', at: { x: 10, y: 50 } }]);
  });

  it.each([
    { active: true, occupied: true },
    { active: false, occupied: false },
  ])('marks a section occupied: $occupied while its sensor active is $active', ({ active, occupied }) => {
    expect(draw(diagram, undefined, id => active && id === 3).sections[0]?.occupied).toBe(occupied);
  });

  it('draws buffer stops across the track end', () => {
    const [stop] = draw(diagram, undefined).buffers;

    expect(stop?.at).toEqual({ x: 0, y: 50 });
    expect(stop?.angle).toBeCloseTo(Math.PI);
  });

  it('puts a turnout number in the open space beside its own switch point', () => {
    const [turnout] = draw(diagram, undefined).turnouts;

    // The approach comes in from the west, the legs leave east and north-east,
    // so the widest gap, and the number, is straight below the switch.
    expect(turnout?.at).toEqual({ x: 20, y: 50 });
    expect(turnout?.toward.x).toBeCloseTo(0);
    expect(turnout?.toward.y).toBeCloseTo(1);
  });
});

// emulator/layout.txt: turnouts 1-5, sensors 20-22.
describe('the emulator sample diagram', () => {
  const lines = diagramLines(EMULATOR_DEMO_DIAGRAM);
  const berths = EMULATOR_DEMO_DIAGRAM.berths;

  it('draws the turnouts the emulator layout script defines', () => {
    expect(EMULATOR_DEMO_DIAGRAM.turnouts.map(turnout => turnout.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('draws the sensors the emulator layout script defines', () => {
    expect(EMULATOR_DEMO_DIAGRAM.sections.map(section => section.sensor)).toEqual([20, 21, 22]);
  });

  it('puts no berth on a line that is not drawn', () => {
    const keys = lines.map(drawn => drawn.key);

    expect(berths.filter(berth => !keys.includes(berth.on)).map(berth => berth.id)).toEqual([]);
  });

  // A berth covers its own line and the same track drawn again.
  it('gives every stretch of track a berth', () => {
    const uncovered = lines.filter(drawn => !berths.some((berth) => {
      const on = lines.find(candidate => candidate.key === berth.on);

      return on !== undefined && sameLine(on.points, drawn.points);
    }));

    expect(uncovered.map(drawn => drawn.key)).toEqual([]);
  });

  it('gives every berth its own id', () => {
    expect(new Set(berths.map(berth => berth.id)).size).toBe(berths.length);
  });
});
