<script setup lang="ts">
import ConnectionPanel from '@/components/connection/ConnectionPanel.vue';
import { useConnectionStore } from '@/stores/connection';

const store = useConnectionStore();
</script>

<template>
  <v-container>
    <h1 class="text-h4 mb-4" data-test="page-title">Throttles</h1>

    <v-card class="mb-4">
      <v-card-text>
        <ConnectionPanel />

        <p class="mt-4 mb-0 text-medium-emphasis">
          {{
            store.status === 'connected'
              ? `Connected via ${store.transportName}. The locomotive controls arrive with the next stage — head to Communications for diagnostics.`
              : 'Connect to your command station to start driving.'
          }}
        </p>
      </v-card-text>
    </v-card>
  </v-container>
</template>
