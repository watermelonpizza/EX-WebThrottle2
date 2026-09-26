<script setup lang="ts">
import { computed, ref } from 'vue';

import { Direction } from '@/core/protocol';
import { useLocosStore } from '@/stores/locos';

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });

const locos = useLocosStore();

const address = ref('');
const name = ref('');

// The largest DCC long address DCC-EX accepts.
const MAX_ADDRESS = 10293;

const parsed = computed(() => Number(address.value));
const valid = computed(
  () =>
    Number.isInteger(parsed.value) &&
    parsed.value >= 1 &&
    parsed.value <= MAX_ADDRESS,
);

const saved = computed(() =>
  locos.roster.filter(
    (loco) =>
      !locos.throttles.some((throttle) => throttle.address === loco.address),
  ),
);

// Moving locos by name where they are saved, by address where they are not.
const moving = computed(() =>
  locos.moving.map((loco) => ({
    ...loco,
    name:
      locos.roster.find((candidate) => candidate.address === loco.address)
        ?.name ?? `Loco ${loco.address}`,
  })),
);

function drive(target: number): void {
  const known = locos.roster.find((loco) => loco.address === target);

  // A name typed here saves the loco for next time; one step, not two.
  if (!known && name.value.trim()) {
    locos.saveLoco(target, name.value.trim());
  }

  locos.acquire(target, known?.mapId);
  address.value = '';
  name.value = '';
}

function submit(): void {
  if (valid.value) {
    drive(parsed.value);
  }
}
</script>

<template>
  <div class="drive-form" :class="{ 'drive-form--compact': compact }">
    <form class="drive-form__row" @submit.prevent="submit">
      <label class="drive-form__field">
        <span class="drive-form__label">Loco address</span>
        <input
          v-model="address"
          class="field numeric"
          inputmode="numeric"
          autocomplete="off"
          data-testid="drive-address"
        />
      </label>
      <label v-if="!compact" class="drive-form__field drive-form__field--wide">
        <span class="drive-form__label">Name (optional, saves it)</span>
        <input
          v-model="name"
          class="field"
          autocomplete="off"
          data-testid="drive-name"
        />
      </label>
      <button
        type="submit"
        class="key key--accent"
        :disabled="!valid"
        data-testid="drive"
      >
        Drive
      </button>
    </form>

    <!-- Locos other Throttles are running, so an operator joining the
         layout can take them all over in one press. -->
    <section v-if="moving.length > 0" class="drive-form__group" aria-labelledby="drive-moving">
      <div class="drive-form__group-head">
        <h3 id="drive-moving" class="drive-form__label">Moving on the layout</h3>
        <button
          v-if="moving.length > 1"
          type="button"
          class="drive-form__all"
          data-testid="drive-all-moving"
          @click="locos.acquireAll(moving.map((loco) => loco.address))"
        >
          Drive all {{ moving.length }}
        </button>
      </div>
      <div class="drive-form__chips">
        <button
          v-for="loco in moving"
          :key="loco.address"
          type="button"
          class="key drive-form__chip"
          :data-testid="`drive-moving-${loco.address}`"
          @click="drive(loco.address)"
        >
          {{ loco.name }}
          <span class="drive-form__speed numeric">
            {{ loco.speed }} {{ loco.direction === Direction.FORWARD ? 'FWD' : 'REV' }}
          </span>
        </button>
      </div>
    </section>

    <section v-if="saved.length > 0" class="drive-form__group" aria-labelledby="drive-saved">
      <div class="drive-form__group-head">
        <h3 id="drive-saved" class="drive-form__label">Saved locos</h3>
        <button
          v-if="saved.length > 1"
          type="button"
          class="drive-form__all"
          data-testid="drive-all-saved"
          @click="locos.acquireAll(saved.map((loco) => loco.address))"
        >
          Drive all {{ saved.length }}
        </button>
      </div>
      <div class="drive-form__chips">
        <button
          v-for="loco in saved"
          :key="loco.address"
          type="button"
          class="key drive-form__chip"
          :data-testid="`drive-saved-${loco.address}`"
          @click="drive(loco.address)"
        >
          {{ loco.name }}
          <span class="drive-form__address numeric">{{ loco.address }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.drive-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.drive-form__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-2);
}

.drive-form__field {
  display: flex;
  flex: 1 1 7rem;
  flex-direction: column;
  gap: var(--space-1);
}

.drive-form__field--wide {
  flex-basis: 12rem;
}

.drive-form__label {
  color: var(--ink-muted);
  font-size: var(--text-xs);
  font-weight: 400;
}

.drive-form__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.drive-form__group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

/* A text action beside the group's label: it acts on the whole group. */
.drive-form__all {
  padding: 0;

  color: var(--accent);
  background: none;
  border: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 0.2em;

  &:hover {
    text-decoration-thickness: var(--line);
  }
}

.drive-form__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--control-gap);
}

.drive-form__chip {
  gap: var(--space-2);
  padding: 0 var(--space-3);
}

.drive-form__address {
  color: var(--ink-muted);
}

.drive-form__speed {
  color: var(--accent);
  font-weight: 600;
}
</style>
