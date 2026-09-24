<script setup lang="ts">
// Console sliders are native <input type="range"> — full keyboard/home/end
// behaviour for free — restyled to brass-on-wood via pseudo-elements.
const model = defineModel<number>({ required: true });

defineProps<{
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}>();
</script>

<template>
  <input
    v-model.number="model"
    class="ui-range"
    type="range"
    :min="min ?? 0"
    :max="max ?? 100"
    :step="step ?? 1"
    :disabled="disabled"
  />
</template>

<style lang="scss" scoped>
// Slider composition differs per engine; each gets its own track/thumb
// shapes, all reading the same tokens.
.ui-range {
  min-height: var(--control-h);

  width: 100%;
  margin: 0;

  -webkit-appearance: none;
  appearance: none;

  background: transparent;

  &:focus-visible {
    outline: 2px solid var(--color-brass);
    outline-offset: 2px;
  }
}

.ui-range::-webkit-slider-runnable-track {
  height: 0.625rem;

  background: var(--color-inset);
  border-radius: 999px;
  box-shadow: inset 0 2px 3px rgb(0 0 0 / 0.3);
}

.ui-range::-webkit-slider-thumb {
  width: 1.5rem;
  height: 1.75rem;
  margin-top: -0.5625rem;

  -webkit-appearance: none;
  appearance: none;

  background: var(--color-brass);
  border-radius: 0.25rem;

  // Chunk of machined brass sat on the track.
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 0.4),
    inset 0 -3px 0 rgb(0 0 0 / 0.25),
    0 2px 3px rgb(0 0 0 / 0.35);
}

.ui-range::-moz-range-track {
  height: 0.625rem;

  background: var(--color-inset);
  border-radius: 999px;
  box-shadow: inset 0 2px 3px rgb(0 0 0 / 0.3);
}

.ui-range::-moz-range-thumb {
  width: 1.5rem;
  height: 1.75rem;
  border: 0;

  background: var(--color-brass);
  border-radius: 0.25rem;
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 0.4),
    inset 0 -3px 0 rgb(0 0 0 / 0.25);
}
</style>
