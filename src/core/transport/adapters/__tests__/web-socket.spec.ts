import { describe, expect, it } from 'vitest';

import {
  WebSocketTransport,
  type WebSocketFactory,
  type WebSocketLike,
} from '../web-socket';

class FakeWebSocket implements WebSocketLike {
  readyState = 0;
  binaryType: BinaryType = 'blob';
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<string | ArrayBuffer>) => void) | null =
    null;

  readonly sent: string[] = [];
  closed = false;

  open(): void {
    this.readyState = WebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  receive(data: string | ArrayBuffer): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  fail(): void {
    this.onerror?.(new Event('error'));
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

function fakeFactory(socket: FakeWebSocket, urls: string[]): WebSocketFactory {
  return (url) => {
    urls.push(url);

    return socket;
  };
}

describe('WebSocketTransport', () => {
  it('connects to the configured WebSocket URL', async () => {
    const socket = new FakeWebSocket();
    const urls: string[] = [];
    const transport = new WebSocketTransport(
      'ws://127.0.0.1:4444',
      fakeFactory(socket, urls),
    );

    const connected = transport.connect();

    socket.open();
    await connected;

    expect(urls).toEqual(['ws://127.0.0.1:4444']);
    expect(socket.binaryType).toBe('arraybuffer');
    expect(transport.connected).toBe(true);
  });

  it('emits text and binary messages as decoded text', async () => {
    const socket = new FakeWebSocket();
    const transport = new WebSocketTransport(
      'ws://127.0.0.1:4444',
      fakeFactory(socket, []),
    );
    const received: string[] = [];

    transport.onData((text) => received.push(text));

    const connected = transport.connect();

    socket.open();
    await connected;
    socket.receive('<p1>');
    socket.receive(new TextEncoder().encode('<p0>').buffer);

    expect(received.join('')).toBe('<p1><p0>');
  });

  it('sends commands and closes the socket on disconnect', async () => {
    const socket = new FakeWebSocket();
    const transport = new WebSocketTransport(
      'ws://127.0.0.1:4444',
      fakeFactory(socket, []),
    );

    const connected = transport.connect();

    socket.open();
    await connected;
    transport.send('<s>');
    await transport.disconnect();

    expect(socket.sent).toEqual(['<s>']);
    expect(socket.closed).toBe(true);
    expect(transport.connected).toBe(false);
  });

  it('rejects duplicate and unopened socket connections', async () => {
    const socket = new FakeWebSocket();
    const transport = new WebSocketTransport(
      'ws://127.0.0.1:4444',
      fakeFactory(socket, []),
    );
    const connecting = transport.connect();

    await expect(transport.connect()).rejects.toThrow('already connected');
    socket.close();
    await expect(connecting).rejects.toThrow('connection closed before');
    expect(() => transport.send('<s>')).toThrow('not connected');
  });

  it('ignores errors after the socket has opened', async () => {
    const socket = new FakeWebSocket();
    const transport = new WebSocketTransport(
      'ws://127.0.0.1:4444',
      fakeFactory(socket, []),
    );
    const connected = transport.connect();

    socket.open();
    await connected;
    socket.fail();
    expect(transport.connected).toBe(true);
  });

  it('removes data and disconnect listeners when unsubscribed', async () => {
    const socket = new FakeWebSocket();
    const transport = new WebSocketTransport(
      'ws://127.0.0.1:4444',
      fakeFactory(socket, []),
    );
    const data: string[] = [];
    let disconnected = false;
    const removeData = transport.onData((text) => data.push(text));
    const removeDisconnect = transport.onDisconnect(() => {
      disconnected = true;
    });
    const connected = transport.connect();

    socket.open();
    await connected;
    removeData();
    removeDisconnect();
    socket.receive('<p1>');
    socket.close();

    expect(data).toEqual([]);
    expect(disconnected).toBe(false);
  });

  it('reports when an open socket closes', async () => {
    const socket = new FakeWebSocket();
    const transport = new WebSocketTransport(
      'ws://127.0.0.1:4444',
      fakeFactory(socket, []),
    );
    let disconnected = false;

    transport.onDisconnect(() => {
      disconnected = true;
    });

    const connected = transport.connect();

    socket.open();
    await connected;
    socket.close();

    expect(disconnected).toBe(true);
    expect(transport.connected).toBe(false);
  });

  it('rejects when the socket fails before opening', async () => {
    const socket = new FakeWebSocket();
    const transport = new WebSocketTransport(
      'ws://127.0.0.1:4444',
      fakeFactory(socket, []),
    );
    const connected = transport.connect();

    socket.fail();

    await expect(connected).rejects.toThrow(
      'could not connect to ws://127.0.0.1:4444',
    );
    expect(transport.connected).toBe(false);
  });
});
