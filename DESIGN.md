---
name: WebThrottle
description: The DCC-EX browser throttle, drawn as a modern rail operating-centre workstation.
colors:
  ground: '#151a1f'
  chrome: '#0e1418'
  panel: '#192025'
  raised: '#1f272d'
  raised-hover: '#263038'
  rule: '#2b343b'
  edge: '#3a444b'
  ink: '#eef2f4'
  ink-muted: '#9ba4ab'
  ink-on-accent: '#04181b'
  accent: '#00a3b9'
  stop: '#c1292e'
  stop-hover: '#d3353a'
  stop-ink: '#ffffff'
  attention: '#f7b656'
  describer: '#eeab35'
  describer-ink: '#1a1405'
  occupied: '#e5484d'
  track-idle: '#5f6b73'
  track-set: '#eef2f4'
  track-unset: '#4a545b'
  focus: '#6fdcea'
  selection: 'rgb(0 163 185 / 0.35)'
typography:
  display:
    fontFamily: "'Alan Sans', system-ui, sans-serif"
    fontSize: '3.5rem'
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 'normal'
  headline:
    fontFamily: "'Alan Sans', system-ui, sans-serif"
    fontSize: '1.75rem'
    fontWeight: 600
    lineHeight: 1.1
  title:
    fontFamily: "'Alan Sans', system-ui, sans-serif"
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "'Alan Sans', system-ui, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.35
  label:
    fontFamily: "'Alan Sans', system-ui, sans-serif"
    fontSize: '0.75rem'
    fontWeight: 600
    lineHeight: 1.1
  code:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.35
rounded:
  base: '4px'
spacing:
  '1': '0.25rem'
  '2': '0.5rem'
  '3': '0.75rem'
  '4': '1rem'
  '5': '1.25rem'
  '6': '1.5rem'
  '7': '2rem'
components:
  key:
    backgroundColor: '{colors.raised}'
    textColor: '{colors.ink}'
    rounded: '{rounded.base}'
    padding: '0 1rem'
    height: '2rem'
  key-hover:
    backgroundColor: '{colors.raised-hover}'
    textColor: '{colors.ink}'
  key-accent:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.ink-on-accent}'
    rounded: '{rounded.base}'
    padding: '0 1.5rem'
    height: '2.75rem'
  key-stop:
    backgroundColor: '{colors.stop}'
    textColor: '{colors.stop-ink}'
    rounded: '{rounded.base}'
    padding: '0 1rem'
    height: '2rem'
  fn-key:
    backgroundColor: '{colors.raised}'
    textColor: '{colors.ink}'
    rounded: '{rounded.base}'
    padding: '0 0.25rem'
    height: '2.75rem'
  fn-key-on:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent}'
    rounded: '{rounded.base}'
  field:
    backgroundColor: '{colors.ground}'
    textColor: '{colors.ink}'
    rounded: '{rounded.base}'
    padding: '0 0.75rem'
    height: '2rem'
  role-tab:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-muted}'
    padding: '0 1rem'
---

# Design System: WebThrottle

## Overview

**Creative North Star: "The Rail Operating Centre"**

WebThrottle is drawn as the workstation in a modern rail operating centre: a calm, dark control desk where the signalling display is the centre of attention and every control is exactly where the operator's hand expects it. It is not a dashboard of equal cards, not a phone app with a rotary knob, and not a period skeuomorph of a real throttle. The screen is a single working field — a panel workspace — laid over a safety strip that never moves. The operator sees what the layout is really doing, drives or switches only what their role owns, and can always stop everything.

The mood is quiet, dense, and instrument-grade. Surfaces are near-black and separate by tone rather than by outline or shadow; sections meet on a single hairline rule. Linework is thin and orthogonal — straight runs and 45° diagonals, in the manner of a signalling diagram. Numbers are treated as measurements and hold their width. Colour is rationed hard: one teal for anything live, one red for stop, one amber for a loco's describer tag, and nothing decorative. The result reads like equipment, not a website.

The system exists to beat clunky throttle controls, so precision and directness outrank expression. Personality lives in the details — the schematic that lights a route white the instant the Command Station confirms it, the amber loco tag that rides with it, the speed shown as a large teal readout on a 0–126 scale — never in ornament. It is a DCC-EX product and wears DCC-EX teal, but it should never look like a generic scaffolded web app or stock Material.

**Key Characteristics:**

- Dark operating-centre workstation; light and high-contrast themes switch via `[data-theme]`, tokens only.
- Sections separated by tone and a 1px hairline rule — no cards, no drop shadows at rest.
- Thin orthogonal linework (straight and 45°) for all schematic track.
- One clean variable sans (Alan Sans) with tabular numerals for every value.
- Each state colour means exactly one thing; state is never carried by colour alone.
- Pointer-adaptive controls: compact for a mouse, larger targets for touch.

