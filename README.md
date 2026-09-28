# EX-WebThrottle

[![GitHub issues](https://img.shields.io/github/issues/dcc-ex/EX-WebThrottle2)](https://github.com/dcc-ex/EX-WebThrottle2/issues)
[![Discord](https://img.shields.io/discord/713189617066836079)](https://discord.gg/y2sB4Fp)

EX-WebThrottle is the [DCC-EX](https://dcc-ex.com) Throttle that runs in your web browser. Plug your Command Station into your computer with a USB cable, open the page, and drive your trains. There is nothing to install.

It is the next generation of the original [WebThrottle-EX](https://dcc-ex.com/WebThrottle-EX), rebuilt from the ground up.

> **Status: early development.** There is no release yet. The features below work, but expect rough edges and changes.

## What you can do

- Drive your locos: speed, direction, stop, emergency stop, and functions F0–F31
- Stop every loco at once with **STOP ALL**, which is on every screen. It pauses your Command Station's EXRAIL automations too, until you resume them
- Save your locos, name their functions, and set each one as latching or momentary
- Throw and close turnouts/points
- Switch outputs on and off
- Watch sensors change live
- Set routes and start automations from your Command Station's EXRAIL script; an automation drives a loco you are driving
- Turn power on and off for every track at once, or one track at a time
- See what just changed on the layout, including changes made by other Throttles
- Pick the console for your job: Drive, Points, Control or Diagnostics. Each one has its own link, so you can hand an operator the page they need
- Choose a dark, light or high-contrast theme
- Watch the commands going to and from your Command Station, with a plain explanation of each, look up any DCC-EX command, and send your own
- Use it from the keyboard: Tab moves between controls, and the arrow keys move within the function keys and the long lists in Diagnostics
- Install it as an app from Chrome or Edge. Once it has been opened, it opens again without the internet

Coming later: a diagram of your own layout (only the emulator has a sample diagram today), arranging the panels yourself, and a network connection so you can drive from a Smart Phone.

## What you need

- A DCC-EX Command Station connected to your computer by USB
- A browser with Web Serial support: Google Chrome or Microsoft Edge on a desktop or laptop. Safari and Firefox do not support Web Serial.

EX-WebThrottle is designed to sit alongside your other Throttles. When another Throttle changes something on the Command Station, EX-WebThrottle shows the change.

## For developers

This section is for Tinkerers and Engineers who want to build or change EX-WebThrottle. You do not need a Command Station: the emulator runs the real DCC-EX firmware on your computer.

### Requirements

- Node.js 26. `.nvmrc` and `engines` pin this; run `nvm use` if you have nvm.
- pnpm. The lockfile (`pnpm-lock.yaml`) is committed.
- For the emulator: a C++17 compiler, `make`, and `sed`. See [emulator/README.md](emulator/README.md), including Windows notes.

### Get started

```bash
git clone --recurse-submodules https://github.com/DCC-EX/EX-WebThrottle2.git
cd EX-WebThrottle2
pnpm install
pnpm run emulator   # terminal 1: emulated Command Station on ws://127.0.0.1:4444
pnpm run dev        # terminal 2: open the address it prints
```

Then open **Other ways to connect** and select **Connect**; the emulator's address is already filled in. If you cloned without `--recurse-submodules`, run `git submodule update --init` first.

### Commands

```bash
pnpm run dev            # Vite dev server
pnpm run build          # type-check (vue-tsc) + production build
pnpm run preview        # preview the production build
pnpm run type-check     # type-check only
pnpm run lint           # ESLint; lint:fix to fix what it can
pnpm run test:unit      # Vitest unit and component tests; fails below 90% coverage
pnpm run emulator       # build the emulator and serve it on ws://127.0.0.1:4444
pnpm run test:emulator  # emulator bridge tests
pnpm run test:e2e       # Playwright tests (starts its own emulator on port 4455 and app on 5174)
```

Before your first `test:e2e` run, run `pnpm exec playwright install` to download the browsers.

### How it is built

Vue 3.5, Vite 8, Pinia 4, vue-router 5 (hash history), and TypeScript 5.9. The interface is our own small component layer over plain HTML and CSS, with no UI framework. ESLint 10 (flat config) with ESLint Stylistic handles both linting and formatting. Tests use Vitest 5 with @vue/test-utils, and Playwright.

Code flows one way:

```text
src/core/protocol → src/core/transport → src/stores → src/components, src/views
```

- `src/core/protocol` reads and writes the DCC-EX Native Protocol. It is plain TypeScript with no Vue.
- `src/core/transport` moves the bytes: Web Serial, a WebSocket for the emulator, and a mock for tests.
- `src/core/loco`, `src/core/diagram` and `src/core/workspace` are small plain helpers: function states, the layout diagram, and how panels are laid out.
- `src/stores` holds the connection and all the state the screens show.
- `src/components` and `src/views` are the console you see.
- `src/service-worker.js` keeps a copy of the built app so it opens offline. The build writes its file list in.

The Command Station is always the source of truth. EX-WebThrottle asks it what it has every time it connects, then listens for its broadcasts.

[AGENTS.md](AGENTS.md) has the engineering principles and conventions. [PRODUCT.md](PRODUCT.md) describes who EX-WebThrottle is for and how it should behave.

## Contributing

We need help of any kind, and no experience is required. See the [contributing page](https://dcc-ex.com/about/contributing/webthrottle.html) and join our [Discord server](https://discord.gg/y2sB4Fp).

## Licence

GPL-3.0. See [LICENSE](LICENSE).
