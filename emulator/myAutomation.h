// EXRAIL script for the CommandStation-EX emulator.
//
// Having a file called myAutomation.h is what turns EXRAIL on in the
// firmware, exactly as on a real Command Station. It is compiled in, so a
// change here needs a rebuild; `make` notices and does it.
//
// ponytail: no text commands (PRINT, BROADCAST, LCD, MESSAGE, SERIAL...).
// EXRAIL keeps a text's address in 32 bits, which cannot hold a 64-bit host
// address, so running one crashes the emulator. Patch EXRAIL2.cpp's
// thrungeString in the Makefile, as FSH.h is, if one is ever needed.
//
// The routes and the automation follow the sample layout the throttle draws
// for the emulator (see mySetup.h): turnouts 1 and 2 are the passing loop,
// 3 the yard throat, 4 and 5 the yard roads. Ids start at 101 so they are not
// mistaken for turnout, output or sensor ids in the traffic log.
//
// Keep this small: the emulator is here to give the throttle real replies
// (<jA>, <jB>, route runs), not to run a layout.

// The Command Station's own loco list (<JR>): a name and function names for
// each address, F0 first, with * for one you hold down. Addresses 10 and 11
// are not driven by any other test, so their names never clash.
ROSTER(10, "Pannier", "Lights/Bell/*Whistle//Coal shovel")
ROSTER(11, "Class 66", "Headlights/*Horn")

// Routes only set points, so a driver can then run over them.
ROUTE(101, "Main line")
  CLOSE(1) CLOSE(3) CLOSE(2)
  DONE

ROUTE(102, "Passing loop")
  THROW(1) THROW(2)
  DONE

ROUTE(103, "Yard road 1")
  CLOSE(1) THROW(3) THROW(4)
  DONE

ROUTE(104, "Yard road 2")
  CLOSE(1) THROW(3) CLOSE(4) CLOSE(5)
  DONE

ROUTE(105, "Yard road 3")
  CLOSE(1) THROW(3) CLOSE(4) THROW(5)
  DONE

// An automation drives the loco it is started with (</ START loco 201>).
// It shows as active while it runs, so the throttle sees <jB 201 1> and then
// <jB 201 0>. AT() reads a pin, not a sensor id: pin 22 is sensor 20,
// Platform 1, so <z -22> is the train arriving.
AUTOMATION(201, "Stop at Platform 1")
  ROUTE_ACTIVE(201)
  CLOSE(1)
  FWD(30)
  AT(22) STOP
  ROUTE_INACTIVE(201)
  DONE
