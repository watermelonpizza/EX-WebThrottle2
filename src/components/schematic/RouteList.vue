<script setup lang="ts">
import SensorRow from '@/components/schematic/SensorRow.vue';
import TurnoutRow from '@/components/schematic/TurnoutRow.vue';
import { useDiagramStore } from '@/stores/diagram';
import { useInventoryStore } from '@/stores/inventory';

const inventory = useInventoryStore();
const diagrams = useDiagramStore();
</script>

<template>
  <div class="route-list" data-testid="route-tiles">
    <header class="route-list__head">
      <h2 class="route-list__title">Points and sensors</h2>
      <p class="route-list__lead">
        From your Command Station · {{ inventory.turnouts.length }}
        {{ inventory.turnouts.length === 1 ? 'turnout' : 'turnouts' }},
        {{ inventory.sensors.length }}
        {{ inventory.sensors.length === 1 ? 'sensor' : 'sensors' }}
      </p>
    </header>

    <p v-if="inventory.turnouts.length === 0" class="route-list__muted">
      Your Command Station has not reported any turnouts/points. Once they are
      set up on it, they appear here.
    </p>

    <ul v-else class="row-list route-list__rows">
      <li v-for="turnout in inventory.turnouts" :key="turnout.id">
        <TurnoutRow
          :turnout="turnout"
          :name="diagrams.turnoutName(turnout.id, turnout.label)"
          @toggle="inventory.toggleTurnout(turnout.id)"
        />
      </li>
    </ul>

    <ul v-if="inventory.sensors.length > 0" class="row-list route-list__rows">
      <li
        v-for="sensor in inventory.sensors"
        :key="sensor.id"
        :data-testid="`sensor-tile-${sensor.id}`"
      >
        <SensorRow :sensor="sensor" :name="diagrams.sensorName(sensor.id)" />
      </li>
    </ul>

    <p class="route-list__muted">
      A layout diagram editor is on the way. Until then, each turnout draws its
      own route here.
    </p>
  </div>
</template>

<style lang="scss" scoped>
// Stands in for the diagram where there is none, or no room for one: the
// same turnouts and sensors as rows, each turnout drawing its own route.
.route-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
  height: 100%;
  padding: var(--space-3) var(--space-4);
  overflow: auto;
}

.route-list__title {
  font-size: var(--text-md);
}

.route-list__lead,
.route-list__muted {
  color: var(--ink-muted);
}

// The whole list scrolls here, so the rows are never held to a height.
.route-list__rows {
  flex: none;
  max-block-size: none;
  column-gap: var(--space-5);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  overflow: visible;
}
</style>
