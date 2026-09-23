<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';

import { useSettingsStore } from '@/stores/settings';

const emit = defineEmits<{ 'toggle-drawer': [] }>();
const settings = useSettingsStore();
const { theme } = storeToRefs(settings);
const route = useRoute();
</script>

<template>
  <v-app-bar flat border class="app-bar">
    <template #prepend>
      <v-app-bar-nav-icon
        icon="mdi-menu"
        aria-label="Toggle navigation"
        data-test="nav-toggle"
        @click="emit('toggle-drawer')"
      />
    </template>

    <v-app-bar-title>
      {{ route.meta.title }}
    </v-app-bar-title>

    <template #append>
      <v-btn
        :icon="theme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        :aria-label="
          theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
        "
        data-test="theme-toggle"
        @click="settings.toggleTheme()"
      />
    </template>
  </v-app-bar>
</template>

<style lang="scss" scoped>
.app-bar {
  backdrop-filter: blur(6px);
}
</style>
