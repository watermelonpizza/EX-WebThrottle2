/*
 * Host main() for the CommandStation-EX emulator - mirrors the setup()/loop()
 * order of CommandStation-EX.ino, minus WiFi/Ethernet/LCN/automation.
 */
#include "DCCEX.h"

// Boot commands configured the same way a physical CS uses mySetup.h, but
// loaded from a file so layouts can be edited without rebuilding the SIM.
static bool runLayoutFile(const char *path) {
  FILE *f = fopen(path, "r");
  if (!f)
    return false;
  char line[256];
  while (fgets(line, sizeof(line), f)) {
    size_t len = strlen(line);
    while (len && (line[len - 1] == '\n' || line[len - 1] == '\r')) line[--len] = '\0';
    if (len == 0)
      continue;
    size_t start = 0;
    while (line[start] == ' ' || line[start] == '\t') start++;
    if (line[start] == '#')
      continue;
    DCCEXParser::parse(F(line));
  }
  fclose(f);
  return true;
}

int main(int argc, char **argv) {
  const char *layoutPath = (argc > 1) ? argv[1] : "layout.txt";

  SerialManager::init();
  DIAG(F("License GPLv3 fsf.org (c) dcc-ex.com"));

  IODevice::begin();
  ADCee::begin();
  TrackManager::Setup(MOTOR_SHIELD_TYPE);

  DCC::begin();
  RMFT::begin();

  bool defaultLayout = runLayoutFile(layoutPath);
  // Optional personal overlay for local testing - gitignored so it is never
  // committed by accident. Commands here run after the default layout.
  runLayoutFile("layout.local.txt");
  if (!defaultLayout)
    DIAG(F("layout file %s not found"), layoutPath);

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