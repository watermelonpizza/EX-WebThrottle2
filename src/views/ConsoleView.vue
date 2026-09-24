<script setup lang="ts">
import { computed } from 'vue';

import ConnectionPanel from '@/components/connection/ConnectionPanel.vue';
import DebugPanel from '@/components/panels/DebugPanel.vue';
import DrivingPanel from '@/components/panels/DrivingPanel.vue';
import LayoutPanel from '@/components/panels/LayoutPanel.vue';
import LocosPanel from '@/components/panels/LocosPanel.vue';
import WorkspacePanel from '@/components/layout/WorkspacePanel.vue';
import { useConnectionStore } from '@/stores/connection';
import { ARRANGEMENTS, PANELS, usePanelsStore } from '@/stores/panels';

const connection = useConnectionStore();
const panels = usePanelsStore();

const connected = computed(() => connection.status === 'connected');

const arrangement = computed(() => ARRANGEMENTS[panels.arrangement]);
const openPanels = computed(() =>
  PANELS.filter((panel) => panels.isOpen(panel.id)),
);

function gridStyle(): Record<string, string> {
  return {
    gridTemplateColumns: arrangement.value.columns,
    gridTemplateAreas: arrangement.value.areas
      .map((row) => `"${row.join(' ')}"`)
      .join(' '),
  };
}
</script>

<template>
  <div class="console">
    <section v-if="!connected" class="console__screen connect-screen">
      <div class="connect-card">
        <i class="mdi mdi-train-cog connect-card__icon" aria-hidden="true" />
        <h1 class="connect-card__title" data-test="page-title">WebThrottle</h1>
        <p class="connect-card__lead">
          Connect to your DCC-EX command station to take the console.
        </p>

        <ConnectionPanel />

        <p class="connect-card__note">
          Web Serial talks to a command station over USB. Emulator runs a
          virtual command station in the browser so you can explore without
          hardware. A Hub connection is planned.
        </p>
      </div>
    </section>

    <section v-else class="console__screen">
      <div class="workspace" :style="gridStyle()">
        <WorkspacePanel
          v-for="panel in openPanels"
          :key="panel.id"
          class="workspace__panel"
          :title="panel.title"
          :icon="panel.icon"
          :style="{ gridArea: panel.id }"
          :data-test="`panel-${panel.id}`"
        >
          <LayoutPanel v-if="panel.id === 'layout'" />
          <LocosPanel v-else-if="panel.id === 'locos'" />
          <DrivingPanel v-else-if="panel.id === 'driving'" />
          <DebugPanel v-else />
        </WorkspacePanel>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.console {
  height: 100%;
}

.console__screen {
  height: 100%;

  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;

  overflow-y: auto;
}

.connect-screen {
  align-items: center;
  justify-content: center;
}

.connect-card {
  width: min(28rem, 100%);
  padding: 1.5rem;

  text-align: center;

  background: var(--color-panel);
  border-radius: var(--radius);
  box-shadow: var(--panel-shadow);
}

.connect-card__icon {
  font-size: 2.5rem;
  color: var(--color-brass);
}

.connect-card__title {
  margin: 0.5rem 0 0.25rem;
}

.connect-card__lead {
  margin: 0 0 1rem;
}

.connect-card__note {
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--color-ink-dim);
}

.workspace {
  display: grid;
  gap: 1rem;
  flex: 1;
  min-height: 0;

  // Rows at least fit their content so panels never overlap; extra space is
  // split evenly so the debug trace still scrolls inside its panel.
  grid-auto-rows: minmax(min-content, 1fr);
}

.workspace__panel {
  min-height: 0;
}

@media (max-width: 40rem) {
  .workspace {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .workspace__panel {
    flex-shrink: 0;
    grid-area: auto !important;
  }
}
</style>
