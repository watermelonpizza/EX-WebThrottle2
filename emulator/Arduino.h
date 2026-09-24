/*
 * Host Arduino.h shim for the CommandStation-EX emulator.
 *
 * Provides the minimal Arduino core API surface CommandStation-EX needs to
 * compile as a native macOS process with no ARDUINO_ARCH_* defined (which also
 * selects the flat-memory / non-PROGMEM path in FSH.h). No protocol logic
 * lives here - just host plumbing (Print/Stream, time, pin no-ops).
 *
 * Protocol bytes and diagnostics share the single `Serial` object, exactly as
 * on real hardware, so framers only ever see the genuine CS byte stream.
 */
#ifndef HOST_ARDUINO_H
#define HOST_ARDUINO_H

#include <stdint.h>
#include <stddef.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <poll.h>
#include <time.h>

typedef uint8_t byte;
typedef uint16_t word;
typedef bool boolean;

#define HIGH 0x1
#define LOW 0x0
#define INPUT 0x0
#define OUTPUT 0x1
#define INPUT_PULLUP 0x2

#define A0 54
#define A1 55
#define A2 56
#define A3 57
#define A4 58
#define A5 59
#define A6 60
#define A7 61
#define A8 62
#define A9 63
#define A10 64
#define A11 65
#define A12 66
#define A13 67
#define A14 68
#define A15 69

#define NUM_DIGITAL_PINS 64

#define lowByte(x) ((byte)((x) & 0xFF))
#define highByte(x) ((byte)(((x) >> 8) & 0xFF))

#define strcpy_P strcpy
#define strcmp_P strcmp
#define strncpy_P strncpy
#define strncmp_P strncmp
#define strlen_P strlen
#define strchr_P strchr
#define strstr_P strstr
#define strlcat_P strlcat

#ifndef min
#define min(a, b) ((a) < (b) ? (a) : (b))
#define max(a, b) ((a) > (b) ? (a) : (b))
#define abs(x) ((x) < 0 ? -(x) : (x))
#endif

enum PrintBase { BIN = 2, OCT = 8, DEC = 10, HEX = 16 };

class Print {
public:
  virtual size_t write(uint8_t) = 0;
  size_t write(const uint8_t *buffer, size_t size) {
    size_t n = 0;
    while (n < size) n += write(buffer[n]);
    return n;
  }
  size_t write(const char *str) {
    if (!str) return 0;
    size_t n = 0;
    while (str[n]) n++;
    return write((const uint8_t *)str, n);
  }
  virtual int availableForWrite() { return 0; }

  size_t print(char c) { return write((uint8_t)c); }
  size_t print(const char *str) { return write(str); }
  size_t print(char *str) { return write(str); }
  size_t print(int value, int base = DEC) { return printNumber((long)value, base); }
  size_t print(long value, int base = DEC) { return printNumber(value, base); }
  size_t print(unsigned int value, int base = DEC) { return printNumber((unsigned long)value, base); }
  size_t print(unsigned long value, int base = DEC) { return printNumber(value, base); }

  size_t println(char c) { return print(c) + print("\r\n"); }
  size_t println(const char *str) { return print(str) + print("\r\n"); }

protected:
  size_t printNumber(long value, int base) {
    return value < 0 ? print('-') + printNumber((unsigned long)(-value), base)
                     : printNumber((unsigned long)value, base);
  }
  size_t printNumber(unsigned long value, int base) {
    char buf[33];
    char *p = &buf[sizeof(buf) - 1];
    *p = '\0';
    do {
      char c = "0123456789abcdef"[value % base];
      *--p = c;
      value /= base;
    } while (value);
    return write(p);
  }
};

class Stream : public Print {
public:
  virtual int available() = 0;
  virtual int read() = 0;
  virtual int peek() = 0;
};

/*
 * Host serial: stdin carries inbound `<...>` commands, stdout carries
 * everything the CS emits (diagnostics and protocol replies - the real CS
 * mixes these on USB serial exactly this way). The bridge separates them by
 * content later (stage 2).
 */
class HardwareSerial : public Stream {
public:
  HardwareSerial(int inFile = 0, int outFile = 1) : in(inFile), out(outFile) {}
  void begin(long) {}
  operator bool() { return true; }

  int available() override {
    struct pollfd pfd = { in, POLLIN, 0 };
    return poll(&pfd, 1, 0) > 0;
  }
  int read() override {
    unsigned char c;
    return ::read(in, &c, 1) == 1 ? c : -1;
  }
  int peek() override { return -1; }
  size_t write(uint8_t c) override { return ::write(out, &c, 1) == 1 ? 1 : 0; }

private:
  int in;
  int out;
};

extern HardwareSerial Serial;

unsigned long millis();
unsigned long micros();
void delay(unsigned long ms);
void delayMicroseconds(unsigned int us);

void noInterrupts();
void interrupts();

void pinMode(byte pin, byte mode);
byte digitalRead(byte pin);
void digitalWrite(byte pin, byte value);
int analogRead(byte pin);
void analogWrite(byte pin, int value);

// AVR fast-pin helpers used by MotorDriver::getFastPin - never called on the
// host (NO_SHIELD has no drivers), so they return placeholder values.
uint8_t digitalPinToPort(byte pin);
uint8_t digitalPinToBitMask(byte pin);
uint8_t *portInputRegister(uint8_t port);
uint8_t *portOutputRegister(uint8_t port);

#endif