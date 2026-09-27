import { beforeEach, describe, expect, it } from 'vitest';

import type { WebSocketFactory, WebSocketLike } from '../web-socket';
import { WebSocketTransport } from '../web-socket';

class FakeWebSocket implements WebSocketLike {
  readyState = 0;
  binaryType: BinaryType = 'blob';
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<string | ArrayBuffer>) => void) | null
    = null;

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

const URL = 'ws://127.0.0.1:4444';

describe('WebSocketTransport', () => {
  let socket: FakeWebSocket;
  let urls: string[];
  let transport: WebSocketTransport;
  let connecting: Promise<void>;

  beforeEach(() => {
    socket = new FakeWebSocket();
    urls = [];
    transport = new WebSocketTransport(URL, fakeFactory(socket, urls));
    connecting = transport.connect();
  });

  describe('while connecting', () => {
    it('rejects a second connect', async () => {
      await expect(transport.connect()).rejects.toThrow('already connected');
    });

    it('refuses to send', () => {
      expect(() => transport.send('<s>')).toThrow('not connected');
    });

    it.each([
      { event: 'closes', end: (fake: FakeWebSocket) => fake.close(), error: `connection closed before ${URL}` },
      { event: 'fails', end: (fake: FakeWebSocket) => fake.fail(), error: `could not connect to ${URL}` },
    ])('rejects the connect when the socket $event before opening', async ({ end, error }) => {
      end(socket);

      await expect(connecting).rejects.toThrow(error);
    });

    it('is not connected after the socket fails', async () => {
      socket.fail();
      await connecting.catch(() => {});

      expect(transport.connected).toBe(false);
    });
  });

  describe('once connected', () => {
    beforeEach(async () => {
      socket.open();
      await connecting;
    });

    it('opened the configured address', () => {
      expect(urls).toEqual([URL]);
    });

    it('asks for binary messages as ArrayBuffers', () => {
      expect(socket.binaryType).toBe('arraybuffer');
    });

    it('says it is connected', () => {
      expect(transport.connected).toBe(true);
    });

    it.each([
      { kind: 'text', data: '<p1>' },
      { kind: 'binary', data: new TextEncoder().encode('<p1>').buffer },
    ])('hands listeners $kind messages as text', ({ data }) => {
      const received: string[] = [];

      transport.onData(text => received.push(text));
      socket.receive(data);

      expect(received).toEqual(['<p1>']);
    });

    it('sends commands over the socket', () => {
      transport.send('<s>');

      expect(socket.sent).toEqual(['<s>']);
    });

    it('stays connected after an error', () => {
      socket.fail();

      expect(transport.connected).toBe(true);
    });

    describe('on disconnect', () => {
      beforeEach(() => transport.disconnect());

      it('closes the socket', () => {
        expect(socket.closed).toBe(true);
      });

      it('is no longer connected', () => {
        expect(transport.connected).toBe(false);
      });
    });

    describe('when the socket closes on its own', () => {
      let drops: number;

      beforeEach(() => {
        drops = 0;
        transport.onDisconnect(() => drops++);
        socket.close();
      });

      it('reports the drop', () => {
        expect(drops).toBe(1);
      });

      it('is no longer connected', () => {
        expect(transport.connected).toBe(false);
      });
    });

    describe('with its listeners removed', () => {
      let data: string[];
      let drops: number;

      beforeEach(() => {
        data = [];
        drops = 0;
        transport.onData(text => data.push(text))();
        transport.onDisconnect(() => drops++)();
        socket.receive('<p1>');
        socket.close();
      });

      it('passes no data on', () => {
        expect(data).toEqual([]);
      });

      it('reports no drop', () => {
        expect(drops).toBe(0);
      });
    });
  });
});
