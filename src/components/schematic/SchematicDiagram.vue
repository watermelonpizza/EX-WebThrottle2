<script setup lang="ts">
import {
  computed,
  onMounted,
  onScopeDispose,
  ref,
  useTemplateRef,
  watch,
} from 'vue';

import {
  CHANGEOVER_MS,
  CHANGEOVER_STYLE,
  changingOver,
} from '@/components/schematic/changeover';
import type { LayoutDiagram, Point } from '@/core/diagram';
import { drawDiagram } from '@/core/diagram';
import { TurnoutState } from '@/core/protocol';
import { useDiagramStore } from '@/stores/diagram';
import { useInventoryStore } from '@/stores/inventory';
import { useLocosStore } from '@/stores/locos';

const props = defineProps<{ diagram: LayoutDiagram }>();

const inventory = useInventoryStore();
const diagrams = useDiagramStore();
const locos = useLocosStore();

// Diagram units per screen pixel. Lines scale with the drawing, but text,
// train descriptions and touch rings keep their token size at any panel size,
// as on a signalling display.
const svg = useTemplateRef<SVGSVGElement>('svg');
const unit = ref(1);
let resize: ResizeObserver | undefined;

onMounted(() => {
  const element = svg.value;

  if (!element || typeof ResizeObserver !== 'function') {
    return;
  }

  resize = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    // preserveAspectRatio "meet": the drawing scales by the tighter side.
    const scale = Math.min(
      width / props.diagram.width,
      height / props.diagram.height,
    );

    unit.value = scale > 0 ? 1 / scale : 1;
  });
  resize.observe(element);
});

onScopeDispose(() => resize?.disconnect());

function turnoutEntry(id: number) {
  return inventory.turnouts.find((turnout) => turnout.id === id);
}

function turnoutState(id: number): TurnoutState | undefined {
  return turnoutEntry(id)?.state;
}

const drawing = computed(() =>
  drawDiagram(
    props.diagram,
    turnoutState,
    (id) =>
      inventory.sensors.find((sensor) => sensor.id === id)?.active ?? false,
  ),
);

// Turnouts pressed here and not yet confirmed by the Command Station. The
// drawing only ever shows what the station reports, so a press shows as
// pending until the <H …> reply moves the points (or the wait runs out).
const PENDING_FOR_MS = 3000;
const pending = ref(new Set<number>());
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function settle(id: number): void {
  clearTimeout(timers.get(id));
  timers.delete(id);

  if (pending.value.has(id)) {
    const next = new Set(pending.value);

    next.delete(id);
    pending.value = next;
  }
}

watch(
  () => inventory.turnouts.map((turnout) => `${turnout.id}:${turnout.state}`),
  (now, before) => {
    for (const entry of now) {
      if (!before?.includes(entry)) {
        settle(Number(entry.split(':')[0]));
      }
    }
  },
);

onScopeDispose(() => timers.forEach((timer) => clearTimeout(timer)));

function points(line: Point[]): string {
  return line.map((point) => `${point.x},${point.y}`).join(' ');
}

// A short stroke across the track at a point, for buffer stops and the ends
// of an occupied section.
function across(at: Point, angle: number, half: number) {
  const dx = -Math.sin(angle) * half;
  const dy = Math.cos(angle) * half;

  return { x1: at.x - dx, y1: at.y - dy, x2: at.x + dx, y2: at.y + dy };
}

function sectionEnds(line: Point[]) {
  const [first, second] = [line[0], line[1]];
  const [last, before] = [line[line.length - 1], line[line.length - 2]];

  return [
    across(first, Math.atan2(second.y - first.y, second.x - first.x), 9),
    across(last, Math.atan2(last.y - before.y, last.x - before.x), 9),
  ];
}

const turnouts = computed(() =>
  drawing.value.turnouts.map((turnout) => {
    const state = turnoutState(turnout.id);
    const known = state !== undefined;
    const lie = state === TurnoutState.THROWN ? 'thrown' : 'closed';

    return {
      ...turnout,
      known,
      description: known
        ? `Turnout ${turnout.id}, ${lie}. Press to ${lie === 'thrown' ? 'close' : 'throw'}.`
        : `Turnout ${turnout.id}, not reported by the Command Station.`,
    };
  }),
);

