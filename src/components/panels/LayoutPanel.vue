<script setup lang="ts">
import { computed } from 'vue';

import UiButton from '@/components/ui/UiButton.vue';
import UiSwitch from '@/components/ui/UiSwitch.vue';
import { TurnoutState } from '@/core/protocol';
import { useConnectionStore } from '@/stores/connection';
import { useInventoryStore } from '@/stores/inventory';

const connection = useConnectionStore();
const inventory = useInventoryStore();

const offline = computed(() => connection.status !== 'connected');

const nothingReported = computed(
  () =>
    inventory.turnouts.length === 0 &&
    inventory.outputs.length === 0 &&
    inventory.sensors.length === 0,
);
</script>

<template>
  <div class="layout-panel" data-test="layout-panel">
    <section v-if="inventory.turnouts.length > 0" class="inventory">
      <h3 class="inventory__title">Turnouts</h3>
      <ul class="inventory__list">
        <li
          v-for="turnout in inventory.turnouts"
          :key="turnout.id"
          class="inventory__row"
          :data-test="`turnout-${turnout.id}`"
        >
          <span class="inventory__name">
            {{ turnout.label || `Turnout ${turnout.id}` }}
          </span>
          <span class="inventory__state">
            {{ turnout.state === TurnoutState.THROWN ? 'Thrown' : 'Closed' }}
          </span>
          <UiButton
            :disabled="offline"
            :data-test="`turnout-toggle-${turnout.id}`"
            @click="inventory.toggleTurnout(turnout.id)"
          >
            {{ turnout.state === TurnoutState.THROWN ? 'Close' : 'Throw' }}
          </UiButton>
        </li>
      </ul>
    </section>

    <section v-if="inventory.outputs.length > 0" class="inventory">
      <h3 class="inventory__title">Outputs</h3>
      <ul class="inventory__list">
        <li
          v-for="output in inventory.outputs"
          :key="output.id"
          class="inventory__row"
        >
          <UiSwitch
            :model-value="output.active"
            :label="`Output ${output.id}`"
            :disabled="offline"
            :data-test="`output-${output.id}`"
            @update:model-value="inventory.toggleOutput(output.id)"
          />
        </li>
      </ul>
    </section>

    <section v-if="inventory.sensors.length > 0" class="inventory">
      <h3 class="inventory__title">Sensors</h3>
      <ul class="inventory__list">
        <li
          v-for="sensor in inventory.sensors"
          :key="sensor.id"
          class="inventory__row"
          :data-test="`sensor-${sensor.id}`"
        >
          <span
            class="inventory__lamp"
            :class="{ 'inventory__lamp--on': sensor.active }"
            aria-hidden="true"
          />
          <span class="inventory__name">Sensor {{ sensor.id }}</span>
          <span class="inventory__state">
            {{ sensor.active ? 'Active' : 'Clear' }}
          </span>
        </li>
      </ul>
    </section>

    <p v-if="nothingReported" class="layout-panel__muted">
      This command station has no turnouts, outputs or sensors set up, so there
      is nothing to control here yet.
    </p>

    <p class="layout-panel__muted">
      Routes and automations are not listed yet — they need EX-RAIL support on
      the command station.
    </p>
  </div>
</template>

<style lang="scss" scoped>
.layout-panel__muted {
  margin: 0;

  color: var(--color-ink-dim);
}

.inventory {
  margin-bottom: 1rem;
}

.inventory__title {
  margin: 0 0 0.25rem;

  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-ink-dim);
}

.inventory__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.inventory__row {
  display: flex;
  align-items: center;
  gap: var(--gap);
  padding: 0.375rem 0;
  flex-wrap: wrap;

  border-top: 1px solid var(--color-panel-edge);
}

.inventory__row:first-of-type {
  border-top: 0;
}

.inventory__name {
  font-weight: 600;
}

.inventory__state {
  margin-left: auto;

  font-size: 0.8rem;
  color: var(--color-ink-dim);
}

.inventory__lamp {
  width: 0.75rem;
  height: 0.75rem;
  flex: none;

  background: var(--color-inset);
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.4);
}

.inventory__lamp--on {
  background: var(--color-brass);
}
</style>
