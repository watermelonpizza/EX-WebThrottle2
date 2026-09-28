<script setup lang="ts">
import { computed, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';

import ConnectScreen from '@/components/shell/ConnectScreen.vue';
import WorkspaceLayout from '@/components/workspace/WorkspaceLayout.vue';
import { useConnectionStore } from '@/stores/connection';
import { useWorkspaceStore } from '@/stores/workspace';

const connection = useConnectionStore();
const workspace = useWorkspaceStore();
const route = useRoute();

const connected = computed(() => connection.status === 'connected');

// A role link (#/points) picks that preset and is remembered for next time.
watch(
  () => route.params.role,
  (role) => {
    if (typeof role === 'string') {
      workspace.setPreset(role);
    }
  },
  { immediate: true },
);

// Connecting swaps the connect page for the workspace, and losing the
// connection swaps it back, taking the focus with the page it was on. Start
// again at the new page's heading, so a screen reader says where you are.
watch(connected, async () => {
  await nextTick();
  document.querySelector<HTMLElement>('h1')?.focus();
});
</script>

<template>
  <div
    v-if="connected"
    class="console"
    :data-preset="workspace.presetId"
  >
    <h1
      class="visually-hidden"
      tabindex="-1"
      data-testid="role-title"
    >
      {{ workspace.preset.label }}
    </h1>
    <WorkspaceLayout :node="workspace.preset.layout" />
  </div>
  <ConnectScreen v-else />
</template>

<style scoped>
.console {
  display: flex;
  height: 100%;
}

@media (max-width: 48rem) {
  .console {
    height: auto;
    min-height: 100%;
  }
}
</style>
