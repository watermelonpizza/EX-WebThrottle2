<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onScopeDispose,
  ref,
  useTemplateRef,
  watch,
} from 'vue';

import DriveForm from '@/components/throttle/DriveForm.vue';
import { fitKeys } from '@/components/throttle/fit-keys';
import FunctionKeys from '@/components/throttle/FunctionKeys.vue';
import SpeedScale from '@/components/throttle/SpeedScale.vue';
import { useDiagramStore } from '@/stores/diagram';
import type { Throttle } from '@/stores/locos';
import { useLocosStore } from '@/stores/locos';
import { useMapsStore } from '@/stores/maps';

const props = withDefaults(
  defineProps<{ throttle: Throttle; canAdd?: boolean }>(),
  { canAdd: false },
);

const locos = useLocosStore();
const maps = useMapsStore();
const diagrams = useDiagramStore();

const menu = useTemplateRef<HTMLElement>('menu');
const functionsArea = useTemplateRef<HTMLElement>('functions-area');

const address = computed(() => props.throttle.address);
const menuId = computed(() => `desk-menu-${address.value}`);
const addId = computed(() => `desk-add-${address.value}`);
const functionsId = computed(() => `desk-functions-${address.value}`);

const forward = computed(() => props.throttle.forward);

const functions = computed(() => maps.visibleFunctions(props.throttle.mapId));

// How many keys the desk shows (undefined: all of them), and whether they are
// a touch target high instead of a control high; see fitKeys.
const limit = ref<number | undefined>();
const tight = ref(false);

// A size token in pixels, read through the key grid itself so a theme's
// larger controls count.
function keyRow(grid: HTMLElement, token: string): number {
  grid.style.gridAutoRows = `var(${token})`;

  const height = parseFloat(getComputedStyle(grid).gridAutoRows);

  grid.style.removeProperty('grid-auto-rows');

  return height;
}

function measure(): void {
  const area = functionsArea.value;
  const grid = area?.querySelector<HTMLElement>('.fn-keys');
  const desk = area?.closest<HTMLElement>('.desk');

  if (!area || !grid || !desk) {
    return;
  }

  // On a phone the page scrolls and every desk is as tall as it needs, with
  // tight keys so more of it fits on the screen.
  if (getComputedStyle(desk).containerType !== 'size') {
    limit.value = undefined;
    tight.value = true;

    return;
  }

  const styles = getComputedStyle(grid);
  const fit = fitKeys(
    {
      available:
        area.getBoundingClientRect().bottom -
        parseFloat(getComputedStyle(area).paddingBottom) -
        grid.getBoundingClientRect().top,
      rowGap: parseFloat(styles.rowGap) || 0,
      columns: styles.gridTemplateColumns.split(' ').filter(Boolean).length,
      roomy: keyRow(grid, '--control'),
      compact: keyRow(grid, '--target'),
    },
    functions.value.length,
  );

  if (fit) {
    tight.value = fit.tight;
    limit.value = fit.limit;
  }
}

let observer: ResizeObserver | undefined;

onMounted(() => {
  if (functionsArea.value && typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(() => measure());
    observer.observe(functionsArea.value);
  }
});

watch(functions, () => nextTick(measure));
onScopeDispose(() => observer?.disconnect());

const valueText = computed(
  () =>
    `${props.throttle.speed} of 126, ${forward.value ? 'forward' : 'reverse'}${props.throttle.estop ? ', emergency stopped' : ''}`,
);

const berths = computed(() => diagrams.diagram?.berths ?? []);

const berth = computed(() => diagrams.berthOf(address.value));

function release(): void {
  menu.value?.hidePopover?.();
  locos.release(address.value);
}
</script>

