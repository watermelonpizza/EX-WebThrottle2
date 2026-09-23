import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Transport } from '../../transport';
import { MockTransport } from '../../transport';
import type { ConnectionEvent } from '../index';
import { ConnectionManager } from '../index';
import { PowerState, TurnoutState } from '../../protocol';

function collect(manager: ConnectionManager): ConnectionEvent[] {
  const events: ConnectionEvent[] = [];

  manager.subscribe((event) => events.push(event));

  return events;
}

describe('ConnectionManager', () => {
  let transport: MockTransport;
  let manager: ConnectionManager;

  beforeEach(() => {
    transport = new MockTransport();

    manager = new ConnectionManager({ transport });
  });

  afterEach(() => {
    if (manager.status !== 'disconnected') manager.disconnect();
  });

  it('connects, reports status and sends the bootstrap command', async () => {
    const events = collect(manager);

    await manager.connect();

    expect(events).toContainEqual({ type: 'status', status: 'connecting' });
    expect(events).toContainEqual({ type: 'status', status: 'connected' });
    expect(transport.sent).toContain('<s>');
    expect(manager.status).toBe('connected');
  });

  it('uses a custom bootstrap instead of the default', async () => {
    const quiet = new ConnectionManager({ transport, bootstrap: [] });

    await quiet.connect();

    expect(transport.sent).toEqual([]);
  });

  it('routes decoded broadcasts to listeners', async () => {
    const events = collect(manager);

    await manager.connect();

    transport.receives('<p1><z 1><l 3 0 143 1><H 2 1><>');

    const messages = events
      .filter((event) => event.type === 'message')
      .map((event) => event.type === 'message' && event.message.kind);

    expect(messages).toEqual(['power', 'unknown', 'loco', 'turnout', 'empty']);

    expect(
      events.some(
        (event) =>
          event.type === 'message' &&
          event.message.kind === 'power' &&
          event.message.state === PowerState.ON,
      ),
    ).toBe(true);

    expect(
      events.some(
        (event) =>
          event.type === 'message' &&
          event.message.kind === 'turnout' &&
          event.message.state === TurnoutState.THROWN,
      ),
    ).toBe(true);
  });

  it('joins a frame that arrives split across data chunks', async () => {
    const events = collect(manager);

    await manager.connect();

    transport.receives('<iDCCEX V-4.2.2');
    transport.receives('0 / MEGA / Pololu / 5><p1>');

    expect(
      events.some(
        (event) =>
          event.type === 'message' &&
          event.message.kind === 'system-info' &&
          event.message.info.version === '4.2.20',
      ),
    ).toBe(true);
  });

  it('records sent and received text in the trace log', async () => {
    await manager.connect();

    transport.receives('<p1>');

    expect(manager.trace.map((entry) => entry.direction)).toEqual([
      'sent',
      'received',
    ]);

    expect(manager.trace).toContainEqual({
      direction: 'sent',
      text: '<s>',
      at: expect.any(Number),
    });
    expect(manager.trace).toContainEqual({
      direction: 'received',
      text: '<p1>',
      at: expect.any(Number),
    });
  });

  it('keeps the trace log within its cap', async () => {
    const small = new ConnectionManager({ transport, maxTrace: 2 });

    await small.connect();

    transport.receives('<p1>');
    transport.receives('<p0>');
    transport.receives('<p1>');

    expect(small.trace).toHaveLength(2);
  });

  it('ignores sends while disconnected', () => {
    manager.send('<1>');

    expect(transport.sent).toEqual([]);
  });

  it('returns to disconnected on a failed connect', async () => {
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
    const flaky = new ConnectionManager({ transport: failing });

    await expect(flaky.connect()).rejects.toThrow('port refused');

    expect(flaky.status).toBe('disconnected');
  });

  it('stops routing and sending after disconnect', async () => {
    const events = collect(manager);

    await manager.connect();
    await manager.disconnect();

    manager.send('<1>');
    transport.receives('<p1>');

    expect(events.some((event) => event.type === 'message')).toBe(false);
  });
});