// When each line was last lit by points moving, so everything the new route
// lights (the leg, and any plain track it leads onto) flashes into place
// together while the rest of the drawing changes straight away. Lines lit as
// the drawing opens, or as the station first reports its turnouts, just show.
const litAt = new Map<string, number>();

watch(drawing, (now, before) => {
  if (!inventory.turnouts.some((turnout) => changingOver(turnout))) {
    return;
  }

  const wasLit = new Set(
    before.lines.filter((line) => line.tone === 'set').map((line) => line.key),
  );
  const at = Date.now();

  for (const line of now.lines) {
    if (line.tone === 'set' && !wasLit.has(line.key)) {
      litAt.set(line.key, at);
    }
  }
});

function changing(key: string): boolean {
  const at = litAt.get(key);

  return at !== undefined && Date.now() - at < CHANGEOVER_MS;
}

// A train description: the running number from the roster name (the part
// before any " · "), squeezed to fit a berth, or the DCC address.
function describe(address: number): string {
  const name = locos.roster.find((loco) => loco.address === address)?.name;
  const number = name?.split(' · ')[0].replace(/\s+/g, '');

  return number && number.length <= 6 ? number : String(address);
}

const berths = computed(() =>
  drawing.value.berths.flatMap((berth) => {
    const address = diagrams.occupant(berth.id);

    return address === undefined
      ? []
      : [{ ...berth, address, text: describe(address) }];
  }),
);

function toggle(id: number, known: boolean): void {
  if (!known) {
    return;
  }

  inventory.toggleTurnout(id);
  pending.value = new Set(pending.value).add(id);
  clearTimeout(timers.get(id));
  timers.set(
    id,
    setTimeout(() => settle(id), PENDING_FOR_MS),
  );
}
</script>

<template>
  <svg
    ref="svg"
    class="diagram"
    :style="{ '--unit': unit, ...CHANGEOVER_STYLE }"
    :viewBox="`0 0 ${diagram.width} ${diagram.height}`"
    preserveAspectRatio="xMidYMid meet"
    role="group"
    :aria-label="`${diagram.name} diagram`"
    data-testid="schematic"
  >
    <!-- Keyed by tone, so a line that becomes lit is a new line and its
         changeover flash starts from the beginning. -->
    <polyline
      v-for="line in drawing.lines"
      :key="`${line.key}-${line.tone}`"
      class="line"
      :class="[`line--${line.tone}`, { 'changing-over': changing(line.key) }]"
      :points="points(line.points)"
      :data-testid="line.turnout ? `leg-${line.key}` : undefined"
    />

    <template v-for="section in drawing.sections" :key="section.sensor">
      <template v-if="section.occupied">
        <polyline
          class="line line--occupied"
          :points="points(section.points)"
        />
        <line
          v-for="(end, index) in sectionEnds(section.points)"
          :key="index"
          class="tick tick--occupied"
          v-bind="end"
        />
      </template>
    </template>

    <line
      v-for="gap in drawing.gaps"
      :key="gap.key"
      class="gap"
      :x1="gap.from.x"
      :y1="gap.from.y"
      :x2="gap.to.x"
      :y2="gap.to.y"
    />

    <line
      v-for="stop in drawing.buffers"
      :key="`${stop.key}-${stop.tone}`"
      class="tick"
      :class="[`tick--${stop.tone}`, { 'changing-over': changing(stop.line) }]"
      v-bind="across(stop.at, stop.angle, 9)"
    />

    <template
      v-for="section in drawing.sections"
      :key="`label-${section.sensor}`"
    >
      <text
        v-if="section.occupied"
        class="section-label"
        :x="section.labelAt.x"
        :y="section.labelAt.y"
        :data-testid="`section-${section.sensor}`"
      >
        {{ section.label }} · Occupied
      </text>
    </template>

    <g
      v-for="turnout in turnouts"
      :key="turnout.id"
      class="turnout"
      :class="{
        'turnout--unknown': !turnout.known,
        'turnout--pending': pending.has(turnout.id),
      }"
      role="button"
      tabindex="0"
      :aria-label="turnout.description"
      :aria-disabled="!turnout.known"
      :data-testid="`diagram-turnout-${turnout.id}`"
      @click="toggle(turnout.id, turnout.known)"
      @keydown.enter.prevent="toggle(turnout.id, turnout.known)"
      @keydown.space.prevent="toggle(turnout.id, turnout.known)"
    >
      <circle class="turnout__hit" :cx="turnout.at.x" :cy="turnout.at.y" />
      <!-- The number is set off from the switch point by a screen distance,
           in the direction the drawing chose, so it stays beside its points
           at any size. -->
      <g
        class="turnout__mark"
        :style="{
          '--toward-x': turnout.toward.x,
          '--toward-y': turnout.toward.y,
        }"
      >
        <circle class="turnout__ring" :cx="turnout.at.x" :cy="turnout.at.y" />
        <text class="turnout__label" :x="turnout.at.x" :y="turnout.at.y">
          {{ turnout.id }}
        </text>
      </g>
    </g>

    <g
      v-for="berth in berths"
      :key="berth.id"
      class="berth"
      :data-testid="`berth-${berth.id}`"
    >
      <title>{{ berth.label }}: loco {{ berth.address }}</title>
      <!-- The tag is sized in ems of its label, centred on the berth. -->
      <foreignObject
        class="berth__box"
        :x="berth.at.x"
        :y="berth.at.y"
        width="1"
        height="1"
      >
        <span class="berth__tag numeric">{{ berth.text }}</span>
      </foreignObject>
    </g>
  </svg>
