<script setup lang="ts">
import { computed, ref } from 'vue';

import { parseAddress } from '@/core/loco/address';
import { useLocosStore } from '@/stores/locos';

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });

const locos = useLocosStore();

const address = ref('');
const name = ref('');

const parsed = computed(() => parseAddress(address.value));

const saved = computed(() => locos.savedNotDriven);
const moving = computed(() => locos.moving);

function drive(target: number): void {
  locos.drive(target, name.value);
  address.value = '';
  name.value = '';
}

function submit(): void {
  if (parsed.value !== undefined) {
    drive(parsed.value);
  }
}
</script>

<template>
  <div class="drive-form" :class="{ 'drive-form--compact': compact }">
    <form
      class="drive-form__row"
      data-testid="drive-form"
      @submit.prevent="submit"
    >
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
        :disabled="parsed === undefined"
        data-testid="drive"
      >
        Drive
      </button>
    </form>

    <!-- Locos other Throttles are running, so an operator joining the
         layout can take them all over in one press. -->
    <section
      v-if="moving.length > 0"
      class="drive-form__group"
      aria-labelledby="drive-moving"
    >
      <div class="drive-form__group-head">
        <h3 id="drive-moving" class="drive-form__label">
          Moving on the layout
        </h3>
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
            {{ loco.speed }}
            {{ loco.forward ? 'FWD' : 'REV' }}
          </span>
        </button>
      </div>
    </section>

    <section
      v-if="saved.length > 0"
      class="drive-form__group"
      aria-labelledby="drive-saved"
    >
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