## Colors

A near-monochrome dark field of blue-greys, lit by a single teal and a small set of one-meaning signal colours borrowed from a signalling display.

### Primary

- **DCC-EX Teal** (`#00a3b9`): the live colour. Everything active, selected, "on", or currently measured is teal — the speed readout, a lit function key, the selected role tab's underline, the connection lamp, the pending-turnout ring, the caret and text selection. It is the only accent, and its rarity is what makes it read as "this is happening now."

### Secondary (state signals)

These are not decoration; each is a fixed signal with one job.

- **Stop Red** (`#c1292e`, hover `#d3353a`): stop and only stop — Stop all, per-loco Stop, the emergency-stopped speed readout. Nothing else is ever this red.
- **Occupied Red** (`#e5484d`): a track section reported occupied on the schematic, with its section ends ticked. Distinct role from Stop Red though close in hue: this is "a train is here", not "stop".
- **Describer Amber** (`#eeab35`, ink `#1a1405`): the loco describer tag that rides in a berth on the diagram — the running number on an amber ground, as on a train-describer display.
- **Attention Amber** (`#f7b656`): a spoken-aside warning in menus ("still moving"), never a persistent surface.

### Neutral

The workstation is built almost entirely from these.

- **Surfaces, room to control:** **Ground** (`#151a1f`, the field behind the work), **Chrome** (`#0e1418`, the recessed bezel of the top bar and safety strip), **Panel** (`#192025`), **Raised** (`#1f272d`, controls) rising to **Raised-hover** (`#263038`).
- **Separators:** **Rule** (`#2b343b`, the hairline between sections) and **Edge** (`#3a444b`, control borders and tick marks).
- **Text:** **Ink** (`#eef2f4`) for content, **Ink-muted** (`#9ba4ab`) for secondary text and idle labels (still AA on every surface above), and **Ink-on-accent** (`#04181b`) for text sitting on teal.
- **Track linework:** **Track-idle** (`#5f6b73`) for plain track, **Track-set** (`#eef2f4`) for a route that is set/lit, **Track-unset** (`#4a545b`) for the leg a turnout is not set to.

### Named Rules

**The One Meaning Rule.** Every state colour means exactly one thing and never takes a second job: teal = live/selected/on, Stop Red = stop, Occupied Red = section occupied, Describer Amber = the loco tag. If a new state needs a colour, it does not borrow an existing one.

**The State-Is-A-Word Rule.** State never rides on colour alone. Power reads `ON`/`OFF` (the all-tracks switch reads `MIXED` when the tracks disagree), a turnout reads `Thrown`/`Closed`, an occupied section is labelled `Occupied`. Colour confirms the word; it never replaces it.

**The One Accent Rule.** There is a single accent (teal). Do not add a second decorative colour to "brighten" a screen — the restraint is the identity, and the signal colours only work because the field around them is quiet.

## Typography

**Display / Body / Label Font:** Alan Sans (variable, weights 300–900), with `system-ui, sans-serif` fallback. Latin and Latin-ext subsets ship as local WOFF2.
**Code Font:** `ui-monospace, SFMono-Regular, Menlo, monospace`.

**Character:** One clean, technical humanist sans does the whole job — no display face, no pairing. Its authority comes from weight and tabular numerals, not from contrast between families. The monospace appears only in raw protocol traffic and the command box, where character alignment matters.

### Hierarchy

- **Display** (500, `3.5rem` / `--text-display`, line-height 1): the speed readout only — one large teal number per loco desk, line-box trimmed to the digits so it reads as an instrument value. On short desks it steps down to `1.75rem` (`--text-2xl`).
- **Headline** (600, `1.75rem` / `--text-2xl`, line-height 1.1): the connect page title.
- **Title** (600, `1.125rem`–`1.375rem` / `--text-lg`–`--text-xl`): the wordmark, loco names, and panel titles.
- **Body** (400, `0.875rem` / `--text-sm`, line-height 1.35): the base document size and all running text; leads are set at `1rem` (`--text-md`) and capped near 34–44ch.
- **Label** (600, `0.75rem` / `--text-xs`): power state, counts, and small captions; power switches set their labels UPPERCASE. Muted ink at rest, brightening to full ink on hover/active.

### Named Rules

**The Measured-Number Rule.** Any value that changes — speed, addresses, counts, clock, unread tally, turnout numbers — carries the `.numeric` class (`font-variant-numeric: tabular-nums`) so digits keep their width and nothing shifts as the number changes.

**The Zoom-Not-Pixels Rule.** Every type step is `rem` scaled by `--text-scale`, so browser zoom enlarges the whole console and the high-contrast theme raises every step at once (`--text-scale: 1.125`). Never set a one-off `px` font size.

