import type { ProtocolMessage } from '../protocol';
import type { Transport } from '../transport';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export type TraceDirection = 'sent' | 'received';

export interface TraceEntry {
  direction: TraceDirection;
  text: string;
  at: number;
}

export type ConnectionEvent =
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'message'; message: ProtocolMessage }
  | { type: 'trace'; entry: TraceEntry };

export interface ConnectionOptions {
  transport: Transport;
  // Commands sent right after a successful connect (the handshake), so the
  // command station introduces itself. Power comes from broadcasts later.
  bootstrap?: string[];
  // How many raw sent/received lines the diagnostics log keeps.
  maxTrace?: number;
}

export type ConnectionListener = (event: ConnectionEvent) => void;