<template>
  <article
    class="desk"
    :class="{ 'desk--estop': throttle.estop }"
    :aria-label="`${throttle.name}, address ${throttle.address}`"
    data-testid="throttle-panel"
  >
    <div class="desk__grid">
      <header class="desk__head">
        <!-- The separator belongs to the address, so it sits between the two
           on one line, and is clipped off the start of the line when the
           address wraps onto a line of its own. -->
        <button
          type="button"
          class="desk__title"
          :popovertarget="menuId"
          :style="{ anchorName: `--${menuId}` }"
          data-testid="desk-title"
        >
          <span class="desk__name">{{ throttle.name }}</span>
          <span class="desk__address numeric">
            <span class="desk__sep" aria-hidden="true">·</span>Address
            {{ throttle.address }}
          </span>
        </button>

        <button
          v-if="canAdd"
          type="button"
          class="desk__add key"
          :popovertarget="addId"
          :style="{ anchorName: `--${addId}` }"
          aria-label="Add loco"
          title="Add loco"
          data-testid="desk-add"
        >
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
          </svg>
        </button>

        <div
          v-if="canAdd"
          :id="addId"
          popover
          class="popup desk-menu"
          :style="{ positionAnchor: `--${addId}` }"
          aria-label="Drive another loco"
        >
          <h3 class="desk-menu__title">Drive another loco</h3>
          <DriveForm compact />
        </div>

        <div
          :id="menuId"
          ref="menu"
          popover
          class="popup desk-menu desk-menu--start"
          :style="{ positionAnchor: `--${menuId}` }"
          data-testid="desk-menu"
        >
          <label class="desk-menu__row">
            <span>Function map</span>
            <select
              class="field"
              :value="throttle.mapId"
              data-testid="function-map"
              @change="
                locos.setMap(
                  address,
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="default">Default (F0–F31)</option>
              <option v-for="map in maps.maps" :key="map.id" :value="map.id">
                {{ map.name }}
              </option>
            </select>
          </label>

          <label v-if="berths.length > 0" class="desk-menu__row">
            <span>On the diagram</span>
            <select
              class="field"
              :value="berth"
              data-testid="berth-select"
              @change="
                diagrams.setBerth(
                  address,
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="">Not shown</option>
              <option
                v-for="candidate in berths"
                :key="candidate.id"
                :value="candidate.id"
              >
                {{ candidate.label }}
              </option>
            </select>
          </label>

          <button
            type="button"
            class="key"
            data-testid="release"
            @click="release"
          >
            Release {{ throttle.name }}
          </button>
        </div>
      </header>

      <section class="desk__drive">
        <output class="desk__speed numeric" data-testid="speed-readout">
          {{ throttle.speed }}
        </output>

        <SpeedScale
          :speed="throttle.speed"
          :label="`Speed, ${throttle.name}`"
          :value-text="valueText"
          @change="locos.setSpeed(address, $event)"
        />

        <div class="desk__controls">
          <div
            class="direction"
            role="group"
            aria-label="Direction"
            data-testid="direction-toggle"
          >
            <button
              type="button"
              class="direction__side"
              :aria-pressed="!forward"
              @click="locos.setForward(address, false)"
            >
              REV
            </button>
            <span class="direction__rule" aria-hidden="true" />
            <button
              type="button"
              class="direction__side"
              :aria-pressed="forward"
              @click="locos.setForward(address, true)"
            >
              FWD
            </button>
          </div>

          <button
            type="button"
            class="desk__stop"
            :aria-label="`Stop ${throttle.name} now`"
            data-testid="estop"
            @click="locos.emergencyStop(address)"
          >
            {{ throttle.estop ? 'Stopped' : 'Stop' }}
          </button>

          <button
            type="button"
            class="desk__all desk__all--slim key"
            :popovertarget="functionsId"
            :aria-label="`All ${functions.length} functions`"
          >
            Functions
          </button>
        </div>
      </section>

      <section
        ref="functions-area"
        class="desk__functions"
        :aria-label="`Functions for ${throttle.name}`"
      >
        <div class="desk__functions-head">
          <h3 class="desk__functions-title" data-testid="functions-title">
            Functions · {{ functions.length }}
          </h3>
          <button
            v-if="limit !== undefined"
            type="button"
            class="desk__all key"
            :popovertarget="functionsId"
            data-testid="all-functions"
          >
            All {{ functions.length }} functions
          </button>
        </div>

        <FunctionKeys
          class="desk__keys"
          data-testid="desk-keys"
          :class="{ 'desk__keys--tight': tight }"
          :functions="functions"
          :limit="limit"
          :states="throttle.functions"
          @set="(fn, on) => locos.setFunction(address, fn, on)"
        />

        <!-- Only needed when the desk leaves keys out; one copy of each key
           otherwise, for people and for assistive tech. -->
        <div
          v-if="limit !== undefined"
          :id="functionsId"
          popover
          class="popup desk-functions"
          :aria-label="`All functions for ${throttle.name}`"
        >
          <h3 class="desk__functions-title">
            {{ throttle.name }} · Functions · {{ functions.length }}
          </h3>
          <FunctionKeys
            :functions="functions"
            :states="throttle.functions"
            @set="(fn, on) => locos.setFunction(address, fn, on)"
          />
        </div>
      </section>
    </div>
  </article>
</template>

<style scoped>
.desk {
  /* The loco's name sets the size of the whole title line; the address
     follows it, never larger. */
  --title: var(--text-lg);

  container: desk / size;
  min-height: 10rem;
  background: var(--panel);
}

/* The desk is the container; this grid inside it is what its size variants
   rearrange (a container cannot restyle itself from its own size). */
.desk__grid {
  display: grid;
  grid-template:
    'head' auto
    'drive' auto
    'functions' minmax(0, 1fr) / minmax(0, 1fr);
  height: 100%;
}

.desk__head {
  grid-area: head;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  /* Every head is as tall as one holding the add key, so desks side by side
     line up their speed, scale and controls. */
  min-block-size: calc(var(--target) + 2 * var(--space-2));
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--rule);
}

.desk__title {
  /* Room for the separator and the space either side of it. */
  --sep: 1.2em;

  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  min-width: 0;
  padding: 0;
  overflow: hidden;

  background: none;
  border: 0;
  font-size: var(--title);
  line-height: var(--leading-tight);
  text-align: left;

  &:hover .desk__name {
    color: var(--accent);
  }
}

.desk__name {
  min-width: 0;
  padding-inline-end: var(--sep);
  font-weight: 600;
}

.desk__address {
  margin-inline-start: calc(-1 * var(--sep));
  color: var(--ink-muted);
  font-weight: 400;
  white-space: nowrap;
}

.desk__sep {
  display: inline-block;
  width: var(--sep);
  text-align: center;
}

.desk__add {
  flex: none;
  width: var(--target);
  margin-left: auto;
  padding: 0;
  color: var(--ink-muted);
  font-size: var(--text-lg);
}

.desk-menu__title {
  font-size: var(--text-md);
  font-weight: 600;
}

.desk__drive {
  grid-area: drive;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--rule);
}

