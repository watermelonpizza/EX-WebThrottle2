<script setup lang="ts">
import { reactive, ref } from 'vue';

import type { FunctionDef } from '@/core/loco/functions';
import type { LocoMap } from '@/stores/maps';
import { useMapsStore } from '@/stores/maps';

const maps = useMapsStore();

interface EditingMap {
  id?: string;
  name: string;
  functions: FunctionDef[];
}

const open = ref(false);
const editing = reactive<EditingMap>({ name: '', functions: [] });

function openNew(): void {
  editing.id = undefined;
  editing.name = '';
  editing.functions = maps.editableFunctions();
  open.value = true;
}

function openEdit(map: LocoMap): void {
  editing.id = map.id;
  editing.name = map.name;
  editing.functions = maps.editableFunctions(map.id);
  open.value = true;
}

function save(): void {
  const name = editing.name.trim();

  if (!name) {
    return;
  }

  if (editing.id) {
    maps.updateMap(editing.id, name, editing.functions);
  } else {
    maps.createMap(name, editing.functions);
  }

  open.value = false;
}

function remove(map: LocoMap): void {
  if (window.confirm(`Delete the ${map.name} function map?`)) {
    maps.deleteMap(map.id);
  }
}
</script>

<template>
  <section
    class="settings-section"
    aria-labelledby="maps-title"
  >
    <div class="settings-section__head">
      <h2
        id="maps-title"
        class="settings-section__title"
      >
        Function maps
      </h2>
      <button
        type="button"
        class="key"
        data-testid="new-map"
        @click="openNew"
      >
        New map
      </button>
    </div>
    <p class="settings-section__lead">
      A function map names a loco's functions, says which ones you hold down
      (like a horn), and hides the ones its decoder does not have.
    </p>

    <ul
      v-if="maps.maps.length > 0"
      class="rows"
    >
      <li
        v-for="map in maps.maps"
        :key="map.id"
        class="row"
        data-testid="map-entry"
      >
        <span class="row__name">{{ map.name }}</span>
        <span class="row__meta numeric">
          {{ map.functions.filter((def) => !def.hidden).length }} functions
        </span>
        <button
          type="button"
          class="key"
          data-testid="edit-map"
          @click="openEdit(map)"
        >
          Edit
        </button>
        <button
          type="button"
          class="key"
          data-testid="delete-map"
          @click="remove(map)"
        >
          Delete
        </button>
      </li>
    </ul>
    <p
      v-else
      class="settings-section__lead"
    >
      No function maps yet.
    </p>

    <form
      v-if="open"
      class="map-editor"
      data-testid="function-map-form"
      @submit.prevent="save"
    >
      <label class="map-editor__name">
        <span>Map name</span>
        <input
          v-model="editing.name"
          class="field"
          data-testid="map-name"
        >
      </label>

      <div class="map-editor__rows">
        <div
          class="map-editor__row map-editor__row--head"
          aria-hidden="true"
        >
          <span>Key</span><span>Name</span><span>Hold</span><span>Show</span>
        </div>
        <div
          v-for="def in editing.functions"
          :key="def.fn"
          class="map-editor__row"
        >
          <span class="numeric">F{{ def.fn }}</span>
          <input
            v-model="def.label"
            class="field"
            :aria-label="`F${def.fn} name`"
            data-testid="function-label"
          >
          <input
            v-model="def.momentary"
            type="checkbox"
            :aria-label="`Hold F${def.fn} down to use it`"
            data-testid="function-momentary"
          >
          <input
            :checked="!def.hidden"
            type="checkbox"
            :aria-label="`Show F${def.fn} on the throttle`"
            data-testid="function-visible"
            @change="def.hidden = !($event.target as HTMLInputElement).checked"
          >
        </div>
      </div>

      <div class="map-editor__actions">
        <button
          type="button"
          class="key"
          @click="open = false"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="key key--accent"
          :disabled="!editing.name.trim()"
          data-testid="save-map"
        >
          Save map
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.rows {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--rule);
}

.row__name {
  flex: 1;
  font-weight: 500;
}

.row__meta {
  color: var(--ink-muted);
  font-size: var(--text-xs);
}

.map-editor {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-4);

  background: var(--panel);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
}

.map-editor__name {
  display: grid;
  gap: var(--space-1);

  span {
    color: var(--ink-muted);
    font-size: var(--text-xs);
  }
}

.map-editor__rows {
  display: grid;
  gap: var(--space-1);
}

.map-editor__row {
  display: grid;
  align-items: center;
  gap: var(--space-3);
  grid-template-columns: 4ch 1fr 4ch 4ch;

  input[type='checkbox'] {
    width: var(--space-4);
    height: var(--space-4);
    accent-color: var(--accent);
    justify-self: center;
  }
}

/* The column names and the save buttons stay in view while the page
   scrolls through all 32 functions, spanning the editor's full width. */
.map-editor__row--head,
.map-editor__actions {
  position: sticky;
  z-index: 1;
  margin-inline: calc(-1 * var(--space-4));
  padding: var(--space-2) var(--space-4);
  background: var(--panel);
}

.map-editor__row--head {
  top: 0;

  color: var(--ink-muted);
  border-bottom: 1px solid var(--rule);
  font-size: var(--text-xs);

  span:nth-child(n + 3) {
    text-align: center;
  }
}

.map-editor__actions {
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-bottom: calc(-1 * var(--space-4));
  padding-block: var(--space-3);
  border-top: 1px solid var(--rule);
}
</style>
