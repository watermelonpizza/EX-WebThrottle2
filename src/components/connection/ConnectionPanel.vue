<script setup lang="ts">
import UiBadge from '@/components/ui/UiBadge.vue';
import UiButton from '@/components/ui/UiButton.vue';
import { useConnectionStore } from '@/stores/connection';

const store = useConnectionStore();

const lamp =
  store.status === 'connected'
    ? 'on'
    : store.status === 'connecting'
      ? 'danger'
      : 'off';
</script>

<template>
  <div>
    <div class="connection-panel__status">
      <UiBadge
        :state="lamp"
        :label="`${store.status}${store.transportName ? ` via ${store.transportName}` : ''}`"
        data-test="status"
      />
    </div>

    <div class="connection-panel__actions">
      <UiButton
        :disabled="!store.serialAvailable || store.status === 'connected'"
        data-test="connect-serial"
        @click="store.connectToSerial()"
      >
        <i class="mdi mdi-usb-port" aria-hidden="true" />
        Connect Web Serial
      </UiButton>
      <UiButton
        variant="ghost"
        :disabled="store.status === 'connected'"
        data-test="connect-emulator"
        @click="store.connectToEmulator()"
      >
        <i class="mdi mdi-chip" aria-hidden="true" />
        Emulator
      </UiButton>
      <UiButton
        v-if="store.status !== 'disconnected'"
        tone="danger"
        data-test="disconnect"
        @click="store.disconnect()"
      >
        Disconnect
      </UiButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.connection-panel__status {
  display: flex;
}

.connection-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
  margin-top: 0.75rem;
}
</style>
