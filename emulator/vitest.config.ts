import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Runs the emulator/bridge integration tests (pnpm run test:emulator). Kept
// separate from vite.config.ts so running `pnpm test` needs no C++ toolchain:
// these spawn the real emulator binary and only apply to emulator/**.
export default defineConfig({
  test: {
    include: ['emulator/**/*.spec.ts'],
    environment: 'node',
    coverage: { enabled: false },
    hookTimeout: 20_000,
    testTimeout: 20_000,
    root: fileURLToPath(new URL('..', import.meta.url)),
  },
});