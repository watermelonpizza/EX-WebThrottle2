// Integration tests for the CommandStation-EX host emulator and its
// WebSocket bridge (emulator/bridge.mjs): spawn the real binary, treat its
// stdin/stdout as a command-station terminal, and round-trip commands. Run
// with `pnpm run test:emulator` — this needs a C++17 compiler + make and the
// git submodule, so it is intentionally NOT part of `pnpm test`.
// @vitest-environment node

import { execFileSync, spawn } from 'node:child_process';
import type {
  ChildProcess,
  ChildProcessWithoutNullStreams,
} from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { WebSocket } from 'ws';

const emulatorDir = fileURLToPath(new URL('.', import.meta.url));
const binary = fileURLToPath(new URL('./build/emulator', import.meta.url));

const children: ChildProcess[] = [];

afterAll(() => {
  for (const child of children) {
child.kill('SIGINT');
}
});

// Collects stdout until a pattern arrives (the emulator streams its boot
// banner immediately and answers each stdin command asynchronously).
function waitForOutput(
  child: ChildProcessWithoutNullStreams,
  want: RegExp,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.stdout.off('data', onData);
      reject(new Error(`no output matching ${want} within 10s`));
    }, 10_000);

    let buffer = '';

    function onData(chunk: Buffer) {
      buffer += chunk.toString();

      if (want.test(buffer)) {
        clearTimeout(timeout);
        child.stdout.off('data', onData);
        resolve(buffer);
      }
    }

    child.stdout.on('data', onData);
  });
}

function ask(child: ChildProcessWithoutNullStreams, command: string): void {
  child.stdin.write(`${command}\n`);
}

// Picks a port that is free right now; the bridge then binds it.
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();

    probe.on('error', reject);

    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as AddressInfo;
      const alive = probe;

      // Hold the port open until the bridge has had a moment to bind it.
      setTimeout(() => alive.close(() => resolve(port)), 300);
    });
  });
}

function ensureBuilt(): void {
  if (!existsSync(binary)) {
    execFileSync('make', ['-C', emulatorDir]);
  }
}

describe('emulator binary', () => {
  let emulator: ChildProcessWithoutNullStreams;

  beforeAll(() => {
    ensureBuilt();
    emulator = spawn(binary, [], { cwd: emulatorDir, stdio: ['pipe', 'pipe', 'pipe'] });
    children.push(emulator);
  });

  test('boots and prints the DCC-EX host banner', async () => {
    const out = await waitForOutput(emulator, /<iDCC-EX V-[\d.]+ \/ HOST /);

    expect(out).toContain('HOST');
  });

  test('answers <s> with the banner again over stdin/stdout', async () => {
    ask(emulator, '<s>');

    const out = await waitForOutput(emulator, /<iDCC-EX V-[\d.]+ \/ HOST /);

    expect(out).toContain('HOST');
  });

  // layout.txt puts sensor 20 on pin 22; pulling that pin low is what a
  // detector does, and the firmware's own sensor polling reports it.
  test('reports a sensor when its pin is pulled low, and clear when released', async () => {
    const active = waitForOutput(emulator, /<Q 20>/);

    ask(emulator, '<z -22>');
    await expect(active).resolves.toMatch(/<Q 20>/);

    const clear = waitForOutput(emulator, /<q 20>/);

    ask(emulator, '<z 22>');
    await expect(clear).resolves.toMatch(/<q 20>/);
  });
});

describe('WebSocket bridge', () => {
  let bridge: ChildProcess;

  let port = 4444;

  beforeAll(async () => {
    ensureBuilt();

    port = await freePort();

    bridge = spawn('node', [fileURLToPath(new URL('./bridge.mjs', import.meta.url))], {
      cwd: emulatorDir,
      env: { ...process.env, WSPORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    children.push(bridge);
  }, 20_000);

  test('serves the emulator on WSPORT and carries a <s> round-trip', async () => {
    const socket = await connectSocket(port);
    let buffer = '';

    // The emulator streams stdout byte-wise, so the bridge emits many small
    // websocket messages; the banner frame arrives split across them.
    const banner = /<iDCC-EX V-[\d.]+ \/ HOST /;

    const reply = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('no <iDCC-EX banner over websocket')), 10_000);

      socket.on('message', (data) => {
        buffer += data.toString();

        if (banner.test(buffer)) {
          clearTimeout(timeout);
          resolve(buffer);
        }
      });
    });

    // Give the bridge's emulator a beat to finish booting, then ask.
    await new Promise((r) => setTimeout(r, 500));
    socket.send('<s>\n');

    await expect(reply).resolves.toMatch(banner);
    socket.close();
  }, 20_000);
});

async function connectSocket(port: number): Promise<WebSocket> {
  while (true) {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);

    const opened = new Promise<WebSocket>((resolve, reject) => {
      const timeout = setTimeout(() => socket.terminate(), 1_000);

      socket.on('open', () => {
        clearTimeout(timeout);
        resolve(socket);
      });
      socket.on('error', () => {
        clearTimeout(timeout);
        socket.terminate();
        reject(new Error('connect failed'));
      });
    });

    try {
      return await opened;
    } catch {
      // Bridge still starting up; retry until its port accepts.
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}
