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
import type { AddressInfo } from 'node:net';
import { createServer } from 'node:net';
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
    emulator = spawn(binary, [], {
      cwd: emulatorDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
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

  // mySetup.h puts sensor 20 on pin 22; pulling that pin low is what a
  // detector does, and the firmware's own sensor polling reports it.
  test('reports a sensor when its pin is pulled low, and clear when released', async () => {
    const active = waitForOutput(emulator, /<Q 20>/);

    ask(emulator, '<z -22>');
    await expect(active).resolves.toMatch(/<Q 20>/);

    const clear = waitForOutput(emulator, /<q 20>/);

    ask(emulator, '<z 22>');
    await expect(clear).resolves.toMatch(/<q 20>/);
  });

  // myAutomation.h turns EXRAIL on, with five routes and one automation.
  test('lists the EXRAIL routes and automation', async () => {
    const listed = waitForOutput(emulator, /<jA 101 102 103 104 105 201>/);

    ask(emulator, '<JA>');
    await expect(listed).resolves.toMatch(/<jA 101 102 103 104 105 201>/);
  });

  test('describes a route', async () => {
    const described = waitForOutput(emulator, /<jA 101 R "Main line">/);

    ask(emulator, '<JA 101>');
    await expect(described).resolves.toMatch(/<jA 101 R "Main line">/);
  });

  // Turnouts start thrown, so each point the Main line route closes reports.
  test('sets the points when a route runs', async () => {
    const set = waitForOutput(emulator, /<H 2 0>/);

    ask(emulator, '</ START 101>');
    await expect(set).resolves.toMatch(/<H 1 0>[\s\S]*<H 3 0>[\s\S]*<H 2 0>/);
  });

  // The automation drives loco 3 until pin 22 (sensor 20, Platform 1) goes
  // low, and shows itself active on throttles while it runs.
  test('shows an automation active while it runs, and inactive once it stops', async () => {
    const running = waitForOutput(emulator, /<jB 201 1>/);

    ask(emulator, '</ START 3 201>');
    await expect(running).resolves.toMatch(/<jB 201 1>/);

    const stopped = waitForOutput(emulator, /<jB 201 0>/);

    ask(emulator, '<z -22>');
    await expect(stopped).resolves.toMatch(/<jB 201 0>/);
  });

  // The DCC timer sends queued packets to the track, so a packet's queue slot
  // is reused afterwards instead of a new one being made for every packet.
  test('reuses DCC queue slots once their packets have gone to the track', async () => {
    const closed = waitForOutput(emulator, /<H 4 0>/);

    ask(emulator, '<T 4 C>');
    await closed;

    // Long enough for the accessory's on and off packets to go out.
    await new Promise(resolve => setTimeout(resolve, 500));

    const thrown = waitForOutput(emulator, /<H 4 1>/);

    ask(emulator, '<T 4 T>');
    await expect(thrown).resolves.not.toContain('New DCC queue slot');
  });
});

describe('WebSocket bridge', () => {
  let bridge: ChildProcess;

  let port = 4444;

  beforeAll(async () => {
    ensureBuilt();

    port = await freePort();

    bridge = spawn(
      'node',
      [fileURLToPath(new URL('./bridge.mjs', import.meta.url))],
      {
        cwd: emulatorDir,
        env: { ...process.env, WSPORT: String(port) },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    children.push(bridge);
  }, 20_000);

  test('serves the emulator on WSPORT and carries a <s> round-trip', async () => {
    const socket = await connectSocket(port);
    let buffer = '';

    // The emulator streams stdout byte-wise, so the bridge emits many small
    // websocket messages; the banner frame arrives split across them.
    const banner = /<iDCC-EX V-[\d.]+ \/ HOST /;

    const reply = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('no <iDCC-EX banner over websocket')),
        10_000,
      );

      socket.on('message', (data) => {
        buffer += data.toString();

        if (banner.test(buffer)) {
          clearTimeout(timeout);
          resolve(buffer);
        }
      });
    });

    // Give the bridge's emulator a beat to finish booting, then ask.
    await new Promise(r => setTimeout(r, 500));
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
      await new Promise(r => setTimeout(r, 200));
    }
  }
}
