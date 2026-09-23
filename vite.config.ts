import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    vue(),
    vuetify({
      autoImport: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: process.env.GH_BUILD ? '/EX-WebThrottle2/' : '/',
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setupFile.ts'],
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary', 'json'],
    },
  },
});