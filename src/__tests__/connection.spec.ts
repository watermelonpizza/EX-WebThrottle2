import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockTransport } from '@/core/transport';
import type { ProtocolMessage } from '@/core/protocol';
import { PowerState, TurnoutState } from '@/core/protocol';
import { useConnectionStore } from '@/stores/connection';

describe('connection store', () => {
  let store: ReturnType<typeof useConnectionStore>;
  let emulator: MockTransport;
  let seen: ProtocolMessage[];

  async function receive(...chunks: string[]): Promise<void> {
    for (const chunk of chunks) {
      emulator.receives(chunk);
    }

    await flushPromises();
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useConnectionStore();
    emulator = new MockTransport();
    seen = [];
    // Subscribed before connecting, the way a store's setup does, so the
    // handshake replies are seen too.
    store.onMessage(message => seen.push(message));
  });

  describe('before connecting', () => {
    it.each([
      { field: 'status', value: 'disconnected' },
      { field: 'transportName', value: '' },
      { field: 'trace', value: [] },
      { field: 'connectionError', value: '' },
    ] as const)('starts with $field as $value', ({ field, value }) => {
      expect(store[field]).toEqual(value);
    });

    it('can disconnect while idle', async () => {
      await store.disconnect();

      expect(store.status).toBe('disconnected');
    });

    it('sends nothing', () => {
      store.send('<1>');

      expect(store.trace).toEqual([]);
    });

    it('rejects a serial connection when Web Serial is unavailable', () => {
      expect(() => store.connectToSerial()).toThrow('Web Serial is not available');
    });

    it('accepts a ws:// address typed on an http:// page', () => {
      expect(store.urlProblem('ws://127.0.0.1:4444', 'http:')).toBe('');
    });

    it('asks for wss:// on an https:// page', () => {
      expect(store.urlProblem('ws://127.0.0.1:4444', 'https:')).toContain('wss://');
    });
  });

  describe('connecting', () => {
    let statuses: string[];

    beforeEach(async () => {
      statuses = [];
      store.$subscribe(() => {
        statuses.push(store.status);
      });
      await store.connect(emulator);
    });

    it('reports connecting, then connected', () => {
      expect(statuses).toEqual(expect.arrayContaining(['connecting', 'connected']));
    });

    it('is connected', () => {
      expect(store.status).toBe('connected');
    });

    it('names the transport', () => {
      expect(store.transportName).toBe('Emulator');
    });

    it.each(['<s>', '<=>'])('sends %s to start the handshake', (command) => {
      expect(emulator.sent).toContain(command);
    });

    it('ignores a second connect', async () => {
      await store.connect(emulator);

      expect(emulator.sent.filter(command => command === '<s>')).toHaveLength(1);
    });

    it('sends a command', () => {
      store.send('<t 3 0 1>');

      expect(emulator.sent).toContain('<t 3 0 1>');
    });
  });

  it('keeps the connection usable when a transport send fails', async () => {
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

  describe('once connected', () => {
    beforeEach(() => store.connect(emulator));

    it('joins a frame that arrives split across data chunks', async () => {
      await receive('<iDCCEX V-4.2.2', '0 / MEGA / Pololu / 5><p1>');

      expect(seen).toContainEqual(expect.objectContaining({ kind: 'system-info', info: expect.objectContaining({ version: '4.2.20' }) }));
    });

    it('logs one trace entry for a frame that arrives split', async () => {
      const handshake = store.trace.filter(entry => entry.direction === 'received').length;

      await receive('<l 4 0 158 9', '>');

      expect(store.trace.filter(entry => entry.direction === 'received').slice(handshake).map(entry => entry.text)).toEqual(['<l 4 0 158 9>']);
    });

    it('caps the trace log', async () => {
      await receive(...Array.from({ length: 600 }, (_, i) => `<p${i % 2}>`));

      expect(store.trace.length).toBeLessThanOrEqual(500);
    });

    describe('when broadcasts arrive', () => {
      beforeEach(() => receive('<= A MAIN><= B PROG><p0>', '<p1><z 1><l 3 0 143 1><H 2 1><>'));

      it('delivers every frame to listeners, decoded, in order', () => {
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
      });

      it.each([
        { kind: 'track', message: { kind: 'track', track: { letter: 'A', mode: 'MAIN' } } },
        { kind: 'power', message: { kind: 'power', state: PowerState.ON } },
        { kind: 'turnout', message: { kind: 'turnout', state: TurnoutState.THROWN } },
      ])('decodes a $kind broadcast', ({ message }) => {
        expect(seen).toContainEqual(expect.objectContaining(message));
      });

      it.each([
        { direction: 'sent', text: '<s>' },
        { direction: 'received', text: '<p1>' },
      ])('records $direction text such as $text in the trace log', (entry) => {
        expect(store.trace).toContainEqual(expect.objectContaining(entry));
      });
    });

    describe('after disconnecting', () => {
      beforeEach(async () => {
        await receive('<p1>');
        await store.disconnect();
      });

      it.each([
        { field: 'status', value: 'disconnected' },
        { field: 'transportName', value: '' },
        { field: 'trace', value: [] },
      ] as const)('resets $field to $value', ({ field, value }) => {
        expect(store[field]).toEqual(value);
      });

      it('sends nothing more', () => {
        store.send('<1>');

        expect(emulator.sent).not.toContain('<1>');
      });

      it('stops listening to the transport', async () => {
        const delivered = seen.length;

        await receive('<p0>');

        expect(seen).toHaveLength(delivered);
      });
    });
  });
});
