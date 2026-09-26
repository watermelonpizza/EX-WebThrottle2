<script setup lang="ts">
import { computed } from 'vue';

import SafetyStrip from '@/components/shell/SafetyStrip.vue';
import TopBar from '@/components/shell/TopBar.vue';
import { useConnectionStore } from '@/stores/connection';

const connection = useConnectionStore();

const connected = computed(() => connection.status === 'connected');
</script>

<template>
  <div class="app" :class="{ 'app--connected': connected }">
    <TopBar v-if="connected" />
    <main class="app__main">
      <router-view />
    </main>
    <SafetyStrip v-if="connected" />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app__main {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
