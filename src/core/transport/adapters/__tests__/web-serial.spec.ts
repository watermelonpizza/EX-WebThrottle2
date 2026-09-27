import { beforeEach, describe, expect, it } from 'vitest';

import { WebSerialTransport, isWebSerialSupported } from '../..';

// What the fake port delivers, in order: bytes, a recoverable read error
// ('glitch'), or the device going away ('unplug').
type FakeChunk = Uint8Array | 'glitch' | 'unplug';

class FakeReader {
  private cancelled?: (result: ReadableStreamReadResult<Uint8Array>) => void;

  constructor(private readonly port: FakePort) {}

  async read(): Promise<ReadableStreamReadResult<Uint8Array>> {
    const next = this.port.chunks.shift();

    if (next === 'glitch') {
      throw new Error('FramingError');
    }

    if (next === 'unplug') {
      this.port.lost = true;

      throw new Error('NetworkError');
    }

    if (next) {
      return { value: next, done: false };
    }

    // Like a real port, wait for more bytes until the read is cancelled.
    return new Promise((resolve) => {
      this.cancelled = resolve;
    });
  }

  async cancel(): Promise<void> {
    this.cancelled?.({ value: undefined, done: true });
  }

  releaseLock(): void {}
}

class FakeWriter {
  constructor(private readonly target: Uint8Array[]) {}

  async write(chunk: Uint8Array): Promise<void> {
    this.target.push(chunk);
  }

  releaseLock(): void {}
}

class FakePort {
  readonly written: Uint8Array[] = [];
  openOptions?: SerialOptions;
  closed = false;
  lost = false;

  constructor(readonly chunks: FakeChunk[] = []) {}

  get readable() {
    return this.lost ? null : { getReader: () => new FakeReader(this) };
  }

  readonly writable = {
    getWriter: () => new FakeWriter(this.written),
  };

  async open(options: SerialOptions): Promise<void> {
    this.openOptions = options;
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

function fakeSerial(port: FakePort): Serial {
  return { requestPort: async () => port } as unknown as Serial;
}

// Lets the read loop and the write queue run.
function settle(): Promise<unknown> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function transportFor(port: FakePort): WebSerialTransport {
  return new WebSerialTransport(fakeSerial(port));
}

const encoder = new TextEncoder();

describe('WebSerialTransport', () => {
  describe('before connecting', () => {
    it('refuses to send', () => {
      const transport = transportFor(new FakePort());

      expect(() => transport.send('<s>')).toThrow('not connected');
    });

    it('can disconnect without ever opening a port', async () => {
      const transport = transportFor(new FakePort());

      await transport.disconnect();

      expect(transport.connected).toBe(false);
    });
  });

  describe('once connected', () => {
    let port: FakePort;
    let transport: WebSerialTransport;

    beforeEach(async () => {
      port = new FakePort();
      transport = transportFor(port);
      await transport.connect();
    });

    it('opens the port at the Command Station baud rate', () => {
      expect(port.openOptions?.baudRate).toBe(115200);
    });

    it('says it is connected', () => {
      expect(transport.connected).toBe(true);
    });

    it('rejects a second connect', async () => {
      await expect(transport.connect()).rejects.toThrow('already connected');
    });

    it('writes sent commands as bytes, in order', async () => {
      transport.send('<1>');
      transport.send('<s>');
      await settle();

      expect(port.written.map(bytes => new TextDecoder().decode(bytes))).toEqual(['<1>', '<s>']);
    });
  });

  describe('reading', () => {
    it.each<{ case: string; chunks: FakeChunk[] }>([
      {
        case: 'split across chunks',
        chunks: [new Uint8Array(), encoder.encode('<p1><p'), encoder.encode('0>')],
      },
      {
        case: 'either side of a recoverable serial error',
        chunks: [encoder.encode('<p1>'), 'glitch', encoder.encode('<p0>')],
      },
    ])('hands listeners the text $case', async ({ chunks }) => {
      const transport = transportFor(new FakePort(chunks));
      const received: string[] = [];

      transport.onData(text => received.push(text));
      await transport.connect();
      await settle();

      expect(received.join('')).toBe('<p1><p0>');
    });

    it('stays connected after a recoverable serial error', async () => {
      const transport = transportFor(new FakePort(['glitch']));

      await transport.connect();
      await settle();

      expect(transport.connected).toBe(true);
    });
  });

  describe('when the cable is pulled', () => {
    let port: FakePort;
    let transport: WebSerialTransport;
    let drops: number;
    let removedDrops: number;

    beforeEach(async () => {
      port = new FakePort(['unplug']);
      transport = transportFor(port);
      drops = 0;
      removedDrops = 0;
      transport.onDisconnect(() => drops++);
      transport.onDisconnect(() => removedDrops++)();
      await transport.connect();
      await settle();
    });

    it('reports the drop once', () => {
      expect(drops).toBe(1);
    });

    it('does not tell a listener that was removed', () => {
      expect(removedDrops).toBe(0);
    });

    it('is no longer connected', () => {
      expect(transport.connected).toBe(false);
    });

    it('closes the port', () => {
      expect(port.closed).toBe(true);
    });

    it('can connect again once plugged back in', async () => {
      port.lost = false;

      await expect(transport.connect()).resolves.toBeUndefined();
    });
  });

  describe('when the user disconnects', () => {
    let port: FakePort;
    let transport: WebSerialTransport;
    let drops: number;

    beforeEach(async () => {
      port = new FakePort();
      transport = transportFor(port);
      drops = 0;
      transport.onDisconnect(() => drops++);
      await transport.connect();
      await transport.disconnect();
      await settle();
    });

    it('closes the port', () => {
      expect(port.closed).toBe(true);
    });

    it('is no longer connected', () => {
      expect(transport.connected).toBe(false);
    });

    it('does not report a drop', () => {
      expect(drops).toBe(0);
    });
  });

  it('reports Web Serial support only when the API exists', () => {
    expect(isWebSerialSupported()).toBe(false);
  });
});
