# EX-WebThrottle2

[![GitHub issues](https://img.shields.io/github/issues/dcc-ex/EX-WebThrottle2)](https://github.com/dcc-ex/EX-WebThrottle2/issues)
[![Discord](https://img.shields.io/discord/713189617066836079)](https://discord.gg/y2sB4Fp)

EX-WebThrottle2 is the next-generation browser throttle for
[DCC-EX Command Station](https://dcc-ex.com). It is a rebuild of the legacy
[WebThrottle-EX](https://dcc-ex.com/WebThrottle-EX) as a modern, maintainable
Vue application.

> **Status: very early development.** Not usable yet. The current engineering
> baseline (toolchain + app shell) is in place; the throttle features build up
> stage by stage.

## Requirements

- Node.js 26 (`.nvmrc` + `engines` pin this). Use `nvm use` if you have nvm.
- npm (lockfile is committed; use `npm ci` in CI).

## Commands

```bash
npm install            # install dependencies
npx playwright install # for Playwright e2e tests
npm run dev            # Vite dev server
npm run build          # type-check (vue-tsc) + production build
npm run preview        # preview the production build
npm run lint           # ESLint (flat config)
npm run test:unit      # Vitest unit/component tests
npm run test:e2e       # Playwright e2e tests
```

## Stack

Vue 3.5, Vite 8, Vuetify 4, Pinia 4, vue-router 5 (hash history), TypeScript 5.9,
ESLint 10 (flat config) + Prettier, Vitest 5 + @vue/test-utils, Playwright.

## Architecture

One-way dependency flow (the core layers land with the connection work):

```text
src/core/protocol → src/core/transport → src/core/connection → src/stores → views/components
```

Protocol parsing, transport, connection lifecycle, UI state, and presentational
components each live in their own layer and never reach across.

## Contributing

We need help of any kind — no experience required. See the
[contributing page](https://dcc-ex.com/about/contributing/webthrottle.html) and
consider joining our [Discord server](https://discord.gg/y2sB4Fp).
