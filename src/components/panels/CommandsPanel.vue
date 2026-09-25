<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue';

import UiButton from '@/components/ui/UiButton.vue';
import type { CommandDef } from '@/core/protocol';
import { buildCommand, isComplete, searchCommands } from '@/core/protocol';
import { useConnectionStore } from '@/stores/connection';

const connection = useConnectionStore();

const query = ref('');
// Patterns are unique, so the open command is kept by its pattern.
const openPattern = ref('');
const values = ref<string[]>([]);
const forms = useTemplateRef<HTMLFormElement[]>('lookup-forms');

const groups = computed(() =>
  Map.groupBy(searchCommands(query.value), (command) => command.group),
);

// A command sends on one click unless it needs values filled in, or is risky
// enough to want a confirm; those open a small form instead.
function opensForm(command: CommandDef): boolean {
  return command.inputs.length > 0 || command.risky;
}

async function choose(command: CommandDef): Promise<void> {
  if (!opensForm(command)) {
    connection.send(buildCommand(command, []));

    return;
  }

  if (openPattern.value === command.pattern) {
    openPattern.value = '';

    return;
  }

  openPattern.value = command.pattern;
  values.value = command.inputs.map(() => '');

  await nextTick();

  // Only the open command renders a form, so it is the first one.
  forms.value?.[0]?.querySelector<HTMLElement>('input, button')?.focus();
}

function send(command: CommandDef): void {
  if (!isComplete(command, values.value)) {
    return;
  }

  connection.send(buildCommand(command, values.value));

  // Close a risky command once sent, so a stray second click cannot repeat it.
  if (command.risky) {
    openPattern.value = '';
  }
}
</script>

<template>
  <div class="commands-panel" data-test="commands-panel">
    <input
      v-model="query"
      type="search"
      class="field"
      placeholder="Search, e.g. turnout, power main or <JT>"
      aria-label="Search commands"
      data-test="lookup-search"
    />

    <div class="lookup-list" data-test="lookup-list">
      <p v-if="groups.size === 0" class="commands-panel__muted">
        No commands match that search.
      </p>

      <section v-for="[group, commands] in groups" :key="group">
        <h4 class="lookup-list__group">{{ group }}</h4>

        <ul class="lookup-list__commands">
          <li
            v-for="command in commands"
            :key="command.pattern"
            class="lookup"
            data-test="lookup-command"
          >
            <button
              type="button"
              class="lookup__head"
              :aria-expanded="
                opensForm(command) ? openPattern === command.pattern : undefined
              "
              @click="choose(command)"
            >
              <code class="lookup__pattern">{{ command.pattern }}</code>
              <span class="lookup__summary">{{ command.summary }}</span>
              <span v-if="command.needs" class="lookup__needs">
                {{ command.needs }}
              </span>
              <i
                v-if="command.risky"
                class="mdi mdi-alert-outline lookup__risky"
                title="Asks you to confirm before sending"
                aria-label="Asks you to confirm before sending"
              />
            </button>

            <form
              v-if="openPattern === command.pattern"
              ref="lookup-forms"
              class="lookup__form"
              @submit.prevent="send(command)"
              @keydown.esc="openPattern = ''"
            >
              <p v-if="command.detail" class="lookup__detail">
                {{ command.detail }}
              </p>

              <div v-if="command.inputs.length > 0" class="lookup__inputs">
                <label
                  v-for="(input, index) in command.inputs"
                  :key="index"
                  class="lookup__input"
                >
                  <span class="lookup__label">
                    {{ input.name }}{{ input.optional ? ' (optional)' : '' }}
                  </span>
                  <input
                    v-model="values[index]"
                    class="field"
                    autocomplete="off"
                    :data-test="`lookup-value-${index}`"
                  />
                </label>
              </div>

              <p v-if="command.risky" class="lookup__warning">
                This is hard to undo on a running layout. Check before sending.
              </p>

              <div class="lookup__send">
                <code class="lookup__preview" data-test="lookup-preview">
                  {{ buildCommand(command, values) }}
                </code>
                <UiButton
                  type="submit"
                  :tone="command.risky ? 'danger' : 'default'"
                  :disabled="!isComplete(command, values)"
                  data-test="lookup-send"
                >
                  {{ command.risky ? 'Confirm send' : 'Send' }}
                </UiButton>
              </div>
            </form>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.commands-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: var(--gap);
  min-height: 0;
}

.commands-panel__muted {
  margin: 0;

  color: var(--color-ink-dim);
}

.lookup-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.lookup-list__group {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0.75rem 0 0.25rem;
  background: var(--color-panel);

  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-ink-dim);
}

.lookup-list section:first-child .lookup-list__group {
  margin-top: 0;
}

.lookup-list__commands {
  margin: 0;
  padding: 0;
  list-style: none;
}

.lookup {
  border-top: 1px solid var(--color-panel-edge);
}

.lookup:first-child {
  border-top: 0;
}

.lookup__head {
  display: flex;
  align-items: baseline;
  gap: 0.25rem var(--gap);
  flex-wrap: wrap;
  width: 100%;
  padding: 0.375rem 0.25rem;

  font: inherit;
  text-align: left;
  color: inherit;
  background: none;
  border: 0;
  border-radius: var(--radius);
  cursor: pointer;
}

.lookup__head:hover {
  background: var(--color-inset);
}

.lookup__head:focus-visible {
  outline: 2px solid var(--color-brass);
  outline-offset: -2px;
}

.lookup__pattern,
.lookup__preview {
  font-family: var(--font-display);
  font-size: 0.85rem;
}

.lookup__pattern {
  font-weight: 600;
  color: var(--color-ink);
}

.lookup__summary {
  flex: 1;
  min-width: 12rem;
}

.lookup__needs {
  padding: 0 0.375rem;

  font-size: 0.75rem;
  color: var(--color-ink-dim);
  border: 1px solid var(--color-panel-edge);
  border-radius: var(--radius);
}

.lookup__risky {
  color: var(--color-danger);
}

.lookup__form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.25rem 0.25rem 0.75rem;
}

.lookup__detail,
.lookup__warning {
  margin: 0;

  font-size: 0.85rem;
}

.lookup__detail {
  color: var(--color-ink-dim);
}

.lookup__warning {
  color: var(--color-danger-text);
}

.lookup__inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lookup__input {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1 1 8rem;
}

.lookup__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-ink-dim);
}

.lookup__send {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap);
}

@media (max-width: 40rem) {
  // Stacked panels grow with their content, so cap the list and let it scroll
  // rather than push the debug console a long way down.
  .lookup-list {
    max-height: 70dvh;
  }
}
</style>
