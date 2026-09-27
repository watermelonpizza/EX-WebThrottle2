/*
 * Host main() for the CommandStation-EX emulator - mirrors the setup()/loop()
 * order of CommandStation-EX.ino, minus WiFi/Ethernet/LCN.
 */
#include "DCCEX.h"

int main() {
  SerialManager::init();
  DIAG(F("License GPLv3 fsf.org (c) dcc-ex.com"));

  IODevice::begin();
  ADCee::begin();
  TrackManager::Setup(MOTOR_SHIELD_TYPE);

  DCC::begin();
  RMFT::begin();

  // Startup commands, included exactly as CommandStation-EX.ino does.
  #define SETUP(cmd) DCCEXParser::parse(F(cmd))
  #include "mySetup.h"
  #undef SETUP

  LCD(3, F("Ready"));
  CommandDistributor::broadcastPower();

  while (true) {
    DCC::loop();
    SerialManager::loop();
    RMFT::loop();
    DisplayInterface::loop();
    IODevice::loop();
    Sensor::checkAll();
    delay(5);
  }
}