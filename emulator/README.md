# CommandStation-EX Host Emulator

A native build of the **real DCC-EX CommandStation firmware**, compiled as a
normal desktop program instead of running on Arduino hardware. It speaks the
same DCC-EX wire protocol over stdin/stdout, so you can develop EX-WebThrottle2
(and debug layouts) without a physical command station.

The point is fidelity: this is not a re-implementation of the protocol in
JavaScript or Python. It is the actual `CommandStation-EX` sources (pinned git
submodule) running against a small host shim that replaces Arduino hardware
APIs. A `layout.txt` file lets you configure the emulated layout with the same
DCC-EX commands a physical command station runs on boot.

## How it works

```
emulator/Arduino.h          host shim: Print/Stream/HardwareSerial, time, pins
emulator/config.h           host board config (emulated motor shield, no EEPROM/wifi)
emulator/host.cpp           stdin/stdout serial, DCCTimer/ADCee stubs, pin no-ops
emulator/main.cpp           setup/loop mirror of CommandStation-EX.ino
emulator/Makefile           cross-platform host build
emulator/layout.txt         boot command script (edit without rebuilding)
emulator/CommandStation-EX/ git submodule: the real firmware (do not edit)
```

Protocol replies (`<...>`) and diagnostics (`<* ...>`) both go to stdout.
Feeding it DCC-EX commands on stdin makes it behave like a command station on a
serial terminal.

## What works (v1)

- Boot banner + system/status responses (`<s>`, `<iDCC-EX ...>`)
- Track power on/off (`<1>`, `<0>`) with power broadcasts
- Throttle: speed, direction, e-stop (`<t ...>`, `<e>`), function keys `<F>`
  with `<l>` state broadcasts
- Native-command turnout/output/sensor setup (see `layout.txt`)
- Commands from `layout.txt` replayed through the real parser at boot

Deliberately not implemented yet:

- The 58 uS DCC waveform tick, so momentum/dcc-accel effects do not advance;
  immediate replies and broadcasts are unaffected
- EX-RAIL layout scripting (automations, routes, signals, roster-backed names)

## Build

Requires a C++17 compiler and `make` (plus `sed`, used by a small one-line
source patch during build). No Arduino toolchain needed.

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
./build/emulator         # reads layout.txt, waits for commands on stdin
./build/emulator mylayout.txt
```

Then type DCC-EX commands, e.g.:

```
<1>                 track power ON  (answers <p1 ...>, <@ 0 2 "PWR On">)
<t 3 52 1>          loco 3, speed 52, forward  (broadcasts <l 3 0 181 0>)
<F 3 0 1>           loco 3 function 0 (headlight) ON
<s>                 status / system info
<0>                 track power OFF
```

(The `<l>` speed field packs direction into bit 7 and adds the DCC offset, so
52 forward reads as 181; a stop broadcasts `<l 3 0 128 0>`.)

Ctrl-D ends the session. There is no timeout on EOF — the emulator keeps
looping, so quit it explicitly (Ctrl-D / Ctrl-C). To drive it programmatically,
pipe commands in (adding a delay and a trailing newline so input isn't
swallowed).

## Layout (layout.txt)

One DCC-EX command per line. The file is read from disk at boot and every line
is replayed through the real parser, exactly like a physical command station's
setup commands. Replies to setup commands are not echoed to any client — the
real command station does not echo its own setup either. Changes need no
rebuild; restart the emulator to apply them.

`layout.local.txt` is your personal overlay: it is gitignored, run after the
default layout on every boot, and is the intended place for your own test
turnouts, outputs, and sensors — so your local setup never shows up in a
commit.

## Config (config.h)

Host-level switches the firmware itself honours (`defines.h` provides the
no-hardware hooks). The default config:

- one emulated MAIN track driver (power can come on; NO_SHIELD would give an
  accessory-only command station whose track can never power up)
- no WiFi / Ethernet / EEPROM / programming track / IO HAL expansion

## Files are the building blocks

For people extending this — the four host files under `emulator/` plus
`layout.txt` are the entire footprint; the large `CommandStation-EX/` tree in
the build is upstream firmware fetched as a git submodule. Keep it that way:
patch from the shim side via the Makefile, never edit inside the submodule.