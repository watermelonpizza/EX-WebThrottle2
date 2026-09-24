<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue';
import {
  ARRANGEMENTS,
  ARRANGEMENT_IDS,
  PANELS,
  usePanelsStore,
} from '@/stores/panels';

const panels = usePanelsStore();
</script>

<template>
  <section class="console-layout" aria-labelledby="console-layout-title">
    <h2 id="console-layout-title">Console layout</h2>

    <div class="console-layout__row">
      <span class="console-layout__label">Arrangement</span>

      <div
        class="console-layout__choices"
        role="group"
        aria-label="Arrangement"
      >
        <UiButton
          v-for="id in ARRANGEMENT_IDS"
          :key="id"
          variant="ghost"
          :class="{
            'console-layout__choice--active': panels.arrangement === id,
          }"
          :data-test="`arrangement-${id}`"
          @click="panels.setArrangement(id)"
        >
          {{ ARRANGEMENTS[id].label }}
        </UiButton>
      </div>
    </div>

    <div class="console-layout__row">
      <span class="console-layout__label">Panels</span>

      <label
        v-for="panel in PANELS"
        :key="panel.id"
        class="console-layout__panel"
      >
        <input
          type="checkbox"
          :checked="panels.isOpen(panel.id)"
          :data-test="`panel-toggle-${panel.id}`"
          @change="panels.togglePanel(panel.id)"
        />
        <i :class="`mdi ${panel.icon}`" aria-hidden="true" />
        {{ panel.title }}
      </label>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.console-layout {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.console-layout h2 {
  margin: 0;
  font-size: 1rem;
}

.console-layout__row {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.console-layout__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-ink-dim);
}

.console-layout__choices {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.console-layout__choice--active {
  color: var(--color-brass);
  box-shadow: inset 0 0 0 2px var(--color-brass);
}

.console-layout__panel {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
