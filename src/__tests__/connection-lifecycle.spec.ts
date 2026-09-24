import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Transport } from '@/core/transport';
import { MockTransport } from '@/core/transport';
import { useConnectionStore } from '@/stores/connection';

describe('connection lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('returns to a clean disconnected state on a failed connect', async () => {
    const store = useConnectionStore();
    const failing: Transport = {
      name: 'Failing',
      connected: false,
      connect: async () => {
        throw new Error('port refused');
      },
      disconnect: async () => {},
      send: () => {},
      onData: () => () => {},
    };

    await store.connect(failing);

    expect(store.status).toBe('disconnected');
    expect(store.transportName).toBe('');
    expect(store.trace).toEqual([]);
    expect(store.connectionError).toBe(
      'Could not connect to Failing. Check it is running and try again.',
    );
  });

  it('ignores a second connection attempt while connecting', async () => {
    const store = useConnectionStore();
    const opened = Promise.withResolvers<void>();
    const first: Transport = {
      name: 'First',
      connected: false,
      connect: async () => {
        await opened.promise;
        first.connected = true;
      },
      disconnect: async () => {
        first.connected = false;
      },
      send: () => {},
      onData: () => () => {},
    };
    const second = new MockTransport();

    const firstConnection = store.connect(first);
    const secondConnection = store.connect(second);

    opened.resolve();
    await Promise.all([firstConnection, secondConnection]);

    expect(store.transportName).toBe('First');
    expect(store.status).toBe('connected');
    expect(second.connected).toBe(false);
  });

  it('returns to disconnected when the active transport closes', async () => {
    const store = useConnectionStore();
    let disconnectListener: (() => void) | undefined;
    const transport: Transport = {
      name: 'Closing',
      connected: false,
      connect: async () => {
        transport.connected = true;
      },
      disconnect: async () => {
        transport.connected = false;
      },
      send: () => {},
      onData: () => () => {},
      onDisconnect: (callback) => {
        disconnectListener = callback;

        return () => {
          disconnectListener = undefined;
        };
      },
    };

    await store.connect(transport);
    disconnectListener?.();

    expect(store.status).toBe('disconnected');
    expect(store.transportName).toBe('');
    expect(store.trace).toEqual([]);
  });
});
