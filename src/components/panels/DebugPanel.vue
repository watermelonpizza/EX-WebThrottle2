<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import UiButton from '@/components/ui/UiButton.vue';
import { describeResponse, matchCommand } from '@/core/protocol';
import type { TraceEntry } from '@/stores/connection';
import { useConnectionStore } from '@/stores/connection';

interface TraceParameter {
  name: string;
  value: string;
  meaning?: string;
}

interface TraceExplanation {
  pattern: string;
  summary: string;
  detail: string;
  parameters: TraceParameter[];
  needs?: string;
}

const props = defineProps<{ rawMode: boolean }>();

const store = useConnectionStore();
const command = ref('');
const traceList = ref<HTMLElement>();
const expandedEntry = ref<TraceEntry | null>(null);

const rawTrace = computed(() =>
  store.trace
    .map(
      (entry) =>
        `${clockTime(entry.at)} ${entry.direction.padEnd(8)} ${entry.text}`,
    )
    .join('\n'),
);

const explanation = computed<TraceExplanation | undefined>(() => {
  const entry = expandedEntry.value;

  if (!entry) {
    return undefined;
  }

  if (entry.direction === 'received') {
    return describeResponse(entry.text);
  }

  const match = matchCommand(entry.text);

  if (!match) {
    return undefined;
  }

  return {
    pattern: match.command.pattern,
    summary: match.command.summary,
    detail: match.command.detail,
    needs: match.command.needs,
    parameters: match.parameters.map(({ input, value }) => ({
      name: input.name,
      value,
      meaning: match.command.detail
        .split(' · ')
        .find((note) => note.startsWith(`${input.name}:`))
        ?.slice(input.name.length + 1)
        .trim(),
    })),
  };
});

function toggleEntry(entry: TraceEntry): void {
  expandedEntry.value = expandedEntry.value === entry ? null : entry;
}

watch(
  () => props.rawMode,
  async () => {
    expandedEntry.value = null;
    await nextTick();
    traceList.value?.scrollTo({ top: traceList.value.scrollHeight });
  },
);

// Keep the newest traffic visible as the log grows.
watch(
  () => store.trace.length,
  async () => {
    await nextTick();

    traceList.value?.scrollTo({ top: traceList.value.scrollHeight });
  },
);

// 24-hour HH:MM:SS: a protocol log wants a fixed, sortable clock, not a
// locale format that appends am/pm.
function clockTime(at: number): string {
  return new Date(at).toTimeString().slice(0, 8);
}

function sendCommand(): void {
  const trimmed = command.value.trim();

  if (!trimmed) {
    return;
  }

  store.send(trimmed);
  command.value = '';
}
</script>

<template>
  <div class="debug-panel">
    <textarea
      v-if="props.rawMode"
      ref="traceList"
      class="trace-list trace-list--raw"
      :value="rawTrace"
      placeholder="No traffic yet."
      aria-label="Raw sent and received traffic log"
      data-test="trace-list"
      readonly
      spellcheck="false"
      wrap="off"
    />
    <div v-else ref="traceList" class="trace-list" data-test="trace-list">
      <p v-if="store.trace.length === 0" class="debug-panel__muted">
        No traffic yet.
      </p>
      <div
        v-for="(entry, index) in store.trace"
        :key="`${entry.at}-${index}`"
        class="trace-list__entry"
        data-test="trace-entry"
      >
        <button
          type="button"
          class="trace-list__line"
          :class="entry.direction"
          :aria-expanded="expandedEntry === entry"
          data-test="trace-row"
          @click="toggleEntry(entry)"
        >
          <span class="trace-list__at">{{ clockTime(entry.at) }}</span>
          <span class="trace-list__direction">{{ entry.direction }}</span>
          <span class="trace-list__text">{{ entry.text }}</span>
          <i
            class="mdi trace-list__toggle"
            :class="expandedEntry === entry ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            aria-hidden="true"
          />
        </button>

        <div
          v-if="expandedEntry === entry"
          class="trace-list__details"
          data-test="trace-details"
        >
          <template v-if="explanation">
            <h4 class="trace-list__summary">{{ explanation.summary }}</h4>
            <code class="trace-list__pattern">{{ explanation.pattern }}</code>
            <p v-if="explanation.detail">{{ explanation.detail }}</p>
            <p v-if="explanation.needs">
              Requires: {{ explanation.needs }}
            </p>

            <dl v-if="explanation.parameters.length > 0" class="trace-parameters">
              <div
                v-for="parameter in explanation.parameters"
                :key="parameter.name"
                class="trace-parameters__item"
              >
                <dt>{{ parameter.name }}</dt>
                <dd>
                  <code>{{ parameter.value }}</code>
                  <span v-if="parameter.meaning">{{ parameter.meaning }}</span>
                </dd>
              </div>
            </dl>
            <p v-else class="debug-panel__muted">This frame has no parameters.</p>
          </template>
          <p v-else-if="entry.direction === 'sent'">
            No matching command definition was found in the command catalog.
          </p>
          <p v-else>
            No matching response definition was found in the response catalog.
          </p>
        </div>
      </div>
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
  min-height: 0;
  overflow-y: auto;

  font-family: var(--font-display);
  font-size: 0.85rem;
}

.trace-list--raw {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 0.375rem;
  resize: none;

  font-family: var(--font-display);
  color: var(--color-ink);
  background: var(--color-inset);
  border: 0;
  border-radius: var(--radius);
  white-space: pre;
}

.trace-list--raw:focus-visible {
  outline: 2px solid var(--color-brass);
  outline-offset: -2px;
}

.trace-list__entry + .trace-list__entry {
  border-top: 1px solid var(--color-panel-edge);
}

.trace-list__line {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  width: 100%;
  padding: 0.25rem;

  font: inherit;
  text-align: left;
  color: inherit;
  background: none;
  border: 0;
  cursor: pointer;
}

.trace-list__line:hover {
  background: var(--color-inset);
}

.trace-list__line:focus-visible {
  outline: 2px solid var(--color-brass);
  outline-offset: -2px;
}

.trace-list__text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.trace-list__toggle {
  flex: none;
  margin-left: auto;
  color: var(--color-ink-dim);
}

.trace-list__at {
  color: var(--color-ink-dim);
}

.trace-list__direction {
  min-width: 4.5rem;
  flex: none;
  text-transform: uppercase;
  font-size: 0.75rem;
  align-self: center;
}

.trace-list__details {
  display: grid;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem 0.75rem;

  background: var(--color-inset);
  border-left: 2px solid var(--color-brass);
}

.trace-list__details p,
.trace-list__summary {
  margin: 0;
}

.trace-list__summary {
  font-size: 0.9rem;
}

.trace-list__pattern {
  font-family: var(--font-display);
  font-size: 0.8rem;
}

.trace-parameters {
  display: grid;
  gap: 0.25rem;
  margin: 0;
}

.trace-parameters__item {
  display: grid;
  grid-template-columns: minmax(5rem, 0.35fr) minmax(0, 1fr);
  gap: 0.5rem;
}

.trace-parameters__item dt {
  font-weight: 600;
}

.trace-parameters__item dd {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  min-width: 0;
  margin: 0;
}

.trace-parameters__item dd code {
  font-family: var(--font-display);
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
