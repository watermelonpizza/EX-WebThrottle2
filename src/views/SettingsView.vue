<script setup lang="ts">
import ConsoleLayout from '@/components/settings/ConsoleLayout.vue';
import FunctionMapsEditor from '@/components/settings/FunctionMapsEditor.vue';
import ThemePicker from '@/components/settings/ThemePicker.vue';
</script>

<template>
  <div class="settings">
    <h1 class="settings__title" data-test="page-title">Settings</h1>

    <ThemePicker />
    <ConsoleLayout />
    <FunctionMapsEditor />
  </div>
</template>

<style lang="scss" scoped>
.settings {
  max-width: 44rem;
  margin: 0 auto;
  padding: 1rem;
}

.settings__title {
  margin-top: 0;
}

.settings > * + * {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-panel-edge);
}
</style>
