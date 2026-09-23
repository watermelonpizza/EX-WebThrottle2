// What the connection layer needs from any device link: Web Serial now, Hub
// WebSocket or direct WebSocket later. Everything is raw text — the framing of
// <opcode params> messages is left to the connection layer, so every transport
// shares the same parser and the same raw sent/received log.

export type DataListener = (text: string) => void;

export interface Transport {
  // A short, user-visible name, shown in the diagnostics view.
  readonly name: string;
  connected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(text: string): void;

  // Called with whatever text arrived since the last call. Returns an
  // unsubscribe function, like the logging sinks.
  onData(callback: DataListener): () => void;
}
