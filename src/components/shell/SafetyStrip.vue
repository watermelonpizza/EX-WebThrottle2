<script setup lang="ts">
import { computed, ref } from 'vue';

import EventsPanel from '@/components/panels/EventsPanel.vue';
import { PowerState } from '@/core/protocol';
import { useEventsStore } from '@/stores/events';
import { useLocosStore } from '@/stores/locos';
import { usePowerStore } from '@/stores/power';

const events = useEventsStore();
const locos = useLocosStore();
const power = usePowerStore();

const newest = computed(() => events.events[0]?.text ?? '');

const masterOn = computed(() => power.master === PowerState.ON);

// The count says "something changed" without the strip spelling each change
// out; the Events panel it opens shows them in order.
const logOpen = ref(false);

// A count past two digits reads as "lots"; the log has the detail.
const unreadText = computed(() => (events.unread > 99 ? '99+' : String(events.unread)));

function onLogToggle(event: Event): void {
  logOpen.value = (event as ToggleEvent).newState === 'open';
}

function toggleTrack(letter: string, on: boolean): void {
  power.setTrack(letter, on ? PowerState.OFF : PowerState.ON);
}

function toggleMaster(): void {
  power.setMaster(masterOn.value ? PowerState.OFF : PowerState.ON);
}
</script>

<template>
  <footer class="safety" aria-label="Stop, track power and events">
    <button
      type="button"
      class="safety__stop-all"
      data-testid="stop-all"
      @click="locos.stopAll()"
    >
      STOP ALL
    </button>

    <div class="safety__power">
      <button
        v-for="track in power.tracks"
        :key="track.letter"
        type="button"
        class="power"
        :class="{ 'power--on': track.on }"
        :aria-pressed="track.on"
        :aria-label="`${track.name} ${track.letter} power, ${track.on ? 'on' : 'off'}`"
        :data-testid="`track-power-${track.letter}`"
        @click="toggleTrack(track.letter, track.on)"
      >
        <span class="power__name">{{ track.name }} {{ track.letter }}</span>
        <span class="power__state">{{ track.on ? 'ON' : 'OFF' }}</span>
      </button>

      <!-- A station that has not listed its tracks still has master power. -->
      <button
        v-if="power.tracks.length === 0"
        type="button"
        class="power"
        :class="{ 'power--on': masterOn }"
        :aria-pressed="masterOn"
        data-testid="master-power"
        @click="toggleMaster"
      >
        <span class="power__name">Track power</span>
        <span class="power__state">{{ masterOn ? 'ON' : 'OFF' }}</span>
      </button>
    </div>

    <button
      type="button"
      class="safety__events"
      popovertarget="event-log"
      :aria-label="events.unread > 0 ? `Events, ${events.unread} new` : 'Events'"
      data-testid="events-button"
    >
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3" />
      </svg>
      <span class="safety__events-label">Events</span>
      <span v-if="events.unread > 0" class="safety__unread numeric" data-testid="events-unread">
        {{ unreadText }}
      </span>
    </button>

    <!-- The same Events panel a layout can keep on screen, in a popup. -->
    <div
      id="event-log"
      popover
      class="popup event-log"
      data-testid="event-log"
      @toggle="onLogToggle"
    >
      <EventsPanel :open="logOpen" />
    </div>

    <p class="visually-hidden" aria-live="polite">{{ newest }}</p>
  </footer>
</template>

<style lang="scss" scoped>
// One slim row that never moves: Stop all first, then each track's power,
// then the event log. Safety stays in reach without taking the screen.
.safety {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-4);
  // Clear of a phone's home indicator.
  padding: var(--space-2) var(--space-3)
    max(var(--space-2), env(safe-area-inset-bottom));

  background: var(--chrome);
  border-top: 1px solid var(--rule);
}

.safety__stop-all {
  min-height: var(--target);
  padding: 0 var(--space-5);

  color: var(--stop-ink);
  background: var(--stop);
  border: 0;
  border-radius: var(--radius);
  font-size: var(--text-md);
  font-weight: 700;

  transition: background-color 150ms var(--ease-out);

  &:hover {
    background: var(--stop-hover);
  }

  &:active {
    transform: translateY(1px);
  }
}

// Each track output is a switch whose state is a word as well as a colour.
.safety__power {
  display: flex;
  flex-wrap: wrap;
}

.power {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--target);
  padding: 0 var(--space-4);

  color: var(--ink-muted);
  background: none;
  border: 0;
  border-left: 1px solid var(--rule);
  font-size: var(--text-sm);
  text-transform: uppercase;
  white-space: nowrap;

  &:last-child {
    border-right: 1px solid var(--rule);
  }

  &:hover .power__name {
    color: var(--ink);
  }
}

.power__name {
  transition: color 150ms var(--ease-out);
}

.power__state {
  font-weight: 600;
}

.power--on .power__name {
  color: var(--ink);
}

.power--on .power__state {
  color: var(--accent);
}

.safety__events {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--target);
  margin-left: auto;
  padding: 0 var(--space-3);

  color: var(--ink-muted);
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius);
  font-size: var(--text-sm);
  anchor-name: --event-log;

  &:hover {
    color: var(--ink);
    border-color: var(--edge);
  }

  .icon {
    font-size: var(--text-lg);
  }
}

.safety__unread {
  min-width: 2ch;
  padding: 0 var(--space-1);

  color: var(--ink-on-accent);
  background: var(--accent);
  border-radius: var(--radius);
  font-size: var(--text-xs);
  font-weight: 600;
  text-align: center;
}

// The log opens upwards from its button; the panel inside brings its own
// padding.
.event-log {
  width: min(24rem, calc(100vw - 2 * var(--space-3)));
  max-height: min(28rem, calc(100dvh - 8rem));
  padding: 0;
  position-anchor: --event-log;
  position-area: top span-left;
}

@supports not (position-area: top) {
  .event-log {
    right: var(--space-3);
    bottom: calc(var(--target) + 2 * var(--space-2) + var(--space-2));
  }
}

// On a phone Stop all takes the room the event label gives up, on the same
// single row as the power switches.
@media (max-width: 40rem) {
  .safety {
    flex-wrap: nowrap;
    gap: var(--control-gap);
    padding-inline: var(--space-2);
  }

  .safety__stop-all {
    flex: 1 0 auto;
    padding: 0 var(--space-3);
  }

  .safety__power {
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  .power {
    padding: 0 var(--space-2);
    font-size: var(--text-xs);
  }

  .safety__events {
    margin-left: 0;
    padding: 0 var(--space-2);
  }

  .safety__events-label {
    display: none;
  }
}
</style>