.desk__speed {
  align-self: flex-start;

  color: var(--accent);
  font-size: var(--text-display);
  font-weight: 500;
  line-height: 1;
  /* Trim the line box to the digits themselves, so the readout's space is the
     number and nothing above or below it. */
  text-box: trim-both cap alphabetic;
}

.desk__controls {
  display: flex;
  gap: var(--control-gap);
}

.direction {
  display: flex;
  flex: 1;
  align-items: center;
  min-height: var(--control);

  border: 1px solid var(--edge);
  border-radius: var(--radius);
  font-size: var(--text-lg);
}

.direction__side {
  flex: 1;
  align-self: stretch;

  color: var(--ink-muted);
  background: none;
  border: 0;
  font-size: inherit;
  font-weight: 600;

  &[aria-pressed='true'] {
    color: var(--accent);
  }

  &:hover {
    color: var(--ink);
  }

  &[aria-pressed='true']:hover {
    color: var(--accent);
  }
}

.direction__rule {
  width: var(--line);
  height: 1em;
  background: var(--edge);
}

.desk__stop {
  flex: 1;
  min-height: var(--control);

  color: var(--stop-ink);
  background: var(--stop);
  border: 0;
  border-radius: var(--radius);
  font-size: var(--text-lg);
  font-weight: 600;

  transition: background-color 150ms var(--ease-out);

  &:hover {
    background: var(--stop-hover);
  }
}

