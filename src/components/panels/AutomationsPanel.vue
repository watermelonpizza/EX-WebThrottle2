<script setup lang="ts">
import { computed } from 'vue';

import RouteRow from '@/components/schematic/RouteRow.vue';
import { useLocosStore } from '@/stores/locos';
import { useRoutesStore } from '@/stores/routes';

const routes = useRoutesStore();
const locos = useLocosStore();

const loco = computed({
  get: () => routes.automationLoco?.address,
  set: (address) => {
    if (address !== undefined) {
      routes.pickLoco(address);
    }
  },
});
</script>

<template>
  <div class="list-panel">
    <div class="list-panel__head">
      <h2 class="list-panel__title">
        Automations
        <span class="list-panel__count numeric">{{
          routes.automations.length
        }}</span>
      </h2>

      <!-- STOP ALL paused them; only this Throttle's own pause is offered
           back, since EXRAIL does not say whether it is paused. -->
      <div
        v-if="routes.paused"
        class="automations__paused"
      >
        Paused by STOP ALL
        <button
          type="button"
          class="key"
          data-testid="resume-automations"
          @click="routes.resumeAll()"
        >
          Resume
        </button>
      </div>

      <!-- Which of your desks' locos an automation sets off with. -->
      <label
        v-else-if="routes.automations.length > 0 && locos.throttles.length > 0"
        class="automations__loco"
      >
        With
        <select
          v-model.number="loco"
          class="field"
          data-testid="automation-loco"
        >
          <option
            v-for="throttle in locos.throttles"
            :key="throttle.address"
            :value="throttle.address"
          >
            {{ throttle.name }}
          </option>
        </select>
      </label>
      <p
        v-else-if="routes.automations.length > 0"
        class="automations__hint"
      >
        Drive a loco to start one with it.
      </p>
    </div>

    <p
      v-if="routes.automations.length === 0"
      class="list-panel__empty"
    >
      No automations reported by your Command Station. Automations are written
      in its EXRAIL script.
    </p>
    <ul
      v-else
      class="row-list list-panel__rows"
    >
      <li
        v-for="automation in routes.automations"
        :key="automation.id"
      >
        <RouteRow
          :route="automation"
          kind="automation"
          :paused="routes.paused"
          :loco="routes.automationLoco?.name"
          @start="routes.startWithLoco(automation.id)"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.automations__paused,
.automations__loco {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--ink-muted);
}

.automations__loco .field {
  min-width: 0;
  color: var(--ink);
}

.automations__hint {
  color: var(--ink-muted);
}
</style>
