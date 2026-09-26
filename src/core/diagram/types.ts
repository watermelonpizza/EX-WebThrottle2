// A layout diagram is the drawn picture of a track plan: where the lines run,
// where each turnout sits, which track a sensor watches, and where a train's
// description can be placed. The Command Station knows none of this, so a
// diagram is authored (by hand for the emulator demo today, by an editor and
// the Hub later) and only ever points at ids the station reports.

// Diagram units: the drawing's own coordinate space, scaled to fit its panel.
export interface Point {
  x: number;
  y: number;
}

export interface DiagramTrack {
  id: string;
  points: Point[];
  // Draw a buffer stop at the first and/or last point.
  buffers?: ('start' | 'end')[];
}

export interface DiagramTurnout {
  // The Command Station's turnout id.
  id: number;
  // What the operators call it, when the station itself gives no name.
  name?: string;
  // Each leg starts at the switch point and runs to where it joins the next
  // piece of track, so a set leg can be drawn as one lit line. The turnout's
  // number is placed beside the switch point by the drawing itself.
  closed: Point[];
  thrown: Point[];
  buffers?: ('closed' | 'thrown')[];
}

export interface DiagramSection {
  // The Command Station's sensor id watching this stretch of track.
  sensor: number;
  label: string;
  labelAt: Point;
  points: Point[];
}

// A place where the operator can put a train's description, the way a
// signaller interposes one into a berth. Positions are never detected. A berth
// names the drawn line it sits on (a track's id, or turnout-<id>-closed or
// -thrown for a leg) and shows halfway along it, so a train can only ever be
// placed on track that is drawn.
export interface DiagramBerth {
  id: string;
  label: string;
  on: string;
}

export interface LayoutDiagram {
  id: string;
  name: string;
  width: number;
  height: number;
  tracks: DiagramTrack[];
  turnouts: DiagramTurnout[];
  sections: DiagramSection[];
  berths: DiagramBerth[];
}
