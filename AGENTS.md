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

4. **Limit packages.** Use what Vue, Node, and the browser already give us before adding anything. Every dependency is maintenance burden and supply-chain risk. Runtime dependencies are intentionally tiny: `vue`, `vue-router`, `pinia`. Styles are plain CSS (native nesting), with no preprocessor. Icons are inline SVG paths copied from Material Design Icons (`@mdi/js`), not an icon font. Do not re-add removed packages (see the list below). A browser SPA must not use Node's `serialport` — use the browser Web Serial API (`navigator.serial`).

5. **Simple language.** Write plain code with plain names. Avoid jargon, cleverness, and over-engineering. Code should be readable by developers who are not veterans — and by users reading project docs. Use comments only where they add something a good name cannot.

6. **No AI-slop.** Do not produce boilerplate or generic patterns that make this look like every other scaffolded web project. Keep the personality of a model-train hobby project: the UI is our own train-console component layer, not stock Material. Keep diffs small, purposeful, and idiomatic.

7. **Always ask questions.** If something is unclear, ambiguous, or seems off, ask immediately. Do not make assumptions that could lead to architectural or implementation mistakes. A question asked early can save hours of rework.

8. **Look up the official documentation.** Before implementing a feature or making a change, consult the official docs for Vue, Vite, Pinia, vue-router, TypeScript, Node, and the browser APIs we use (Web Serial, `<dialog>`, CSS custom properties). This keeps us on current best practice.

9. **Internal IDs stay internal.** Planning identifiers (ticket, task, and stage numbers) mean nothing to users or other contributors. Keep them out of anything committed or user-facing: READMEs, docs, code comments, UI copy, and commit messages.

10. **Pause for review before committing.** Never commit or push until the maintainer has reviewed and approved the current change-set. Present a short summary of the changes and wait for a go-ahead — even mid-iteration on a work branch.

11. **Readable code grouping, with reasons, not magic numbers.** Separate blocks of code with blank lines so related statements are visibly grouped; the `@stylistic/padding-line-between-statements` rule enforces this (`npm run lint:fix` tidies it up). Whenever a value or formula is not self-evidently why (protocol byte layouts, reserved values, range ceilings), add a short comment explaining the reason and the source — and attach it directly to the thing it documents with no blank line between them, so IDE/JSDoc tooling binds it correctly. Core formatting rules are deprecated in ESLint; use the `@stylistic/...` versions, never the deprecated core names.

12. **No pixel-peeping in styles.** Size and space come from the shared tokens in `src/styles/tokens.css` (type, spacing and control scales) and from layout (flex, grid, content), never from one-off values tuned to match a screenshot: no hand-picked line heights, widths, heights, offsets or letter-spacing. Panels change size at run time and the layout will become user-arrangeable, so anything that only holds at one size is a bug.

## Stack

| Area            | Choice                                                                                                                                                                                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node            | 26 (active current release, LTS soon). `engines >=26.0.0`, `.nvmrc` = 26, CI `26.x`                                                                                                                                                                                                                                               |
| Package manager | pnpm (`pnpm-lock.yaml` is committed)                                                                                                                                                                                                                                                                                              |
| Vue             | 3.5 stable, Composition API + `<script setup lang="ts">`                                                                                                                                                                                                                                                                          |
| Build           | Vite 8 + `@vitejs/plugin-vue`                                                                                                                                                                                                                                                                                                     |
| UI              | **Own component layer** (Vuetify was removed). Thin components over native HTML + CSS: range inputs for throttles, `<dialog>` for modals, plain elements elsewhere. Inline SVG paths (from Material Design Icons) for glyphs. Fallback if we ever need a control we do not want to hand-wire: `@vuetify/v0` (headless, unstyled). |
| State           | Pinia 4                                                                                                                                                                                                                                                                                                                           |
| Routing         | vue-router 5, hash history (static hosting on GitHub Pages)                                                                                                                                                                                                                                                                       |
| TypeScript      | pinned `^5.9.x` — **do NOT bump to `latest`**: TypeScript 7.x (native/Go) is not yet supported by vue-tsc/Volar and will crash the type-check. Revisit once Volar ships TS 7 support.                                                                                                                                             |
| Lint/format     | ESLint 10 flat config + Prettier (`@vue/eslint-config-typescript` + `@vue/eslint-config-prettier`) + `@stylistic/eslint-plugin` (blank-line padding rule)                                                                                                                                                                         |
| Tests           | Vitest 5 + `@vue/test-utils` + jsdom (unit/component); Playwright for e2e, run against the host emulator                                                                                                                                                                                                                          |
| Type-check      | `vue-tsc` inside the production build                                                                                                                                                                                                                                                                                             |

