import type { DataListener, DisconnectListener, Transport } from '../types';

export interface WebSocketLike {
  readyState: number;
  binaryType: BinaryType;
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onmessage: ((event: MessageEvent<string | ArrayBuffer>) => void) | null;

  send(data: string): void;
  close(): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

class WebSocketTransportError extends Error {
  constructor(url: string, reason: string) {
    super(`${reason} ${url}`);
    this.name = 'WebSocketTransportError';
  }
}

export class WebSocketTransport implements Transport {
  readonly name = 'Emulator';
  connected = false;

  private readonly decoder = new TextDecoder();
  private readonly dataCallbacks = new Set<DataListener>();
  private readonly disconnectCallbacks = new Set<DisconnectListener>();
  private socket?: WebSocketLike;

  constructor(
    private readonly url: string,
    private readonly createSocket: WebSocketFactory = (url) =>
      new WebSocket(url),
  ) {}

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
    if (this.connected || this.socket) {
      throw new WebSocketTransportError(this.url, 'already connected to');
    }

    const socket = this.createSocket(this.url);

    socket.binaryType = 'arraybuffer';
    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      let opened = false;

      socket.onopen = () => {
        opened = true;
        this.connected = true;
        resolve();
      };
      socket.onerror = () => {
        if (opened) {
          return;
        }

        this.socket = undefined;
        reject(new WebSocketTransportError(this.url, 'could not connect to'));
      };
      socket.onclose = () => {
        this.connected = false;
        this.socket = undefined;

        if (opened) {
          for (const callback of this.disconnectCallbacks) {
            callback();
          }
        } else {
          reject(
            new WebSocketTransportError(this.url, 'connection closed before'),
          );
        }
      };
      socket.onmessage = (event) => {
        const text =
          typeof event.data === 'string'
            ? event.data
            : this.decoder.decode(event.data);

        for (const callback of this.dataCallbacks) {
          callback(text);
        }
      };
    });
  }

  send(command: string): void {
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) {
      throw new WebSocketTransportError(this.url, 'not connected to');
    }

    this.socket.send(command);
  }

  async disconnect(): Promise<void> {
    const socket = this.socket;

    this.connected = false;
    this.socket = undefined;
    socket?.close();
  }
}
