import type { DataListener, Transport } from '../types';

// A scriptable stand-in for a command station: tests and the in-browser
// emulator feed it received text and read back what was sent. It also answers
// the power and track commands the console relies on, so the emulator shows a
// live status bar without any hardware. Replacements for real hardware.
export class MockTransport implements Transport {
  readonly name = 'Emulator';
  connected = false;
  readonly sent: string[] = [];

  // Two track outputs the emulator reports: A wired as the main track, B as
  // the programming track. Power starts off until switched.
  private readonly mode = new Map<string, string>([
    ['A', 'MAIN'],
    ['B', 'PROG'],
  ]);
  private readonly power = new Map<string, boolean>();

  private readonly dataCallbacks = new Set<DataListener>();

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  send(command: string): void {
    this.sent.push(command);
    this.respond(command);
  }

  receives(text: string): void {
    for (const callback of this.dataCallbacks) callback(text);
  }

  onData(callback: DataListener): () => void {
    this.dataCallbacks.add(callback);

    return () => {
      this.dataCallbacks.delete(callback);
    };
  }

  private emit(text: string): void {
    for (const callback of this.dataCallbacks) callback(text);
  }

  private respond(command: string): void {
    if (command === '<=>') {
      for (const [letter, mode] of this.mode) {
        this.emit(`<= ${letter} ${mode}>\n`);
      }

      this.broadcastPower();

      return;
    }

    const match = /^<([10]) ?([A-H])?>$/.exec(command);

    if (!match) return;

    const on = match[1] === '1';
    const letter = match[2];
    const targets = letter ? [letter] : [...this.mode.keys()];

    for (const id of targets) this.power.set(id, on);

    if (letter) {
      this.emit(`<p${on ? letter : letter.toLowerCase()}>\n`);
    } else {
      this.emit(`<p${on ? 1 : 0}>\n`);
    }

    this.broadcastPower();
  }

  private broadcastPower(): void {
    const all = [...this.mode.keys()].every((letter) => this.power.get(letter));
    const any = [...this.mode.keys()].some((letter) => this.power.get(letter));

    if (all) {
      this.emit('<p1>\n');
    } else if (!any) {
      this.emit('<p0>\n');
    }
  }
}
