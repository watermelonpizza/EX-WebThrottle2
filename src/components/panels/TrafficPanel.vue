<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';

import { logTime } from '@/composables/useClock';
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

const store = useConnectionStore();
const command = ref('');
const raw = ref(false);
const expandedEntry = ref<TraceEntry | null>(null);
const traceList = useTemplateRef<HTMLElement>('trace-list');

const rawTrace = computed(() =>
  store.trace
    .map(
      (entry) =>
        `${logTime(entry.at)} ${entry.direction.padEnd(8)} ${entry.text}`,
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

// Follow new traffic only while the reader is at the bottom and not reading
// an opened line, so scrolling back to study a frame is never yanked away.
function nearBottom(): boolean {
  const list = traceList.value;

  return !list || list.scrollHeight - list.scrollTop - list.clientHeight < 48;
}

watch(
  () => store.trace.length,
  async () => {
    const follow = nearBottom() && !expandedEntry.value;

    await nextTick();

    if (follow) {
      scrollToLatest();
    }
  },
);

function scrollToLatest(): void {
  traceList.value?.scrollTo({ top: traceList.value.scrollHeight });
}

// Opening the log, or switching how it reads, starts at the latest traffic.
onMounted(scrollToLatest);

watch(raw, async () => {
  expandedEntry.value = null;
  await nextTick();
  scrollToLatest();
});

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
  <div class="traffic">
    <header class="traffic__head">
      <h2 class="traffic__title">Traffic</h2>
      <div class="traffic__mode" role="group" aria-label="Show traffic as">
        <button
          type="button"
          class="traffic__mode-side"
          :aria-pressed="!raw"
          data-testid="traffic-explained"
          @click="raw = false"
        >
          Explained
        </button>
        <button
          type="button"
          class="traffic__mode-side"
          :aria-pressed="raw"
          data-testid="traffic-raw"
          @click="raw = true"
        >
          Raw log
        </button>
      </div>
    </header>

    <textarea
      v-if="raw"
      ref="trace-list"
      class="trace trace--raw"
      :value="rawTrace"
      placeholder="No traffic yet."
      aria-label="Raw sent and received traffic log"
      data-testid="trace-list"
      readonly
      spellcheck="false"
      wrap="off"
    />
    <div v-else ref="trace-list" class="trace" data-testid="trace-list">
      <p v-if="store.trace.length === 0" class="traffic__muted">
        No traffic yet.
      </p>
      <div
        v-for="(entry, index) in store.trace"
        :key="`${entry.at}-${index}`"
        class="trace__entry"
        data-testid="trace-entry"
      >
        <button
          type="button"
          class="trace__line"
          :class="entry.direction"
          :aria-expanded="expandedEntry === entry"
          data-testid="trace-row"
          @click="toggleEntry(entry)"
        >
          <span class="trace__at">{{ logTime(entry.at) }}</span>
          <span class="trace__direction">{{ entry.direction }}</span>
          <code class="trace__text">{{ entry.text }}</code>
        </button>

        <div
          v-if="expandedEntry === entry"
          class="trace__details"
          data-testid="trace-details"
        >
          <template v-if="explanation">
            <h3 class="trace__summary">{{ explanation.summary }}</h3>
            <code>{{ explanation.pattern }}</code>
            <p v-if="explanation.detail">{{ explanation.detail }}</p>
            <p v-if="explanation.needs">Needs: {{ explanation.needs }}</p>
            <dl v-if="explanation.parameters.length > 0" class="trace__params">
              <div v-for="parameter in explanation.parameters" :key="parameter.name">
                <dt>{{ parameter.name }}</dt>
                <dd>
                  <code>{{ parameter.value }}</code>
                  <span v-if="parameter.meaning">{{ parameter.meaning }}</span>
                </dd>
              </div>
            </dl>
          </template>
          <p v-else>
            WebThrottle does not know this {{ entry.direction === 'sent' ? 'command' : 'reply' }} yet,
            so it cannot explain it. The raw text is shown above.
          </p>
        </div>
      </div>
    </div>

    <form class="traffic__send" @submit.prevent="sendCommand">
      <input
        v-model="command"
        class="field traffic__input"
        placeholder="DCC-EX command, for example <1> for track power on"
        aria-label="DCC-EX command to send"
        autocomplete="off"
        spellcheck="false"
        data-testid="command-input"
      />
      <button
        type="submit"
        class="key"
        :disabled="!command.trim()"
        data-testid="send-command"
      >
        Send
      </button>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.traffic {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  height: 100%;
  padding: var(--space-3) var(--space-4);
}

.traffic__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.traffic__title {
  font-size: var(--text-lg);
  font-weight: 500;
}

.traffic__mode {
  display: flex;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
}

.traffic__mode-side {
  min-height: var(--target);
  padding: 0 var(--space-3);

  color: var(--ink-muted);
  background: none;
  border: 0;
  font-size: var(--text-xs);

  &[aria-pressed='true'] {
    color: var(--accent);
    font-weight: 600;
  }
}

.traffic__muted {
  color: var(--ink-muted);
}

// Protocol frames are code, so they read in a monospace face.
.trace {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  font-size: var(--text-sm);
}

.trace--raw {
  width: 100%;
  padding: var(--space-3);
  resize: none;

  color: var(--ink);
  background: var(--ground);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  font-family: var(--font-code);
  white-space: pre;
}

.trace__entry + .trace__entry {
  border-top: 1px solid var(--rule);
}

.trace__line {
  display: grid;
  align-items: baseline;
  gap: var(--space-3);
  grid-template-columns: auto 8ch 1fr;
  width: 100%;
  padding: var(--space-1) var(--space-2);

  background: none;
  border: 0;
  text-align: left;

  &:hover {
    background: var(--raised);
  }
}

.trace__at {
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.trace__direction {
  color: var(--ink-muted);
  text-transform: capitalize;
}

.received .trace__direction {
  color: var(--accent);
}

.trace__text,
.trace__details code {
  font-family: var(--font-code);
  overflow-wrap: anywhere;
}

.trace__details {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3) var(--space-4);

  color: var(--ink-muted);
}

.trace__summary {
  color: var(--ink);
  font-size: var(--text-sm);
}

.trace__params {
  display: grid;
  gap: var(--space-1);
  margin: 0;

  div {
    display: flex;
    gap: var(--space-3);
  }

  dt {
    min-width: 6rem;
    color: var(--ink);
  }

  dd {
    display: flex;
    gap: var(--space-2);
    margin: 0;
  }
}

.traffic__send {
  display: flex;
  gap: var(--space-2);
}

.traffic__input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-code);
}
</style>
