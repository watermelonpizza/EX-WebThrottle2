<script setup lang="ts">
defineProps<{ title: string; icon: string }>();
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <h3 class="panel__title">
        <i :class="`mdi ${icon}`" aria-hidden="true" />
        {{ title }}
      </h3>
    </header>

    <div class="panel__body">
      <slot />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
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
  margin-bottom: 0.75rem;
}

.panel__title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.05rem;
}

.panel__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
</style>
