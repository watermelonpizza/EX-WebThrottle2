import type { Transport } from '../transport';
import { extractFrames } from '../transport';
import { decodeFrame, requestSystemInfo } from '../protocol';
import { log } from '../logging';
import type {
  ConnectionEvent,
  ConnectionListener,
  ConnectionOptions,
  ConnectionStatus,
  TraceDirection,
  TraceEntry,
} from './types';

const DEFAULT_MAX_TRACE = 500;

// Owns the connect/disconnect lifecycle, turns raw received text into decoded
// protocol messages, and keeps the raw sent/received log. Stores subscribe to
// its events; components never talk to a transport directly.
export class ConnectionManager {
  status: ConnectionStatus = 'disconnected';

  private readonly transport: Transport;
  private readonly bootstrap: string[];
  private readonly maxTrace: number;
  private readonly traceLog: TraceEntry[] = [];
  private readonly listeners = new Set<ConnectionListener>();
  private buffer = '';
  private unsubscribeData?: () => void;

  constructor(options: ConnectionOptions) {
    this.transport = options.transport;
    this.bootstrap = options.bootstrap ?? [requestSystemInfo()];
    this.maxTrace = options.maxTrace ?? DEFAULT_MAX_TRACE;
  }

  get trace(): readonly TraceEntry[] {
    return [...this.traceLog];
  }

  subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  async connect(): Promise<void> {
    if (this.transport.connected) return;

    this.setStatus('connecting');

    this.unsubscribeData = this.transport.onData((text) =>
      this.handleData(text),
    );

    try {
      await this.transport.connect();
      this.setStatus('connected');

      for (const command of this.bootstrap) this.send(command);
    } catch (error) {
      this.unsubscribeData?.();
      this.unsubscribeData = undefined;
      this.setStatus('disconnected');
      log.error('connection.connect.failed', { error: String(error) });

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.unsubscribeData?.();
    this.unsubscribeData = undefined;

    await this.transport.disconnect();

    this.setStatus('disconnected');
  }

  send(command: string): void {
    if (!this.transport.connected) return;

    this.addTrace('sent', command);

    try {
      this.transport.send(command);
    } catch (error) {
      log.error('connection.send.failed', { command, error: String(error) });
    }
  }

  private handleData(text: string): void {
    this.addTrace('received', text);

    this.buffer += text;

    const result = extractFrames(this.buffer);

    this.buffer = result.rest;

    for (const frame of result.frames) {
      this.emit({ type: 'message', message: decodeFrame(frame) });
    }
  }

  private addTrace(direction: TraceDirection, text: string): void {
    const entry = { direction, text, at: Date.now() };

    this.traceLog.push(entry);

    if (this.traceLog.length > this.maxTrace) this.traceLog.shift();

    this.emit({ type: 'trace', entry });
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;

    this.emit({ type: 'status', status });
  }

  private emit(event: ConnectionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        // A broken listener (for example a store mid-cleanup) must never take
        // the message router down with it.
        log.error('connection.emit.listener_failed', { error: String(error) });
      }
    }
  }
}
