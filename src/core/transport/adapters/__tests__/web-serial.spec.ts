import { describe, expect, it } from 'vitest';

import { isWebSerialSupported, WebSerialTransport } from '../..';

class FakeReader {
  constructor(private readonly chunks: Uint8Array[]) {}

  async read(): Promise<ReadableStreamReadResult<Uint8Array>> {
    const value = this.chunks.shift();

    return value ? { value, done: false } : { value: undefined, done: true };
  }

  async cancel(): Promise<void> {}
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

  constructor(readonly chunks: Uint8Array[] = []) {}

  readonly readable = {
    getReader: () => new FakeReader(this.chunks),
  };

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
      new TextEncoder().encode('<p1><p'),
      new TextEncoder().encode('0>'),
    ];
    const port = new FakePort(chunks);
    const transport = new WebSerialTransport(fakeSerial(port));
    const received: string[] = [];

    transport.onData((text) => received.push(text));

    await transport.connect();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(received.join('')).toBe('<p1><p0>');
  });

  it('queues and writes sent commands as bytes', async () => {
    const port = new FakePort();
    const transport = new WebSerialTransport(fakeSerial(port));

    await transport.connect();

    transport.send('<1>');
    transport.send('<s>');

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      port.written.map((bytes) => new TextDecoder().decode(bytes)),
    ).toEqual(['<1>', '<s>']);
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
