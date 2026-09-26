import type { DiagramTurnout, LayoutDiagram, Point } from './types';

// How a line reads on the schematic, in the manner of a signalling display:
// set is track a train can run on as the points lie now (lit), unset is track
// the points are set against, and idle is track whose points the Command
// Station has not reported, so nobody can say.
export type LineTone = 'idle' | 'set' | 'unset';

export interface DrawnLine {
  key: string;
  points: Point[];
  tone: LineTone;
  // The turnout this line is a leg of, if any.
  turnout?: number;
}

// A short break in an unset leg right after the switch point, so the way a
// turnout lies can be read even where another turnout lights the same track.
export interface DrawnGap {
  key: string;
  from: Point;
  to: Point;
}

export interface DrawnBuffer {
  key: string;
  at: Point;
  // Direction of the track arriving at the buffer, in radians; the stop is
  // drawn across it.
  angle: number;
  // The line the stop ends, and its tone, so the stop reads like its track.
  line: string;
  tone: LineTone;
}

export interface DrawnSection {
  sensor: number;
  label: string;
  labelAt: Point;
  points: Point[];
  occupied: boolean;
}

// Where a turnout's number goes: set off from the switch point in the
// direction given, a unit vector. How far is a screen distance, so the
// number stays beside its points at any zoom.
export interface DrawnTurnout {
  id: number;
  at: Point;
  toward: Point;
}

// A place for a train description, halfway along the line it names.
export interface DrawnBerth {
  id: string;
  label: string;
  at: Point;
}

export interface DiagramDrawing {
  lines: DrawnLine[];
  gaps: DrawnGap[];
  buffers: DrawnBuffer[];
  sections: DrawnSection[];
  turnouts: DrawnTurnout[];
  berths: DrawnBerth[];
}

// Every line the diagram draws, by the key berths use to name it: a plain
// track by its id, a turnout leg as turnout-<id>-closed or -thrown.
export interface DiagramLine {
  key: string;
  points: Point[];
  turnout?: DiagramTurnout;
  leg?: 'closed' | 'thrown';
}

// The gap runs from 12 to 24 units along the unset leg: far enough out that a
// diverging leg has separated from the set one by more than a line's width.
const GAP_START = 12;
const GAP_END = 24;

// Two authored points closer than this are the same point.
const SAME_POINT = 0.5;

function distance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function samePoint(first: Point, second: Point): boolean {
  return distance(first, second) <= SAME_POINT;
}

function lengthOf(points: Point[]): number {
  return points
    .slice(1)
    .reduce((total, point, index) => total + distance(points[index], point), 0);
}

export function pointAlong(points: Point[], length: number): Point {
  let remaining = length;

  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const span = distance(from, to);

    if (remaining <= span) {
      const share = span === 0 ? 0 : remaining / span;

      return {
        x: from.x + (to.x - from.x) * share,
        y: from.y + (to.y - from.y) * share,
      };
    }

    remaining -= span;
  }

  return points[points.length - 1];
}

export function legKey(id: number, leg: 'closed' | 'thrown'): string {
  return `turnout-${id}-${leg}`;
}

export function diagramLines(diagram: LayoutDiagram): DiagramLine[] {
  return [
    ...diagram.tracks.map((track) => ({ key: track.id, points: track.points })),
    ...diagram.turnouts.flatMap((turnout) =>
      (['closed', 'thrown'] as const).map((leg) => ({
        key: legKey(turnout.id, leg),
        points: turnout[leg],
        turnout,
        leg,
      })),
    ),
  ];
}

