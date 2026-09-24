<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
</script>

<template>
  <section class="theme-picker" aria-labelledby="theme-picker-title">
    <h2 id="theme-picker-title">Appearance</h2>

    <div class="theme-picker__choices" role="group" aria-label="Theme">
      <UiButton
        variant="ghost"
        :class="{ 'theme-picker__choice--active': settings.theme === 'light' }"
        data-test="theme-light"
        @click="settings.setTheme('light')"
      >
        Light
      </UiButton>
      <UiButton
        variant="ghost"
        :class="{ 'theme-picker__choice--active': settings.theme === 'dark' }"
        data-test="theme-dark"
        @click="settings.setTheme('dark')"
      >
        Night cab
      </UiButton>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.theme-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.theme-picker h2 {
  margin: 0;
  font-size: 1rem;
}

.theme-picker__choices {
  display: flex;
  gap: 0.5rem;
}

.theme-picker__choice--active {
  color: var(--color-brass);
  box-shadow: inset 0 0 0 2px var(--color-brass);
}
</style>
