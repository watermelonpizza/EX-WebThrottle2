<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  speed: number;
  label: string;
  valueText: string;
}>();

defineEmits<{ change: [speed: number] }>();

// The DCC-EX 128-step range: 0 is stop and 126 the top speed. Ticks every
// sixth of the range put a mark at each 21 steps.
const MAX_SPEED = 126;
const TICKS = [0, 21, 42, 63, 84, 105, 126];

const fill = computed(() => `${(props.speed / MAX_SPEED) * 100}%`);
</script>

<template>
  <div class="scale" :style="{ '--fill': fill }">
    <input
      class="scale__input"
      type="range"
      min="0"
      :max="MAX_SPEED"
      step="1"
      :value="speed"
      :aria-label="label"
      :aria-valuetext="valueText"
      data-testid="speed-slider"
      @input="$emit('change', Number(($event.target as HTMLInputElement).value))"
    />
    <div class="scale__ticks" aria-hidden="true">
      <span
        v-for="tick in TICKS"
        :key="tick"
        class="scale__tick numeric"
        :style="{ left: `${(tick / MAX_SPEED) * 100}%` }"
      >
        {{ tick }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.scale {
  --bar: var(--space-2);

  container: scale / inline-size;
  position: relative;
  padding-bottom: var(--space-6);
}

/* A short scale keeps every mark but numbers every other one (0, 42, 84,
   126), so the numbers never run into each other. */
@container scale (width < 16rem) {
  .scale__tick:nth-child(even) {
    color: transparent;
  }
}

.scale__input {
  display: block;
  width: 100%;
  height: var(--space-4);
  margin: 0;

  background: transparent;
  cursor: pointer;
  appearance: none;

  &::-webkit-slider-runnable-track {
    height: var(--bar);
    background: linear-gradient(
      to right,
      var(--accent) 0 var(--fill),
      var(--track-idle) var(--fill) 100%
    );
  }

  &::-moz-range-track {
    height: var(--bar);
    background: linear-gradient(
      to right,
      var(--accent) 0 var(--fill),
      var(--track-idle) var(--fill) 100%
    );
  }

  /* The thumb is a slim marker standing proud of the bar, like a needle on a
     scale; it is centred on the bar, whatever the bar's thickness. */
  &::-webkit-slider-thumb {
    width: var(--space-1);
    height: calc(var(--bar) * 3);
    margin-top: calc(var(--bar) * -1);

    background: var(--accent);
    border: 0;
    border-radius: 1px;
    appearance: none;
  }

  &::-moz-range-thumb {
    width: var(--space-1);
    height: calc(var(--bar) * 3);

    background: var(--accent);
    border: 0;
    border-radius: 1px;
  }

  &:focus-visible {
    outline-offset: var(--space-1);
  }
}

.scale__ticks {
  position: absolute;
  inset: var(--space-4) 0 0;
}

.scale__tick {
  position: absolute;
  top: 0;
  translate: -50% 0;
  padding-top: var(--space-3);

  color: var(--ink-muted);
  font-size: var(--text-xs);
  line-height: 1;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 1px;
    height: var(--space-2);
    background: var(--edge);
  }

  /* The end labels sit inside the bar's ends rather than hanging past them. */
  &:first-child {
    translate: 0 0;

    &::before {
      left: 0;
    }
  }

  &:last-child {
    translate: -100% 0;

    &::before {
      right: 0;
      left: auto;
    }
  }
}
</style>