// Two legs can draw the same stretch of track, one from each end (the loop
// between two turnouts, say), so that stretch is one place, not two.
export function sameLine(first: Point[], second: Point[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  const reversed = [...second].reverse();

  return (
    first.every((point, index) => samePoint(point, second[index])) ||
    first.every((point, index) => samePoint(point, reversed[index]))
  );
}

function touches(first: Point[], second: Point[]): boolean {
  return first.some((point) => second.some((other) => samePoint(point, other)));
}

function heading(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

// Every direction a line leaves `at` in: from its ends, and both ways from a
// corner that sits on it.
function directionsFrom(at: Point, line: Point[]): number[] {
  return line.flatMap((point, index) => {
    if (!samePoint(point, at)) {
      return [];
    }

    return [line[index - 1], line[index + 1]]
      .filter((next): next is Point => next !== undefined)
      .map((next) => heading(at, next));
  });
}

// A turnout's number goes into the widest gap between the lines that meet at
// its switch point (its toe and its two legs, at the least), so it sits right
// beside its own points without touching a line. With three lines the widest
// gap is at least 120°, which leaves room for the number either side.
export function labelToward(turnout: DiagramTurnout, lines: Point[][]): Point {
  const at = turnout.closed[0];
  const closed = heading(at, turnout.closed[1]);
  const found = lines.flatMap((line) => directionsFrom(at, line));

  // With nothing drawn into the switch point, take the toe to run straight on
  // from the closed leg.
  const angles = [
    closed,
    heading(at, turnout.thrown[1]),
    ...(found.length > 0 ? found : [closed + Math.PI]),
  ]
    .map((angle) => (angle + 2 * Math.PI) % (2 * Math.PI))
    .sort((first, second) => first - second);

  let widest = { size: -1, middle: 0 };

  angles.forEach((from, index) => {
    const to = angles[index + 1] ?? angles[0] + 2 * Math.PI;

    if (to - from > widest.size) {
      widest = { size: to - from, middle: (from + to) / 2 };
    }
  });

  return { x: Math.cos(widest.middle), y: Math.sin(widest.middle) };
}

function buffer(
  line: string,
  key: string,
  points: Point[],
  end: 'start' | 'end',
  tone: LineTone,
): DrawnBuffer {
  const [at, towards] =
    end === 'start'
      ? [points[0], points[1]]
      : [points[points.length - 1], points[points.length - 2]];

  return {
    key,
    at,
    angle: Math.atan2(at.y - towards.y, at.x - towards.x),
    line,
    tone,
  };
}

// Plain track has no points of its own, so it takes its tone from the legs it
// joins: lit when it joins a lit leg (or lit plain track), because a train can
// run onto it from there; set against when the points it joins are all known
// and set away from it; idle while any of them is unreported.
function plainTones(
  diagram: LayoutDiagram,
  legs: { points: Point[]; tone: LineTone }[],
): Map<string, LineTone> {
  const tones = new Map<string, LineTone>();

  for (const track of diagram.tracks) {
    const joined = legs.filter((leg) => touches(track.points, leg.points));

    tones.set(
      track.id,
      joined.some((leg) => leg.tone === 'set')
        ? 'set'
        : joined.length > 0 && joined.every((leg) => leg.tone === 'unset')
          ? 'unset'
          : 'idle',
    );
  }

  // Plain track joined to lit plain track is lit too, however long the chain.
  let spreading = true;

  while (spreading) {
    spreading = false;

    for (const track of diagram.tracks) {
      if (tones.get(track.id) === 'set') {
        continue;
      }

      const lit = diagram.tracks.some(
        (other) =>
          tones.get(other.id) === 'set' && touches(track.points, other.points),
      );

      if (lit) {
        tones.set(track.id, 'set');
        spreading = true;
      }
    }
  }

  return tones;
}

// Turns the diagram plus what the Command Station last reported into lines to
// draw. A turnout the station has not reported (thrown answers undefined)
// shows both legs idle and no gap, because its position is unknown.
export function drawDiagram(
  diagram: LayoutDiagram,
  turnoutThrown: (id: number) => boolean | undefined,
  sensorActive: (id: number) => boolean,
): DiagramDrawing {
  const legs: DrawnLine[] = [];
  const gaps: DrawnGap[] = [];
  const buffers: DrawnBuffer[] = [];

  for (const turnout of diagram.turnouts) {
    const thrown = turnoutThrown(turnout.id);

    for (const leg of ['closed', 'thrown'] as const) {
      const points = turnout[leg];
      const key = legKey(turnout.id, leg);
      const isSet = thrown !== undefined && (leg === 'thrown') === thrown;
      const tone: LineTone =
        thrown === undefined ? 'idle' : isSet ? 'set' : 'unset';

      legs.push({ key, points, tone, turnout: turnout.id });

      if (thrown !== undefined && !isSet) {
        gaps.push({
          key: `${key}-gap`,
          from: pointAlong(points, GAP_START),
          to: pointAlong(points, GAP_END),
        });
      }

      if (turnout.buffers?.includes(leg)) {
        buffers.push(buffer(key, `${key}-buffer`, points, 'end', tone));
      }
    }
  }

  const tones = plainTones(diagram, legs);
  const plain: DrawnLine[] = diagram.tracks.map((track) => {
    const tone = tones.get(track.id) ?? 'idle';

    for (const end of track.buffers ?? []) {
      buffers.push(
        buffer(track.id, `${track.id}-${end}`, track.points, end, tone),
      );
    }

    return { key: track.id, points: track.points, tone };
  });

  const lines = diagramLines(diagram);

  // Every other line in the drawing, for finding what meets each switch point.
  const others = (own: DiagramTurnout): Point[][] =>
    lines.filter((line) => line.turnout !== own).map((line) => line.points);

  const drawn = [...plain, ...legs];
  const byTone = (tone: LineTone) => drawn.filter((line) => line.tone === tone);

  return {
    // Lit lines go last so a lit leg sharing track with an unset one shows.
    lines: [...byTone('idle'), ...byTone('unset'), ...byTone('set')],
    gaps,
    buffers,
    sections: diagram.sections.map((section) => ({
      ...section,
      occupied: sensorActive(section.sensor),
    })),
    turnouts: diagram.turnouts.map((turnout) => ({
      id: turnout.id,
      at: turnout.closed[0],
      toward: labelToward(turnout, others(turnout)),
    })),
    berths: diagram.berths.flatMap((berth) => {
      const line = lines.find((candidate) => candidate.key === berth.on);

      // A berth names a line that exists; the diagram tests check that for
      // every authored diagram, so one that does not is left out.
      if (!line) {
        return [];
      }

      const at = pointAlong(line.points, lengthOf(line.points) / 2);

      return [{ id: berth.id, label: berth.label, at }];
    }),
  };
}
