<script setup lang="ts">
import { computed, ref } from 'vue';

import { parseAddress } from '@/core/loco/address';
import type { RosterLoco } from '@/stores/locos';
import { LOCO_TYPES, useLocosStore } from '@/stores/locos';
import { STATION_MAP, useMapsStore } from '@/stores/maps';

const locos = useLocosStore();
const maps = useMapsStore();

const address = ref('');
const name = ref('');
const mapId = ref('default');
const type = ref('');
const brand = ref('');
const decoder = ref('');

const parsed = computed(() => parseAddress(address.value));
const valid = computed(
  () => parsed.value !== undefined && name.value.trim().length > 0,
);

function save(): void {
  if (parsed.value === undefined || !name.value.trim()) {
    return;
  }

  locos.saveLoco(parsed.value, name.value.trim(), mapId.value, {
    type: type.value || undefined,
    brand: brand.value.trim() || undefined,
    decoder: decoder.value.trim() || undefined,
  });
  fill();
}

// Puts a saved loco in the form to change it, or empties the form.
function fill(loco?: RosterLoco): void {
  address.value = loco ? String(loco.address) : '';
  name.value = loco?.name ?? '';
  mapId.value = loco?.mapId ?? 'default';
  type.value = loco?.type ?? '';
  brand.value = loco?.brand ?? '';
  decoder.value = loco?.decoder ?? '';
}

// The details a row shows after the name, when there are any.
function details(loco: RosterLoco): string {
  return [loco.type, loco.brand, loco.decoder].filter(Boolean).join(' · ');
}

function remove(loco: { address: number; name: string }): void {
  if (window.confirm(`Delete ${loco.name} from your saved locos?`)) {
    locos.removeLoco(loco.address);
  }
}
</script>

<template>
  <section
    class="settings-section"
    aria-labelledby="locos-title"
  >
    <h2
      id="locos-title"
      class="settings-section__title"
    >
      Saved locos
    </h2>
    <p class="settings-section__lead">
      Saved locos are kept in this browser. Give each one a name like "37 025 ·
      Class 37": the part before the dot is what shows on the layout diagram.
      Type, brand and decoder are there for your own reference.
    </p>

    <ul
      v-if="locos.roster.length > 0"
      class="rows"
    >
      <li
        v-for="loco in locos.roster"
        :key="loco.address"
        class="row"
        :data-testid="`roster-${loco.address}`"
      >
        <span class="row__name">{{ loco.name }}</span>
        <span class="row__meta numeric">Address {{ loco.address }}</span>
        <span class="row__meta">{{ maps.mapName(loco.mapId) }}</span>
        <span
          v-if="details(loco)"
          class="row__meta"
          :data-testid="`roster-details-${loco.address}`"
        >{{ details(loco) }}</span>
        <button
          type="button"
          class="key"
          :aria-label="`Edit ${loco.name}`"
          @click="fill(loco)"
        >
          Edit
        </button>
        <button
          type="button"
          class="key"
          :aria-label="`Delete ${loco.name}`"
          data-testid="delete-loco"
          @click="remove(loco)"
        >
          Delete
        </button>
      </li>
    </ul>

    <form
      class="loco-form"
      data-testid="saved-loco-form"
      @submit.prevent="save"
    >
      <label class="loco-form__field">
        <span>Address</span>
        <input
          v-model="address"
          class="field numeric"
          inputmode="numeric"
          data-testid="new-loco-address"
        >
      </label>
      <label class="loco-form__field loco-form__field--wide">
        <span>Name</span>
        <input
          v-model="name"
          class="field"
          data-testid="new-loco-name"
        >
      </label>
      <label class="loco-form__field">
        <span>Function map</span>
        <select
          v-model="mapId"
          class="field"
          data-testid="new-loco-map"
        >
          <option value="default">Default</option>
          <option :value="STATION_MAP">
            From the Command Station roster
          </option>
          <option
            v-for="map in maps.maps"
            :key="map.id"
            :value="map.id"
          >
            {{ map.name }}
          </option>
        </select>
      </label>
      <label class="loco-form__field">
        <span>Type (optional)</span>
        <select
          v-model="type"
          class="field"
          data-testid="new-loco-type"
        >
          <option value="">Not set</option>
          <option
            v-for="kind in LOCO_TYPES"
            :key="kind"
            :value="kind"
          >
            {{ kind }}
          </option>
        </select>
      </label>
      <label class="loco-form__field">
        <span>Brand (optional)</span>
        <input
          v-model="brand"
          class="field"
          data-testid="new-loco-brand"
        >
      </label>
      <label class="loco-form__field">
        <span>Decoder (optional)</span>
        <input
          v-model="decoder"
          class="field"
          data-testid="new-loco-decoder"
        >
      </label>
      <button
        type="submit"
        class="key key--accent"
        :disabled="!valid"
        data-testid="add-loco"
      >
        Save loco
      </button>
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
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--rule);
}

.row__name {
  flex: 1 1 12rem;
  font-weight: 500;
}

.row__meta {
  color: var(--ink-muted);
  font-size: var(--text-xs);
}

.loco-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
}

.loco-form__field {
  display: grid;
  flex: 1 1 7rem;
  gap: var(--space-1);

  span {
    color: var(--ink-muted);
    font-size: var(--text-xs);
  }
}

.loco-form__field--wide {
  flex-basis: 14rem;
}
</style>
