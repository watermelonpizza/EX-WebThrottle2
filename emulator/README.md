# CommandStation-EX Host Emulator

A native build of the **real DCC-EX CommandStation firmware**, compiled as a
normal desktop program instead of running on Arduino hardware. It speaks the
same DCC-EX wire protocol over stdin/stdout, so you can develop EX-WebThrottle
(and debug layouts) without a physical command station.

The point is fidelity: this is not a re-implementation of the protocol in
JavaScript or Python. It is the actual `CommandStation-EX` sources (pinned git
submodule) running against a small host shim that replaces Arduino hardware
APIs. It is configured the way a physical command station is: startup
commands in `mySetup.h` and an EXRAIL script in `myAutomation.h`, compiled in.

## How it works

```
emulator/Arduino.h          host shim: Print/Stream/HardwareSerial, time, pins
emulator/wiring_private.h   empty stand-in for the Arduino header the firmware includes
emulator/config.h           host board config (emulated motor shield, no EEPROM/wifi)
emulator/host.cpp           stdin/stdout serial, DCC timer thread, pin levels
emulator/main.cpp           setup/loop mirror of CommandStation-EX.ino
emulator/bridge.mjs         Node WebSocket bridge (pnpm run emulator)
emulator/Makefile           cross-platform host build
emulator/mySetup.h          startup commands: turnouts, outputs, sensors
emulator/myAutomation.h     EXRAIL script: a roster, routes and an automation
emulator/CommandStation-EX/ git submodule: the real firmware (do not edit)
```

Protocol replies (`<...>`) and diagnostics (`<* ...>`) both go to stdout.
Feeding it DCC-EX commands on stdin makes it behave like a command station on a
serial terminal.

## What works

- Boot banner + system/status responses (`<s>`, `<iDCC-EX ...>`)
- Track power on/off (`<1>`, `<0>`) with power broadcasts
- Throttle: speed, direction, emergency stop (`<t ...>`, `<!>`), function keys
  `<F>` with `<l>` state broadcasts
- Native-command turnout/output/sensor setup (see `mySetup.h`)
- Sensors that fire: a pin idles high, as a sensor input's pull-up holds it,
  and `<z -22>` pulls pin 22 low the way a detector would (`<z 22>` lets it
  go). The firmware's own sensor polling then reports `<Q 20>` / `<q 20>`
- Startup commands from `mySetup.h` run through the real parser at boot
- The DCC waveform: a thread stands in for the board's 58 uS timer
  interrupt, so queued DCC packets go out to the (imaginary) track, their
  queue slots are reused, and speed reminders and momentum move on. The OS
  can stretch each tick a little, so the waveform runs slightly slow
- EXRAIL, from `myAutomation.h`: `<JA>` lists five routes and one
  automation, `</ START 101>` runs a route (it sets the points), and
  `</ START 3 201>` sends loco 3 off until sensor 20 fires, showing the
  automation as active (`<jB 201 1>`) while it runs. `<JR>` lists a
  two-loco roster (`<jR 10 11>`), and `<JR 10>` names loco 10 and its
  functions

Deliberately not implemented yet:

- EXRAIL text commands (`PRINT`, `BROADCAST`, `LCD`, …): they crash the
  emulator, see `myAutomation.h`. Signals and block events are left out of
  the script until the throttle needs them

## Build

Requires a C++17 compiler and `make` (plus `sed`, used by two one-line
source patches during build). No Arduino toolchain needed.

```bash
make
```

Produces `build/emulator`.

### Windows

Works via one of these (both provide `make`/`sed`/a C++17 compiler):

- **WSL2** (Ubuntu): `sudo apt install g++ make`
- **MSYS2 / MinGW-w64**: `pacman -S mingw-w64-ucrt-x86_64-gcc make sed`

macOS, Linux, and MinGW are all supported — the Makefile picks the right linker
flags per platform. On Linux/g++ you can build natively, or set `CXX=g++` /
`CXX=clang++` as you prefer. The binary needs no Arduino serial — it is pure
stdio.

## Run

```bash
./build/emulator         # waits for commands on stdin
```

Then type DCC-EX commands, e.g.:

```
<1>                 track power ON  (answers <p1 ...>, <@ 0 2 "PWR On">)
<t 3 52 1>          loco 3, speed 52, forward  (broadcasts <l 3 0 181 0>)
<F 3 0 1>           loco 3 function 0 (headlight) ON
<s>                 status / system info
<z -22>             pull pin 22 low: sensor 20 reports <Q 20> (occupied)
<z 22>              release pin 22: sensor 20 reports <q 20> (clear)
<JA>                list EXRAIL routes and automations (<jA 101 102 ...>)
<JR 10>             roster loco 10: <jR 10 "Pannier" "Lights/Bell/*Whistle//Coal shovel">
</ START 102>       run route 102, Passing loop: throws turnouts 1 and 2
<0>                 track power OFF
```

(The `<l>` speed field packs direction into bit 7 and adds the DCC offset, so
52 forward reads as 181; a stop broadcasts `<l 3 0 128 0>`.)

Ctrl-D ends the session. There is no timeout on EOF — the emulator keeps
looping, so quit it explicitly (Ctrl-D / Ctrl-C). To drive it programmatically,
pipe commands in (adding a delay and a trailing newline so input isn't
swallowed).

## Browser connection (WebSocket bridge)

```bash
pnpm run emulator       # builds, then serves ws://127.0.0.1:4444
```

The bridge spawns the emulator, forwards everything on its stdout to every
connected WebSocket client, and pipes client bytes back to its stdin — so a
browser talks to the real CS-EX parser exactly like a serial terminal would.
Protocol replies and `<* ...>` diagnostics both flow (the real CS mixes them on
USB too); anything on the emulator's stderr goes to the bridge's console, not
the wire. Override the port with `WSPORT`:

```bash
WSPORT=4445 pnpm run emulator
```

Try it from any WebSocket client; connect, then send a command and read the
reply, e.g. `<s>` answers with the `<iDCC-EX ...>` banner plus power state.

## Layout (mySetup.h and myAutomation.h)

Both files are the firmware's own, used exactly as on a physical command
station:

- `mySetup.h` holds startup commands, one `SETUP("<...>");` per line (see
  [Startup Configuration](https://dcc-ex.com/ex-commandstation/advanced-setup/startup-config.html)).
  They run through the real parser at boot. Their replies are not sent to any
  client, as a real command station does not echo its own setup either.
- `myAutomation.h` is the EXRAIL script. Having the file is what turns EXRAIL
  on.

Both are compiled in. After an edit, run `make` (or restart
`pnpm run emulator`, which runs it): it rebuilds whatever the change touches,
because the compiler records every header each file reads in `build/*.d`.

## Config (config.h)

Host-level switches the firmware itself honours (`defines.h` provides the
no-hardware hooks). The default config:

- one emulated MAIN track driver (power can come on; NO_SHIELD would give an
  accessory-only command station whose track can never power up)
- no WiFi / Ethernet / EEPROM / programming track / IO HAL expansion

## Files are the building blocks

For people extending this — the host files under `emulator/` (`Arduino.h`,
`wiring_private.h`, `config.h`, `host.cpp`, `main.cpp`), the bridge,
`mySetup.h` and `myAutomation.h` are the entire footprint; the large
`CommandStation-EX/` tree in the build is upstream firmware fetched as a git
submodule. Keep it that way:
patch from the shim side via the Makefile, never edit inside the submodule.
