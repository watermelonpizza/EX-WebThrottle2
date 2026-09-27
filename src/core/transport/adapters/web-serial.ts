import type { DataListener, DisconnectListener, Transport } from '../types';
import { log } from '../../logging';

// The USB rate used by EX-CommandStation (SerialManager.cpp).
const BAUD_RATE = 115200;

// A Transport that talks to an EX-CommandStation over the browser Web Serial
// API. The Serial object is injected rather than read from navigator, so tests
// can substitute a fake and the adapter runs anywhere the shape matches.
export class WebSerialTransport implements Transport {
  readonly name = 'USB';
  connected = false;

  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();
  private readonly dataCallbacks = new Set<DataListener>();
  private readonly disconnectCallbacks = new Set<DisconnectListener>();
  private port?: SerialPort;
  private reader?: ReadableStreamDefaultReader<Uint8Array>;
  private reading?: Promise<void>;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly serial: Serial) {}

  onData(callback: DataListener): () => void {
    this.dataCallbacks.add(callback);

    return () => {
      this.dataCallbacks.delete(callback);
    };
  }

  onDisconnect(callback: DisconnectListener): () => void {
    this.disconnectCallbacks.add(callback);

    return () => {
      this.disconnectCallbacks.delete(callback);
    };
  }

  async connect(): Promise<void> {
    if (this.connected || this.port) {
      throw new Error('already connected');
    }

    // requestPort opens the browser chooser, so it must run from a user
    // gesture (a button click) and rejects when the user cancels.
    const port = await this.serial.requestPort();

    await port.open({ baudRate: BAUD_RATE });

    this.port = port;
    this.connected = true;
    this.reading = this.readLoop(port);
  }

  private async readLoop(port: SerialPort): Promise<void> {
    let open = true;

    // After a recoverable error (a framing or parity glitch) the port hands
    // over a fresh readable; once the device is lost (cable pulled) it has
    // none, which ends the loop. See the Web Serial spec's read example.
    while (open && this.connected && port.readable) {
      const reader = port.readable.getReader();

      this.reader = reader;

      try {
        // Chunk sizes are arbitrary, so { stream: true } keeps a multi-byte
        // character that is split across two chunks intact.
        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            open = false;
            break;
          }

          if (!value || value.length === 0) {
            continue;
          }

          const text = this.decoder.decode(value, { stream: true });

          for (const callback of this.dataCallbacks) {
            callback(text);
          }
        }
      } catch (error) {
        log.warn('transport.web-serial.read_failed', { error: String(error) });
      } finally {
        reader.releaseLock();
        this.reader = undefined;
      }
    }

    // Still connected means disconnect() was never called: the cable came
    // out or the port went away. Close it so a reconnect can open it again,
    // then report the drop.
    if (this.connected) {
      this.connected = false;
      this.port = undefined;
      await this.closePort(port);

      for (const callback of this.disconnectCallbacks) {
        callback();
      }
    }
  }

  send(command: string): void {
    const port = this.port;

    const writable = port?.writable;

    if (!writable) {
      throw new Error('not connected');
    }

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

    await this.reader?.cancel();
    await this.reading;

    if (port) {
      await this.closePort(port);
    }
  }

  // A port refuses to close while a stream is locked, so this waits for any
  // queued write; callers have already let the read loop finish.
  private async closePort(port: SerialPort): Promise<void> {
    await this.writeQueue;

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
