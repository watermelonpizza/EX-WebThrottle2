/*
 * Host board configuration for the CommandStation-EX emulator.
 *
 * Activates the firmware's own no-hardware switches (see defines.h): no motor
 * shield, no EEPROM persistence, no programming track, no IO HAL driver
 * expansion. `layout.txt` recreates all state in RAM on every boot.
 */
#pragma once

#define BOARD_NAME "HOST"

#define ENABLE_WIFI false
#define ENABLE_ETHERNET false

// One emulated MAIN track driver so throttle commands have a live track to
// act on. NO_SHIELD (no MotorDriver lines) turns the firmware into an
// accessory-only CS with null tracks - power can never come on. Pins are fake:
// nothing drives them on the host (v1 has no 58us waveform tick).
#define MOTOR_SHIELD_TYPE F("HOST_SHIELD"), \
  new MotorDriver(2, 3, UNUSED_PIN, UNUSED_PIN, A0, 1.0, 1500, UNUSED_PIN), \
  new MotorDriver(4, 5, UNUSED_PIN, UNUSED_PIN, A1, 1.0, 1500, UNUSED_PIN)

#define DISABLE_EEPROM
#define DISABLE_PROG
#define IO_NO_HAL