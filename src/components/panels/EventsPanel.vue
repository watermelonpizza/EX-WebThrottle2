<script setup lang="ts">
import { ref, useId, watch } from 'vue';

import { logTime } from '@/composables/useClock';
import { useEventsStore } from '@/stores/events';

// The event log: what changed on the layout, newest first. It is a panel like
// any other, so a layout can keep it on screen beside the diagram; the strip
// shows the same panel in a popup and says whether that is open.
const props = withDefaults(defineProps<{ open?: boolean }>(), { open: true });

const events = useEventsStore();
const titleId = useId();

// Changes that were already waiting when this view opened stand out from the
// ones read before; changes that arrive while it is open slide in at the top.
const since = ref(0);
const openedAt = ref(0);

watch(
  () => props.open,
  (open) => {
    if (open) {
      since.value = events.readAt;
      openedAt.value = Date.now();
      events.markRead();
    }
  },
  { immediate: true },
);

// On screen, a change is read as it arrives.
watch(
  () => events.events[0]?.id,
  () => {
    if (props.open) {
      events.markRead();
    }
  },
);

function waiting(at: number): boolean {
  return at > since.value && at <= openedAt.value;
}
</script>

<template>
  <div
    class="events-panel"
    role="region"
    :aria-labelledby="titleId"
    data-testid="events-panel"
  >
    <h2 :id="titleId" class="events-panel__title">
      Events
      <span class="events-panel__count numeric">{{
        events.events.length
      }}</span>
    </h2>

    <p v-if="events.events.length === 0" class="events-panel__empty">
      Nothing has changed on the layout yet. Turnouts/points, outputs, sensors,
      track power and locos driven from other Throttles show up here as they
      change.
    </p>
    <TransitionGroup v-else tag="ol" name="event" class="events-panel__list">
      <li
        v-for="event in events.events"
        :key="event.id"
        class="event"
        :class="{ 'event--waiting': waiting(event.at) }"
      >
        <time class="event__at numeric">{{ logTime(event.at) }}</time>
        <span class="event__text">{{ event.text }}</span>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.events-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-2);
  height: 100%;
  padding: var(--space-3) var(--space-4);
}

.events-panel__title {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: var(--text-md);
}

.events-panel__count {
  color: var(--ink-muted);
  font-size: var(--text-sm);
  font-weight: 400;
}

.events-panel__empty {
  max-width: 44ch;
  color: var(--ink-muted);
}

.events-panel__list {
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

/* A timeline: fixed-width times down the left, the change beside each. */
.event {
  display: grid;
  align-items: baseline;
  gap: var(--space-3);
  grid-template-columns: auto 1fr;
  padding: var(--space-1) var(--space-1);

  color: var(--ink-muted);
  border-top: 1px solid var(--rule);
}

.event__at {
  font-size: var(--text-xs);
}

.event--waiting {
  color: var(--ink);

  .event__at {
    color: var(--accent);
  }
}

/* A change arriving while the log is open slides in and glows for a moment,
   so it is seen without a sound or a jump. */
.event-enter-active {
  animation:
    event-slide 250ms var(--ease-out),
    event-glow 2s var(--ease-out);
}

@keyframes event-slide {
  from {
    opacity: 0;
    translate: 0 calc(-1 * var(--space-2));
  }
}

@keyframes event-glow {
  from {
    color: var(--ink);
    background-color: color-mix(in oklab, var(--accent) 22%, transparent);
  }
}
</style>
