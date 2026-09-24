<script setup lang="ts">
import ThrottlePanel from '@/components/throttle/ThrottlePanel.vue';
import { useLocosStore } from '@/stores/locos';

const locos = useLocosStore();
</script>

<template>
  <div class="driving-panel">
    <template v-if="locos.throttles.length > 0">
      <ThrottlePanel
        v-for="throttle in locos.throttles"
        :key="throttle.address"
        :throttle="throttle"
      />
    </template>

    <p v-else class="driving-panel__muted" data-test="no-throttles">
      Acquire a locomotive with the Drive button to see its throttle here.
    </p>
  </div>
</template>

<style lang="scss" scoped>
.driving-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.driving-panel__muted {
  margin: 0;

  color: var(--color-ink-dim);
}
</style>
