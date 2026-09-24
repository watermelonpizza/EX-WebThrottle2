<script setup lang="ts">
// An LED-style status lamp: unlit, lit, or danger. Lit/danger are live LEDs
// with a glow; the label sits beside it for non-visual confirmation.
defineProps<{
  state: 'off' | 'on' | 'danger';
  label: string;
}>();
</script>

<template>
  <span class="ui-badge" role="status">
    <span
      class="ui-badge__lamp"
      :class="`ui-badge__lamp--${state}`"
      aria-hidden="true"
    />
    <span class="ui-badge__label">{{ label }}</span>
  </span>
</template>

<style lang="scss" scoped>
.ui-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: var(--control-h);
  padding: 0.25rem 0.75rem;

  color: var(--color-ink-dim);
  background: var(--color-inset);
  border-radius: var(--radius);
  font-weight: 600;
}

.ui-badge__lamp {
  width: 0.75rem;
  height: 0.75rem;
  flex: none;

  background: rgb(0 0 0 / 0.25);
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.4);
}

.ui-badge__lamp--on {
  background: var(--color-ok);
  box-shadow:
    0 0 6px color-mix(in srgb, var(--color-ok) 80%, transparent),
    inset 0 1px 2px rgb(255 255 255 / 0.4);
}

.ui-badge__lamp--danger {
  background: var(--color-danger);
  box-shadow:
    0 0 8px color-mix(in srgb, var(--color-danger) 80%, transparent),
    inset 0 1px 2px rgb(255 255 255 / 0.4);
}
</style>
