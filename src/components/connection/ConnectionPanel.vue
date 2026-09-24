<script setup lang="ts">
import { useConnectionStore } from '@/stores/connection';

const store = useConnectionStore();
</script>

<template>
  <div>
    <div class="d-flex align-center">
      <v-chip
        :color="store.status === 'connected' ? 'success' : 'warning'"
        data-test="status"
      >
        {{ store.status }}
      </v-chip>
      <span v-if="store.transportName" class="ml-2 text-medium-emphasis">
        via {{ store.transportName }}
      </span>
    </div>

    <div class="d-flex flex-wrap mt-3">
      <v-btn
        :disabled="!store.serialAvailable || store.status === 'connected'"
        class="me-2"
        data-test="connect-serial"
        @click="store.connectToSerial()"
      >
        Connect Web Serial
      </v-btn>
      <v-btn
        :disabled="store.status === 'connected'"
        class="me-2"
        data-test="connect-emulator"
        @click="store.connectToEmulator()"
      >
        Emulator
      </v-btn>
      <v-btn
        :disabled="store.status !== 'connected'"
        data-test="disconnect"
        @click="store.disconnect()"
      >
        Disconnect
      </v-btn>
    </div>
  </div>
</template>
