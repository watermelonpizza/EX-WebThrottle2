import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setupFile.ts'],
    coverage: {
      // Every source file counts, not just the ones a test happened to import.
      include: ['src/**/*.{ts,vue}'],
      // The entrypoint only mounts Vue; component and end-to-end tests cover
      // the application it starts, not this five-line bootstrap.
      exclude: ['src/main.ts'],
      reporter: ['text', 'json-summary', 'json'],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
});
