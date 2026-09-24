<script setup lang="ts">
// Console push-button. Attrs (disabled, aria-label, data-test, …) fall
// through to the native button. Use variant="icon" for icon glyphs and pass
// an aria-label for accessibility.
defineProps<{
  tone?: 'default' | 'danger';
  variant?: 'solid' | 'ghost' | 'icon';
}>();
</script>

<template>
  <button
    class="ui-btn"
    :class="[`ui-btn--${tone ?? 'default'}`, `ui-btn--${variant ?? 'solid'}`]"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>
.ui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: var(--control-h);
  padding: 0.25rem 1rem;

  font: inherit;
  font-weight: 600;
  color: var(--color-ghost-ink);
  background: var(--color-cream);
  border: 0;
  border-radius: var(--radius);

  // Machined look: a bright top edge and a stepped bottom (like a real
  // panel key), pressed down with a small translate.
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 0.35),
    inset 0 -3px 0 rgb(0 0 0 / 0.25),
    0 2px 3px rgb(0 0 0 / 0.3);
  cursor: pointer;
}

.ui-btn:hover:not(:disabled) {
  filter: brightness(1.05);
}

.ui-btn:focus-visible {
  outline: 2px solid var(--color-brass);
  outline-offset: 2px;
}

.ui-btn:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 0.2),
    inset 0 -1px 0 rgb(0 0 0 / 0.25);
}

.ui-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ui-btn--danger {
  color: #fff;
  background: var(--color-danger);
}

.ui-btn--ghost {
  color: var(--color-ink);
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--color-panel-edge);
}

.ui-btn--danger.ui-btn--ghost {
  box-shadow: inset 0 0 0 1px var(--color-danger);
}

.ui-btn--icon {
  width: var(--control-h);
  padding: 0;
  justify-content: center;
}
</style>
