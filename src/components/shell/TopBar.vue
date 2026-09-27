<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';

import { useClock } from '@/composables/useClock';
import { useConnectionStore } from '@/stores/connection';
import { useLocosStore } from '@/stores/locos';
import { useWorkspaceStore } from '@/stores/workspace';

const connection = useConnectionStore();
const locos = useLocosStore();
const workspace = useWorkspaceStore();
const clock = useClock();

const appMenu = useTemplateRef<HTMLElement>('app-menu');
const linkPopover = useTemplateRef<HTMLElement>('link-popover');

const moving = computed(() => locos.movingHere);

// A menu item has done its job once chosen, so the menu gets out of the way.
function closeMenu(): void {
  appMenu.value?.hidePopover?.();
}

async function disconnect(stopFirst: boolean): Promise<void> {
  if (stopFirst) {
    locos.stopAll();
  }

  linkPopover.value?.hidePopover?.();
  await connection.disconnect();
}
</script>

<template>
  <header class="top-bar">
    <!-- The wordmark goes home, as on any website; the menu has its own
         button at the other end of the bar. -->
    <router-link
      class="top-bar__brand"
      :to="{ name: 'console' }"
      data-testid="home"
    >
      <span class="top-bar__wordmark">WebThrottle</span>
      <span class="top-bar__tag">DCC-EX</span>
    </router-link>

    <nav
      class="roles"
      aria-label="Role"
    >
      <router-link
        v-for="preset in workspace.presets"
        :key="preset.id"
        class="roles__tab"
        :class="{
          'roles__tab--active':
            $route.name !== 'settings' && workspace.presetId === preset.id,
        }"
        :aria-current="
          $route.name !== 'settings' && workspace.presetId === preset.id
            ? 'page'
            : undefined
        "
        :to="`/${preset.id}`"
        :data-testid="`role-${preset.id}`"
      >
        {{ preset.label }}
      </router-link>
    </nav>

    <div class="top-bar__status">
      <button
        type="button"
        class="top-bar__link"
        popovertarget="link-popover"
        data-testid="shell-status"
      >
        <span
          class="lamp"
          aria-hidden="true"
        />
        <span><span class="top-bar__link-state">Connected · </span>{{ connection.transportName }}</span>
      </button>

      <div
        id="link-popover"
        ref="link-popover"
        popover
        class="popup menu menu--end"
        data-testid="link-popover"
      >
        <p class="menu__note">
          Connected to your Command Station by {{ connection.transportName }}.
          <template v-if="connection.station">
            It runs DCC-EX {{ connection.station.version }} on
            {{ connection.station.microprocessor }}.
          </template>
        </p>

        <template v-if="moving.length > 0">
          <p
            class="menu__warning"
            data-testid="disconnect-warning"
          >
            {{ moving.map((throttle) => throttle.name).join(', ') }}
            {{ moving.length === 1 ? 'is' : 'are' }} still moving.
          </p>
          <button
            type="button"
            class="key key--stop"
            data-testid="stop-and-disconnect"
            @click="disconnect(true)"
          >
            Stop all and disconnect
          </button>
          <button
            type="button"
            class="key"
            data-testid="disconnect"
            @click="disconnect(false)"
          >
            Disconnect anyway
          </button>
        </template>
        <button
          v-else
          type="button"
          class="key"
          data-testid="disconnect"
          @click="disconnect(false)"
        >
          Disconnect
        </button>
      </div>

      <time
        class="top-bar__clock numeric"
        data-testid="clock"
      >{{
        clock
      }}</time>

      <button
        type="button"
        class="top-bar__menu"
        popovertarget="app-menu"
        aria-label="Menu"
        title="Menu"
        data-testid="app-menu-button"
      >
        <svg
          class="icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
        </svg>
      </button>

      <div
        id="app-menu"
        ref="app-menu"
        popover
        class="popup menu menu--app"
        data-testid="app-menu"
      >
        <router-link
          class="menu__item"
          :to="{ name: 'settings' }"
          data-testid="menu-settings"
          @click="closeMenu"
        >
          Settings
        </router-link>
        <a
          class="menu__item"
          href="https://dcc-ex.com/throttles/software/ex-webthrottle.html"
          target="_blank"
          rel="noopener"
          @click="closeMenu"
        >
          Help on dcc-ex.com
        </a>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Brand on the left, roles centred, the link and clock on the right, all in
   one slim row. */
