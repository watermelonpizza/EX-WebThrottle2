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
    <span class="lamp" :class="`lamp--${state}`" aria-hidden="true" />
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
</style>