**Removed and not to be re-added**: `@mdi/font` (a whole icon font for a handful of glyphs), `sass` (native CSS nesting covers what we used), `vuetify`, `vite-plugin-vuetify`, `three` / `@types/three`, `vue-round-slider`, `serialport`, `webfontloader`, `roboto-fontface`, `@iconify/vue`, `@cloudthrottle/dcc-ex--commands`, `@cloudthrottle/dcc-ex--serial-communicator`, `@babel/types`, `npm-run-all`, `eslint-config-google`, `playwright` (use `@playwright/test` only). We own the DCC-EX connection layer ourselves instead of the stale cloudthrottle packages.

## Architecture

One-way dependency flow, top to bottom:

```text
src/core/protocol     pure: DCC-EX Native Protocol encode/decode, speed bytes, opcode
                      constants; commands.ts (the command catalog) and responses.ts
                      (reply explanations) are imported only by stores/diagnostics.ts,
                      never through index.ts, so only Diagnostics downloads them
src/core/transport    Transport interface + frame extractor; adapters/ = Web Serial,
                      WebSocket (emulator bridge), MockTransport (offline test double)
src/core/loco         pure loco helpers (function-state reconciliation)
src/core/diagram      pure layout-diagram types and drawing, plus the emulator's sample
src/core/workspace    pure panel layout tree and the role presets
src/core/logging      console warn/error, tagged with dotted event identifiers
src/stores            Pinia stores, the only view-facing state: connection (lifecycle,
                      decode routing, raw traffic log), power, locos, maps, inventory,
                      events, diagram, workspace, settings; saved.ts reads localStorage
src/composables       small Vue helpers (the clock)
src/components        shell/ (top bar, safety strip, connect screen), workspace/ (panel
                      layout), panels/, schematic/, throttle/, settings/
src/views             ConsoleView (connect page, then the panel workspace), SettingsView
src/router · src/styles (design tokens as CSS custom properties; themes via [data-theme])
emulator/             real CommandStation-EX built for the host + WebSocket bridge
e2e/                  Playwright tests
```

Rules:

- `src/core/*` must not depend on Vue or Pinia.
- Stores must not touch the DOM.
- Components must not know protocol details — they call store actions and read store state. Stores hand them plain values (`forward`, `thrown`, `on`), not protocol types. ESLint enforces it: files under `src/components` and `src/views` cannot import `@/core/protocol` or `@/core/transport`.
- Keep logic out of `.vue` files. A component holds what is specific to rendering and the DOM; calculations belong in a store, in `src/core`, or in a plain `.ts` module beside the component (`throttle/fit-keys.ts`, `schematic/changeover.ts`), where a unit test can reach them.
- The Command Station is authoritative. Stores send commands and fold in replies and broadcasts; they do not assume a command's reply is the next message.
- Components only ever read colours, spacing, and type from `var(--*)` tokens in `src/styles/tokens.css`, never hard-coded values, so new themes need no component changes.

## Commands

```bash
pnpm install            # clean install
pnpm run dev            # Vite dev server
pnpm run build          # type-check (vue-tsc) + production build
pnpm run preview        # preview the production build
pnpm run type-check     # vue-tsc only
pnpm run lint           # ESLint (flat config, eslint.config.mjs); lint:fix to auto-fix
pnpm run format:check   # Prettier check on every file it formats; format to write
pnpm run test:unit      # Vitest unit/component tests with coverage (= pnpm test)
pnpm run emulator       # build the host emulator and serve it on ws://127.0.0.1:4444
pnpm run test:emulator  # emulator bridge tests
pnpm run test:e2e       # Playwright e2e (starts its own emulator + app server)
```

- Before the first e2e run, run `pnpm exec playwright install`, or the tests fail with "Executable doesn't exist".
- An e2e run starts its own emulator on port 4455 and app server on 5174 (`e2e/ports.ts`), so it never shares state with an emulator or dev server you already have running on 4444 or 5173.
- The emulator needs the submodule (`git submodule update --init`) and a C++ toolchain with `make`. See `emulator/README.md`.
- Run lint, type-check, and unit tests after every change.
- `test:unit` fails if statement, branch, function or line coverage drops below 90% (`vite.config.ts`). Add meaningful tests to stay above it; do not lower the bar or exclude files to get past it.
- In tests, find elements by `data-testid`. Add one to the component when a test needs it; use a class or tag only when the target is generic (any row, any button).

## Design and product context

- `PRODUCT.md` — users, purpose, principles, voice, and accessibility goals. dcc-ex.com is the source of truth for voice, spelling, and terminology.
- `DESIGN.md` — the visual system: tokens, rules, and component language. Read it before any UI change.
- `.impeccable/` — config for the Impeccable design skill (`.pi/skills/impeccable`). New surfaces are built comp-first; live mode targets `index.html`.

## Git

- `main` is the integration line. Work happens on topic branches that are squash-merged to `main`.
- Commit messages are plain, user-meaningful sentences, with no planning identifiers (principle 9).
- Never commit or push without the maintainer's go-ahead (principle 10).
