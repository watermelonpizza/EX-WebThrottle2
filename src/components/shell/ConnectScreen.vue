<script setup lang="ts">
import { computed, ref } from 'vue';

import { EMULATOR_URL, useConnectionStore } from '@/stores/connection';

const connection = useConnectionStore();

const url = ref(EMULATOR_URL);
const connecting = computed(() => connection.status === 'connecting');

const urlError = computed(() =>
  connection.urlProblem(url.value, window.location.protocol),
);

function connectUsb(): void {
  void connection.connectToSerial();
}

function connectUrl(): void {
  if (!urlError.value) {
    void connection.connectToEmulator(url.value.trim());
  }
}
</script>

<template>
  <section
    class="connect"
    :class="{ 'connect--connecting': connecting }"
    aria-labelledby="connect-title"
  >
    <div class="connect__body">
      <p class="connect__brand">
        <span class="connect__wordmark">WebThrottle</span>
        <span class="connect__tag">DCC-EX</span>
      </p>

      <h1 id="connect-title" class="connect__title" data-testid="page-title">
        Connect to your Command Station
      </h1>
      <p class="connect__lead">
        Plug your Command Station into this computer with a USB cable, then
        choose its port.
      </p>

      <p
        v-if="connection.connectionError"
        class="connect__alert"
        role="alert"
        data-testid="connection-error"
      >
        {{ connection.connectionError }}
      </p>

      <button
        type="button"
        class="key key--accent connect__usb"
        :disabled="!connection.serialAvailable || connecting"
        data-testid="connect-serial"
        @click="connectUsb"
      >
        {{ connecting ? 'Connecting…' : 'Connect by USB' }}
      </button>

      <p v-if="!connection.serialAvailable" class="connect__note">
        This browser cannot reach USB devices. Open WebThrottle in Google Chrome
        or Microsoft Edge on a computer, or use another way to connect below.
      </p>

      <details
        class="connect__other"
        :open="!connection.serialAvailable"
        data-testid="other-connections"
      >
        <summary
          class="connect__summary"
          data-testid="other-connections-toggle"
        >
          Other ways to connect
        </summary>

        <form
          class="connect__form"
          data-testid="connect-form"
          @submit.prevent="connectUrl"
        >
          <label class="connect__label" for="connect-url">
            Emulator or WebSocket address
          </label>
          <div class="connect__row">
            <input
              id="connect-url"
              v-model="url"
              class="field connect__url"
              type="text"
              inputmode="url"
              autocomplete="url"
              autocapitalize="none"
              spellcheck="false"
              :aria-invalid="Boolean(urlError)"
              aria-describedby="connect-url-help"
              data-testid="emulator-url"
            />
            <button
              type="submit"
              class="key"
              :disabled="Boolean(urlError) || connecting"
              data-testid="connect-emulator"
            >
              Connect
            </button>
          </div>
          <p
            id="connect-url-help"
            class="connect__note"
            :class="{ 'connect__note--error': urlError }"
            data-testid="emulator-url-error"
          >
            {{
              urlError ||
              'The emulator runs a real Command Station on your computer (pnpm run emulator).'
            }}
          </p>
        </form>
      </details>

      <router-link class="connect__settings" :to="{ name: 'settings' }">
        Settings
      </router-link>

      <!-- A stretch of idle track between buffer stops, waiting for a
           Command Station; a lit route runs along it while connecting. -->
      <svg
        class="connect__track"
        viewBox="0 0 600 24"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line class="connect__rail" x1="2" y1="12" x2="598" y2="12" />
        <line class="connect__stop" x1="2" y1="2" x2="2" y2="22" />
        <line class="connect__stop" x1="598" y1="2" x2="598" y2="22" />
        <line
          class="connect__rail connect__rail--live"
          x1="2"
          y1="12"
          x2="598"
          y2="12"
          pathLength="1"
        />
      </svg>
    </div>
  </section>
</template>

<style scoped>
.connect {
  display: grid;
  align-content: center;
  min-height: 100%;
  padding: var(--space-6) var(--space-5);
}

.connect__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
  width: min(38rem, 100%);
  margin: 0 auto;
}

.connect__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.connect__wordmark {
  font-size: var(--text-lg);
  font-weight: 700;
}

.connect__tag {
  padding: 0 var(--space-1);

  color: var(--ink-muted);
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  font-size: var(--text-xs);
}

.connect__title {
  font-size: var(--text-2xl);
  font-weight: 600;
  line-height: var(--leading-tight);
}

.connect__lead {
  max-width: 34ch;
  color: var(--ink-muted);
  font-size: var(--text-md);
}

.connect__alert {
  width: 100%;
  padding: var(--space-3) var(--space-4);

  color: var(--ink);
  background: color-mix(in srgb, var(--stop) 18%, var(--panel));
  border: 1px solid var(--stop);
  border-radius: var(--radius);
}

.connect__usb {
  min-height: var(--control);
  margin-top: var(--space-2);
  padding: 0 var(--space-6);
  font-size: var(--text-lg);
}

.connect__note {
  max-width: 44ch;
  color: var(--ink-muted);
  font-size: var(--text-xs);
}

.connect__note--error {
  color: var(--occupied);
}

.connect__other {
  width: 100%;
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--rule);
}

.connect__summary {
  min-height: var(--target);

  color: var(--ink-muted);
  cursor: pointer;
  line-height: var(--target);

  &:hover {
    color: var(--ink);
  }

  &::marker {
    color: var(--accent);
  }
}

.connect__form {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.connect__label {
  font-size: var(--text-xs);
}

.connect__row {
  display: flex;
  gap: var(--space-2);
}

.connect__url {
  flex: 1;
  min-width: 0;
  font-family: var(--font-code);
}

.connect__settings {
  margin-top: var(--space-4);
  font-size: var(--text-xs);
}

.connect__track {
  width: 100%;
  height: var(--space-5);
  margin-top: var(--space-5);
}

.connect__rail {
  stroke: var(--track-idle);
  stroke-width: 4;
  vector-effect: non-scaling-stroke;
}

.connect__stop {
  stroke: var(--track-idle);
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
}

/* While a connection opens, a lit route runs along the track. */
.connect__rail--live {
  stroke: var(--accent);
  stroke-dasharray: 0.2 1;
  opacity: 0;
}

.connect--connecting .connect__rail--live {
  opacity: 1;
  animation: rail-run 1.4s linear infinite;
}

@keyframes rail-run {
  from {
    stroke-dashoffset: 0.2;
  }

  to {
    stroke-dashoffset: -1;
  }
}
</style>
