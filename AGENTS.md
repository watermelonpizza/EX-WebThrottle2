# AGENTS.md

Working notes for AI coding agents and developers in this repository. Read this before changing code. Read [PRODUCT.md](PRODUCT.md) before any UI, copy, or feature work: it says who the product is for, what it does, and how it speaks.

If an `AGENTS.local.md` file exists next to this one, read it too. It holds a developer's private working notes, is gitignored, and must never be committed.

## What this project is

EX-WebThrottle (shown in the app as **WebThrottle**) is the DCC-EX browser throttle. It rebuilds the legacy [WebThrottle-EX](https://github.com/DCC-EX/WebThrottle-EX) as a maintainable Vue application.

- The legacy app is the behavioural **reference**, not the implementation model.
- The [CommandStation-EX](https://github.com/DCC-EX/CommandStation-EX) source is the protocol source of truth. A pinned copy lives in `emulator/CommandStation-EX`.
- What works today, what is planned, and what is retired on purpose are listed in PRODUCT.md under Capabilities and Constraints.

## Engineering principles

1. **Modern, current, mainstream.** Use the latest stable tooling and best practices as defined by the Vue, Node, and TypeScript teams (Vue 3.5 + Vite 8 + Pinia 4 + vue-router 5 + ESLint 10 flat config + Prettier, on Node 26). When in doubt, follow the official docs and the `create-vue` default project, then adjust only where our app needs it.

2. **Minimal config and maintenance.** Prefer sensible defaults over options. The fewer files, flags, and settings a developer has to understand before they can run, compile, test, and deploy, the better. A clean checkout must install, type-check, test, and build with documented, obvious commands.

3. **Clean architecture, minimal spaghetti.** Keep strict separation of concerns and one-way data flow. Protocol parsing, transport, connection lifecycle, UI state, and presentational components each have their own layer and must not reach across layers. If a change needs to read three layers at once, the design is wrong — restructure. Keep components small and focused.

4. **Limit packages.** Use what Vue, Node, and the browser already give us before adding anything. Every dependency is maintenance burden and supply-chain risk. Runtime dependencies are intentionally tiny: `vue`, `vue-router`, `pinia`, `@mdi/font` (`sass` is a build-time devDependency). Do not re-add removed packages (see the list below). A browser SPA must not use Node's `serialport` — use the browser Web Serial API (`navigator.serial`).

5. **Simple language.** Write plain code with plain names. Avoid jargon, cleverness, and over-engineering. Code should be readable by developers who are not veterans — and by users reading project docs. Use comments only where they add something a good name cannot.

6. **No AI-slop.** Do not produce boilerplate or generic patterns that make this look like every other scaffolded web project. Keep the personality of a model-train hobby project: the UI is our own train-console component layer, not stock Material. Keep diffs small, purposeful, and idiomatic.

7. **Always ask questions.** If something is unclear, ambiguous, or seems off, ask immediately. Do not make assumptions that could lead to architectural or implementation mistakes. A question asked early can save hours of rework.

8. **Look up the official documentation.** Before implementing a feature or making a change, consult the official docs for Vue, Vite, Pinia, vue-router, TypeScript, Node, and the browser APIs we use (Web Serial, `<dialog>`, CSS custom properties). This keeps us on current best practice.

9. **Internal IDs stay internal.** Planning identifiers (ticket, task, and stage numbers) mean nothing to users or other contributors. Keep them out of anything committed or user-facing: READMEs, docs, code comments, UI copy, and commit messages.

10. **Pause for review before committing.** Never commit or push until the maintainer has reviewed and approved the current change-set. Present a short summary of the changes and wait for a go-ahead — even mid-iteration on a work branch.

11. **Readable code grouping, with reasons, not magic numbers.** Separate blocks of code with blank lines so related statements are visibly grouped; the `@stylistic/padding-line-between-statements` rule enforces this (`npm run lint:fix` tidies it up). Whenever a value or formula is not self-evidently why (protocol byte layouts, reserved values, range ceilings), add a short comment explaining the reason and the source — and attach it directly to the thing it documents with no blank line between them, so IDE/JSDoc tooling binds it correctly. Core formatting rules are deprecated in ESLint; use the `@stylistic/...` versions, never the deprecated core names.

## Stack

| Area            | Choice                                                                                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node            | 26 (active current release, LTS soon). `engines >=26.0.0`, `.nvmrc` = 26, CI `26.x`                                                                                                                                                                                                              |
| Package manager | npm (lockfile is committed; workflows use `npm ci`)                                                                                                                                                                                                                                              |
| Vue             | 3.5 stable, Composition API + `<script setup lang="ts">`                                                                                                                                                                                                                                         |
| Build           | Vite 8 + `@vitejs/plugin-vue`                                                                                                                                                                                                                                                                    |
| UI              | **Own component layer** (Vuetify was removed). Thin components over native HTML + SCSS: range inputs for throttles, `<dialog>` for modals, plain elements elsewhere. `@mdi/font` for glyphs. Fallback if we ever need a control we do not want to hand-wire: `@vuetify/v0` (headless, unstyled). |
| State           | Pinia 4                                                                                                                                                                                                                                                                                          |
| Routing         | vue-router 5, hash history (static hosting on GitHub Pages)                                                                                                                                                                                                                                      |
| TypeScript      | pinned `^5.9.x` — **do NOT bump to `latest`**: TypeScript 7.x (native/Go) is not yet supported by vue-tsc/Volar and will crash the type-check. Revisit once Volar ships TS 7 support.                                                                                                            |
| Lint/format     | ESLint 10 flat config + Prettier (`@vue/eslint-config-typescript` + `@vue/eslint-config-prettier`) + `@stylistic/eslint-plugin` (blank-line padding rule)                                                                                                                                        |
| Tests           | Vitest 5 + `@vue/test-utils` + jsdom (unit/component); Playwright for e2e, run against the host emulator                                                                                                                                                                                         |
| Type-check      | `vue-tsc` inside the production build                                                                                                                                                                                                                                                            |

**Removed and not to be re-added**: `vuetify`, `vite-plugin-vuetify`, `three` / `@types/three`, `vue-round-slider`, `serialport`, `webfontloader`, `roboto-fontface`, `@iconify/vue`, `@cloudthrottle/dcc-ex--commands`, `@cloudthrottle/dcc-ex--serial-communicator`, `@babel/types`, `npm-run-all`, `eslint-config-google`, `playwright` (use `@playwright/test` only). We own the DCC-EX connection layer ourselves instead of the stale cloudthrottle packages.

## Architecture

One-way dependency flow, top to bottom:

```text
src/core/protocol     pure: DCC-EX Native Protocol encode/decode, speed bytes, opcode constants
src/core/transport    Transport interface + frame extractor; adapters/ = Web Serial,
                      WebSocket (emulator bridge), MockTransport (offline test double)
src/core/loco         pure loco helpers (function-state reconciliation)
src/core/logging      structured logging (event identifiers + sinks)
src/stores            Pinia stores, the only view-facing state: connection (lifecycle,
                      decode routing, raw traffic log), power, locos, maps, inventory,
                      panels, settings
src/components        ui/ (our component layer), layout/, panels/, connection/,
                      settings/, throttle/
src/views             ConsoleView (connect page, then the panel workspace), SettingsView
src/router · src/styles (design tokens as CSS custom properties; themes via [data-theme])
emulator/             real CommandStation-EX built for the host + WebSocket bridge
e2e/                  Playwright tests
```

Rules:

- `src/core/*` must not depend on Vue or Pinia.
- Stores must not touch the DOM.
- Components must not know protocol details — they call store actions and read store state.
- The Command Station is authoritative. Stores send commands and fold in replies and broadcasts; they do not assume a command's reply is the next message.
- Components only ever read colours, spacing, and type from `var(--*)` tokens in `src/styles/main.scss`, never hard-coded values, so new themes need no component changes.

## Commands

```bash
npm install            # clean install
npm run dev            # Vite dev server
npm run build          # type-check (vue-tsc) + production build
npm run preview        # preview the production build
npm run type-check     # vue-tsc only
npm run lint           # ESLint (flat config, eslint.config.mjs); lint:fix to auto-fix
npm run format:check   # Prettier check on src/; format to write
npm run test:unit      # Vitest unit/component tests with coverage (= npm test)
npm run emulator       # build the host emulator and serve it on ws://127.0.0.1:4444
npm run test:emulator  # emulator bridge tests
npm run test:e2e       # Playwright e2e (starts the emulator + dev server itself)
```

- Before the first e2e run, run `npx playwright install`, or the tests fail with "Executable doesn't exist".
- The emulator needs the submodule (`git submodule update --init`) and a C++ toolchain with `make`. See `emulator/README.md`.
- Run lint, type-check, and unit tests after every change.

## Design and product context

- `PRODUCT.md` — users, purpose, principles, voice, and accessibility goals. dcc-ex.com is the source of truth for voice, spelling, and terminology.
- `.impeccable/` — config for the Impeccable design skill (`.pi/skills/impeccable`). New surfaces are built comp-first; live mode targets `index.html`.

## Git

- `main` is the integration line. Work happens on topic branches that are squash-merged to `main`.
- Commit messages are plain, user-meaningful sentences, with no planning identifiers (principle 9).
- Never commit or push without the maintainer's go-ahead (principle 10).
