<script setup lang="ts">
import TurnoutRow from '@/components/schematic/TurnoutRow.vue';
import { useDiagramStore } from '@/stores/diagram';
import { useInventoryStore } from '@/stores/inventory';

const inventory = useInventoryStore();
const diagrams = useDiagramStore();
</script>

<template>
  <div class="list-panel" data-testid="layout-panel">
    <h2 class="list-panel__title">
      Points
      <span class="list-panel__count numeric">{{
        inventory.turnouts.length
      }}</span>
    </h2>

    <p v-if="inventory.turnouts.length === 0" class="list-panel__empty">
      No turnouts/points reported by your Command Station.
    </p>
    <ul v-else class="row-list list-panel__rows">
      <li v-for="turnout in inventory.turnouts" :key="turnout.id">
        <TurnoutRow
          :turnout="turnout"
          :name="diagrams.turnoutName(turnout.id, turnout.label)"
          @toggle="inventory.toggleTurnout(turnout.id)"
        />
      </li>
    </ul>
  </div>
</template>
