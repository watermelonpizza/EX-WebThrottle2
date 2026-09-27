<script setup lang="ts">
import type { FunctionDef } from '@/core/loco/functions';

const props = defineProps<{
  functions: FunctionDef[];
  states: boolean[];
  // Show only the first keys when the desk has room for no more whole rows.
  limit?: number;
}>();

const emit = defineEmits<{ set: [fn: number, on: boolean] }>();

// Momentary functions (horn, whistle) sound only while held, by pointer or by
// Space/Enter; latching ones toggle on each press.
const held = new Set<number>();

function hold(def: FunctionDef, on: boolean): void {
  if (!def.momentary || held.has(def.fn) === on) {
    return;
  }

  if (on) {
    held.add(def.fn);
  } else {
    held.delete(def.fn);
  }

  emit('set', def.fn, on);
}

function press(def: FunctionDef): void {
  if (!def.momentary) {
    emit('set', def.fn, !props.states[def.fn]);
  }
}

function keyDown(def: FunctionDef, event: KeyboardEvent): void {
  if (!def.momentary || event.repeat) {
    return;
  }

  event.preventDefault();
  hold(def, true);
}

function keyUp(def: FunctionDef, event: KeyboardEvent): void {
  if (def.momentary) {
    event.preventDefault();
    hold(def, false);
  }
}
</script>

<template>
  <div
    class="fn-keys"
    role="group"
    aria-label="Functions"
  >
    <button
      v-for="def in limit === undefined ? functions : functions.slice(0, limit)"
      :key="def.fn"
      type="button"
      class="fn-key"
      :class="{ 'fn-key--on': states[def.fn] }"
      :aria-pressed="def.momentary ? undefined : Boolean(states[def.fn])"
      :aria-label="`F${def.fn} ${def.label}${def.momentary ? ', hold to use' : ''}`"
      :title="`F${def.fn}`"
      data-testid="fun"
      :data-function="def.fn"
      @click="press(def)"
      @pointerdown="hold(def, true)"
      @pointerup="hold(def, false)"
      @pointerleave="hold(def, false)"
      @pointercancel="hold(def, false)"
      @keydown.space="keyDown(def, $event)"
      @keydown.enter="keyDown(def, $event)"
      @keyup.space="keyUp(def, $event)"
      @keyup.enter="keyUp(def, $event)"
    >
      {{ def.label }}
    </button>
  </div>
</template>

<style scoped>
.fn-keys {
  display: grid;
  gap: var(--control-gap);
  /* As many keys per row as fit a label of about ten characters, whatever
     the panel's size: four on a desk, more on a wide cab, three on a phone. */
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 10ch), 1fr));
  grid-auto-rows: var(--control);
  font-size: var(--text-sm);
}

.fn-key {
  min-width: 0;
  padding: 0 var(--space-1);

  color: var(--ink);
  background: var(--raised);
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  font-size: inherit;
  line-height: var(--leading-tight);
  /* Labels wrap between words, hyphenating a long one where the browser has a
     dictionary and breaking it as a last resort, but never clipping it: a
     function is only useful if it can be read in full. */
  hyphens: auto;
  overflow-wrap: break-word;
  touch-action: manipulation;
  user-select: none;

  transition:
    background-color 150ms var(--ease-out),
    box-shadow 150ms var(--ease-out);

  &:hover {
    background: var(--raised-hover);
  }

  &:active {
    background: var(--raised-hover);
    box-shadow: inset 0 var(--space-1) 0 rgb(0 0 0 / 0.2);
  }
}

/* On is a lit key: teal edge, teal label and a teal wash, the same teal that
   marks every live value, readable at arm's length in every theme. */
.fn-key--on {
  color: var(--accent);
  background: color-mix(in oklab, var(--accent) 16%, var(--raised));
  border-color: var(--accent);
  font-weight: 600;

  &:hover {
    background: color-mix(in oklab, var(--accent) 22%, var(--raised));
  }
}
</style>
