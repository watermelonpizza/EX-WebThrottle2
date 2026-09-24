<script setup lang="ts">
import { reactive, ref } from 'vue';

import { DEFAULT_FUNCTIONS } from '@/core/loco/functions';
import type { FunctionDef } from '@/core/loco/functions';
import UiButton from '@/components/ui/UiButton.vue';
import UiDialog from '@/components/ui/UiDialog.vue';
import UiSwitch from '@/components/ui/UiSwitch.vue';
import { useMapsStore } from '@/stores/maps';
import type { LocoMap } from '@/stores/maps';

const maps = useMapsStore();
const dialog = ref(false);

interface EditingMap {
  id?: string;
  name: string;
  functions: FunctionDef[];
}

const editing = reactive<EditingMap>({
  name: '',
  functions: [],
});

function openNew(): void {
  editing.id = undefined;
  editing.name = '';
  editing.functions = DEFAULT_FUNCTIONS.map((def) => ({ ...def }));
  dialog.value = true;
}

function openEdit(map: LocoMap): void {
  editing.id = map.id;
  editing.name = map.name;
  // Work on the map's full 32 functions so the editor always shows a
  // complete row set, falling back to default labels for unset functions.
  editing.functions = maps.fullFunctions(map.id).map((def) => ({ ...def }));
  dialog.value = true;
}

function save(): void {
  if (!editing.name.trim()) return;

  if (editing.id) {
    maps.updateMap(editing.id, editing.name.trim(), editing.functions);
  } else {
    maps.createMap(editing.name.trim(), editing.functions);
  }

  dialog.value = false;
}
</script>

<template>
  <div class="panel">
    <div class="panel__head">
      <h2 class="panel__title">Function maps</h2>
      <UiButton data-test="new-map" @click="openNew">New map</UiButton>
    </div>

    <p class="panel__muted">
      Function maps give each locomotive its own set of function names and
      press-and-hold behaviour, on top of the default F0–F31 layout.
    </p>

    <ul v-if="maps.maps.length > 0" class="map-list">
      <li
        v-for="map in maps.maps"
        :key="map.id"
        class="map-list__row"
        data-test="map-entry"
      >
        <span class="map-list__name">{{ map.name }}</span>
        <UiButton
          variant="icon"
          aria-label="Edit map"
          data-test="edit-map"
          @click="openEdit(map)"
        >
          <i class="mdi mdi-pencil" aria-hidden="true" />
        </UiButton>
        <UiButton
          variant="icon"
          aria-label="Delete map"
          data-test="delete-map"
          @click="maps.deleteMap(map.id)"
        >
          <i class="mdi mdi-delete" aria-hidden="true" />
        </UiButton>
      </li>
    </ul>

    <p v-else class="panel__muted">No custom maps yet.</p>

    <UiDialog v-model="dialog">
      <h3 class="dialog-title">
        {{ editing.id ? 'Edit map' : 'New map' }}
      </h3>

      <label class="dialog-name">
        <span>Map name</span>
        <input v-model="editing.name" class="field" data-test="map-name" />
      </label>

      <div class="function-rows">
        <div
          v-for="def in editing.functions"
          :key="def.fn"
          class="function-row"
        >
          <span class="function-row__fn">F{{ def.fn }}</span>
          <input
            v-model="def.label"
            class="field"
            :aria-label="`F${def.fn} label`"
            data-test="function-label"
          />
          <UiSwitch
            v-model="def.momentary"
            label="Hold"
            data-test="function-momentary"
          />
        </div>
      </div>

      <template #actions>
        <UiButton variant="ghost" @click="dialog = false">Cancel</UiButton>
        <UiButton
          tone="default"
          :disabled="!editing.name.trim()"
          data-test="save-map"
          @click="save"
        >
          Save
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>

<style lang="scss" scoped>
.panel {
  padding: 1rem;

  background: var(--color-panel);
  border-radius: var(--radius);
  box-shadow: var(--panel-shadow);
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap);
}

.panel__title {
  margin: 0;
  font-size: 1.05rem;
}

.panel__muted {
  color: var(--color-ink-dim);
}

.map-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.map-list__row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0;

  border-top: 1px solid var(--color-panel-edge);
}

.map-list__row:first-of-type {
  border-top: 0;
}

.map-list__name {
  font-weight: 600;
  margin-right: auto;
}

.dialog-title {
  margin: 0 0 0.75rem;
}

.dialog-name {
  display: grid;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-ink-dim);
}

.function-rows {
  max-height: 24rem;
  overflow-y: auto;
}

.function-row {
  display: grid;
  grid-template-columns: 3rem 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.function-row__fn {
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--color-ink-dim);
}
</style>
