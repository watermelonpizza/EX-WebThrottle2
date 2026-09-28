<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue';

import { useRovingFocus } from '@/composables/useRovingFocus';
import type { CommandDef } from '@/stores/diagnostics';
import { useDiagnosticsStore } from '@/stores/diagnostics';

const diagnostics = useDiagnosticsStore();

const query = ref('');
// Patterns are unique, so the open command is kept by its pattern.
const openPattern = ref('');
const values = ref<string[]>([]);
const forms = useTemplateRef<HTMLFormElement[]>('lookup-forms');

const groups = computed(() => diagnostics.search(query.value));

// Every command in the order listed, so the list can be one Tab stop that
// the arrow keys move through.
const order = computed(() =>
  new Map([...groups.value.values()].flat().map((command, index) => [command, index])));

const roving = useRovingFocus({ count: () => order.value.size });

async function choose(command: CommandDef): Promise<void> {
  if (!diagnostics.needsForm(command)) {
    diagnostics.send(command);

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
  if (!diagnostics.send(command, values.value)) {
    return;
  }

  // Close a risky command once sent, so a stray second click cannot repeat it.
  if (command.risky) {
    openPattern.value = '';
  }
}
</script>

<template>
  <div
    class="commands"
    data-testid="commands-panel"
  >
    <h2 class="commands__title">
      Commands
    </h2>
    <input
      v-model="query"
      type="search"
      class="field"
      placeholder="Search, for example turnout, power main or <JT>"
      aria-label="Search commands"
      data-testid="lookup-search"
    >

    <div
      class="lookup-list"
      data-testid="lookup-list"
      @keydown="roving.onKeydown"
      @focusin="roving.onFocusin"
    >
      <p
        v-if="groups.size === 0"
        class="commands__muted"
      >
        No commands match that search.
      </p>

      <section
        v-for="[group, commands] in groups"
        :key="group"
      >
        <h3 class="lookup-list__group">
          {{ group }}
        </h3>

        <ul class="lookup-list__commands">
          <li
            v-for="command in commands"
            :key="command.pattern"
            class="lookup"
            data-testid="lookup-command"
          >
            <button
              type="button"
              class="lookup__head"
              :tabindex="roving.tabindex(order.get(command) ?? -1)"
              data-roving
              :aria-expanded="
                diagnostics.needsForm(command)
                  ? openPattern === command.pattern
                  : undefined
              "
              @click="choose(command)"
            >
              <code class="lookup__pattern">{{ command.pattern }}</code>
              <span class="lookup__summary">{{ command.summary }}</span>
              <span
                v-if="command.needs"
                class="lookup__needs"
              >
                Needs {{ command.needs }}
              </span>
              <span
                v-if="command.risky"
                class="lookup__risky"
              >Asks first</span>
            </button>

            <form
              v-if="openPattern === command.pattern"
              ref="lookup-forms"
              class="lookup__form"
              @submit.prevent="send(command)"
              @keydown.esc="openPattern = ''"
            >
              <p
                v-if="command.detail"
                class="lookup__detail"
              >
                {{ command.detail }}
              </p>

              <div
                v-if="command.inputs.length > 0"
                class="lookup__inputs"
              >
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
                    :data-testid="`lookup-value-${index}`"
                  >
                </label>
              </div>

              <p
                v-if="command.risky"
                class="lookup__warning"
              >
                This is hard to undo on a running layout. Check before sending.
              </p>

              <div class="lookup__send">
                <code
                  class="lookup__preview"
                  data-testid="lookup-preview"
                >
                  {{ diagnostics.preview(command, values) }}
                </code>
                <button
                  type="submit"
                  class="key"
                  :class="{ 'key--stop': command.risky }"
                  :disabled="!diagnostics.canSend(command, values)"
                  data-testid="lookup-send"
                >
                  {{ command.risky ? 'Confirm send' : 'Send' }}
                </button>
              </div>
            </form>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.commands {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  height: 100%;
  padding: var(--space-3) var(--space-4);
}

.commands__title {
  font-size: var(--text-lg);
  font-weight: 500;
}

.commands__muted {
  color: var(--ink-muted);
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
  padding: var(--space-3) 0 var(--space-1);

  color: var(--ink-muted);
  background: var(--ground);
  font-size: var(--text-xs);
  font-weight: 600;
}

.lookup-list__commands {
  margin: 0;
  padding: 0;
  list-style: none;
}

.lookup {
  border-top: 1px solid var(--rule);
}

.lookup__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-1) var(--space-3);
  width: 100%;
  min-height: var(--target);
  padding: var(--space-2);

  background: none;
  border: 0;
  text-align: left;

  &:hover {
    background: var(--raised);
  }
}

.lookup__pattern,
.lookup__preview {
  font-family: var(--font-code);
}

.lookup__pattern {
  color: var(--accent);
}

.lookup__summary {
  flex: 1;
}

.lookup__needs,
.lookup__risky {
  color: var(--ink-muted);
  font-size: var(--text-xs);
}

.lookup__risky {
  color: var(--attention);
}

.lookup__form {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-2) var(--space-4);
}

.lookup__detail {
  color: var(--ink-muted);
  font-size: var(--text-xs);
}

.lookup__inputs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.lookup__input {
  display: grid;
  flex: 1 1 8rem;
  gap: var(--space-1);
}

.lookup__label {
  color: var(--ink-muted);
  font-size: var(--text-xs);
}

.lookup__warning {
  color: var(--attention);
}

.lookup__send {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
</style>
