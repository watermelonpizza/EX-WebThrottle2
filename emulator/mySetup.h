// Startup commands for the CommandStation-EX emulator.
//
// This is the firmware's own mySetup.h: each SETUP("...") line is a DCC-EX
// command run through the real parser at boot, exactly as on a physical
// Command Station (dcc-ex.com, Startup Configuration). It is compiled in, so a
// change here needs a rebuild; `make` notices and does it. Replies to these
// commands are not sent to any client, as a real Command Station does not
// echo its own setup either.
//
// Native commands set up turnouts, outputs and sensors here. Routes and the
// automation need EXRAIL and live in myAutomation.h. Locos need no setup, and
// track power starts off until a throttle turns it on.

// Turnout 1 on DCC accessory decoder address 10, output 0 (<T id DCC addr sub>).
// Throwing it sends a real accessory packet and broadcasts <H 1 1> thrown or
// <H 1 0> closed, which is what the throttle lists and switches.
SETUP("<T 1 DCC 10 0>");

// Turnout 2, same decoder, next output. A second one so the throttle is
// exercised against a list rather than a single row.
SETUP("<T 2 DCC 10 1>");

// Turnouts 3-5 lead into the yard. With 1 and 2 they match the sample layout
// diagram the throttle draws for the emulator (a main line, a passing loop and
// a two-road yard).
SETUP("<T 3 DCC 10 2>");
SETUP("<T 4 DCC 10 3>");
SETUP("<T 5 DCC 11 0>");

// Output 10 driving pin 100, active high (<Z id pin flags>, flag bit 0 low
// means active high). Outputs are the on/off accessories of a layout -
// uncouplers, lights, relays. <Z 10 1> switches it and answers <Y 10 1>.
SETUP("<Z 10 100 0>");

// Output 11 on pin 101, same kind, again so there is more than one to show.
SETUP("<Z 11 101 0>");

// Sensor 20 reading pin 22 with the pull-up enabled (<S id pin pullup>).
// Sensors are layout feedback - occupancy detectors, reed switches, buttons.
// They report <Q 20> when active and <q 20> when clear, and start clear: the
// pull-up holds the pin high. A detector fires by pulling its pin to 0V; here
// <z -22> does the same (the firmware drives the pin low, exactly as it would
// on a real board) and <z 22> lets it go again.
SETUP("<S 20 22 1>");

// Sensors 21 and 22 on pins 23 and 24, same again. On the sample diagram, 20
// watches Platform 1, 21 the loop and 22 the yard.
SETUP("<S 21 23 1>");
SETUP("<S 22 24 1>");
