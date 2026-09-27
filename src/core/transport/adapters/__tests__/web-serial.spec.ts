import { describe, expect, it } from 'vitest';

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
  openResolved = false;
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
    this.openResolved = true;
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

function fakeSerial(port: FakePort): Serial {
  return { requestPort: async () => port } as unknown as Serial;
}

describe('WebSerialTransport', () => {
  it('rejects duplicate connections and sends only while connected', async () => {
    const port = new FakePort();
    const transport = new WebSerialTransport(fakeSerial(port));

    expect(() => transport.send('<s>')).toThrow('not connected');
    await transport.connect();
    await expect(transport.connect()).rejects.toThrow('already connected');
  });

  it('requests a port and opens it at the command station baud rate', async () => {
    const port = new FakePort();
    const transport = new WebSerialTransport(fakeSerial(port));

    await transport.connect();

    expect(port.openResolved).toBe(true);
    expect(port.openOptions?.baudRate).toBe(115200);
    expect(transport.connected).toBe(true);
  });

  it('emits decoded text to data listeners', async () => {
    const chunks = [
      new Uint8Array(),
      new TextEncoder().encode('<p1><p'),
      new TextEncoder().encode('0>'),
    ];
    const port = new FakePort(chunks);
    const transport = new WebSerialTransport(fakeSerial(port));
    const received: string[] = [];

    transport.onData(text => received.push(text));

    await transport.connect();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(received.join('')).toBe('<p1><p0>');
  });

  it('queues and writes sent commands as bytes', async () => {
    const port = new FakePort();
    const transport = new WebSerialTransport(fakeSerial(port));

    await transport.connect();

    transport.send('<1>');
    transport.send('<s>');

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(
      port.written.map(bytes => new TextDecoder().decode(bytes)),
    ).toEqual(['<1>', '<s>']);
  });

  it('keeps reading after a recoverable serial error', async () => {
    const encoder = new TextEncoder();
    const port = new FakePort([
      encoder.encode('<p1>'),
      'glitch',
      encoder.encode('<p0>'),
    ]);
    const transport = new WebSerialTransport(fakeSerial(port));
    const received: string[] = [];

    transport.onData(text => received.push(text));
    await transport.connect();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(received.join('')).toBe('<p1><p0>');
    expect(transport.connected).toBe(true);
  });

  it('reports a pulled cable as a lost connection and closes the port', async () => {
    const port = new FakePort(['unplug']);
    const transport = new WebSerialTransport(fakeSerial(port));
    let drops = 0;
    let removedDrops = 0;

    transport.onDisconnect(() => drops++);
    transport.onDisconnect(() => removedDrops++)();
    await transport.connect();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(drops).toBe(1);
    expect(removedDrops).toBe(0);
    expect(transport.connected).toBe(false);
    expect(port.closed).toBe(true);
    // Plugged back in, the port is free again and the transport reconnects.
    port.lost = false;
    await expect(transport.connect()).resolves.toBeUndefined();
  });

  it('does not report a drop when the user disconnects', async () => {
    const port = new FakePort();
    const transport = new WebSerialTransport(fakeSerial(port));
    let drops = 0;

    transport.onDisconnect(() => drops++);
    await transport.connect();
    await transport.disconnect();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(drops).toBe(0);
    expect(port.closed).toBe(true);
  });

  it('can disconnect before a port is opened', async () => {
    const transport = new WebSerialTransport(fakeSerial(new FakePort()));

    await transport.disconnect();
    expect(transport.connected).toBe(false);
  });

  it('closes the port on disconnect', async () => {
    const port = new FakePort();
    const transport = new WebSerialTransport(fakeSerial(port));

    await transport.connect();
    await transport.disconnect();

    expect(port.closed).toBe(true);
    expect(transport.connected).toBe(false);
  });

  it('reports Web Serial support only when the API exists', () => {
    expect(isWebSerialSupported()).toBe(false);
  });
});
