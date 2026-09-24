<script setup lang="ts">
import { useRouter } from 'vue-router';

import UiButton from '@/components/ui/UiButton.vue';

const router = useRouter();
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
        @click="router.push('/settings')"
      >
        <i class="mdi mdi-cog-outline" aria-hidden="true" />
        Settings
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
