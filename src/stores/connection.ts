import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import type { ProtocolMessage, SystemInfo } from '@/core/protocol';
import {
  decodeFrame,
  requestSystemInfo,
  requestTrackState,
} from '@/core/protocol';
import type { Transport } from '@/core/transport';
import { extractFrames } from '@/core/transport';
import {
  WebSerialTransport,
  WebSocketTransport,
  isWebSerialSupported,
} from '@/core/transport';
import { log } from '@/core/logging';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export type TraceDirection = 'sent' | 'received';

export interface TraceEntry {
  direction: TraceDirection;
  text: string;
  at: number;
}

// How many raw sent/received lines the diagnostics log keeps.
const MAX_TRACE = 500;

const serialAvailable = isWebSerialSupported();
export const EMULATOR_URL = 'ws://127.0.0.1:4444';

// Owns the whole connection: how far the browser got in the connect lifecycle,
// the raw sent/received traffic log, and the delivery of decoded broadcasts to
// whoever is listening. There is no separate connection layer — the store is
// the single connection boundary, and the transport (Web Serial, emulator,
// future Hub) is injected through connect().
//
// Decoded messages are handed to subscribers as they arrive and not kept: the
// stores that care (locos, power) fold each one into their own state, so there
// is no second, ever-growing copy of the traffic to replay.
export const useConnectionStore = defineStore('connection', () => {
  const status = ref<ConnectionStatus>('disconnected');
  const connectionError = ref('');
  const trace = ref<TraceEntry[]>([]);
  // What the Command Station says it is, from its <i…> reply to <s>.
  const station = ref<SystemInfo | undefined>();

  const messageListeners = new Set<(message: ProtocolMessage) => void>();
  const sentListeners = new Set<(command: string) => void>();

  // The transport lives in a shallowRef so Vue observes it being swapped but
  // never proxies the object itself (a proxy breaks the class internals).
  const transport = shallowRef<Transport | undefined>();

  const transportName = computed(() => transport.value?.name ?? '');

  let buffer = '';
  let unsubscribeData: (() => void) | undefined;
  let unsubscribeDisconnect: (() => void) | undefined;

  function addTrace(direction: TraceDirection, text: string): void {
    trace.value.push({ direction, text, at: Date.now() });

    if (trace.value.length > MAX_TRACE) {
      trace.value.shift();
    }
  }

  function handleData(text: string): void {
    buffer += text;

    const result = extractFrames(buffer);

    buffer = result.rest;

    // A transport hands over whatever bytes arrived, so one frame can be split
    // across chunks. The log follows frames, not chunks, so the diagnostics
    // view never shows half a <...> message.
    for (const frame of result.frames) {
      addTrace('received', frame);

      const message = decodeFrame(frame);

      if (message.kind === 'system-info') {
        station.value = message.info;
      }

      for (const listener of messageListeners) {
        listener(message);
      }
    }
  }

  // Listeners are registered once by a store's setup and live as long as it
  // does, so there is nothing to unsubscribe.
  function onMessage(listener: (message: ProtocolMessage) => void): void {
    messageListeners.add(listener);
  }

  // Lets a store tell this browser's own commands apart from changes another
  // Throttle made, which arrive as the same broadcasts.
  function onSent(listener: (command: string) => void): void {
    sentListeners.add(listener);
  }

  function clearConnectionState(): void {
    unsubscribeData?.();
    unsubscribeData = undefined;
    unsubscribeDisconnect?.();
    unsubscribeDisconnect = undefined;

    transport.value = undefined;
    buffer = '';
    station.value = undefined;
    status.value = 'disconnected';
    trace.value = [];
  }

  async function disconnect(): Promise<void> {
    await transport.value?.disconnect();
    clearConnectionState();
    connectionError.value = '';
  }

  async function connect(nextTransport: Transport): Promise<void> {
    if (status.value !== 'disconnected') {
      return;
    }

    connectionError.value = '';
    transport.value = nextTransport;
    unsubscribeData = nextTransport.onData(handleData);
    unsubscribeDisconnect = nextTransport.onDisconnect?.(() => {
      if (transport.value === nextTransport) {
        clearConnectionState();
        // The link dropped on its own (cable out, emulator stopped). Say so:
        // locos keep running on the Command Station until something stops them.
        connectionError.value =
          'The connection to the Command Station was lost. Trains may still be moving: reconnect to stop them.';
      }
    });
    status.value = 'connecting';

    try {
      await nextTransport.connect();
      status.value = 'connected';
      // The handshake: ask the command station to introduce itself and list
      // its track outputs. Power broadcasts arrive on their own afterwards.
      send(requestSystemInfo());
      send(requestTrackState());
    } catch (error) {
      if (transport.value === nextTransport) {
        clearConnectionState();
        connectionError.value = `Could not connect to ${nextTransport.name}. Check it is running and try again.`;
      }

      log.error('connection.connect.failed', { error: String(error) });
    }
  }

  function connectToEmulator(url = EMULATOR_URL): Promise<void> {
    return connect(new WebSocketTransport(url));
  }

  function connectToSerial(): Promise<void> {
    if (!serialAvailable) {
      throw new Error('Web Serial is not available in this browser');
    }

    return connect(new WebSerialTransport(navigator.serial));
  }

  function send(command: string): void {
    if (!transport.value?.connected) {
      return;
    }

    addTrace('sent', command);

    for (const listener of sentListeners) {
      listener(command);
    }

    try {
      transport.value.send(command);
    } catch (error) {
      log.error('connection.send.failed', { command, error: String(error) });
    }
  }

  return {
    status,
    connectionError,
    transportName,
    station,
    trace,
    serialAvailable,
    onMessage,
    onSent,
    connect,
    connectToEmulator,
    connectToSerial,
    disconnect,
    send,
  };
});
