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
- STOP ALL on every screen; it also pauses every EXRAIL task until this Throttle resumes them
- Track power: one switch for every track at once, plus one for each track output the Command Station reports
- Saved locos, stored per browser: acquire and release, speed, direction, stop, emergency stop, and functions F0–F31
- Function maps: labels, latching or momentary, visibility
- The Command Station's own roster (EXRAIL ROSTER lines): its locos to drive, with their names and function names, and its default function names (`ROSTER(0, …)`) for any other loco. A loco saved in this browser keeps the name and map you gave it
- Saved locos can note their type, brand and decoder, for your own reference
- Backup: export saved locos and function maps to a file, import them again (merging with what is here), import the AppData.json from WebThrottle-EX, and delete everything saved in this browser
- Turnouts/points: throw and close
- Outputs: switch on and off
- Sensors: live state, read-only
- Routes and automations from EXRAIL: set a route, start an automation with a loco on one of your desks, and see the state EXRAIL gives each one
- Event log: what changed on the layout, including changes made by other Throttles, with a count of new changes
- Layout diagram: a sample diagram for the emulator's demo layout; any other Command Station gets a list of its turnouts/points and sensors instead
- Diagnostics: sent/received traffic with a plain explanation of each line, a searchable list of every native command, and a command box
- Panel workspace with role presets (Drive, Points, Control, Diagnostics), each with its own link; Points and Control show the routes and automations under the diagram
- Dark, light and high-contrast themes, and a Settings page
- Keyboard and screen-reader access, aiming at WCAG 2.2 AA in every theme
- Installs as an app (PWA) from Chrome or Edge, and opens without the internet once it has been loaded

**Planned:**

- Hub network connection
- Multiple operators
- A track-layout diagram for your own layout
- Arranging the panels yourself

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
  - The in-app wordmark is set in text ("WebThrottle" with a "DCC-EX" tag), not an image; it is also the home button
  - `public/favicon.ico`, `icon.svg` and the app icons: the DCC-EX diamond as dcc-ex.com's own favicon draws it (teal outline). `favicon.ico` is that favicon; the rest are drawn from the official logo SVG in the DCC-EX website repository (`image-artefacts/logos/DCC-EX_logo.svg`). The DCC-EX logo licence asks for the logo's own forms and colours, so do not restyle it
  - `src/assets/WebThrottle.png` (a 778×200 wordmark image), `cover.jpg` and `full-logo.png` are not used by the app and are not binding

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
- Everything you can do with a pointer, you can do from the keyboard, and every control has a name and state a screen reader can say.
- The target is **WCAG 2.2 AA**, in every theme. The high-contrast theme is AA too; it only adds contrast and size on top.
