<script setup lang="ts">
import { ref, watch } from 'vue';
import { useTheme } from 'vuetify';
import { storeToRefs } from 'pinia';

import AppBar from '@/components/layout/AppBar.vue';
import NavigationDrawer from '@/components/layout/NavigationDrawer.vue';
import { useSettingsStore } from '@/stores/settings';

const drawer = ref(true);
const settings = useSettingsStore();
const { theme } = storeToRefs(settings);

const vuetifyTheme = useTheme();
watch(
  theme,
  (name) => {
    vuetifyTheme.global.name.value = name;
  },
  { immediate: true },
);
</script>

<template>
  <v-app>
    <AppBar @toggle-drawer="drawer = !drawer" />
    <NavigationDrawer v-model="drawer" />
    <v-main class="app-main">
      <router-view />
    </v-main>
    <v-footer class="d-flex justify-center text-body-2 text-medium-emphasis">
      {{ new Date().getFullYear() }} &mdash; DCC-EX team
    </v-footer>
  </v-app>
</template>
