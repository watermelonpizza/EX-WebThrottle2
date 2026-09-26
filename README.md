# EX-WebThrottle

[![GitHub issues](https://img.shields.io/github/issues/dcc-ex/EX-WebThrottle2)](https://github.com/dcc-ex/EX-WebThrottle2/issues)
[![Discord](https://img.shields.io/discord/713189617066836079)](https://discord.gg/y2sB4Fp)

EX-WebThrottle is the [DCC-EX](https://dcc-ex.com) Throttle that runs in your web browser. Plug your Command Station into your computer with a USB cable, open the page, and drive your trains. There is nothing to install.

It is the next generation of the original [WebThrottle-EX](https://dcc-ex.com/WebThrottle-EX), rebuilt from the ground up.

> **Status: early development.** There is no release yet. The features below work, but expect rough edges and changes.

## What you can do

- Drive your locos: speed, direction, stop, emergency stop, and functions F0–F31
- Save your locos, name their functions, and set each one as latching or momentary
- Throw and close turnouts/points
- Switch outputs on and off
- Watch sensors change live
- Turn power on and off for every track at once, or one track at a time
- Arrange the console to suit you, in a light or dark theme
- Watch the commands going to and from your Command Station, and send your own

Coming later: routes and automations (EXRAIL), a network connection so you can drive from a Smart Phone, and installing EX-WebThrottle as an app.

## What you need

- A DCC-EX Command Station connected to your computer by USB
- A browser with Web Serial support: Google Chrome or Microsoft Edge on a desktop or laptop. Safari and Firefox do not support Web Serial.

EX-WebThrottle is designed to sit alongside your other Throttles. When another Throttle changes something on the Command Station, EX-WebThrottle shows the change.

## For developers

This section is for Tinkerers and Engineers who want to build or change EX-WebThrottle. You do not need a Command Station: the emulator runs the real DCC-EX firmware on your computer.

### Requirements

- Node.js 26. `.nvmrc` and `engines` pin this; run `nvm use` if you have nvm.
- npm. The lockfile is committed, and CI uses `npm ci`.
- For the emulator: a C++17 compiler, `make`, and `sed`. See [emulator/README.md](emulator/README.md), including Windows notes.

### Get started

```bash
git clone --recurse-submodules https://github.com/DCC-EX/EX-WebThrottle2.git
cd EX-WebThrottle2
npm install
npm run emulator   # terminal 1: emulated Command Station on ws://127.0.0.1:4444
npm run dev        # terminal 2: open the address it prints
```

Then select **Connect to emulator**. If you cloned without `--recurse-submodules`, run `git submodule update --init` first.

### Commands

```bash
npm run dev            # Vite dev server
npm run build          # type-check (vue-tsc) + production build
npm run preview        # preview the production build
npm run type-check     # type-check only
npm run lint           # ESLint; lint:fix to fix what it can
npm run format:check   # Prettier check; format to rewrite
npm run test:unit      # Vitest unit and component tests, with coverage
npm run emulator       # build the emulator and serve it on ws://127.0.0.1:4444
npm run test:emulator  # emulator bridge tests
npm run test:e2e       # Playwright tests (starts the emulator and dev server itself)
```

Before your first `test:e2e` run, run `npx playwright install` to download the browsers.

### How it is built

Vue 3.5, Vite 8, Pinia 4, vue-router 5 (hash history), and TypeScript 5.9. The interface is our own small component layer over plain HTML and CSS, with no UI framework. ESLint 10 (flat config) and Prettier handle linting and formatting. Tests use Vitest 5 with @vue/test-utils, and Playwright.

Code flows one way:

```text
src/core/protocol → src/core/transport → src/stores → src/components, src/views
```

- `src/core/protocol` reads and writes the DCC-EX Native Protocol. It is plain TypeScript with no Vue.
- `src/core/transport` moves the bytes: Web Serial, a WebSocket for the emulator, and a mock for tests.
- `src/stores` holds the connection and all the state the screens show.
- `src/components` and `src/views` are the console you see.

The Command Station is always the source of truth. EX-WebThrottle asks it what it has every time it connects, then listens for its broadcasts.

[AGENTS.md](AGENTS.md) has the engineering principles and conventions. [PRODUCT.md](PRODUCT.md) describes who EX-WebThrottle is for and how it should behave.

## Contributing

We need help of any kind, and no experience is required. See the [contributing page](https://dcc-ex.com/about/contributing/webthrottle.html) and join our [Discord server](https://discord.gg/y2sB4Fp).

## Licence

GPL-3.0. See [LICENSE](LICENSE).