.top-bar {
  display: grid;
  flex: none;
  align-items: center;
  gap: var(--space-3);
  grid-template-columns: 1fr auto 1fr;
  padding: var(--space-1) var(--space-3);

  background: var(--chrome);
  border-bottom: 1px solid var(--rule);
}

.top-bar__brand {
  display: flex;
  align-items: center;
  justify-self: start;
  gap: var(--space-2);
  min-height: var(--target);

  color: var(--ink);
  border-radius: var(--radius);
  text-decoration: none;
}

.top-bar__wordmark {
  font-size: var(--text-lg);
  font-weight: 700;
}

.top-bar__tag {
  padding: 0 var(--space-1);

  color: var(--ink-muted);
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  font-size: var(--text-xs);
}

.roles {
  display: flex;
  align-self: stretch;
  margin-block: calc(-1 * var(--space-1));
}

.roles__tab {
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);

  color: var(--ink-muted);
  font-size: var(--text-md);
  text-decoration: none;
  box-shadow: inset 0 calc(-1 * var(--line)) 0 transparent;

  transition:
    color 150ms var(--ease-out),
    box-shadow 150ms var(--ease-out);

  &:hover {
    color: var(--ink);
  }
}

.roles__tab--active {
  color: var(--ink);
  box-shadow: inset 0 calc(-1 * var(--line)) 0 var(--accent);
}

.top-bar__status {
  display: flex;
  align-items: center;
  justify-self: end;
  gap: var(--space-3);
}

.top-bar__link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--target);
  padding: 0 var(--space-2);

  color: var(--ink-muted);
  background: none;
  border: 0;
  border-radius: var(--radius);
  font-size: var(--text-sm);
  anchor-name: --link-popover;

  &:hover {
    color: var(--ink);
  }
}

.lamp {
  width: var(--space-2);
  height: var(--space-2);

  background: var(--accent);
  border-radius: 50%;
}

.top-bar__clock {
  color: var(--ink-muted);
  font-size: var(--text-sm);
}

.top-bar__menu {
  display: grid;
  place-items: center;
  width: var(--target);
  height: var(--target);
  padding: 0;

  color: var(--ink-muted);
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius);
  font-size: var(--text-xl);
  anchor-name: --app-menu;

  &:hover {
    color: var(--ink);
    border-color: var(--edge);
  }
}

.menu {
  min-width: 14rem;
  padding: var(--space-2);
}

/* Without anchor positioning, menus hang from the top bar's right corner. */
@supports not (position-area: bottom) {
  .menu {
    top: calc(var(--target) + var(--space-3));
    right: var(--space-3);
  }
}

.menu--app {
  position-anchor: --app-menu;
}

.menu--end {
  max-width: min(22rem, calc(100vw - 2 * var(--space-3)));
  padding: var(--space-3);
  position-anchor: --link-popover;
}

.menu__item {
  display: flex;
  align-items: center;
  min-height: var(--target);
  padding: 0 var(--space-3);

  color: var(--ink);
  border-radius: var(--radius);
  text-decoration: none;

  &:hover {
    background: var(--raised-hover);
  }
}

.menu__note {
  color: var(--ink-muted);
}

.menu__warning {
  color: var(--attention);
  font-weight: 600;
}

/* Narrow screens: the brand and status share the first row, and the roles
   take a full-width row of their own that scrolls sideways if it must. */
@media (max-width: 64rem) {
  .top-bar {
    grid-template-columns: 1fr auto;
    row-gap: 0;
  }

  .roles {
    grid-column: 1 / -1;
    grid-row: 2;
    margin-block: 0;
    overflow-x: auto;
  }

  .roles__tab {
    flex: 1;
    justify-content: center;
    min-height: var(--target);
    padding: 0 var(--space-2);
    font-size: var(--text-sm);
  }

  .top-bar__tag,
  .top-bar__clock {
    display: none;
  }
}

/* On a phone the lamp and the link's name are enough to see; "Connected"
   is still read out. */
@media (max-width: 30rem) {
  .top-bar__wordmark {
    font-size: var(--text-md);
  }

  .top-bar__link-state {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
</style>
