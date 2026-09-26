---
version: 1
slug: "src-views-consoleview-vue"
primary_target: "src/views/ConsoleView.vue"
related_targets: ["src/App.vue"]
---

# Surface brief: the connected console

Scope: the whole connected frontend (console shell, role presets, panels), replacing the current views, components and styles. Stores and `src/core` stay. Mode: **Operate**.

Audience and job: see PRODUCT.md. Operators run trains, switch turnouts/points and watch sensors; the job decides the view (one loco on a phone, points only in a club session, a controller running the whole layout on a desktop).

Constraints: the Command Station is the truth (enumerate on connect, fold broadcasts, show changes by other Throttles); Stop all and track power reachable in every preset and size; must work with **no layout geometry** (turnouts and sensors as self-drawing tiles); must handle **15–20+ functions** per loco; dcc-ex.com voice; high-contrast/low-vision themes via tokens; state never by colour alone.

Approved comp: `.impeccable/mocks/option-1.png` (comp round option 1, approved with steer).

Owner steer on the approved comp: less fixed, more panel-driven. Pre-defined presets per role/job (Drive, Points, Control, Diagnostics; more later), customisable. Each panel type (layout schematic, points list, sensor list, throttle) declares a minimum size and size variants: a roomy throttle expands its functions, a slim one collapses them; 1 loco vs 2–3 on screen slims each desk down; this is how screen sizes are served.

Memorable moment: the schematic lights the route white the instant the Command Station confirms a turnout, and the loco's amber tag moves with it; Stop all is always in the same place.

Unresolved: where diagram geometry comes from (no source exists yet; tile mode is the default); how deep customisation goes in v1 (presets + panel show/hide/size vs free drag-to-dock).

## Direction contract

THESIS: The modern signal box as a panel workspace: a calm operating-centre schematic, loco desks and route tiles that re-form by role, over a safety strip that never moves. It refuses the equal-card dashboard, the rotary-knob throttle app, and every period skeuomorph.

OWN-WORLD: Dark operating-centre workstation. Ground #151a1f, panels #192025, idle track #5f6b73, set route #eef2f4, occupied #e5484d, describer amber #eeab35, selection DCC-EX teal #00a3b9, stop #c1292e. Thin orthogonal linework (straight and 45°), one clean sans with tabular numerals, sections by tone and space with no card outlines; each state colour means one thing only.

STORY: The operator sees what the layout is really doing, drives or switches what their role owns, and can always stop everything.

FIRST VIEWPORT: Control preset at 1536×1024. Thin top bar: wordmark and DCC-EX tag left, role tabs centre (Control underlined teal), connection and time right. Schematic panel 60% left: numbered turnouts, set routes white, occupied section red, amber loco tags, no-diagram caption bottom-left. Loco desk 40% right: name line, speed 42 in large teal numerals on a 0–126 scale, REV|FWD, red Stop, 20-function grid. Bottom safety strip: STOP ALL, MAIN A ON, MAIN B ON, event line.

FORM: Operating centre (modern Rail Operating Centre workstation), rank 1 of the grounded list in re-roll round 1, taken as the pick; seed key 406909fb.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
