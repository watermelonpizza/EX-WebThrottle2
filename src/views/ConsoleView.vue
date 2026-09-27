<script setup lang="ts">
import { computed, watch } from 'vue';
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
</script>

<template>
  <div
    v-if="connected"
    class="console"
    :data-preset="workspace.presetId"
  >
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