## Layout

A single full-height column: top bar, the working field (`main`, the only scroll area), and the safety strip — the first and last are `flex: none` so the field takes the rest. The working field is a **panel workspace**: a recursive flex split-tree (`WorkspaceLayout`) whose leaves are panels, arranged by role presets (Drive, Points, Control, Diagnostics). Panels are separated by a 1px hairline rule, never a gap or a card edge.

Every panel is a **size container** (`container: panel / size`), so each panel's contents pick their own variant from the room the panel has, not from the window. The loco desk is the clearest case: wide it becomes a two-column cab (drive left, functions right); short it packs speed/direction/stop into a grid and drops function rows; at its slimmest it shows only speed, direction and stop with functions one press away. Function-key and list grids reflow with `repeat(auto-fill, minmax(...))`.

Spacing comes from one scale (`--space-1`…`--space-7`, `0.25rem`→`2rem`); components pick steps and never invent values. Control sizing is **pointer-adaptive**, not width-based: a fine pointer (mouse/trackpad) gets compact controls (`--target` 2rem, `--control` 2.75rem) and more layout on screen; a coarse pointer (`@media (pointer: coarse)`) enlarges them to the 44px touch target (`--target` 2.75rem, `--control` 3.5rem). Below `48rem` panels stop being size containers, stack in reading order, and the workspace scrolls rather than squeezing panels under their minimum. The safety strip pads for `env(safe-area-inset-bottom)`.

## Elevation & Depth

Flat by default. Depth is built from **tonal layering**, not shadow: the eye reads recession from Chrome (bezel) up through Ground, Panel, Raised, to Raised-hover, with a 1px `--rule` hairline marking where two sections meet. Nothing is elevated at rest.

### Shadow Vocabulary

- **Popup float** (`box-shadow: 0 var(--space-2) var(--space-5) rgb(0 0 0 / 0.35)`): the only ambient shadow, and only on things that genuinely float above the field — menus, the add-loco form, the event log popover.
- **Chosen ring** (`box-shadow: 0 0 0 1px var(--accent)`): a hairline teal ring on the selected theme card; a border-tint, not a lift.
- **Pressed inset** (`box-shadow: inset 0 var(--space-1) 0 rgb(0 0 0 / 0.2)`): a function key on `:active` reads as pushed in, not raised.

### Named Rules

**The Flat-Field Rule.** Surfaces are flat and separated by tone plus a hairline. A drop shadow appears only on a true popover, and only while it is open. Never add shadow to a panel, card, or button to suggest elevation.

## Shapes

Gently squared, not round: a single `4px` radius (`--radius`) on every control, key, field, popover, and tag — there is no second radius and no fully-rounded pill (the connection lamp's `50%` and the slider needle's `1px` are the only exceptions, and both are functional marks, not surfaces). Borders are a hairline 1px in `--edge` (controls) or `--rule` (section separators); weight never exceeds the `--line` token (2px, 3px in high contrast), which is also the focus-outline and active-tab-underline weight.

Schematic geometry is its own shape language: thin orthogonal linework — horizontal/vertical runs and 45° diagonals — with mitred joins, buffer-stop and section-end ticks drawn across the rail, and turnout numbers set in a ring offset from the switch point. Track strokes scale with the diagram (diagram units); labels, tags and touch rings hold their token size at any panel size, as on a real signalling display.

## Components

### Buttons

The base control is `.key`: a flat, thin-edged key with one height.

- **Shape:** `4px` radius (`--radius`), 1px `--edge` border, `--target` min-height.
- **Flat key (default):** Raised background, Ink text, `0 var(--space-4)` padding; hover lifts to Raised-hover; disabled drops to Ink-muted at 0.6 opacity with `not-allowed` cursor.
- **Accent key (`.key--accent`):** teal background, Ink-on-accent text, borderless, weight 600; hover brightens (`filter: brightness(1.08)`). The primary call to action (Connect by USB).
- **Stop key (`.key--stop`):** Stop Red background, white text, borderless, weight 600; hover to Stop-hover. Also the standalone `STOP ALL` (weight 700, nudges down 1px on `:active`) and per-loco `Stop`.
- **Transitions:** background and box-shadow, `150ms var(--ease-out)`.

### Function keys

- **Style:** a reflowing grid (`auto-fill, minmax(10ch, 1fr)`) of Raised keys with `--edge` borders; labels wrap and hyphenate but never clip — a function is only useful if its label can be read in full.
- **On state (`.fn-key--on`):** a lit key — teal label, teal border, and a teal wash (`color-mix(in oklab, var(--accent) 16%, var(--raised))`), weight 600. `:active` shows the pressed inset shadow.
- **Behaviour:** latching keys toggle; momentary keys (horn, whistle) sound only while held by pointer or Space/Enter and expose `aria-pressed` accordingly.

