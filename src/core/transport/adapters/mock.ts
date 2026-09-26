import type { DataListener, Transport } from '../types';

// A scriptable stand-in for a command station in unit tests: a test feeds it
// received text with receives() and reads back what was sent. Realistic
// replies come from the host emulator (npm run emulator), not from here.
export class MockTransport implements Transport {
  readonly name = 'Emulator';
  connected = false;
  readonly sent: string[] = [];

  private readonly dataCallbacks = new Set<DataListener>();

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  send(command: string): void {
    this.sent.push(command);
  }

  receives(text: string): void {
    for (const callback of this.dataCallbacks) {
      callback(text);
    }
  }

  onData(callback: DataListener): () => void {
    this.dataCallbacks.add(callback);

    return () => {
      this.dataCallbacks.delete(callback);
    };
  }
}
