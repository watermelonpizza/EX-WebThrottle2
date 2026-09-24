<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

import UiButton from '@/components/ui/UiButton.vue';
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
  <div class="debug-panel">
    <div ref="traceList" class="trace-list" data-test="trace-list">
      <p v-if="store.trace.length === 0" class="debug-panel__muted">
        No traffic yet.
      </p>
      <p
        v-for="(entry, index) in store.trace"
        :key="index"
        :class="entry.direction"
      >
        <span>{{ new Date(entry.at).toLocaleTimeString() }}</span>
        <b>{{ entry.direction }}</b>
        {{ entry.text }}
      </p>
    </div>

    <form class="debug-panel__command" @submit.prevent="sendCommand">
      <input
        v-model="command"
        class="field"
        placeholder="Raw DCC-EX command (e.g. &lt;1&gt; for power on)"
        aria-label="Raw DCC-EX command"
        data-test="command-input"
      />
      <UiButton
        type="button"
        :disabled="!command.trim()"
        data-test="send-command"
        @click="sendCommand"
      >
        Send
      </UiButton>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.debug-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: var(--gap);
  min-height: 0;
}

.trace-list {
  flex: 1;
  overflow-y: auto;

  font-family: var(--font-display);
  font-size: 0.85rem;
}

.trace-list p {
  margin: 0;
}

.debug-panel__muted {
  color: var(--color-ink-dim);
}

.sent {
  color: var(--color-ink);
}

.received {
  color: var(--color-ok);
}

.debug-panel__command {
  display: flex;
  gap: var(--gap);
}

.debug-panel__command .field {
  flex: 1;
  min-width: 0;
}
</style>