### Inputs / Fields

- **Style (`.field`):** Ground background (recessed below its surface), 1px `--edge` border, `4px` radius, `--target` min-height; muted placeholder. URL and command inputs switch to the code font.
- **Focus:** the global `:focus-visible` ring — `var(--line)` solid `--focus` with `2px` offset.
- **Error:** paired with a message and `aria-invalid`; the message turns Occupied Red.

### Cards / Containers (panels)

- **Corner style:** square. Panels are not cards — no radius, no shadow, no outline.
- **Background:** Panel (`#192025`); list and section internals use Ground/Raised for recession/lift.
- **Separation:** a single 1px `--rule` hairline between split cells (left/right border, flipping to top on narrow stacks).
- **Internal padding:** `--space-3`/`--space-4`; list panels title + `minmax(0,1fr)` rows, rows filling whole heights (`round(down, 100%, --row)`) so the last row is never sliced.

### Navigation (role tabs & menus)

- **Role tabs:** text-only, Ink-muted, centred in the top bar; the active tab is full Ink with an inset teal underline (`inset 0 calc(-1 * var(--line)) 0 var(--accent)`) and `aria-current="page"`. On narrow screens they take a full-width scrollable row.
- **Menus / popovers:** the shared `.popup` — Raised surface, `--edge` border, `4px` radius, the popup-float shadow, anchored to their trigger with CSS anchor positioning and a fixed-position fallback. Menu items are `--target`-tall rows that highlight to Raised-hover on hover.

### List row (points / outputs / sensors / routes / automations) — signature

One compact grammar shared across the list panels: a small self-drawing SVG state glyph, a tabular number, an ellipsised name, and the state as a word. The turnout row draws its own route — the set leg lit (Track-set), the other dimmed (Track-unset) with a break at the switch — and re-draws with a changeover flash when it moves. A route row draws a way through the points, lit Track-set when EXRAIL marks it active; an automation row draws a train on the move, lit teal while active. Idle, their word is what a press does (`Set`, `Start`); otherwise it is the state (`Active`, `Disabled`, or `Paused` after STOP ALL, with Resume beside the Automations title). An automation needs a loco from one of the operator's desks, picked beside the panel title. Full-width button, `--rule` bottom border, hover to Raised.

### Loco desk — signature

The throttle, built as an operating-desk panel that reshapes to the room it has (see Layout). A tappable title (name + muted address), a large teal speed readout, the speed scale, a `REV | FWD` segmented direction control (active side teal, split by a thin rule), a Stop key, and the function grid. It never uses a rotary knob.

### Speed scale — signature

A native `<input type="range">` restyled to a signalling instrument: a thin bar filled teal from 0 to the current value over Track-idle, with a slim teal **needle** standing proud of the bar (not a round thumb), and tick labels at each sixth of the DCC 0–126 range. Narrow, it keeps every tick but numbers every other one.

### Schematic diagram — signature

The operating-centre display. Thin orthogonal track scaled in diagram units; set routes go Track-set white, occupied sections Occupied Red with ticked ends, turnouts carry a numbered ring and a generous touch/hit circle. A sent-but-unconfirmed turnout shows a circling teal pending ring until the Command Station replies; a confirmed change flashes the new route into place (`changeover`). Loco describer tags ride in berths in Describer Amber. Everything shown is only ever what the Command Station reports.

## Do's and Don'ts

### Do:

- **Do** read every colour, size, and space from tokens (`var(--…)` in `src/styles/tokens.css`); a new theme is one block there and never a component edit.
- **Do** pair every state with a word or shape (`ON`/`OFF`, `Thrown`/`Closed`, `Occupied`), so colour only confirms it — never carries it alone.
- **Do** let each panel choose its variant from its own size with container queries, not from window width.
- **Do** keep Stop all, track power, and connection state reachable at every size and in every preset.
- **Do** give changing values the `.numeric` class (`tabular-nums`) so digits hold their width.
- **Do** separate sections with a 1px `--rule` hairline and tonal steps, not gaps or card edges.
- **Do** size type and controls in `rem` scaled by `--text-scale`, and give touch (`pointer: coarse`) larger targets.

### Don't:

- **Don't** add card outlines, rounded cards, or resting drop shadows; shadow belongs only to an open popover.
- **Don't** give a state colour a second job — teal is live/on, Stop Red is stop, Occupied Red is a busy section, amber is the loco describer.
- **Don't** introduce a second accent or a decorative colour; the quiet field is what makes the signals read.
- **Don't** use a radius other than `4px` or a border/line heavier than the `--line` token.
- **Don't** size or space from one-off `px` values tuned to match a screenshot.
- **Don't** reach for a rotary knob or a skeuomorphic dial; the throttle is a linear scale with a needle.
