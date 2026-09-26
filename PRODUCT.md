# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone running a DCC-EX layout, from beginners to experts. DCC-EX names these audience levels **Conductor** (just wants to run trains), **Tinkerer**, and **Engineer**. The product must welcome all three.

There are three usage scenes. All are targets; only the first is possible today:

1. **Solo at the layout (today).** One person at a laptop or desktop, plugged into the Command Station over USB, running trains and throwing turnouts/points beside the layout.
2. **Walking the layout (planned).** Operators carry a Smart Phone and walk around the layout driving trains and working the track. This needs the planned DCC-EX Hub to relay commands over the network.
3. **Club and operating sessions (planned).** Several operators each own a different part of the job. One person may only drive a single loco. Another may sit at a large desktop with a full overview of the track layout, turnouts/points, and sensors, acting as the controller/dispatcher.

## Product Purpose

EX-WebThrottle is the DCC-EX browser throttle. It lets people with no other throttle hardware, just a laptop or a Smart Phone, run a DCC-EX layout. It scales from a single-loco cab up to a full control-station interface.

It replaces the legacy WebThrottle-EX. The legacy app defines the expected behaviour, but its design and code are not the model to copy.

Success means:

- a beginner connects and drives a train without reading a manual
- an expert can run a whole layout from one screen
- the controls feel solid and direct, never clunky
- stop, power, and connection state are never out of reach

## Positioning

It is the official DCC-EX project's own throttle. It speaks the DCC-EX Native Protocol directly to the Command Station, so there is nothing to install beyond a browser: no app, no account, and no extra hardware.

It is not meant to replace other throttles. It runs alongside hardware throttles, Engine Driver, JMRI, and WiThrottle apps, and each user picks what they prefer. What sets it apart is that one browser client covers everything from a phone cab for a single loco to a desktop control station for the whole layout.

## Operating Context

- **Connection today:** USB Web Serial only, which means Chromium-based desktop browsers (Chrome, Edge). Safari, iOS, and Firefox cannot use Web Serial. For testing and demos there is a host emulator that runs the real CommandStation-EX firmware.
- **Connection planned:** a self-hosted DCC-EX Hub will relay commands to the Command Station over the network, so phones and multiple browser sessions can connect. The browser needs the Hub because a secure (HTTPS) page cannot reliably open insecure local WebSocket connections. The Hub stays optional: running trains over USB must never require it.
- **The Command Station is the live truth.** On every connection the app asks the Command Station what it has: power and tracks, turnouts, outputs, sensors, and routes when present. Broadcasts arrive at any time. Other throttles and apps on the same Command Station can change state at any moment, and the interface must show those changes.
- **Physical scene:** a model railway room. Beside the layout today; walking around it with a phone, or at a shared desktop during a session, once the Hub exists.

## Capabilities and Constraints

**Working now:**

- Connect over Web Serial or the emulator
- Master power plus power for each track output
- Saved locos, stored per browser: acquire and release, speed, direction, stop, emergency stop, and functions F0–F31
- Function maps: labels, latching or momentary, visibility
- Turnouts/points: throw and close
- Outputs: switch on and off
- Sensors: live state, read-only
- Raw diagnostics console: sent/received traffic and a command box
- Panel workspace with arrangement presets, a light theme and a dark theme, and a Settings page

**Planned:**

- Routes and automations (need EXRAIL on the Command Station)
- Keyboard and screen-reader parity
- Installable web app (PWA)
- Hub network connection
- Multiple operators
- A visual track-layout overview

**Retired on purpose:** the CV programmer and the WiFi setup screen. **Out of scope:** turntables.

**Technical constraints:**

- Static hosting on GitHub Pages with hash routing
- Very few runtime dependencies
- Browser Web Serial only (no Node serial libraries)
- GPL-3.0 licence
- The Command Station stays authoritative; the app sends commands and trusts the replies

**Terminology:** use DCC-EX terms as dcc-ex.com uses them, for example Command Station, loco, Throttle, turnouts/points, EXRAIL.

**Open decisions (not yet made):**

- How multiple operators work: roles, loco and area assignment, and what each person sees
- Where the track-layout overview's data comes from and how people draw it (planning points to the Hub owning the visual layout)
- Whether phones are a supported target before the Hub exists
- A formal accessibility conformance level

## Brand Commitments

- **Name (final):** EX-WebThrottle is the full product name, and **WebThrottle** is the short brand shown in the app. EX-WebThrottle2 is only the repository name.
- **Family:** it is a DCC-EX product. The DCC-EX branding on dcc-ex.com and its sister sites (colours, imagery) is the binding reference. Check it before any visual work.
- **Voice:** dcc-ex.com is the source of truth for voice, spelling, and terminology, starting with the DCC-EX writing style guide (https://dcc-ex.com/about/contributing/website/style-guide.html). It applies to in-app copy as well as docs. When this summary and the site disagree, the site wins. In practice:
  - British spelling ("colour"), second person ("you", "your"), short sentences, no fluff, a little humour now and then
  - no abbreviations a Conductor would not recognise: write "Command Station", not "CS"
  - prefer "loco" or "train" to "locomotive" or "engine"
  - use "Throttle"
  - give US and UK railway terms together, US first: turnouts/points, consists/multiple units
  - use "Smart Phone"
  - lead with the plain explanation; technical detail comes after it and is never required reading
- **Personality:** a model-railway hobby project. It should not look or read like a generic scaffolded web app or stock Material.
- **Assets:**
  - `src/assets/WebThrottle.png`: the wordmark, 778×200, also the home button
  - `src/assets/favicon.ico`
  - Other images in `src/assets/` are unreferenced leftovers from the legacy app and are not binding

## Evidence on Hand

- **No user research, testimonials, usage data, or case studies exist.** Do not invent any.
- **Peers:** the DCC-EX throttle software list (https://dcc-ex.com/throttles/software/index.html) and Engine Driver (https://enginedriver.mstevetodd.com/). The owner's view is that many of these throttles have clunky controls and buttons. That is the bar to beat, not a pattern to copy.
- **Legacy behaviour:** WebThrottle-EX (a sibling checkout, `../WebThrottle-EX`) and its feature-parity audit.
- **Realistic demos:** the host emulator (`pnpm run emulator`) runs genuine CommandStation-EX firmware.

## Product Principles

1. **One throttle, any role.** The same product serves one person driving one loco on a phone and a controller running the whole layout on a desktop. The operator's job decides what they see; there is not a separate app for each role.
2. **The Command Station is the truth.** Show what the layout is actually doing, including changes made by other throttles. Never display a guess as fact.
3. **Safety is always within reach.** Stop, emergency stop, track power, and connection state stay visible and reachable on every screen and every device size.
4. **Controls that feel solid.** Every control should feel precise, immediate, and trustworthy. Clunky controls are the failing this product exists to fix.
5. **Welcoming first, deep underneath.** A Conductor never has to meet protocol detail. Tinkerers and Engineers can still reach the raw console and the full settings.

## Accessibility & Inclusion

- The audience is broad, including people with poor eyesight. High-contrast and low-vision themes (larger text, larger controls) are an explicit goal.
- Theming is built on design tokens, so a new theme never needs component changes.
- Controls need touch targets large enough for a Smart Phone used while walking the layout.
- State such as power, connection, and turnout position must never rely on colour alone.
- Keyboard and screen-reader parity is planned.
- No formal conformance level (for example WCAG 2.2 AA) has been set yet; this is an open decision.
