import type { DataListener, Transport } from '../types';
import { log } from '../../logging';

export interface WebSerialOptions {
  baudRate?: number;
}

// The default USB rate used by EX-CommandStation (SerialManager.cpp).
const DEFAULT_BAUD_RATE = 115200;

// A Transport that talks to an EX-CommandStation over the browser Web Serial
// API. The Serial object is injected rather than read from navigator, so tests
// can substitute a fake and the adapter runs anywhere the shape matches.
export class WebSerialTransport implements Transport {
  readonly name = 'Web Serial';
  connected = false;

  private readonly serial: Serial;
  private readonly baudRate: number;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();
  private readonly dataCallbacks = new Set<DataListener>();
  private port?: SerialPort;
  private reader?: ReadableStreamDefaultReader<Uint8Array>;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(serial: Serial, options: WebSerialOptions = {}) {
    this.serial = serial;
    this.baudRate = options.baudRate ?? DEFAULT_BAUD_RATE;
  }

  onData(callback: DataListener): () => void {
    this.dataCallbacks.add(callback);

    return () => {
      this.dataCallbacks.delete(callback);
    };
  }

  async connect(): Promise<void> {
    if (this.connected || this.port) throw new Error('already connected');

    // requestPort opens the browser chooser, so it must run from a user
    // gesture (a button click) and rejects when the user cancels.
    const port = await this.serial.requestPort();

    await port.open({ baudRate: this.baudRate });

    this.port = port;
    this.connected = true;
    void this.readLoop();
  }

  private async readLoop(): Promise<void> {
    const port = this.port;

    if (!port?.readable) return;

    const reader = port.readable.getReader();

    this.reader = reader;

    try {
      // Chunk sizes are arbitrary, so { stream: true } keeps a multi-byte
      // character that is split across two chunks intact.
      while (this.connected) {
        const { value, done } = await reader.read();

        if (done) break;

        if (!value || value.length === 0) continue;

        const text = this.decoder.decode(value, { stream: true });

        for (const callback of this.dataCallbacks) callback(text);
      }
    } catch (error) {
      log.warn('transport.web-serial.read_failed', { error: String(error) });
    } finally {
      reader.releaseLock();
      this.reader = undefined;
    }
  }

  send(command: string): void {
    const port = this.port;

    const writable = port?.writable;

    if (!writable) throw new Error('not connected');

    // Writes go through one queue because a serial port only grants a single
    // writer at a time; back-to-back sends must not ask for two at once.
    this.writeQueue = this.writeQueue
      .then(() => {
        const writer = writable.getWriter();

        return writer
          .write(this.encoder.encode(command))
          .finally(() => writer.releaseLock());
      })
      .catch((error) => {
        log.warn('transport.web-serial.write_failed', {
          command,
          error: String(error),
        });
      });
  }

  async disconnect(): Promise<void> {
    const port = this.port;

    this.connected = false;
    this.port = undefined;

    if (this.reader) {
      await this.reader.cancel();
      this.reader = undefined;
    }

    if (!port) return;

    try {
      await port.close();
    } catch (error) {
      log.warn('transport.web-serial.close_failed', { error: String(error) });
    }
  }
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}
