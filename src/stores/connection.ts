import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import type { ProtocolMessage } from '@/core/protocol';
import {
  decodeFrame,
  requestSystemInfo,
  requestTrackState,
} from '@/core/protocol';
import type { Transport } from '@/core/transport';
import { extractFrames } from '@/core/transport';
import {
  MockTransport,
  WebSerialTransport,
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

// Owns the whole connection: how far the browser got in the connect lifecycle,
// the raw sent/received traffic log, and the decoded protocol messages for
// whatever the throttles view needs. There is no separate connection layer —
// the store is the single connection boundary, and the transport (Web Serial,
// emulator, future Hub) is injected through connect().
export const useConnectionStore = defineStore('connection', () => {
  const status = ref<ConnectionStatus>('disconnected');
  const trace = ref<TraceEntry[]>([]);
  const messages = ref<ProtocolMessage[]>([]);

  // The transport lives in a shallowRef so Vue observes it being swapped but
  // never proxies the object itself (a proxy breaks the class internals).
  const transport = shallowRef<Transport | undefined>();

  const transportName = computed(() => transport.value?.name ?? '');

  let buffer = '';
  let unsubscribeData: (() => void) | undefined;

  function addTrace(direction: TraceDirection, text: string): void {
    trace.value.push({ direction, text, at: Date.now() });

    if (trace.value.length > MAX_TRACE) trace.value.shift();
  }

  function handleData(text: string): void {
    addTrace('received', text);

    buffer += text;

    const result = extractFrames(buffer);

    buffer = result.rest;

    for (const frame of result.frames) {
      messages.value.push(decodeFrame(frame));
    }
  }

  async function disconnect(): Promise<void> {
    unsubscribeData?.();
    unsubscribeData = undefined;

    await transport.value?.disconnect();

    transport.value = undefined;
    buffer = '';
    status.value = 'disconnected';
    trace.value = [];
    messages.value = [];
  }

  async function connect(nextTransport: Transport): Promise<void> {
    await disconnect();

    transport.value = nextTransport;
    unsubscribeData = nextTransport.onData(handleData);
    status.value = 'connecting';

    try {
      await nextTransport.connect();
      status.value = 'connected';
      // The handshake: ask the command station to introduce itself and list
      // its track outputs. Power broadcasts arrive on their own afterwards.
      send(requestSystemInfo());
      send(requestTrackState());
    } catch (error) {
      unsubscribeData?.();
      unsubscribeData = undefined;
      transport.value = undefined;
      buffer = '';
      status.value = 'disconnected';
      trace.value = [];
      messages.value = [];
      log.error('connection.connect.failed', { error: String(error) });
    }
  }

  function connectToEmulator(): Promise<void> {
    return connect(new MockTransport());
  }

  function connectToSerial(): Promise<void> {
    if (!serialAvailable) {
      throw new Error('Web Serial is not available in this browser');
    }

    return connect(new WebSerialTransport(navigator.serial));
  }

  function send(command: string): void {
    if (!transport.value?.connected) return;

    addTrace('sent', command);

    try {
      transport.value.send(command);
    } catch (error) {
      log.error('connection.send.failed', { command, error: String(error) });
    }
  }

  return {
    status,
    transportName,
    trace,
    messages,
    serialAvailable,
    connect,
    connectToEmulator,
    connectToSerial,
    disconnect,
    send,
  };
});
