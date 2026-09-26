import { globalIgnores } from 'eslint/config';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import stylistic from '@stylistic/eslint-plugin';

export default defineConfigWithVueTs(
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/node_modules/**',
    // Vendored agent skills (third-party code, not ours to lint)
    '.pi/**',
  ]),
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  stylistic.configs.recommended,
  {
    name: 'app/rules',
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'throw' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: ['block-like'] },
      ],
      "@stylistic/curly-newline": [
        'error',
        {
          'multiline': true,
          'minElements': 1,
          'TryStatementBlock': { 'multiline': true, 'minElements': 0 },
          'TryStatementHandler': { 'multiline': true, 'minElements': 0 },
          'TryStatementFinalizer': { 'multiline': true, 'minElements': 0 }
        }
      ]
    },
  },
  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormatting,
  {
    name: 'app/braces',
    rules: {
      // Braces on every control statement, one-liners included. This sits
      // after skipFormatting because eslint-config-prettier switches `curly`
      // off wholesale; the "all" option never disagrees with Prettier, only
      // the multi-line ones do. `curly` is a core suggestion rule, not one of
      // the formatting rules @stylistic took over.
      curly: ['error', 'all'],
    },
  },
  {
    // Components know stores, not the wire: protocol and transport details
    // reach the screen only through store state and actions (AGENTS.md).
    name: 'app/layers',
    files: ['src/components/**', 'src/views/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/core/protocol',
                '@/core/protocol/*',
                '@/core/transport',
                '@/core/transport/*',
              ],
              message:
                'Components use stores, not protocol or transport code: add a store action or getter instead.',
            },
          ],
        },
      ],
    },
  },
);
