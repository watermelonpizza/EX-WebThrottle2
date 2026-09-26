<script setup lang="ts">
import { computed } from 'vue';

import type { PanelNode } from '@/core/workspace';
import { PANEL_TYPES } from '@/components/workspace/panels';

const props = defineProps<{ panel: PanelNode }>();

const type = computed(() => PANEL_TYPES[props.panel.kind]);
</script>

<template>
  <section
    class="panel-frame"
    :aria-label="type.title"
    :style="{ minWidth: type.minWidth, minHeight: type.minHeight }"
    :data-panel="panel.kind"
    :data-testid="`panel-${panel.kind}`"
  >
    <component :is="type.component" />
  </section>
</template>

<style scoped>
.panel-frame {
  /* Every panel is a size container, so its contents choose their variant
     from the room this panel has, not from the whole window. */
  container: panel / size;
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

@media (max-width: 48rem) {
  .panel-frame {
    container-type: inline-size;
    min-width: 0 !important;
    overflow: visible;
  }
}
</style>
