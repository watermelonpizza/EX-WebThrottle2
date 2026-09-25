<script setup lang="ts">
import { computed, ref } from 'vue';

import UiBadge from '@/components/ui/UiBadge.vue';
import UiButton from '@/components/ui/UiButton.vue';
import { useConnectionStore } from '@/stores/connection';

const store = useConnectionStore();
const emulatorUrl = ref('ws://127.0.0.1:4444');

const lamp = computed(() =>
  store.status === 'connected'
    ? 'on'
    : store.status === 'connecting'
      ? 'danger'
      : 'off',
);

const emulatorUrlError = computed(() => {
  const value = emulatorUrl.value.trim();

  if (!value) {
    return 'Enter a WebSocket URL.';
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return 'Enter a full WebSocket URL, such as ws://192.168.1.25:4444.';
  }

  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    return 'The URL must start with ws:// or wss://.';
  }

  if (parsed.username || parsed.password) {
    return 'WebSocket URLs cannot include a username or password.';
  }

  if (window.location.protocol === 'https:' && parsed.protocol !== 'wss:') {
    return 'This page uses HTTPS, so the WebSocket URL must use wss://.';
  }

  return '';
});

const statusHint = computed(() =>
  store.status === 'connecting'
    ? 'Opening the connection…'
    : 'Choose how WebThrottle should reach your command station.',
);

function connectSerial(): void {
  void store.connectToSerial();
}

function connectEmulator(): void {
  if (emulatorUrlError.value) {
    return;
  }

  void store.connectToEmulator(emulatorUrl.value.trim());
}
</script>

<template>
  <div class="connection-panel">
    <header class="connection-panel__status">
      <UiBadge
        :state="lamp"
        :label="`${store.status}${store.transportName ? ` via ${store.transportName}` : ''}`"
        data-test="status"
      />
      <p>{{ statusHint }}</p>
    </header>

    <div class="connection-panel__methods">
      <section class="connection-method" aria-labelledby="serial-title">
        <div class="connection-method__heading">
          <span class="connection-method__icon" aria-hidden="true">
            <i class="mdi mdi-usb-port" />
          </span>
          <div>
            <h2 id="serial-title">USB serial</h2>
            <p>Connect directly to a command station over USB.</p>
          </div>
        </div>

        <p v-if="!store.serialAvailable" class="connection-method__note">
          Web Serial is not available in this browser. Try a supported desktop
          browser or use the emulator connection.
        </p>
        <p v-else class="connection-method__note">
          Plug in the command station, allow serial access, and choose its port.
        </p>

        <UiButton
          class="connection-method__button"
          :disabled="!store.serialAvailable || store.status !== 'disconnected'"
          data-test="connect-serial"
          @click="connectSerial"
        >
          Connect by USB
        </UiButton>
      </section>

      <section class="connection-method" aria-labelledby="emulator-title">
        <div class="connection-method__heading">
          <span class="connection-method__icon" aria-hidden="true">
            <i class="mdi mdi-chip" />
          </span>
          <div>
            <h2 id="emulator-title">Emulator or WebSocket</h2>
            <p>Connect to a local emulator or another WebSocket endpoint.</p>
          </div>
        </div>

        <form
          class="connection-method__form"
          data-test="emulator-connect-form"
          @submit.prevent="connectEmulator"
        >
          <label class="connection-method__label" for="emulator-url">
            WebSocket URL
          </label>
          <input
            id="emulator-url"
            v-model="emulatorUrl"
            class="field connection-method__url"
            type="text"
            inputmode="url"
            autocomplete="url"
            autocapitalize="none"
            spellcheck="false"
            placeholder="ws://127.0.0.1:4444"
            :aria-invalid="Boolean(emulatorUrlError)"
            :aria-describedby="emulatorUrlError ? 'emulator-url-error' : 'emulator-url-help'"
            data-test="emulator-url"
          />
          <p
            v-if="emulatorUrlError"
            id="emulator-url-error"
            class="connection-method__note connection-method__note--error"
            data-test="emulator-url-error"
          >
            {{ emulatorUrlError }}
          </p>
          <p v-else id="emulator-url-help" class="connection-method__note">
            Default: ws://127.0.0.1:4444. Change the host, port, or path as needed.
          </p>

          <UiButton
            type="submit"
            class="connection-method__button"
            :disabled="Boolean(emulatorUrlError) || store.status !== 'disconnected'"
            data-test="connect-emulator"
          >
            Connect to emulator
          </UiButton>
        </form>
      </section>
    </div>

    <div class="connection-panel__bottom">
      <p
        v-if="store.connectionError"
        class="connection-panel__error"
        role="alert"
        data-test="connection-error"
      >
        {{ store.connectionError }}
      </p>

      <UiButton
        v-if="store.status !== 'disconnected'"
        tone="danger"
        data-test="disconnect"
        @click="store.disconnect()"
      >
        Disconnect
      </UiButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.connection-panel {
  display: grid;
  gap: 1rem;
}

.connection-panel__status {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.connection-panel__status p {
  margin: 0;
  color: var(--color-ink-dim);
  font-size: 0.9rem;
}

.connection-panel__methods {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.connection-method {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  padding: 1rem;

  background: var(--color-panel-raise);
  border: 1px solid var(--color-panel-edge);
  border-radius: var(--radius);
}

.connection-method__heading {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.connection-method__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;

  color: var(--color-brass-ink);
  background: var(--color-brass);
  border-radius: 50%;
  font-size: 1.2rem;
}

.connection-method__heading h2 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}

.connection-method__heading p,
.connection-method__note {
  margin: 0;
  color: var(--color-ink-dim);
  font-size: 0.85rem;
}

.connection-method__note {
  min-height: 2.5em;
  margin-bottom: 0.75rem;
}

.connection-method__note--error {
  color: var(--color-danger-text);
}

.connection-method__form {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
}

.connection-method__label {
  margin-bottom: 0.25rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.connection-method__url {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 0.5rem;
  font-family: var(--font-display);
  font-size: 0.85rem;
}

.connection-method__button {
  width: 100%;
  margin-top: auto;
}

.connection-panel__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap);
}

.connection-panel__error {
  margin: 0;
  color: var(--color-danger-text);
  font-size: 0.875rem;
  font-weight: 600;
}

@media (max-width: 40rem) {
  .connection-panel__methods {
    grid-template-columns: minmax(0, 1fr);
  }

  .connection-method__note {
    min-height: 0;
  }
}
</style>
