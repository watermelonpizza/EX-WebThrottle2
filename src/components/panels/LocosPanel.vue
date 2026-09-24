<script setup lang="ts">
import { computed, ref } from 'vue';

import UiButton from '@/components/ui/UiButton.vue';
import { useConnectionStore } from '@/stores/connection';
import { useLocosStore } from '@/stores/locos';
import { useMapsStore } from '@/stores/maps';

const connection = useConnectionStore();
const locos = useLocosStore();
const maps = useMapsStore();

const newAddress = ref<number | null>(null);
const newName = ref('');

const mapChoices = computed(() => [
  { title: 'Default', value: 'default' },
  ...maps.maps.map((map) => ({ title: map.name, value: map.id })),
]);

function addLoco(): void {
  const address = newAddress.value;

  if (address === null || !Number.isInteger(address) || address < 1) return;

  locos.saveLoco(address, newName.value.trim() || `Loco ${address}`);
  newAddress.value = null;
  newName.value = '';
}
</script>

<template>
  <div>
    <div class="roster-add">
      <label>
        <span class="roster-add__label">Address</span>
        <input
          v-model.number="newAddress"
          class="field"
          type="number"
          min="1"
          placeholder="3"
          data-test="new-loco-address"
        />
      </label>
      <label>
        <span class="roster-add__label">Name (optional)</span>
        <input
          v-model="newName"
          class="field"
          placeholder="Flying Scotsman"
          data-test="new-loco-name"
        />
      </label>
      <UiButton
        class="roster-add__save"
        :disabled="
          newAddress === null || !Number.isInteger(newAddress) || newAddress < 1
        "
        data-test="add-loco"
        @click="addLoco"
      >
        Save
      </UiButton>
    </div>

    <ul v-if="locos.roster.length > 0" class="roster">
      <li
        v-for="entry in locos.roster"
        :key="entry.address"
        class="roster__row"
        :data-test="`roster-${entry.address}`"
      >
        <span class="roster__name">
          {{ entry.name }}
          <span class="roster__addr">· {{ entry.address }}</span>
        </span>

        <label class="roster__map">
          <span class="roster__map-label">Map</span>
          <select
            class="field roster__map-select"
            :value="entry.mapId"
            data-test="roster-map"
            @change="
              (event) =>
                locos.saveLoco(
                  entry.address,
                  entry.name,
                  (event.target as HTMLSelectElement).value,
                )
            "
          >
            <option
              v-for="choice in mapChoices"
              :key="choice.value"
              :value="choice.value"
            >
              {{ choice.title }}
            </option>
          </select>
        </label>

        <UiButton
          :disabled="connection.status !== 'connected'"
          tone="default"
          data-test="drive"
          @click="locos.acquire(entry.address)"
        >
          Drive
        </UiButton>
        <UiButton
          variant="icon"
          aria-label="Delete loco"
          @click="locos.removeLoco(entry.address)"
        >
          <i class="mdi mdi-delete" aria-hidden="true" />
        </UiButton>
      </li>
    </ul>

    <p v-else class="panel__muted">
      No saved locomotives yet — enter an address above to save one (saved locos
      are kept in this browser).
    </p>
  </div>
</template>

<style lang="scss" scoped>
.roster-add {
  display: flex;
  align-items: flex-end;
  gap: var(--gap);
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.roster-add label {
  display: grid;
}

.roster-add__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-ink-dim);
}

.roster-add__save {
  align-self: center;
}

.roster {
  margin: 0;
  padding: 0;
  list-style: none;
}

.roster__row {
  display: flex;
  align-items: center;
  gap: var(--gap);
  padding: 0.5rem 0;
  flex-wrap: wrap;

  border-top: 1px solid var(--color-panel-edge);
}

.roster__row:first-of-type {
  border-top: 0;
}

.roster__name {
  font-weight: 600;
}

.roster__addr {
  color: var(--color-ink-dim);
  font-weight: 400;
}

.roster__map {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.roster__map-label {
  font-size: 0.8rem;
  color: var(--color-ink-dim);
}

.roster__map-select {
  max-width: 9rem;
}

.panel__muted {
  color: var(--color-ink-dim);
}
</style>
