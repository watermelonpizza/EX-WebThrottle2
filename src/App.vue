<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useRoute } from 'vue-router';

import SafetyStrip from '@/components/shell/SafetyStrip.vue';
import TopBar from '@/components/shell/TopBar.vue';
import { useConnectionStore } from '@/stores/connection';
import { useWorkspaceStore } from '@/stores/workspace';

const connection = useConnectionStore();
const workspace = useWorkspaceStore();
const route = useRoute();

const connected = computed(() => connection.status === 'connected');

// The browser tab, history and assistive tech name the page you are on.
watchEffect(() => {
  const page = route.name === 'settings'
    ? 'Settings'
    : connected.value
      ? workspace.preset.label
      : 'Connect';

  document.title = `${page} · WebThrottle`;
});
</script>

<template>
  <div
    class="app"
    :class="{ 'app--connected': connected }"
  >
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