.desk--estop .desk__speed {
  color: var(--stop);
}

.desk__functions {
  grid-area: functions;
  min-height: 0;
  padding: var(--space-3) var(--space-4);
  overflow: hidden;
}

.desk__functions-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  /* Room for the "All functions" key whether it shows or not, so key rows
     line up across desks. */
  min-block-size: var(--target);
  margin-bottom: var(--space-2);
}

.desk__functions-title {
  font-size: var(--text-md);
  font-weight: 600;
}

.desk__all {
  min-height: var(--target);
  padding: 0 var(--space-3);
  font-size: var(--text-xs);
}

.desk .desk__keys--tight {
  grid-auto-rows: var(--target);
}

/* The same list from the controls row, for the slimmest desk only. */
.desk__all--slim {
  display: none;
}

.desk-menu {
  width: min(24rem, calc(100vw - 2 * var(--space-3)));
}

/* The loco's own menu hangs from its name, on the left of the desk. */
.desk-menu--start {
  position-area: bottom span-right;
}

@supports not (position-area: bottom) {
  .desk-menu {
    top: var(--space-7);
    right: var(--space-3);
  }
}

/* The whole set of keys, over the middle of the screen. */
.desk-functions {
  top: 50%;
  left: 50%;
  translate: -50% -50%;
  width: min(40rem, calc(100vw - 2 * var(--space-3)));
  position-area: none;
}

.desk-menu__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);

  > span {
    color: var(--ink-muted);
    font-size: var(--text-xs);
  }
}

/* Size variants, chosen by the room this desk has rather than the window.
   A wide desk (one loco on a big screen) becomes a cab: driving on the left,
   functions on the right. */
@container desk (width >= 48rem) {
  .desk__grid {
    grid-template:
      'head head' auto
      'drive functions' minmax(0, 1fr) / minmax(20rem, 2fr) minmax(0, 3fr);
  }

  .desk__drive {
    border-right: 1px solid var(--rule);
    border-bottom: 0;
  }
}

/* Short desks (two or three locos at once) keep speed, direction and stop
   whole at a smaller size; the key rows that fit come from the measurement
   above. */
@container desk (height < 32rem) {
  .desk {
    --title: var(--text-md);
  }

  .desk__head {
    padding-block: var(--space-1);
    min-block-size: calc(var(--target) + 2 * var(--space-1));
  }

  .desk__drive,
  .desk__functions {
    padding-block: var(--space-2);
  }

  /* The readout sits beside its scale rather than above it, a row saved for
     a row of keys. It keeps the width of three digits, so the scale does not
     shift as the speed changes. */
  .desk__drive {
    display: grid;
    align-items: center;
    gap: var(--space-2) var(--space-3);
    grid-template-columns: auto minmax(0, 1fr);
  }

  .desk__speed {
    align-self: start;
    min-width: 3ch;
    font-size: var(--text-2xl);
  }

  .desk__controls {
    grid-column: 1 / -1;
  }

  .direction,
  .desk__stop {
    min-height: var(--target);
    font-size: var(--text-md);
  }
}

/* The slimmest desk is speed, direction and stop; functions are one press
   away from a key in the same row. */
@container desk (height < 16rem) {
  .desk__functions {
    display: none;
  }

  .desk__all--slim {
    display: inline-flex;
    flex: none;
  }
}

/* A phone page scrolls, so each desk simply takes the height it needs. */
@media (max-width: 48rem) {
  .desk {
    container-type: inline-size;
    min-height: 0;
  }

  .desk__grid {
    height: auto;
  }

  .desk__functions {
    overflow: visible;
  }
}
</style>
