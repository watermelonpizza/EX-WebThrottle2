<script setup lang="ts">
// Binary machine switch — role="switch" on a styled native checkbox so the
// keyboard/AT behaviour is built in.
const model = defineModel<boolean>();

defineProps<{ label: string; disabled?: boolean }>();
</script>

<template>
  <label class="ui-switch">
    <input
      v-model="model"
      class="ui-switch__input"
      type="checkbox"
      role="switch"
      :disabled="disabled"
    />
    <span class="ui-switch__track" aria-hidden="true">
      <span class="ui-switch__knob" />
    </span>
    <span class="ui-switch__label">{{ label }}</span>
  </label>
</template>

<style lang="scss" scoped>
.ui-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: var(--control-h);
  cursor: pointer;
}

.ui-switch__input {
  position: absolute;
  opacity: 0;
}

.ui-switch__input:focus-visible + .ui-switch__track {
  outline: 2px solid var(--color-brass);
  outline-offset: 2px;
}

.ui-switch__track {
  position: relative;

  width: 2.5rem;
  height: 1.375rem;
  flex: none;

  background: var(--color-inset);
  border-radius: 999px;
  box-shadow: inset 0 2px 3px rgb(0 0 0 / 0.3);

  transition: background 0.15s;
}

.ui-switch__knob {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;

  width: 0.875rem;
  height: 0.875rem;

  background: var(--color-cream);
  border-radius: 50%;

  box-shadow: 0 1px 2px rgb(0 0 0 / 0.4);
  transition:
    transform 0.15s,
    background 0.15s;
}

.ui-switch__input:checked + .ui-switch__track {
  background: var(--color-brass);
}

.ui-switch__input:checked + .ui-switch__track .ui-switch__knob {
  background: var(--color-brass-ink);
  transform: translateX(1.125rem);
}

.ui-switch:has(.ui-switch__input:disabled) {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
