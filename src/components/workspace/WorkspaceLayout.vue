<script setup lang="ts">
import type { LayoutNode } from '@/core/workspace';
import PanelFrame from '@/components/workspace/PanelFrame.vue';

defineProps<{ node: LayoutNode }>();
</script>

<template>
  <div
    v-if="node.type === 'split'"
    class="split"
    :class="`split--${node.direction}`"
  >
    <div
      v-for="(child, index) in node.children"
      :key="index"
      class="split__cell"
      :style="{ flexGrow: child.weight }"
    >
      <WorkspaceLayout :node="child.node" />
    </div>
  </div>

  <PanelFrame v-else :panel="node" />
</template>

<style scoped>
.split {
  display: flex;
  width: 100%;
  height: 100%;
}

.split--row {
  flex-direction: row;
}

.split--column {
  flex-direction: column;
}

.split__cell {
  display: flex;
  flex-basis: 0;
  min-width: 0;
  min-height: 0;
}

/* Sections meet on a hairline rule rather than a gap or a card edge. */
.split--row > .split__cell + .split__cell {
  border-left: 1px solid var(--rule);
}

.split--column > .split__cell + .split__cell {
  border-top: 1px solid var(--rule);
}

/* Narrow screens read a layout top to bottom, in its reading order, and the
   workspace scrolls instead of squeezing panels below their minimum. */
@media (max-width: 48rem) {
  .split--row {
    flex-direction: column;
    height: auto;
  }

  .split__cell {
    flex-basis: auto;
  }

  .split--row > .split__cell + .split__cell {
    border-top: 1px solid var(--rule);
    border-left: 0;
  }
}
</style>
