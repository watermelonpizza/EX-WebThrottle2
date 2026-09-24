<script setup lang="ts">
import { watch } from 'vue';
import { storeToRefs } from 'pinia';

import HeaderBar from '@/components/layout/HeaderBar.vue';
import StatusBar from '@/components/layout/StatusBar.vue';
import { applyTheme } from '@/styles/theme';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const { theme } = storeToRefs(settings);

// Keep the selector flipped the moment the setting changes; initial paint is
// handled in main.ts.
watch(theme, (name) => applyTheme(name), { immediate: true });
</script>

<template>
  <div class="shell">
    <HeaderBar />
    <main class="shell__main">
      <router-view />
    </main>
    <StatusBar />
  </div>
</template>

<style lang="scss" scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.shell__main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
