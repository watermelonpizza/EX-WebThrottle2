<script setup lang="ts">
import { computed } from 'vue';

import { Direction } from '@/core/protocol';
import UiButton from '@/components/ui/UiButton.vue';
import UiRange from '@/components/ui/UiRange.vue';
import { useLocosStore } from '@/stores/locos';
import type { Throttle } from '@/stores/locos';
import { useMapsStore } from '@/stores/maps';

const props = defineProps<{ throttle: Throttle }>();

const locos = useLocosStore();
const maps = useMapsStore();

const functionDefs = computed(() => maps.fullFunctions(props.throttle.mapId));
const mapChoices = computed(() => [
  { title: 'Default', value: 'default' },
  ...maps.maps.map((map) => ({ title: map.name, value: map.id })),
]);

// Locally-tracked "held down" state for momentary functions: the store only
// cares about the last command sent, not the pointer.
const held = new Set<number>();

function holdFunction(fn: number, state: boolean): void {
  if (state) held.add(fn);
  else held.delete(fn);

  locos.setFunction(props.throttle.address, fn, state);
}
</script>

<template>
  <section class="throttle" data-test="throttle-panel">
    <div class="throttle__head">
      <div>
        <div class="throttle__name">{{ throttle.name }}</div>
        <div class="throttle__addr">Address {{ throttle.address }}</div>
      </div>

      <label class="throttle__map">
        <span class="throttle__map-label">Function map</span>
        <select
          class="field"
          :value="throttle.mapId"
          data-test="function-map"
          @change="
            (event) =>
              locos.setMap(
                throttle.address,
                (event.target as HTMLSelectElement).value,
              )
          "
        >
          <option
            v-for="choice in mapChoices"
            :key="choice.value"
            :value="choice.value"
          >
            {{ choice.title }}
          </option>
        </select>
      </label>
    </div>

    <UiRange
      :model-value="throttle.speed"
      :min="0"
      :max="126"
      :step="1"
      class="throttle__speed"
      data-test="speed-slider"
      @update:model-value="locos.setSpeed(throttle.address, $event)"
    />

    <div class="throttle__controls">
      <div class="segmented" data-test="direction-toggle">
        <UiButton
          variant="ghost"
          class="ui-btn-tight"
          :aria-pressed="throttle.direction === Direction.FORWARD"
          :class="{
            'is-selected': throttle.direction === Direction.FORWARD,
          }"
          @click="locos.setDirection(throttle.address, Direction.FORWARD)"
        >
          Forward
        </UiButton>
        <UiButton
          variant="ghost"
          class="ui-btn-tight"
          :aria-pressed="throttle.direction === Direction.REVERSE"
          :class="{
            'is-selected': throttle.direction === Direction.REVERSE,
          }"
          @click="locos.setDirection(throttle.address, Direction.REVERSE)"
        >
          Reverse
        </UiButton>
      </div>

      <span class="throttle__speed-readout">
        {{ throttle.speed }}
      </span>

      <UiButton
        variant="ghost"
        data-test="stop"
        @click="locos.setSpeed(throttle.address, 0)"
      >
        Stop
      </UiButton>
      <UiButton
        tone="danger"
        data-test="estop"
        @click="locos.emergencyStop(throttle.address)"
      >
        E-Stop
      </UiButton>
      <UiButton
        variant="icon"
        aria-label="Release loco"
        data-test="release"
        @click="locos.release(throttle.address)"
      >
        <i class="mdi mdi-close" aria-hidden="true" />
      </UiButton>
    </div>

    <div class="function-keys" data-test="function-keys">
      <template v-for="def in functionDefs" :key="def.fn">
        <UiButton
          v-if="def.momentary"
          :class="{ 'is-selected': held.has(def.fn) }"
          class="function-key"
          data-test="fun"
          :data-function="def.fn"
          @pointerdown="holdFunction(def.fn, true)"
          @pointerup="holdFunction(def.fn, false)"
          @pointerleave="holdFunction(def.fn, false)"
          @pointercancel="holdFunction(def.fn, false)"
        >
          {{ def.label }}
        </UiButton>
        <UiButton
          v-else
          :class="{ 'is-selected': throttle.functions[def.fn] }"
          class="function-key"
          data-test="fun"
          :data-function="def.fn"
          @click="locos.toggleFunction(throttle.address, def.fn)"
        >
          {{ def.label }}
        </UiButton>
      </template>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.throttle {
  padding: 1rem;
  margin-top: 1rem;

  background: var(--color-panel-raise);
  border-radius: var(--radius);
  box-shadow: var(--panel-shadow);
}

.throttle__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap);
  flex-wrap: wrap;
}

.throttle__name {
  font-weight: 700;
  font-size: 1.05rem;
}

.throttle__addr {
  color: var(--color-ink-dim);
  font-size: 0.85rem;
}

.throttle__map {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.throttle__map-label {
  font-size: 0.8rem;
  color: var(--color-ink-dim);
}

.throttle__speed {
  margin-top: 0.75rem;
}

.throttle__controls {
  display: flex;
  align-items: center;
  gap: var(--gap);
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.throttle__speed-readout {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
}

.segmented {
  display: inline-flex;
  padding: 0.25rem;
  gap: 0.25rem;

  background: var(--color-inset);
  border-radius: var(--radius);
}

.ui-btn-tight {
  min-height: 2.25rem;
  padding: 0 0.75rem;
}

.is-selected {
  color: var(--color-brass-ink);
  background: var(--color-brass);
}

.ui-btn--ghost.is-selected {
  box-shadow: none;
}

.function-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 1rem;

  .function-key {
    min-width: 4.5rem;
  }
}
</style>
