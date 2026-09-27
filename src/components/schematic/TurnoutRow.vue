<script setup lang="ts">
import { computed } from 'vue';

import {
  CHANGEOVER_STYLE,
  changingOver,
} from '@/components/schematic/changeover';
import type { TurnoutEntry } from '@/stores/inventory';

const props = defineProps<{ turnout: TurnoutEntry; name?: string }>();

defineEmits<{ toggle: [] }>();

const thrown = computed(() => props.turnout.thrown);
const lie = computed(() => (thrown.value ? 'Thrown' : 'Closed'));
</script>

<template>
  <button
    type="button"
    class="turnout-row"
    :aria-label="`Turnout ${turnout.id}${name ? `, ${name}` : ''}, ${lie.toLowerCase()}. Press to ${thrown ? 'close' : 'throw'}.`"
    :data-testid="`turnout-${turnout.id}`"
    @click="$emit('toggle')"
  >
    <!-- The turnout draws its own route: the leg it is set to is lit, the
         other is dimmed with a break at the switch. Keyed by position, so a
         move redraws it and the new leg flashes into place. -->
    <svg
      :key="String(turnout.thrown)"
      class="turnout-row__route"
      viewBox="0 12 120 48"
      aria-hidden="true"
      :style="CHANGEOVER_STYLE"
    >
      <line
        class="route route--set"
        x1="6"
        y1="48"
        x2="42"
        y2="48"
      />
      <line
        class="route"
        :class="
          thrown
            ? 'route--unset'
            : ['route--set', { 'changing-over': changingOver(turnout) }]
        "
        x1="42"
        y1="48"
        x2="114"
        y2="48"
      />
      <polyline
        class="route"
        :class="
          thrown
            ? ['route--set', { 'changing-over': changingOver(turnout) }]
            : 'route--unset'
        "
        points="42,48 72,18 114,18"
      />
      <line
        v-if="thrown"
        class="route__gap"
        x1="52"
        y1="48"
        x2="62"
        y2="48"
      />
      <line
        v-else
        class="route__gap"
        x1="49"
        y1="41"
        x2="56"
        y2="34"
      />
      <line
        class="route__stop"
        x1="6"
        y1="41"
        x2="6"
        y2="55"
      />
    </svg>
    <span class="turnout-row__number numeric">{{ turnout.id }}</span>
    <span
      class="turnout-row__name"
      :title="name"
    >{{ name }}</span>
    <span
      class="turnout-row__state"
      :data-testid="`turnout-state-${turnout.id}`"
    >
      {{ lie }}
    </span>
  </button>
</template>

<style scoped>
/* One compact row: the drawn route, the number, the name and the position as
   a word, the same grammar as the output and sensor rows beside it. */
.turnout-row {
  display: grid;
  align-items: center;
  gap: var(--space-3);
  grid-template-columns: auto 3ch minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  padding: 0 var(--space-2);

  color: var(--ink);
  background: none;
  border: 0;
  border-bottom: 1px solid var(--rule);
  text-align: left;

  transition: background-color 150ms var(--ease-out);

  &:hover {
    background: var(--raised);
  }
}

.turnout-row__route {
  height: var(--text-xl);
  aspect-ratio: 120 / 48;
}

.route {
  fill: none;
  stroke-width: 5;
}

.route--set {
  stroke: var(--track-set);
}

.route--unset {
  stroke: var(--track-unset);
}

.route__gap {
  stroke: var(--panel);
  stroke-width: 10;
}

.turnout-row:hover .route__gap {
  stroke: var(--raised);
}

.route__stop {
  stroke: var(--track-idle);
  stroke-width: 3;
}

.turnout-row__number {
  font-size: var(--text-md);
  font-weight: 600;
}

.turnout-row__name {
  overflow: hidden;
  color: var(--ink-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.turnout-row__state {
  font-weight: 600;
}
</style>
