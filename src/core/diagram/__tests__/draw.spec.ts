import { describe, expect, it } from 'vitest';

import { TurnoutState } from '../../protocol/types';
import type { LayoutDiagram } from '../index';
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

describe('diagram drawing', () => {
  it('finds points along a polyline by distance', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];

    expect(pointAlong(line, 5)).toEqual({ x: 5, y: 0 });
    expect(pointAlong(line, 15)).toEqual({ x: 10, y: 5 });
    expect(pointAlong(line, 99)).toEqual({ x: 10, y: 10 });
  });

  it('lights the leg a turnout lies on and breaks the other at the switch', () => {
    const drawing = drawDiagram(diagram, () => TurnoutState.THROWN, () => false);

    const tones = Object.fromEntries(
      drawing.lines.map((line) => [line.key, line.tone]),
    );

    // Plain track leading to lit points is lit too: a train can run on it.
    expect(tones).toEqual({
      approach: 'set',
      'turnout-7-closed': 'unset',
      'turnout-7-thrown': 'set',
    });

    // Lit legs draw last, so they are never hidden under an unset one.
    expect(drawing.lines.at(-1)?.tone).toBe('set');

    expect(drawing.gaps).toHaveLength(1);
    expect(drawing.gaps[0]?.key).toBe('turnout-7-closed-gap');
    expect(drawing.gaps[0]?.from).toEqual({ x: 32, y: 50 });
  });

  it('shows a turnout the station has not reported as unknown: nothing lit, no gap', () => {
    const drawing = drawDiagram(diagram, () => undefined, () => false);

    expect(drawing.lines.every((line) => line.tone === 'idle')).toBe(true);
    expect(drawing.gaps).toHaveLength(0);
  });

  it('lights plain track only where it joins lit points', () => {
    // A siding off the end of the thrown leg: lit when the points are thrown,
    // set against when they are closed.
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
    const tone = (state: TurnoutState) =>
      drawDiagram(withSiding, () => state, () => false).lines.find(
        (line) => line.key === 'siding',
      )?.tone;

    expect(tone(TurnoutState.THROWN)).toBe('set');
    expect(tone(TurnoutState.CLOSED)).toBe('unset');

    // Its buffer stop reads in the same tone as the track it ends.
    const closed = drawDiagram(withSiding, () => TurnoutState.CLOSED, () => false);

    expect(closed.buffers.find((stop) => stop.key === 'siding-end')?.tone).toBe('unset');
  });

  it('places a berth halfway along the line it names, and nowhere else', () => {
    const drawing = drawDiagram(
      { ...diagram, berths: [...diagram.berths, { id: 'nowhere', label: 'Nowhere', on: 'no-such-track' }] },
      () => undefined,
      () => false,
    );

    expect(drawing.berths).toEqual([{ id: 'approach', label: 'Approach', at: { x: 10, y: 50 } }]);
  });

  it('marks a section occupied only while its sensor is active', () => {
    expect(
      drawDiagram(diagram, () => undefined, (id) => id === 3).sections[0]
        ?.occupied,
    ).toBe(true);
    expect(
      drawDiagram(diagram, () => undefined, () => false).sections[0]?.occupied,
    ).toBe(false);
  });

  it('draws buffer stops across the track end', () => {
    const [stop] = drawDiagram(diagram, () => undefined, () => false).buffers;

    expect(stop?.at).toEqual({ x: 0, y: 50 });
    expect(stop?.angle).toBeCloseTo(Math.PI);
  });

  it('puts a turnout number in the open space beside its own switch point', () => {
    const [turnout] = drawDiagram(diagram, () => undefined, () => false).turnouts;

    // The approach comes in from the west, the legs leave east and north-east,
    // so the widest gap, and the number, is straight below the switch.
    expect(turnout?.at).toEqual({ x: 20, y: 50 });
    expect(turnout?.toward.x).toBeCloseTo(0);
    expect(turnout?.toward.y).toBeCloseTo(1);
  });

  it('draws the emulator sample from the ids the emulator layout script defines', () => {
    const turnouts = EMULATOR_DEMO_DIAGRAM.turnouts.map((turnout) => turnout.id);
    const sensors = EMULATOR_DEMO_DIAGRAM.sections.map((section) => section.sensor);

    // emulator/layout.txt: turnouts 1-5, sensors 20-22.
    expect(turnouts).toEqual([1, 2, 3, 4, 5]);
    expect(sensors).toEqual([20, 21, 22]);
  });

  it('gives every stretch of track in the emulator sample a berth, and no berth off the track', () => {
    const lines = diagramLines(EMULATOR_DEMO_DIAGRAM);
    const berths = EMULATOR_DEMO_DIAGRAM.berths;

    // No berth names a line that is not drawn.
    for (const berth of berths) {
      expect(lines.map((line) => line.key)).toContain(berth.on);
    }

    // Every drawn line has a berth, on it or on the same track drawn again.
    for (const line of lines) {
      const covered = berths.some((berth) => {
        const on = lines.find((candidate) => candidate.key === berth.on);

        return on !== undefined && sameLine(on.points, line.points);
      });

      expect(covered, `${line.key} has no berth`).toBe(true);
    }

    expect(new Set(berths.map((berth) => berth.id)).size).toBe(berths.length);
  });
});
