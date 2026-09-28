import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { URL, fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const PUBLIC = fileURLToPath(new URL('./public', import.meta.url));
const SERVICE_WORKER = fileURLToPath(new URL('./src/service-worker.js', import.meta.url));

// Writes sw.js beside the built app with the list of files it keeps a copy
// of, and a version that changes whenever any of them does. Only a build has
// one: the dev server's files change on every save.
function serviceWorker(): Plugin {
  return {
    name: 'service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const built = Object.values(bundle).map(file => file.fileName);
      const copied = readdirSync(PUBLIC);
      const files = [...new Set(['index.html', ...built, ...copied])].sort();

      const version = createHash('sha256');

      for (const file of Object.values(bundle)) {
        version.update(file.type === 'chunk' ? file.code : file.source);
      }

      for (const file of copied) {
        version.update(readFileSync(`${PUBLIC}/${file}`));
      }

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: readFileSync(SERVICE_WORKER, 'utf8')
          .replace('self.__FILES__', JSON.stringify(files))
          .replace('self.__VERSION__', JSON.stringify(version.digest('hex').slice(0, 12))),
      });
    },
  };
}

export default defineConfig({
  // Relative asset paths, so one build runs from any folder: the site root in
  // dev, /EX-WebThrottle2/ on GitHub Pages. Safe because routing uses the hash.
  base: './',
  plugins: [vue(), serviceWorker()],
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
      // The entrypoint only mounts Vue and registers the service worker;
      // component and end-to-end tests cover what it starts.
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
