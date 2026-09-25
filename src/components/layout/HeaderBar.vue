<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import UiButton from '@/components/ui/UiButton.vue';

const route = useRoute();
const router = useRouter();
const isSettings = computed(() => route.name === 'settings');

function toggleSettings(): void {
  void router.push(isSettings.value ? { name: 'console' } : { name: 'settings' });
}
</script>

<template>
  <header class="header-bar">
    <RouterLink
      to="/"
      class="header-bar__brand"
      data-test="brand"
      aria-label="WebThrottle home"
    >
      <img class="header-bar__logo" src="@/assets/WebThrottle.png" alt="" />
    </RouterLink>

    <div class="header-bar__actions">
      <UiButton
        variant="ghost"
        data-test="settings-link"
        @click="toggleSettings"
      >
        <i
          class="mdi"
          :class="isSettings ? 'mdi-arrow-left' : 'mdi-cog-outline'"
          aria-hidden="true"
        />
        {{ isSettings ? 'Console' : 'Settings' }}
      </UiButton>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.header-bar {
  display: flex;
  align-items: center;
  gap: var(--gap);
  min-height: var(--control-h);
  padding: 0.375rem var(--gap);

  background: var(--color-panel);
  box-shadow: inset 0 -1px 0 var(--color-panel-edge);
}

.header-bar__brand {
  display: inline-flex;
  align-items: center;

  text-decoration: none;
}

.header-bar__logo {
  height: 1.75rem;
  width: auto;
}

.header-bar__actions {
  display: flex;
  align-items: center;
  gap: var(--gap);
  margin-left: auto;
}

@media (max-width: 40rem) {
  .header-bar__logo {
    height: 1.4rem;
  }
}
</style>
