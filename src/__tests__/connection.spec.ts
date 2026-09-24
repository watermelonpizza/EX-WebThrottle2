import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Transport } from '@/core/transport';
import { MockTransport } from '@/core/transport';
import { PowerState, TurnoutState } from '@/core/protocol';
import { useConnectionStore } from '@/stores/connection';

describe('connection store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts disconnected with no traffic', () => {
    const store = useConnectionStore();

    expect(store.status).toBe('disconnected');
    expect(store.transportName).toBe('');
    expect(store.trace).toEqual([]);
    expect(store.messages).toEqual([]);
  });

  it('connects, reports status and sends the bootstrap command', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();
    const events: string[] = [];

    store.$subscribe(() => {
      events.push(store.status);
    });

    await store.connect(emulator);

    expect(events).toContain('connecting');
    expect(events).toContain('connected');
    expect(emulator.sent).toContain('<s>');
    expect(store.status).toBe('connected');
    expect(store.transportName).toBe('Emulator');
  });

  it('joins a frame that arrives split across data chunks', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();

    await store.connect(emulator);

    emulator.receives('<iDCCEX V-4.2.2');
    emulator.receives('0 / MEGA / Pololu / 5><p1>');

    await flushPromises();

    expect(
      store.messages.some(
        (message) =>
          message.kind === 'system-info' && message.info.version === '4.2.20',
      ),
    ).toBe(true);
  });

  it('routes decoded broadcasts into messages', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();

    await store.connect(emulator);
    emulator.receives('<p1><z 1><l 3 0 143 1><H 2 1><>');

    await flushPromises();

    expect(store.messages.map((message) => message.kind)).toEqual([
      'power',
      'unknown',
      'loco',
      'turnout',
      'empty',
    ]);

    expect(store.messages).toContainEqual(
      expect.objectContaining({ kind: 'power', state: PowerState.ON }),
    );
    expect(store.messages).toContainEqual(
      expect.objectContaining({ kind: 'turnout', state: TurnoutState.THROWN }),
    );
  });

  it('records sent and received text in the trace log', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();

    await store.connect(emulator);
    emulator.receives('<p1>');

    await flushPromises();

    expect(store.trace).toContainEqual(
      expect.objectContaining({ direction: 'sent', text: '<s>' }),
    );
    expect(store.trace).toContainEqual(
      expect.objectContaining({ direction: 'received', text: '<p1>' }),
    );
  });

  it('sends commands only while connected', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();

    store.send('<1>');

    expect(emulator.sent).toEqual([]);

    await store.connect(emulator);
    store.send('<t 3 0 1>');

    expect(emulator.sent).toContain('<t 3 0 1>');
  });

  it('clears all state on disconnect', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();

    await store.connect(emulator);
    emulator.receives('<p1>');
    await store.disconnect();

    store.send('<1>');
    emulator.receives('<p0>');

    await flushPromises();

    expect(store.status).toBe('disconnected');
    expect(store.transportName).toBe('');
    expect(store.trace).toEqual([]);
    expect(store.messages).toEqual([]);
  });

  it('stops listening after disconnect', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();

    await store.connect(emulator);
    await store.disconnect();

    emulator.receives('<p1>');

    await flushPromises();

    expect(store.messages).toEqual([]);
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
    expect(store.messages).toEqual([]);
  });

  it('caps the trace log', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();

    await store.connect(emulator);

    for (let i = 0; i < 600; i++) {
      emulator.receives(`<p${i % 2}>`);
    }

    await flushPromises();

    expect(store.trace.length).toBeLessThanOrEqual(500);
  });
});
