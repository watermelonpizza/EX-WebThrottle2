/*
 * Host implementations of the Arduino runtime pieces CommandStation-EX needs
 * that the excluded per-arch DCCTimer*.cpp files would normally provide.
 *
 * ponytail: DCCTimer::begin no-ops on a single-threaded host, so nothing
 * ticks the DCC waveform and `isReminderWindowOpen()` stays false: momentum
 * stepping and DCC packet pacing never advance. Add a DCCTimerSim (pthread at
 * 58uS) in v2 if speed-ramping fidelity is needed - immediate <t>/<l> replies
 * and broadcasts are unaffected.
 */
#include "Arduino.h"
#include "DCCTimer.h"

// Shared monotonic clock, scaled per caller. millis()/micros() both use it.
static unsigned long monotonic(unsigned long perSec) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return (unsigned long)(ts.tv_sec * perSec + ts.tv_nsec / (1000000000UL / perSec));
}

unsigned long millis() { return monotonic(1000UL); }
unsigned long micros() { return monotonic(1000000UL); }
void delay(unsigned long ms) { usleep(ms * 1000UL); }
void delayMicroseconds(unsigned int us) { usleep(us); }

void noInterrupts() {}
void interrupts() {}

void pinMode(byte, byte) {}
byte digitalRead(byte) { return LOW; }
void digitalWrite(byte, byte) {}
int analogRead(byte) { return 0; }
void analogWrite(byte, int) {}

uint8_t digitalPinToPort(byte) { return 0; }
uint8_t digitalPinToBitMask(byte) { return 1; }
uint8_t *portInputRegister(uint8_t) { return NULL; }
uint8_t *portOutputRegister(uint8_t) { return NULL; }

// AVR fast-IO "shadow port" externs declared unconditionally in MotorDriver.h.
// A-C ship in MotorDriver.cpp; the rest are STM32-only so the host defines them.
// Host has no real port registers; unused with the emulated shield but must link.
typedef uint8_t portreg_t;
volatile portreg_t shadowPORTD;
volatile portreg_t shadowPORTE, shadowPORTF, shadowPORTG, shadowPORTH;

// User hook that real deployments may implement in myFilter.cpp - no-op on host.
void myFilter(Print *, byte &, byte &, int16_t[]) {}

HardwareSerial Serial(0, 1);

void DCCTimer::begin(INTERRUPT_CALLBACK) {}
bool DCCTimer::isPWMPin(byte) { return false; }
void DCCTimer::setPWM(byte, bool) {}
void DCCTimer::clearPWM() {}
void DCCTimer::startRailcomTimer(byte) {}
void DCCTimer::ackRailcomTimer() {}
void DCCTimer::DCCEXanalogWriteFrequency(uint8_t, uint32_t) {}
int DCCTimer::getMinimumFreeMemory() { return 8 * 1024; }
void DCCTimer::reset() {}
int DCCTimer::freeMemory() { return 1024 * 1024; }
volatile int DCCTimer::minimum_free_memory = -1;

void ADCee::begin() {}
int ADCee::init(uint8_t) { return 0; }
int ADCee::read(uint8_t, bool) { return 0; }
int16_t ADCee::ADCmax() { return 1023; }
void ADCee::scan() {}