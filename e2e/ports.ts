// An e2e run starts its own emulator and app server on ports of its own, so it
// never shares layout or power state with an emulator a developer already has
// running on the usual 4444, and never tests another checkout's dev server.
export const EMULATOR_PORT = 4455;
export const APP_PORT = 5174;

export const EMULATOR_URL = `ws://127.0.0.1:${EMULATOR_PORT}`;
