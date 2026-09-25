<script setup lang="ts">
import { computed, ref } from 'vue';

import ConnectionPanel from '@/components/connection/ConnectionPanel.vue';
import CommandsPanel from '@/components/panels/CommandsPanel.vue';
import DebugPanel from '@/components/panels/DebugPanel.vue';
import DrivingPanel from '@/components/panels/DrivingPanel.vue';
import LayoutPanel from '@/components/panels/LayoutPanel.vue';
import LocosPanel from '@/components/panels/LocosPanel.vue';
import WorkspacePanel from '@/components/layout/WorkspacePanel.vue';
import UiButton from '@/components/ui/UiButton.vue';
import { useConnectionStore } from '@/stores/connection';
import { ARRANGEMENTS, PANELS, usePanelsStore } from '@/stores/panels';

const connection = useConnectionStore();
const panels = usePanelsStore();

const connected = computed(() => connection.status === 'connected');
const rawDebug = ref(false);

const arrangement = computed(() => ARRANGEMENTS[panels.arrangement]);
const openPanels = computed(() => {
  const placed = arrangement.value.areas.flat();

  return PANELS.filter(
    (panel) => placed.includes(panel.id) && panels.isOpen(panel.id),
  );
});

function toggleDebugMode(): void {
  rawDebug.value = !rawDebug.value;
}

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
        <header class="connect-card__header">
          <span class="connect-card__emblem" aria-hidden="true">
            <i class="mdi mdi-train-cog" />
          </span>
          <div>
            <p class="connect-card__eyebrow">Command station link</p>
            <h1 class="connect-card__title" data-test="page-title">
              WebThrottle
            </h1>
            <p class="connect-card__lead">
              Choose how to reach your DCC-EX command station.
            </p>
          </div>
        </header>

        <ConnectionPanel />

        <p class="connect-card__note">
          Your throttle, layout controls, and diagnostics appear here after the
          connection opens.
        </p>
      </div>
    </section>

    <section v-else class="console__screen workspace-screen">
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
          <template #actions>
            <UiButton
              v-if="panel.id === 'debug'"
              variant="ghost"
              class="debug-mode-toggle"
              :aria-label="rawDebug ? 'Switch to nice mode' : 'Switch to raw mode'"
              :aria-pressed="rawDebug"
              data-test="debug-mode-toggle"
              @click="toggleDebugMode"
            >
              {{ rawDebug ? 'Nice' : 'Raw' }}
            </UiButton>
          </template>

          <LayoutPanel v-if="panel.id === 'layout'" />
          <LocosPanel v-else-if="panel.id === 'locos'" />
          <DrivingPanel v-else-if="panel.id === 'driving'" />
          <CommandsPanel v-else-if="panel.id === 'commands'" />
          <DebugPanel v-else :raw-mode="rawDebug" />
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
  box-sizing: border-box;
  height: 100%;

  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;

  overflow-y: auto;
}

.workspace-screen {
  overflow: hidden;
}

.connect-screen {
  align-items: center;
  justify-content: center;
}

.connect-card {
  width: min(62rem, 100%);
  padding: clamp(1.25rem, 3vw, 2rem);

  background: var(--color-panel);
  border-radius: var(--radius);
  box-shadow: var(--panel-shadow);
}

.connect-card__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.connect-card__emblem {
  display: grid;
  flex: none;
  place-items: center;
  width: 4rem;
  height: 4rem;

  color: var(--color-brass-ink);
  background: var(--color-brass);
  border-radius: 50%;
  font-size: 2rem;
  box-shadow: inset 0 2px 0 rgb(255 255 255 / 0.35);
}

.connect-card__eyebrow {
  margin: 0 0 0.125rem;
  color: var(--color-ink-dim);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.connect-card__title {
  margin: 0;
  font-size: clamp(1.5rem, 4vw, 2rem);
}

.connect-card__lead {
  margin: 0.25rem 0 0;
  color: var(--color-ink-dim);
}

.connect-card__note {
  margin: 1.25rem 0 0;
  padding-top: 0.75rem;

  color: var(--color-ink-dim);
  border-top: 1px solid var(--color-panel-edge);
  font-size: 0.85rem;
}

.workspace {
  display: grid;
  gap: 1rem;
  flex: 1;
  min-height: 0;

  // Keep each panel within the workspace; its body owns any content scrolling.
  grid-auto-rows: minmax(0, 1fr);
}

.workspace__panel {
  min-height: 0;
}

:deep(.debug-mode-toggle) {
  min-height: 2rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.8rem;
}

@media (max-width: 40rem) {
  .connect-card__header {
    align-items: flex-start;
    gap: 0.75rem;
  }

  .connect-card__emblem {
    width: 3rem;
    height: 3rem;
    font-size: 1.5rem;
  }

  .workspace {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: none;
  }

  .workspace__panel {
    grid-area: auto !important;
  }
}
</style>
