<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import { PowerState } from '@/core/protocol';
import { useConnectionStore } from '@/stores/connection';
import { usePowerStore } from '@/stores/power';

const connection = useConnectionStore();
const power = usePowerStore();

const connected = computed(() => connection.status === 'connected');

const connectionLamp =
  connection.status === 'connected'
    ? 'on'
    : connection.status === 'connecting'
      ? 'warn'
      : 'off';

function toggleMaster(): void {
  power.setMaster(
    power.master === PowerState.ON ? PowerState.OFF : PowerState.ON,
  );
}

function toggleTrack(letter: string, on: boolean): void {
  power.setTrack(letter, on ? PowerState.OFF : PowerState.ON);
}

const { master } = storeToRefs(power);
</script>

<template>
  <footer class="status-bar">
    <span class="status-bar__item">
      <i
        class="status-bar__lamp"
        :class="`status-bar__lamp--${connectionLamp}`"
        aria-hidden="true"
      />
      <span data-test="shell-status">{{ connection.status }}</span>
    </span>

    <span v-if="connected" class="status-bar__item status-bar__power">
      <button
        class="power-toggle"
        data-test="commander-power"
        :aria-pressed="master === PowerState.ON"
        :title="
          master === PowerState.ON
            ? 'Power off every track'
            : 'Power on every track'
        "
        @click="toggleMaster"
      >
        <i
          class="status-bar__lamp"
          :class="
            master === PowerState.ON
              ? 'status-bar__lamp--on'
              : 'status-bar__lamp--off'
          "
          aria-hidden="true"
        />
        Commander
      </button>

      <button
        v-for="track in power.tracks"
        :key="track.letter"
        class="power-toggle"
        :data-test="`track-power-${track.letter}`"
        :aria-pressed="track.on"
        :title="
          track.on
            ? `Power off ${track.name} track`
            : `Power on ${track.name} track`
        "
        @click="toggleTrack(track.letter, track.on)"
      >
        <i
          class="status-bar__lamp"
          :class="track.on ? 'status-bar__lamp--on' : 'status-bar__lamp--off'"
          aria-hidden="true"
        />
        {{ track.name }}
      </button>
    </span>

    <span class="status-bar__item status-bar__actions">
      <button
        v-if="connected"
        class="power-toggle"
        data-test="disconnect"
        :title="connection.transportName"
        @click="connection.disconnect()"
      >
        <i class="mdi mdi-power-plug-off" aria-hidden="true" />
        Disconnect
      </button>
    </span>
  </footer>
</template>

<style lang="scss" scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 1.625rem;
  padding: 0.0625rem 0.625rem;

  font-size: 0.72rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;

  color: var(--color-ink-dim);
  background: var(--color-panel);
  box-shadow: inset 0 1px 0 var(--color-panel-edge);
}

.status-bar__item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  white-space: nowrap;
}

.status-bar__power {
  gap: 0.5rem;
  margin-left: 0.5rem;
}

.status-bar__actions {
  margin-left: auto;
}

.power-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0;

  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;

  background: none;
  border: 0;
  cursor: pointer;
}

.power-toggle:hover:not(:disabled) {
  color: var(--color-ink);
}

.power-toggle:focus-visible {
  outline: 1px solid var(--color-brass);
  outline-offset: 2px;
}

.power-toggle[aria-pressed='true'] {
  color: var(--color-ink);
}

.status-bar__lamp {
  width: 0.5rem;
  height: 0.5rem;

  border-radius: 50%;
  background: var(--color-cream);
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.3);
}

.status-bar__lamp--on {
  background: var(--color-ok);
  box-shadow:
    inset 0 0 0 1px rgb(0 0 0 / 0.3),
    0 0 4px var(--color-ok);
}

.status-bar__lamp--warn {
  background: var(--color-warn);
}

.status-bar__lamp--off {
  background: var(--color-cream);
}

@media (max-width: 40rem) {
  .status-bar {
    overflow-x: auto;
  }
}
</style>
