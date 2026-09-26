<script setup lang="ts">
import { useInventoryStore } from '@/stores/inventory';

const inventory = useInventoryStore();
</script>

<template>
  <div class="list-panel">
    <h2 class="list-panel__title">
      Outputs
      <span class="list-panel__count numeric">{{
        inventory.outputs.length
      }}</span>
    </h2>

    <p v-if="inventory.outputs.length === 0" class="list-panel__empty">
      No outputs reported by your Command Station.
    </p>
    <ul v-else class="row-list list-panel__rows">
      <li v-for="output in inventory.outputs" :key="output.id">
        <!-- A switch: the Command Station's answer, not the press, sets it. -->
        <button
          type="button"
          class="output"
          :class="{ 'output--on': output.active }"
          role="switch"
          :aria-checked="output.active"
          :data-testid="`output-${output.id}`"
          @click="inventory.toggleOutput(output.id)"
        >
          <span class="output__lamp" aria-hidden="true" />
          <span class="output__name">Output {{ output.id }}</span>
          <span class="output__state">{{ output.active ? 'ON' : 'OFF' }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.output {
  display: grid;
  align-items: center;
  gap: var(--space-3);
  grid-template-columns: auto minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  padding: 0 var(--space-2);

  color: var(--ink);
  background: none;
  border: 0;
  border-bottom: 1px solid var(--rule);
  text-align: left;

  transition: background-color 150ms var(--ease-out);

  &:hover {
    background: var(--raised);
  }
}

/* Off is an empty ring and on a filled lamp, so the shape says it as well as
   the colour and the word. */
.output__lamp {
  width: var(--space-3);
  height: var(--space-3);
  border: var(--line) solid var(--track-idle);
  border-radius: 50%;
}

.output__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.output__state {
  color: var(--ink-muted);
  font-weight: 600;
}

.output--on {
  .output__lamp {
    background: var(--accent);
    border-color: var(--accent);
  }

  .output__state {
    color: var(--accent);
  }
}
</style>
