/*
 * WebSocket bridge for the CommandStation host emulator: spawns the native
 * binary, serves its real CS-EX byte stream to browser Transport clients as
 * ws://localhost:<port>, and forwards client bytes to the emulator's stdin.
 *
 * The emulator's protocol replies and diagnostics both come out of its stdout
 * (exactly like a real command station on USB); its stderr stays on this
 * console so log spam never reaches the wire.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';

// Overridable local port; the browser side connects here.
const PORT = Number(process.env.WSPORT ?? 4444);

// Paths resolve from this file so the script runs from any CWD; the binary
// itself reads layout.txt/layout.local.txt relative to the emulator dir.
const emulatorDir = dirname(fileURLToPath(import.meta.url));
const binary = join(emulatorDir, 'build', 'emulator');

const emulator = spawn(binary, [], {
  cwd: emulatorDir,
  stdio: ['pipe', 'pipe', 'pipe'],
});

const HOST = '127.0.0.1';
const wss = new WebSocketServer({ host: HOST, port: PORT });

wss.on('listening', () => {
  console.log(`emulator bridge on ws://${HOST}:${PORT} (pid ${emulator.pid})`);
});

wss.on('connection', (socket) => {
  socket.on('message', (data) => {
    emulator.stdin.write(data);
  });
});

emulator.stdout.on('data', (data) => {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
});

emulator.stderr.on('data', (data) => process.stderr.write(data));

emulator.on('exit', (code) => {
  console.log(`emulator exited (${code}); closing bridge`);
  wss.close();
});

process.on('SIGINT', () => emulator.kill('SIGINT'));
