<script setup lang="ts">
import SensorRow from '@/components/schematic/SensorRow.vue';
import { useDiagramStore } from '@/stores/diagram';
import { useInventoryStore } from '@/stores/inventory';

const inventory = useInventoryStore();
const diagrams = useDiagramStore();
</script>

<template>
  <div class="list-panel">
    <h2 class="list-panel__title">
      Sensors
      <span class="list-panel__count numeric">{{
        inventory.sensors.length
      }}</span>
    </h2>

    <p
      v-if="inventory.sensors.length === 0"
      class="list-panel__empty"
    >
      No sensors reported by your Command Station.
    </p>
    <ul
      v-else
      class="row-list list-panel__rows"
    >
      <li
        v-for="sensor in inventory.sensors"
        :key="sensor.id"
        :data-testid="`sensor-${sensor.id}`"
      >
        <SensorRow
          :sensor="sensor"
          :name="diagrams.sensorName(sensor.id)"
        />
      </li>
    </ul>
  </div>
</template>