</template>

<style scoped>
/* Sizes inside the drawing are in diagram units, so strokes and labels scale
   with the diagram as its panel grows or shrinks. */
.diagram {
  display: block;
  width: 100%;
  height: 100%;

  font-family: var(--font);
}

.line {
  fill: none;
  stroke-linejoin: miter;
  stroke-width: 4.5;
}

.line--idle {
  stroke: var(--track-idle);
}

.line--unset {
  stroke: var(--track-unset);
  stroke-width: 4;
}

.line--set {
  stroke: var(--track-set);
  stroke-width: 5;
}

.line--occupied {
  stroke: var(--occupied);
  stroke-width: 5;
}

.gap {
  stroke: var(--ground);
  stroke-width: 9;
}

.tick {
  stroke: var(--track-idle);
  stroke-width: 3;
}

.tick--set {
  stroke: var(--track-set);
}

.tick--unset {
  stroke: var(--track-unset);
}

.tick--occupied {
  stroke: var(--occupied);
}

.section-label {
  fill: var(--occupied);
  font-size: calc(var(--text-sm) * var(--unit));
  text-anchor: middle;
  dominant-baseline: central;
}

.turnout {
  /* The ring round a number, and how far the number sits from its switch
     point: far enough that the ring clears the lines either side of the gap
     it sits in (half of at least 120°), and no further. */
  --ring: calc(var(--target) / 2.3 * var(--unit));
  --reach: calc(var(--ring) * 1.35);

  cursor: pointer;
  outline: none;
}

.turnout__mark {
  translate: calc(var(--toward-x) * var(--reach))
    calc(var(--toward-y) * var(--reach));
}

.turnout--unknown {
  cursor: default;
}

.turnout__hit {
  r: calc(var(--target) / 2 * var(--unit));
  fill: transparent;
}

.turnout__ring {
  r: var(--ring);
  fill: transparent;
  stroke: transparent;
  stroke-width: calc(2px * var(--unit));
}

.turnout:hover .turnout__ring {
  stroke: var(--edge);
}

.turnout:focus-visible .turnout__ring {
  stroke: var(--focus);
  stroke-width: calc(3px * var(--unit));
}

/* Sent, not yet confirmed: a ring that circles until the station answers. */
.turnout--pending .turnout__ring {
  stroke: var(--accent);
  stroke-dasharray: 6 6;
  animation: pending-turn 900ms linear infinite;
}

@keyframes pending-turn {
  to {
    stroke-dashoffset: -24;
  }
}

.turnout__label {
  fill: var(--ink);
  font-size: calc(var(--text-lg) * var(--unit));
  text-anchor: middle;
  dominant-baseline: central;
}

.turnout--unknown .turnout__label {
  fill: var(--ink-muted);
}

.berth__box {
  overflow: visible;
}

.berth__tag {
  position: absolute;
  translate: -50% -60%;
  padding: 0.35em 0.6em;

  color: var(--describer-ink);
  background: var(--describer);
  border-radius: var(--radius);
  font-size: calc(var(--text-xs) * var(--unit));
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
</style>
