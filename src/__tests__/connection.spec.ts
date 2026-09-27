import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import type { ProtocolMessage } from '@/core/protocol';
import { PowerState, TurnoutState } from '@/core/protocol';
import { useConnectionStore } from '@/stores/connection';

// Subscribes before connecting, the way a store's setup does, so the handshake
// replies are seen too.
function collectMessages(store: ReturnType<typeof useConnectionStore>) {
  const seen: ProtocolMessage[] = [];

  store.onMessage(message => seen.push(message));

  return seen;
}

describe('connection store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts disconnected with no traffic', () => {
    const store = useConnectionStore();

    expect(store.status).toBe('disconnected');
    expect(store.transportName).toBe('');
    expect(store.trace).toEqual([]);
    expect(store.connectionError).toBe('');
  });

  it('ignores duplicate connects and can disconnect while idle', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();

    await store.disconnect();
    await store.connect(emulator);
    await store.connect(emulator);

    expect(emulator.sent.filter(command => command === '<s>')).toHaveLength(
      1,
    );
  });

  it('checks an address typed on the connect page against the page it is on', () => {
    const store = useConnectionStore();

    expect(store.urlProblem('ws://127.0.0.1:4444', 'http:')).toBe('');
    expect(store.urlProblem('ws://127.0.0.1:4444', 'https:')).toContain(
      'wss://',
    );
  });

  it('rejects serial connection when Web Serial is unavailable', () => {
    const store = useConnectionStore();

    expect(() => store.connectToSerial()).toThrow(
      'Web Serial is not available',
    );
  });

  it('keeps the connection usable when a transport send fails', async () => {
    const store = useConnectionStore();
    const transport = {
      name: 'Broken',
      connected: true,
      onData: () => () => {},
      connect: async () => {},
      send: () => {
        throw new Error('write failed');
      },
    } as unknown as MockTransport;

    await store.connect(transport);
    store.send('<1>');

    expect(store.status).toBe('connected');
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
    expect(emulator.sent).toContain('<=>');
    expect(store.status).toBe('connected');
    expect(store.transportName).toBe('Emulator');
  });

  it('joins a frame that arrives split across data chunks', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();
    const seen = collectMessages(store);

    await store.connect(emulator);

    emulator.receives('<iDCCEX V-4.2.2');
    emulator.receives('0 / MEGA / Pololu / 5><p1>');

    await flushPromises();

    expect(
      seen.some(
        message =>
          message.kind === 'system-info' && message.info.version === '4.2.20',
      ),
    ).toBe(true);
  });

  it('delivers decoded broadcasts to listeners', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();
    const seen = collectMessages(store);

    await store.connect(emulator);

    emulator.receives('<= A MAIN><= B PROG><p0>');
    emulator.receives('<p1><z 1><l 3 0 143 1><H 2 1><>');

    await flushPromises();

    expect(seen.map(message => message.kind)).toEqual([
      'track',
      'track',
      'power',
      'power',
      'ignored',
      'loco',
      'turnout',
      'ignored',
    ]);

    expect(seen).toContainEqual(
      expect.objectContaining({
        kind: 'track',
        track: { letter: 'A', mode: 'MAIN' },
      }),
    );
    expect(seen).toContainEqual(
      expect.objectContaining({ kind: 'power', state: PowerState.ON }),
    );
    expect(seen).toContainEqual(
      expect.objectContaining({ kind: 'turnout', state: TurnoutState.THROWN }),
    );
  });

  it('logs one trace entry per frame, even when a frame arrives split', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();

    await store.connect(emulator);

    const handshake = store.trace.filter(
      entry => entry.direction === 'received',
    ).length;

    emulator.receives('<l 4 0 158 9');
    emulator.receives('>');

    await flushPromises();

    const received = store.trace
      .filter(entry => entry.direction === 'received')
      .slice(handshake);

    expect(received.map(entry => entry.text)).toEqual(['<l 4 0 158 9>']);
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
  });

  it('stops listening after disconnect', async () => {
    const store = useConnectionStore();
    const emulator = new MockTransport();
    const seen = collectMessages(store);

    await store.connect(emulator);
    await store.disconnect();

    const delivered = seen.length;

    emulator.receives('<p1>');

    await flushPromises();

    expect(seen).toHaveLength(delivered);
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
