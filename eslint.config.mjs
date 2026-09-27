import { globalIgnores } from 'eslint/config';
import { vueTsConfigs, withVueTs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import stylistic from '@stylistic/eslint-plugin';

const config = [
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/node_modules/**',
    // Vendored agent skills (third-party code, not ours to lint)
    '.pi/**',
    '.impeccable/**',
  ]),
  pluginVue.configs['flat/recommended-error'],
  vueTsConfigs.recommended,
  stylistic.configs.customize({
    semi: true,
  }),
  {
    name: 'app/rules',
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      // Later entries win, so the 'any' lines let a run of imports or of
      // declarations stay together.
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },
        { blankLine: 'always', prev: ['block-like', 'function'], next: '*' },
        {
          blankLine: 'always',
          prev: '*',
          next: ['block-like', 'function', 'return', 'throw'],
        },
      ],
      '@stylistic/brace-style': ['error', '1tbs'],
      '@stylistic/curly-newline': [
        'error',
        {
          multiline: true,
          minElements: 1,
          TryStatementBlock: { multiline: true, minElements: 0 },
          TryStatementHandler: { multiline: true, minElements: 0 },
          TryStatementFinalizer: { multiline: true, minElements: 0 },
        },
      ],
      '@stylistic/list-style': ['error', { empty: 'never' }],
    },
  },
  {
    name: 'app/consistency',
    rules: {
      // Braces on every control statement, one-liners included.
      'curly': ['error', 'all'],
      // One import per module; a separate `import type` line is fine. That
      // types are imported with `import type` is checked by TypeScript
      // itself (verbatimModuleSyntax in tsconfig.json).
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
      // Names inside { } in order; the order of import lines is left alone.
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
      'no-else-return': 'error',
      'prefer-template': 'error',
      'logical-assignment-operators': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportSpecifier[importKind="type"]',
          message: 'Import types on their own `import type { … }` line.',
        },
        {
          selector: 'ForStatement[init=null][test=null][update=null]',
          message: 'Write an endless loop as `while (true)`.',
        },
      ],
    },
  },
  {
    // The app logs through src/core/logging, which tags every event.
    name: 'app/logging',
    files: ['src/**'],
    ignores: ['src/core/logging/**'],
    rules: {
      'no-console': 'error',
    },
  },
  {
    // Components should not access transport details directly;
    // They should instead reach the screen only through store state and actions
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
];

export default withVueTs(config);
