<script setup lang="ts">
import { computed } from 'vue';

import type { RouteEntry } from '@/stores/routes';

const props = defineProps<{
  route: RouteEntry;
  kind: 'route' | 'automation';
  // The loco an automation will drive, by name; unset when there is none.
  loco?: string;
  // Every EXRAIL task is paused, so anything started now would wait too.
  paused?: boolean;
}>();

defineEmits<{ start: [] }>();

const noun = computed(() => (props.kind === 'route' ? 'Route' : 'Automation'));

// Routes are set and automations are started; an automation needs a loco.
const verb = computed(() => (props.kind === 'route' ? 'Set' : 'Start'));
const needsLoco = computed(() => props.kind === 'automation' && !props.loco);

const state = computed(() => {
  if (props.paused) {
    return 'Paused';
  }

  if (props.route.disabled) {
    return 'Disabled';
  }

  return props.route.active ? 'Active' : verb.value;
});

const label = computed(() => {
  const what = `${noun.value} ${props.route.id}, ${props.route.name}`;

  if (props.paused) {
    return `${what}, paused by STOP ALL.`;
  }

  if (props.route.disabled) {
    return `${what}, disabled.`;
  }

  const active = props.route.active ? ', active' : '';

  if (needsLoco.value) {
    return `${what}${active}. Drive a loco to start it.`;
  }

  const action = props.kind === 'route'
    ? 'set it'
    : `start it with ${props.loco}`;

  return `${what}${active}. Press to ${action}.`;
});
</script>

<template>
  <button
    type="button"
    class="route-row"
    :class="[
      `route-row--${kind}`,
      { 'route-row--active': route.active && !route.disabled },
    ]"
    :disabled="paused || route.disabled || needsLoco"
    :aria-label="label"
    :data-testid="`${kind}-${route.id}`"
    @click="$emit('start')"
  >
    <!-- A route is a way through the points; an automation is a train on
         the move. Lit when EXRAIL says it is active. -->
    <svg
      class="route-row__glyph"
      viewBox="0 0 64 24"
      aria-hidden="true"
    >
      <polyline
        v-if="kind === 'route'"
        points="2,20 20,20 36,4 62,4"
      />
      <template v-else>
        <line
          x1="2"
          y1="12"
          x2="62"
          y2="12"
        />
        <polyline points="44,4 52,12 44,20" />
      </template>
    </svg>
    <span class="route-row__number numeric">{{ route.id }}</span>
    <span
      class="route-row__name"
      :title="route.name"
    >{{ route.name }}</span>
    <span
      class="route-row__state"
      :data-testid="`${kind}-state-${route.id}`"
    >{{ state }}</span>
  </button>
</template>

<style scoped>
/* One compact row, in the same grammar as the points, output and sensor
   rows: a drawn glyph, the number, the name and the state as a word. Idle,
   the word is what a press does. */
.route-row {
  display: grid;
  align-items: center;
  gap: var(--space-3);
  grid-template-columns: auto 4ch minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  padding: 0 var(--space-2);

  color: var(--ink);
  background: none;
  border: 0;
  border-bottom: 1px solid var(--rule);
  text-align: left;

  transition: background-color 150ms var(--ease-out);

  &:hover:not(:disabled) {
    background: var(--raised);
  }

  &:disabled {
    color: var(--ink-muted);
    cursor: not-allowed;
  }
}

.route-row__glyph {
  height: var(--text-lg);
  aspect-ratio: 64 / 24;
  fill: none;
  stroke: var(--track-idle);
  stroke-width: 3;
}

.route-row__number {
  font-size: var(--text-md);
  font-weight: 600;
}

.route-row__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-row__state {
  color: var(--ink-muted);
}

.route-row:disabled .route-row__glyph {
  stroke: var(--track-unset);
}

/* A set route lights white, as it does on the diagram; a running automation
   is live, so it lights teal. */
.route-row--active {
  .route-row__state {
    color: var(--ink);
    font-weight: 600;
  }

  &.route-row--route .route-row__glyph {
    stroke: var(--track-set);
  }

  &.route-row--automation {
    .route-row__glyph {
      stroke: var(--accent);
    }

    .route-row__state {
      color: var(--accent);
    }
  }
}
</style>
