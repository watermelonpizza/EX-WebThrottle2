<script setup lang="ts">
import FunctionMaps from '@/components/settings/FunctionMaps.vue';
import SavedLocos from '@/components/settings/SavedLocos.vue';
import ThemeChoice from '@/components/settings/ThemeChoice.vue';
import { useConnectionStore } from '@/stores/connection';

const connection = useConnectionStore();
</script>

<template>
  <div class="settings">
    <header class="settings__head">
      <router-link class="settings__back" to="/" data-testid="settings-back">
        {{ connection.status === 'connected' ? 'Back to the console' : 'Back to connect' }}
      </router-link>
      <h1 class="settings__title" data-testid="page-title">Settings</h1>
    </header>

    <ThemeChoice />
    <SavedLocos />
    <FunctionMaps />
  </div>
</template>

<style lang="scss" scoped>
.settings {
  display: grid;
  gap: var(--space-6);
  width: min(52rem, 100%);
  margin: 0 auto;
  padding: var(--space-6) var(--space-5);
}

.settings__head {
  display: grid;
  gap: var(--space-2);
}

.settings__back {
  font-size: var(--text-xs);
}

.settings__title {
  font-size: var(--text-2xl);
  font-weight: 600;
}

:deep(.settings-section) {
  display: grid;
  gap: var(--space-4);
  padding-top: var(--space-5);
  border-top: 1px solid var(--rule);
}

:deep(.settings-section__head) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

:deep(.settings-section__title) {
  font-size: var(--text-lg);
  font-weight: 500;
}

:deep(.settings-section__lead) {
  max-width: 62ch;
  color: var(--ink-muted);
}
</style>
