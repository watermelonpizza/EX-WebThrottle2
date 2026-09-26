<script setup lang="ts">
import type { SensorEntry } from '@/stores/inventory';

defineProps<{ sensor: SensorEntry; name: string }>();
</script>

<template>
  <div class="sensor" :class="{ 'sensor--occupied': sensor.active }">
    <svg class="sensor__track" viewBox="0 0 64 16" aria-hidden="true">
      <line x1="2" y1="8" x2="62" y2="8" />
      <line x1="2" y1="2" x2="2" y2="14" />
      <line x1="62" y1="2" x2="62" y2="14" />
    </svg>
    <span class="sensor__name" :title="name">{{ name }}</span>
    <span class="sensor__state">{{ sensor.active ? 'Occupied' : 'Clear' }}</span>
  </div>
</template>

<style scoped>
/* A read-only row: the stretch of track it watches, its name and its state as
   a word. Occupied lights the track red, as on the diagram. */
.sensor {
  display: grid;
  align-items: center;
  gap: var(--space-3);
  grid-template-columns: auto minmax(0, 1fr) auto;
  height: 100%;
  padding: 0 var(--space-2);

  border-bottom: 1px solid var(--rule);
}

.sensor__track {
  height: var(--text-sm);
  aspect-ratio: 4;
  stroke: var(--track-idle);
  stroke-width: 3;
}

.sensor__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sensor__state {
  color: var(--ink-muted);
}

.sensor--occupied {
  .sensor__track {
    stroke: var(--occupied);
  }

  .sensor__state {
    color: var(--occupied);
    font-weight: 600;
  }
}
</style>
