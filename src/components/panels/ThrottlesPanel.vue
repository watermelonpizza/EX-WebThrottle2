<script setup lang="ts">
import DriveForm from '@/components/throttle/DriveForm.vue';
import LocoDesk from '@/components/throttle/LocoDesk.vue';
import { useLocosStore } from '@/stores/locos';

const locos = useLocosStore();
</script>

<template>
  <div class="throttles">
    <LocoDesk
      v-for="(throttle, index) in locos.throttles"
      :key="throttle.address"
      :throttle="throttle"
      :can-add="index === 0"
    />

    <div v-if="locos.throttles.length === 0" class="throttles__empty">
      <h2 class="throttles__title">Drive a loco</h2>
      <p class="throttles__lead">
        Type the loco's DCC address and press Drive. Turn track power on in the
        strip at the bottom if the loco does not move.
      </p>
      <DriveForm />
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Locos stack in a narrow panel and sit side by side in a wide one; either
// way each desk shares the room equally and picks its own size variant.
.throttles {
  display: grid;
  grid-auto-rows: minmax(10rem, 1fr);
  height: 100%;
  overflow-y: auto;
  background: var(--panel);
}

.throttles > :deep(.desk + .desk) {
  border-top: 1px solid var(--rule);
}

@container panel (width >= 48rem) {
  .throttles {
    grid-auto-flow: column;
    grid-auto-columns: minmax(20rem, 1fr);
    grid-auto-rows: auto;
    overflow-x: auto;
  }

  .throttles > :deep(.desk + .desk) {
    border-top: 0;
    border-left: 1px solid var(--rule);
  }
}

.throttles__empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 44rem;
  padding: var(--space-4);
}

@media (max-width: 48rem) {
  .throttles {
    grid-auto-rows: auto;
    height: auto;
  }
}

.throttles__title {
  font-size: var(--text-lg);
}

.throttles__lead {
  max-width: 38ch;
  color: var(--ink-muted);
}
</style>
