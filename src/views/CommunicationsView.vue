<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

import ConnectionPanel from '@/components/connection/ConnectionPanel.vue';
import { useConnectionStore } from '@/stores/connection';

const store = useConnectionStore();
const command = ref('');
const traceList = ref<HTMLElement>();

// Keep the newest traffic visible as the log grows.
watch(
  () => store.trace.length,
  async () => {
    await nextTick();

    traceList.value?.scrollTo({ top: traceList.value.scrollHeight });
  },
);

function sendCommand(): void {
  const trimmed = command.value.trim();

  if (!trimmed) return;

  store.send(trimmed);
  command.value = '';
}
</script>

<template>
  <v-container>
    <h1 class="text-h4 mb-4" data-test="page-title">Communications</h1>

    <v-card title="Connection" class="mb-4">
      <v-card-text>
        <ConnectionPanel />
      </v-card-text>
    </v-card>

    <v-card title="Raw traffic" class="mb-4">
      <v-card-text>
        <div ref="traceList" class="trace-list" data-test="trace-list">
          <p v-if="store.trace.length === 0" class="text-medium-emphasis">
            No traffic yet.
          </p>
          <p
            v-for="(entry, index) in store.trace"
            :key="index"
            :class="entry.direction"
          >
            <span class="text-body-2">
              {{ new Date(entry.at).toLocaleTimeString() }}
            </span>
            <b class="mx-1">{{ entry.direction }}</b>
            {{ entry.text }}
          </p>
        </div>
      </v-card-text>
    </v-card>

    <v-card title="Command">
      <v-card-text>
        <v-text-field
          v-model="command"
          label="Raw DCC-EX command (e.g. &lt;1&gt; for power on)"
          density="compact"
          hide-details
          data-test="command-input"
          @keydown.enter="sendCommand"
        />
        <v-btn
          color="primary"
          class="mt-2"
          :disabled="!command.trim()"
          data-test="send-command"
          @click="sendCommand"
        >
          Send
        </v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style lang="scss" scoped>
.trace-list {
  max-height: 24rem;
  overflow-y: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
}

.trace-list p {
  margin: 0;
}

.sent {
  color: rgb(var(--v-theme-primary));
}

.received {
  color: rgb(var(--v-theme-success));
}
</style>
