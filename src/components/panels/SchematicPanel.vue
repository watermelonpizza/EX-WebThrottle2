<script setup lang="ts">
import DiagramKey from '@/components/schematic/DiagramKey.vue';
import RouteList from '@/components/schematic/RouteList.vue';
import SchematicDiagram from '@/components/schematic/SchematicDiagram.vue';
import { useDiagramStore } from '@/stores/diagram';

const diagrams = useDiagramStore();
</script>

<template>
  <div class="schematic-panel">
    <template v-if="diagrams.diagram">
      <div
        class="schematic-panel__drawing"
        :style="{ '--drawing-ratio': `${diagrams.diagram.width} / ${diagrams.diagram.height}` }"
      >
        <SchematicDiagram :diagram="diagrams.diagram" />
        <div class="schematic-panel__foot">
          <DiagramKey />
          <p class="schematic-panel__caption">
            Sample diagram of the {{ diagrams.diagram.name.toLowerCase() }}
          </p>
        </div>
      </div>
      <!-- Too narrow to operate a drawing: the same turnouts as rows, each
           still drawing its own route. -->
      <RouteList class="schematic-panel__tiles" />
    </template>
    <RouteList v-else />
  </div>
</template>

<style lang="scss" scoped>
.schematic-panel {
  height: 100%;
}

.schematic-panel__drawing {
  display: grid;
  height: 100%;
}

// The key and caption share the drawing's cell and sit in its lower corner,
// so the diagram keeps the panel's full height to scale into.
.schematic-panel__drawing > * {
  grid-area: 1 / 1;
  min-height: 0;
}

.schematic-panel__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  align-self: end;
  justify-self: start;
  gap: var(--space-2) var(--space-3);
  margin: var(--space-3);
}

.schematic-panel__caption {
  max-width: 60ch;
  color: var(--ink-muted);
  font-size: var(--text-sm);
}

.schematic-panel__tiles {
  display: none;
}

@container panel (width < 20rem) {
  .schematic-panel__drawing {
    display: none;
  }

  .schematic-panel__tiles {
    display: flex;
  }
}

// A phone page scrolls, so the drawing takes the height its width gives it.
@media (max-width: 48rem) {
  .schematic-panel,
  .schematic-panel__drawing {
    height: auto;
  }

  .schematic-panel__drawing {
    aspect-ratio: var(--drawing-ratio);
  }
}
</style>
