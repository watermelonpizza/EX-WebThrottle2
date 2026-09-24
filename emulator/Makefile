CXX ?= c++
# -Wall -Wextra only on our own sources below: upstream CommandStation-EX code
# trips clang-specific warnings (missing override, VLAs, GCC pragmas) that the
# real avr-gcc toolchain never complains about, and the submodule stays pristine.
WARNFLAGS = -Wall -Wextra
CXXFLAGS ?= -g -O0 -DF_CPU=16000000L
# Upstream headers omit `override`; clang enables the missing-override check by
# default, but it never exists on GCC - so only silence it under clang.
IS_CLANG := $(shell $(CXX) --version 2>/dev/null | grep -c clang)
ifeq ($(IS_CLANG),1)
CXXFLAGS += -Wno-inconsistent-missing-override
endif
# --gc-sections matches Arduino's toolchain: single-USB configs compile dead
# broadcast/channel code that otherwise brings unreachable but undefined symbols.
# The exact flag spelling differs per linker (macOS ld64 vs GNU ld).
CXXFLAGS += -ffunction-sections -fdata-sections
UNAME_S := $(shell uname -s)
ifeq ($(findstring Darwin,$(UNAME_S)),Darwin)
LDFLAGS = -Wl,-dead_strip
else
LDFLAGS = -Wl,--gc-sections
endif
# MinGW/MSYS (MSYS2) compilers append .exe themselves; make must look for the
# same filename or it relinks every invocation. Linux (WSL2) and macOS stay bare.
ifneq ($(filter MINGW% MSYS%,$(UNAME_S)),)
EXEEXT = .exe
endif
CXXFLAGS += -I. -ICommandStation-EX -std=gnu++17
CS = CommandStation-EX
BUILD = build

# Per-arch/hardware sources the host build never needs.
EXCLUDE = DCCTimerAVR.cpp DCCTimerMEGAAVR.cpp DCCTimerESP.cpp DCCTimerSAMD.cpp \
          DCCTimerSTM32.cpp DCCTimerTEENSY.cpp DCCRMT.cpp DCCWaveformRMT.cpp \
          Sniffer.cpp DCCDecoder.cpp WifiESP32.cpp WifiInterface.cpp \
          WifiInboundHandler.cpp Websockets.cpp WiThrottle.cpp SerialUsbLog.cpp \
          EthernetInterface.cpp EXmDNS.cpp Ztest.cpp I2CManager.cpp EEStore.cpp \
          IO_TM1638.cpp IO_EncoderThrottle.cpp IO_Servo.cpp IO_PCA9685.cpp \
          IO_DS1307.cpp IO_I2CRailcom.cpp LiquidCrystal_I2C.cpp SSD1306Ascii.cpp \
          EXRAIL2.cpp EXRAIL2Parser.cpp EXRAILSensor.cpp IO_DCCAccessory.cpp

SRCS = $(filter-out $(addprefix $(CS)/,$(EXCLUDE)), $(wildcard $(CS)/*.cpp))
OBJS = $(patsubst $(CS)/%.cpp,$(BUILD)/%.o,$(SRCS))
OBJS += $(addprefix $(BUILD)/,main.o host.o)
TARGET = $(BUILD)/emulator$(EXEEXT)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) $(LDFLAGS) -o $@ $(OBJS)

# StringFormatter '%P' casts a void* to uint32_t - ill-formed on 64-bit hosts
# (works on the real 32-bit MCUs; only the low half of the address is printed).
# We compile a sed-patched copy from build/ so the submodule stays pristine.
$(BUILD)/StringFormatter.cpp: $(CS)/StringFormatter.cpp | $(BUILD)
	sed 's/(uint32_t)va_arg(args, void\*)/(uint32_t)(uintptr_t)va_arg(args, void*)/' $< > $@

$(BUILD)/StringFormatter.o: $(BUILD)/StringFormatter.cpp
	$(CXX) $(CXXFLAGS) -c -o $@ $<

$(BUILD)/%.o: $(CS)/%.cpp | $(BUILD)
	$(CXX) $(CXXFLAGS) -c -o $@ $<

$(BUILD)/main.o: main.cpp config.h Arduino.h | $(BUILD)
	$(CXX) $(CXXFLAGS) $(WARNFLAGS) -c -o $@ main.cpp

$(BUILD)/host.o: host.cpp config.h Arduino.h | $(BUILD)
	$(CXX) $(CXXFLAGS) $(WARNFLAGS) -c -o $@ host.cpp

$(BUILD):
	mkdir -p $(BUILD)

clean:
	rm -rf $(BUILD)

.PHONY: all clean