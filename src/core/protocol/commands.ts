// Every native command a production command station (CommandStation-EX 5.6)
// understands, for looking up and sending by hand. Taken from the station's
// parser sources (DCCEXParser.cpp, TrackManager.cpp, EXRAIL2Parser.cpp,
// CamParser.cpp), so keep it in step with the release the emulator pins.
//
// Patterns follow the firmware's own convention: lower case words are values
// the user fills in, anything else is sent as written. "name" is a value that
// is sent inside quotes, [name] is one that may be left out, and a value
// touching the opcode (like <+atCommand>) is sent with no space before it.

// A word sent exactly as written: the opcode, or a keyword like DCC in
// <T id DCC address subaddress>.
export interface CommandKeyword {
  kind: 'keyword';
  text: string;
}

// A value the user fills in, like id or address.
export interface CommandInput {
  kind: 'input';
  name: string;
  quoted: boolean;
  optional: boolean;
}

export type CommandPart = CommandKeyword | CommandInput;

export interface CommandDef {
  group: string;
  pattern: string;
  summary: string;
  // What the values mean, where a name alone does not say.
  detail: string;
  // The hardware or firmware feature the command only works with.
  needs: string;
  // Wipes saved settings, restarts the station or takes over the link, so it
  // waits for an explicit confirm instead of sending on one click.
  risky: boolean;
  opcode: string;
  // Everything after the opcode, in order.
  parts: CommandPart[];
  inputs: CommandInput[];
  // The first word after the opcode touches it, as in <+atCommand>.
  glued: boolean;
}

interface CommandSource {
  pattern: string;
  summary: string;
  detail?: string;
  needs?: string;
  risky?: boolean;
}

interface CommandGroup {
  title: string;
  // What every command in the group needs, unless a command says otherwise.
  needs?: string;
  commands: CommandSource[];
}

const GROUPS: CommandGroup[] = [
  {
    title: 'Power and tracks',
    commands: [
      { pattern: '<1>', summary: 'Power on every track' },
      { pattern: '<1 MAIN>', summary: 'Power on the main tracks' },
      { pattern: '<1 PROG>', summary: 'Power on the programming track' },
      {
        pattern: '<1 JOIN>',
        summary: 'Join the programming track to main and power both',
      },
      {
        pattern: '<1 track>',
        summary: 'Power on one track output',
        detail: 'track: A to H',
      },
      { pattern: '<0>', summary: 'Power off every track' },
      { pattern: '<0 MAIN>', summary: 'Power off the main tracks' },
      { pattern: '<0 PROG>', summary: 'Power off the programming track' },
      {
        pattern: '<0 track>',
        summary: 'Power off one track output',
        detail: 'track: A to H',
      },
      { pattern: '<=>', summary: 'List what each track output is set to' },
      { pattern: '<= track MAIN>', summary: 'Set a track output to DCC main' },
      {
        pattern: '<= track MAIN_INV>',
        summary: 'Set a track output to DCC main with inverted polarity',
      },
      {
        pattern: '<= track MAIN_AUTO>',
        summary: 'Set a track output to DCC main with auto-reverse',
      },
      {
        pattern: '<= track PROG>',
        summary: 'Set a track output to the programming track',
      },
      { pattern: '<= track OFF>', summary: 'Switch a track output off' },
      { pattern: '<= track NONE>', summary: 'Give a track output no signal' },
      {
        pattern: '<= track EXT>',
        summary: 'Drive a track output from an external DCC signal',
      },
      {
        pattern: '<= track BOOST>',
        summary: 'Drive a track output from the booster input',
        needs: 'Booster input',
      },
      {
        pattern: '<= track BOOST_INV>',
        summary:
          'Drive a track output from the booster input, inverted polarity',
        needs: 'Booster input',
      },
      {
        pattern: '<= track BOOST_AUTO>',
        summary: 'Drive a track output from the booster input, auto-reverse',
        needs: 'Booster input',
      },
      {
        pattern: '<= track AUTO>',
        summary: 'Add auto-reverse to a track output\'s current mode',
      },
      {
        pattern: '<= track INV>',
        summary: 'Invert a track output\'s current polarity',
      },
      {
        pattern: '<= track DC loco>',
        summary: 'Run a track output as DC for one loco address',
      },
      {
        pattern: '<= track DC_INV loco>',
        summary: 'Run a track output as DC with inverted polarity',
      },
      {
        pattern: '<= track DCX loco>',
        summary: 'Run a track output as DC with inverted polarity',
      },
      { pattern: '<JI>', summary: 'Report the current drawn on each track' },
      { pattern: '<JG>', summary: 'Report the current limit of each track' },
      {
        pattern: '<JL display row>',
        summary: 'Show track currents on a display row',
      },
      {
        pattern: '<c>',
        summary: 'Report the main track current (legacy, use <JI>)',
      },
      {
        pattern: '<C PROGBOOST>',
        summary: 'Let the programming track draw full current',
      },
    ],
  },
  {
    title: 'Locos',
    commands: [
      { pattern: '<t loco>', summary: 'Ask for a loco\'s speed and functions' },
      {
        pattern: '<t loco speed direction>',
        summary: 'Set a loco speed and direction',
        detail:
          'speed: 0 to 126, -1 is an emergency stop · direction: 1 forward, 0 reverse',
      },
      {
        pattern: '<t register loco speed direction>',
        summary: 'Set a loco speed and direction (legacy form)',
        detail: 'register is ignored; the reply is the old <T …> format',
      },
      { pattern: '<!>', summary: 'Emergency stop every loco' },
      { pattern: '<!P>', summary: 'Emergency stop and pause the layout' },
      { pattern: '<!R>', summary: 'Resume a paused layout' },
      { pattern: '<!Q>', summary: 'Report whether the layout is paused' },
      {
        pattern: '<m loco momentum>',
        summary: 'Set a loco\'s momentum for accelerating and braking',
        detail: 'loco 0 sets the default for every loco',
      },
      {
        pattern: '<m loco accelerating braking>',
        summary: 'Set a loco\'s accelerating and braking momentum separately',
        detail: 'loco 0 sets the default for every loco',
      },
      {
        pattern: '<m LINEAR>',
        summary: 'Apply momentum at a steady rate',
      },
      {
        pattern: '<m POWER>',
        summary: 'Apply momentum in proportion to the change in speed',
      },
      {
        pattern: '<- loco>',
        summary: 'Forget a loco and stop repeating its speed and functions',
      },
      {
        pattern: '<->',
        summary: 'Forget every loco the station is driving',
        risky: true,
      },
      {
        pattern: '<#>',
        summary: 'Report how many locos the station can drive at once',
      },
      {
        pattern: '<C SPEED28>',
        summary: 'Send 28-step speed commands, for old decoders',
      },
      {
        pattern: '<C SPEED128>',
        summary: 'Send 128-step speed commands (the default)',
      },
    ],
  },
  {
    title: 'Functions',
    commands: [
      {
        pattern: '<F loco function state>',
        summary: 'Switch a loco function on or off',
        detail: 'function: 0 to 68 · state: 1 on, 0 off',
      },
      {
        pattern: '<F loco DCFREQ frequency>',
        summary: 'Set the PWM frequency for a DC loco',
        detail: 'frequency: 0 to 3',
      },
      {
        pattern: '<f loco byte>',
        summary: 'Set functions F0 to F12 as a DCC byte (legacy, use <F>)',
      },
      {
        pattern: '<f loco group byte>',
        summary: 'Set functions F13 to F28 as a DCC byte (legacy, use <F>)',
        detail: 'group: 222 for F13 to F20, 223 for F21 to F28',
      },
    ],
  },
  {
    title: 'Consists',
    commands: [
      { pattern: '<^>', summary: 'List consists' },
      { pattern: '<^ loco>', summary: 'Break up the consist holding a loco' },
      {
        pattern: '<^ lead follower [moreFollowers]>',
        summary: 'Build a consist from a lead loco and its followers',
        detail:
          'a negative address runs that loco reversed · list extra followers separated by spaces',
      },
    ],
  },
  {
    title: 'Turnouts',
    commands: [
      { pattern: '<T>', summary: 'List turnout definitions' },
      { pattern: '<JT>', summary: 'List turnout ids' },
      {
        pattern: '<JT id>',
        summary: 'Report a turnout\'s state and description',
      },
      { pattern: '<T id T>', summary: 'Throw a turnout' },
      { pattern: '<T id C>', summary: 'Close a turnout' },
      {
        pattern: '<T id state>',
        summary: 'Throw or close a turnout',
        detail: 'state: 1 thrown, 0 closed',
      },
      { pattern: '<T id X>', summary: 'Show a turnout\'s definition' },
      {
        pattern: '<T id DCC address subaddress>',
        summary: 'Create a DCC accessory turnout',
        detail: 'address: 0 to 511 · subaddress: 0 to 3',
      },
      {
        pattern: '<T id DCC linearAddress>',
        summary: 'Create a DCC accessory turnout by linear address',
        detail: 'linearAddress: 1 to 2048',
      },
      {
        pattern: '<T id SERVO vpin thrown closed profile>',
        summary: 'Create a servo turnout',
        detail:
          'thrown, closed: servo positions · profile: 0 instant, 1 fast, 2 medium, 3 slow, 4 bounce',
      },
      { pattern: '<T id VPIN vpin>', summary: 'Create a pin turnout' },
      {
        pattern: '<T id address subaddress>',
        summary: 'Create a DCC accessory turnout (legacy form)',
      },
      {
        pattern: '<T id vpin thrown closed>',
        summary: 'Create a servo turnout (legacy form)',
      },
      { pattern: '<T id>', summary: 'Delete a turnout' },
    ],
  },
  {
    title: 'Sensors',
    commands: [
      { pattern: '<Q>', summary: 'Report the state of every sensor' },
      { pattern: '<S>', summary: 'List sensor definitions' },
      {
        pattern: '<S id vpin pullup>',
        summary: 'Create a sensor',
        detail: 'pullup: 1 uses the pin pull-up, 0 does not',
      },
      { pattern: '<S id>', summary: 'Delete a sensor' },
    ],
  },
  {
    title: 'Outputs',
    commands: [
      { pattern: '<Z>', summary: 'List outputs' },
      {
        pattern: '<Z id state>',
        summary: 'Switch an output on or off',
        detail: 'state: 1 on, 0 off',
      },
      {
        pattern: '<Z id vpin flags>',
        summary: 'Create an output',
        detail:
          'flags 0 to 7: bit 0 makes it active low, bit 1 sets a start-up state taken from bit 2',
      },
      { pattern: '<Z id>', summary: 'Delete an output' },
    ],
  },
  {
    title: 'Accessories and pins',
    commands: [
      {
        pattern: '<a address subaddress activate>',
        summary: 'Send a DCC accessory command',
        detail: 'address: 0 to 511 · subaddress: 0 to 3 · activate: 1 or 0',
      },
      {
        pattern: '<a address subaddress activate onoff>',
        summary: 'Send a DCC accessory command with only the on or off packet',
        detail: 'onoff: 1 on, 0 off',
      },
      {
        pattern: '<a linearAddress activate>',
        summary: 'Send a DCC accessory command by linear address',
      },
      {
        pattern: '<A address aspect>',
        summary: 'Send a DCC extended accessory (signal aspect) command',
      },
      {
        pattern: '<z vpin>',
        summary: 'Set a pin high, or low with a negative vpin',
      },
      { pattern: '<z vpin value>', summary: 'Write an analogue pin value' },
      {
        pattern: '<z vpin value profile>',
        summary: 'Move an analogue pin to a value using a profile',
      },
      {
        pattern: '<z vpin value profile duration>',
        summary: 'Fade or move an analogue pin to a value over a duration',
      },
      {
        pattern: '<o vpin>',
        summary: 'Turn a NeoPixel on, or off with a negative vpin',
        needs: 'NeoPixel',
      },
      {
        pattern: '<o vpin count>',
        summary: 'Turn a row of NeoPixels on, or off with a negative vpin',
        needs: 'NeoPixel',
      },
      {
        pattern: '<o vpin red green blue>',
        summary: 'Set a NeoPixel colour',
        detail: 'red, green, blue: 0 to 255',
        needs: 'NeoPixel',
      },
      {
        pattern: '<o vpin red green blue count>',
        summary: 'Set the colour of a row of NeoPixels',
        detail: 'red, green, blue: 0 to 255',
        needs: 'NeoPixel',
      },
      {
        pattern: '<D ANOUT vpin value>',
        summary: 'Write an analogue value to a pin, for testing',
      },
      {
        pattern: '<D ANOUT vpin value profile>',
        summary: 'Write an analogue value to a pin using a profile',
      },
      {
        pattern: '<D SERVO vpin position>',
        summary: 'Move a servo, for testing',
      },
      {
        pattern: '<D SERVO vpin position profile>',
        summary: 'Move a servo using a profile, for testing',
      },
      { pattern: '<D ANIN vpin>', summary: 'Show an analogue input value' },
    ],
  },
  {
    title: 'Turntables',
    commands: [
      { pattern: '<I>', summary: 'List turntables' },
      { pattern: '<JO>', summary: 'List turntable ids' },
      {
        pattern: '<JO id>',
        summary: 'Report a turntable\'s state and description',
      },
      { pattern: '<JP id>', summary: 'List a turntable\'s positions' },
      {
        pattern: '<I id>',
        summary: 'Report a turntable\'s type and position',
      },
      { pattern: '<I id position>', summary: 'Turn a DCC turntable' },
      {
        pattern: '<I id position activity>',
        summary: 'Turn an EX-Turntable',
        needs: 'EX-Turntable',
      },
      {
        pattern: '<I id DCC home>',
        summary: 'Create a DCC turntable',
        detail: 'home: angle in tenths of a degree, 0 to 3600',
      },
      {
        pattern: '<I id EXTT vpin home>',
        summary: 'Create an EX-Turntable',
        detail: 'home: angle in tenths of a degree, 0 to 3600',
        needs: 'EX-Turntable',
      },
      {
        pattern: '<I id ADD position value angle>',
        summary: 'Add a turntable position',
        detail: 'position: up to 48 · angle: tenths of a degree, 0 to 3600',
      },
      {
        pattern: '<D TT vpin steps>',
        summary: 'Move a turntable, for testing',
      },
      {
        pattern: '<D TT vpin steps activity>',
        summary: 'Move a turntable with an activity, for testing',
      },
    ],
  },
  {
    title: 'Programming track',
    commands: [
      {
        pattern: '<R>',
        summary: 'Read the loco address (short, long or consist)',
      },
      {
        pattern: '<R LOCOID>',
        summary: 'Read the loco address, ignoring any consist',
      },
      { pattern: '<R CONSIST>', summary: 'Read the consist address' },
      { pattern: '<R cv>', summary: 'Read a CV' },
      {
        pattern: '<R cv callbackNumber callbackSub>',
        summary: 'Read a CV (legacy form)',
      },
      {
        pattern: '<W loco>',
        summary: 'Write a new loco address and clear any consist',
      },
      { pattern: '<W CONSIST loco>', summary: 'Write a consist address' },
      {
        pattern: '<W CONSIST loco REVERSE>',
        summary: 'Write a consist address with the loco reversed',
      },
      { pattern: '<W cv value>', summary: 'Write a CV' },
      {
        pattern: '<W cv value callbackNumber callbackSub>',
        summary: 'Write a CV (legacy form)',
      },
      {
        pattern: '<B cv bit value>',
        summary: 'Write one bit of a CV',
        detail: 'bit: 0 to 7 · value: 1 or 0',
      },
      {
        pattern: '<B cv bit value callbackNumber callbackSub>',
        summary: 'Write one bit of a CV (legacy form)',
      },
      {
        pattern: '<V cv value>',
        summary: 'Check a CV holds a value (a fast read)',
      },
      {
        pattern: '<V cv bit value>',
        summary: 'Check one bit of a CV holds a value',
      },
      {
        pattern: '<P register byte [moreBytes]>',
        summary: 'Send a raw DCC packet on the programming track',
        detail:
          'bytes in hex, up to 5, separated by spaces · register is ignored, use 0',
      },
    ],
  },
  {
    title: 'Main track programming',
    commands: [
      {
        pattern: '<w loco cv value>',
        summary: 'Write a CV on the main track',
      },
      {
        pattern: '<b loco cv bit value>',
        summary: 'Write one bit of a CV on the main track',
        detail: 'bit: 0 to 7 · value: 1 or 0',
      },
      {
        pattern: '<r loco cv>',
        summary: 'Read a CV on the main track',
        needs: 'Railcom',
      },
      {
        pattern: '<M register byte [moreBytes]>',
        summary: 'Send a raw DCC packet on the main track',
        detail:
          'bytes in hex, up to 5, separated by spaces · register is ignored, use 0',
      },
    ],
  },
  {
    title: 'Throttle info',
    commands: [
      {
        pattern: '<JA>',
        summary: 'List routes and automations',
        detail: 'empty unless the station runs EXRAIL',
      },
      {
        pattern: '<JA id>',
        summary: 'Report a route\'s type and description',
        needs: 'EXRAIL',
      },
      {
        pattern: '<JR>',
        summary: 'List roster ids',
        detail: 'empty unless the station runs EXRAIL',
      },
      {
        pattern: '<JR id>',
        summary: 'Report a roster loco\'s name and function names',
        needs: 'EXRAIL',
      },
      { pattern: '<JC>', summary: 'Report the fast clock time' },
      {
        pattern: '<JC minutes rate>',
        summary: 'Set the fast clock',
        detail: 'minutes: since midnight · rate: clock speed-up factor',
      },
      { pattern: '<JM>', summary: 'List stash values' },
      { pattern: '<JM id>', summary: 'Report a stash value' },
      { pattern: '<JM id loco>', summary: 'Set a stash value' },
      { pattern: '<JM CLEAR id>', summary: 'Clear a stash value' },
      { pattern: '<JM CLEAR ALL>', summary: 'Clear every stash value' },
      {
        pattern: '<JM CLEAR ANY loco>',
        summary: 'Clear every stash value holding a loco',
      },
    ],
  },
  {
    title: 'EXRAIL',
    needs: 'EXRAIL',
    commands: [
      { pattern: '</>', summary: 'Show EXRAIL task status' },
      {
        pattern: '</ PAUSE>',
        summary: 'Pause every task and stop every loco',
      },
      { pattern: '</ RESUME>', summary: 'Resume every task' },
      {
        pattern: '</ START route>',
        summary: 'Start a route or sequence',
      },
      {
        pattern: '</ START loco route>',
        summary: 'Start an automation with a loco',
      },
      { pattern: '</ KILL ALL>', summary: 'Stop every task' },
      { pattern: '</ KILL task>', summary: 'Stop one task' },
      {
        pattern: '</ RESERVE section>',
        summary: 'Reserve a section',
      },
      {
        pattern: '</ FREE section>',
        summary: 'Free a reserved section',
      },
      {
        pattern: '</ FREEALL>',
        summary: 'Free every reserved section',
      },
      {
        pattern: '</ LATCH sensor>',
        summary: 'Hold a sensor on for EXRAIL',
        detail: 'sensor: the pin EXRAIL reads in AT and IF · only EXRAIL sees it: <Q> and <q> still report the pin',
      },
      {
        pattern: '</ UNLATCH sensor>',
        summary: 'Release a sensor held on for EXRAIL',
        detail: 'sensor: the pin that was latched',
      },
      {
        pattern: '</ RED signal>',
        summary: 'Set a signal to red',
      },
      {
        pattern: '</ AMBER signal>',
        summary: 'Set a signal to amber',
      },
      {
        pattern: '</ GREEN signal>',
        summary: 'Set a signal to green',
      },
      {
        pattern: '<K block loco>',
        summary: 'Tell EXRAIL a loco has entered a block',
      },
      {
        pattern: '<k block loco>',
        summary: 'Tell EXRAIL a loco has left a block',
      },
      {
        pattern: '<L>',
        summary: 'Introduce an LCC or CBUS adapter to the station',
        needs: 'EXRAIL with LCC',
      },
      {
        pattern: '<L event>',
        summary: 'Pass an incoming LCC event to EXRAIL',
        needs: 'EXRAIL with LCC',
      },
    ],
  },
  {
    title: 'Sound',
    needs: 'DFPlayer',
    commands: [
      {
        pattern: '<y vpin PLAY track>',
        summary: 'Play a sound track',
      },
      {
        pattern: '<y vpin PLAY track volume>',
        summary: 'Play a sound track at a volume',
      },
      {
        pattern: '<y vpin REPEAT track>',
        summary: 'Play a sound track on repeat',
      },
      {
        pattern: '<y vpin REPEAT track volume>',
        summary: 'Play a sound track on repeat at a volume',
      },
      {
        pattern: '<y vpin FOLDER folder>',
        summary: 'Switch to a sound folder',
      },
      {
        pattern: '<y vpin STOP>',
        summary: 'Stop playing',
      },
      {
        pattern: '<y vpin PAUSE>',
        summary: 'Pause playing',
      },
      {
        pattern: '<y vpin RESUME>',
        summary: 'Resume playing',
      },
      {
        pattern: '<y vpin VOL volume>',
        summary: 'Set the volume',
      },
      {
        pattern: '<y vpin EQ eq>',
        summary: 'Set the equaliser',
        detail: 'eq: 0 normal, 1 pop, 2 rock, 3 jazz, 4 classic, 5 bass',
      },
      {
        pattern: '<y vpin RESET>',
        summary: 'Reset the sound module',
      },
    ],
  },
  {
    title: 'EX-SensorCAM',
    needs: 'EX-SensorCAM',
    commands: [
      {
        pattern: '<N>',
        summary: 'Show the current CAM and the others available',
      },
      {
        pattern: '<NC cam>',
        summary: 'Switch to another CAM',
        detail: 'cam: 1 to 4, or its vpin (over 99)',
      },
      {
        pattern: '<NQ>',
        summary: 'Report the state of every CAM sensor',
      },
      {
        pattern: '<NQ bank>',
        summary: 'Report which sensors in a bank are enabled',
        detail: 'bank 9 reports every bank',
      },
      {
        pattern: '<NA sensor>',
        summary: 'Enable a sensor and refresh its reference image',
      },
      {
        pattern: '<NA sensor row column>',
        summary: 'Move a sensor, enable it and refresh its reference image',
      },
      {
        pattern: '<NB bank>',
        summary: 'Report the occupancy of a bank of sensors',
      },
      {
        pattern: '<NE>',
        summary: 'Save the CAM configuration to its EEPROM',
      },
      {
        pattern: '<NF>',
        summary: 'Reset the CAM now, leaving webCAM or WiFi mode',
      },
      {
        pattern: '<NF sensor>',
        summary: 'Show a sensor\'s pixel frames (hex)',
      },
      {
        pattern: '<NG>',
        summary: 'Show the camera settings on the CAM monitor',
      },
      {
        pattern: '<NH value>',
        summary: 'Show CAM help, or set the highest sensor bank',
      },
      {
        pattern: '<NI sensor>',
        summary: 'Show a sensor\'s state and configuration',
      },
      {
        pattern: '<NI sensor twin>',
        summary: 'Add a twin sensor to a sensor',
      },
      {
        pattern: '<NJ setting value>',
        summary: 'Adjust a camera setting',
      },
      {
        pattern: '<NL sensor>',
        summary: 'Latch a sensor on (occupied)',
      },
      {
        pattern: '<NM frames>',
        summary: 'Set how many frames it takes to trip a sensor',
        detail: 'frames: 1 to 4',
      },
      {
        pattern: '<NM frames maxSensor>',
        summary: 'Set the trip frames and the highest sensor',
      },
      {
        pattern: '<NN bank>',
        summary: 'Light the CAM LED when a bank trips',
      },
      {
        pattern: '<NN bank minSensor>',
        summary: 'Light the CAM LED for a bank and set the lowest sensor',
      },
      {
        pattern: '<NO sensor>',
        summary: 'Turn a sensor off (unoccupied)',
      },
      {
        pattern: '<NP bank>',
        summary: 'List the positions of a bank of sensors',
      },
      {
        pattern: '<NR>',
        summary: 'Refresh the reference image of every sensor',
      },
      {
        pattern: '<NR sensor>',
        summary: 'Refresh a sensor\'s reference image',
      },
      {
        pattern: '<NS sensor>',
        summary: 'Scan for the brightest spot and put a sensor there',
      },
      {
        pattern: '<NT value>',
        summary: 'Set the trip threshold, or show scroll data rows',
        detail:
          'value: 32 to 98 sets the threshold, 2 to 30 shows that many rows',
      },
      {
        pattern: '<NT threshold sensor>',
        summary: 'Set a private threshold for one sensor',
        detail: 'threshold 0 deletes it',
      },
      {
        pattern: '<NU sensor>',
        summary: 'Undefine a sensor',
      },
      {
        pattern: '<NV>',
        summary: 'Show the CAM version',
      },
      {
        pattern: '<NV ssid>',
        summary: 'Start webCAM mode on a WiFi network',
      },
      {
        pattern: '<NW>',
        summary: 'Pause image capture until the next command',
      },
      {
        pattern: '<N vpin row column>',
        summary: 'Place a sensor at a row and column',
      },
    ],
  },
  {
    title: 'Command station',
    commands: [
      {
        pattern: '<s>',
        summary: 'Report the version, power, turnouts and sensors',
      },
      {
        pattern: '<E>',
        summary: 'Save turnouts, sensors and outputs to EEPROM',
      },
      {
        pattern: '<e>',
        summary: 'Erase everything saved in EEPROM',
        risky: true,
      },
      {
        pattern: '<C RESET>',
        summary: 'Restart the command station',
        risky: true,
      },
      {
        pattern: '<D RESET>',
        summary: 'Restart the command station',
        risky: true,
      },
      { pattern: '<C RAILCOM ON>', summary: 'Turn on the Railcom cutout' },
      { pattern: '<C RAILCOM OFF>', summary: 'Turn off the Railcom cutout' },
      {
        pattern: '<C SNIFFER ON>',
        summary: 'Turn on the DCC sniffer',
        needs: 'ESP32',
      },
      {
        pattern: '<C SNIFFER OFF>',
        summary: 'Turn off the DCC sniffer',
        needs: 'ESP32',
      },
      { pattern: '<@>', summary: 'Send me the virtual display messages' },
      {
        pattern: '<@ display row "text">',
        summary: 'Show text on a virtual display row',
      },
    ],
  },
  {
    title: 'WiFi',
    commands: [
      {
        pattern: '<C WIFI "ssid" "password">',
        summary: 'Join a WiFi network',
        needs: 'ESP32',
      },
      {
        pattern: '<+atCommand>',
        summary: 'Send an AT command to the WiFi module',
        detail: 'sent as AT+atCommand',
        needs: 'WiFi shield',
      },
      {
        pattern: '<+X>',
        summary: 'Treat the WiFi module as connected',
        needs: 'WiFi shield',
      },
      {
        pattern: '<+>',
        summary:
          'Pass everything straight to the WiFi module until a line starts with !',
        needs: 'WiFi shield',
        risky: true,
      },
    ],
  },
  {
    title: 'Diagnostics',
    commands: [
      { pattern: '<D CABS>', summary: 'Show the table of driven locos' },
      { pattern: '<D RAM>', summary: 'Show free memory' },
      { pattern: '<D CMD ON>', summary: 'Log every command received' },
      { pattern: '<D CMD OFF>', summary: 'Stop logging commands' },
      {
        pattern: '<D ACK ON>',
        summary: 'Log programming track acknowledgements',
      },
      {
        pattern: '<D ACK OFF>',
        summary: 'Stop logging programming track acknowledgements',
      },
      {
        pattern: '<D ACK LIMIT milliamps>',
        summary: 'Set the current that counts as an acknowledgement',
      },
      {
        pattern: '<D ACK MIN microseconds>',
        summary: 'Set the shortest acknowledgement pulse',
      },
      {
        pattern: '<D ACK MIN milliseconds MS>',
        summary: 'Set the shortest acknowledgement pulse in milliseconds',
      },
      {
        pattern: '<D ACK MAX microseconds>',
        summary: 'Set the longest acknowledgement pulse',
      },
      {
        pattern: '<D ACK MAX milliseconds MS>',
        summary: 'Set the longest acknowledgement pulse in milliseconds',
      },
      {
        pattern: '<D ACK RETRY count>',
        summary: 'Set how often a programming read retries',
      },
      { pattern: '<D RAILCOM ON>', summary: 'Log Railcom messages' },
      { pattern: '<D RAILCOM OFF>', summary: 'Stop logging Railcom messages' },
      { pattern: '<D WIFI ON>', summary: 'Log WiFi activity' },
      { pattern: '<D WIFI OFF>', summary: 'Stop logging WiFi activity' },
      { pattern: '<D ETHERNET ON>', summary: 'Log Ethernet activity' },
      {
        pattern: '<D ETHERNET OFF>',
        summary: 'Stop logging Ethernet activity',
      },
      { pattern: '<D WIT ON>', summary: 'Log WiThrottle activity' },
      { pattern: '<D WIT OFF>', summary: 'Stop logging WiThrottle activity' },
      { pattern: '<D LCN ON>', summary: 'Log LCN activity' },
      { pattern: '<D LCN OFF>', summary: 'Stop logging LCN activity' },
      { pattern: '<D SNIFFER ON>', summary: 'Log sniffed DCC packets' },
      {
        pattern: '<D SNIFFER OFF>',
        summary: 'Stop logging sniffed DCC packets',
      },
      { pattern: '<D WEBSOCKET ON>', summary: 'Log WebSocket activity' },
      {
        pattern: '<D WEBSOCKET OFF>',
        summary: 'Stop logging WebSocket activity',
      },
      {
        pattern: '<D EXRAIL ON>',
        summary: 'Log EXRAIL activity',
        needs: 'EXRAIL',
      },
      {
        pattern: '<D EXRAIL OFF>',
        summary: 'Stop logging EXRAIL activity',
        needs: 'EXRAIL',
      },
      {
        pattern: '<D EEPROM entries>',
        summary: 'Show what is saved in EEPROM',
      },
      {
        pattern: '<D HAL SHOW>',
        summary: 'Scan and list the connected I/O devices',
      },
      {
        pattern: '<D HAL RESET>',
        summary: 'Reset every connected I/O device',
        risky: true,
      },
    ],
  },
];

function toPart(word: string): CommandPart {
  if (word.startsWith('"')) {
    return {
      kind: 'input',
      name: word.slice(1, -1),
      quoted: true,
      optional: false,
    };
  }

  if (word.startsWith('[')) {
    return {
      kind: 'input',
      name: word.slice(1, -1),
      quoted: false,
      optional: true,
    };
  }

  if (/^[a-z]/.test(word)) {
    return { kind: 'input', name: word, quoted: false, optional: false };
  }

  return { kind: 'keyword', text: word };
}

function toCommand(group: CommandGroup, source: CommandSource): CommandDef {
  // The opcode is always the single character after "<", whatever its case.
  const rest = source.pattern.slice(2, -1);
  const parts = rest.split(' ').filter(Boolean).map(toPart);

  return {
    group: group.title,
    pattern: source.pattern,
    summary: source.summary,
    detail: source.detail ?? '',
    needs: source.needs ?? group.needs ?? '',
    risky: source.risky ?? false,
    opcode: source.pattern.charAt(1),
    parts,
    inputs: parts.filter(part => part.kind === 'input'),
    glued: rest !== '' && !rest.startsWith(' '),
  };
}

export const COMMANDS: CommandDef[] = GROUPS.flatMap(group =>
  group.commands.map(command => toCommand(group, command)));

export interface MatchedCommandParameter {
  input: CommandInput;
  value: string;
}

export interface CommandMatch {
  command: CommandDef;
  parameters: MatchedCommandParameter[];
}

function frameTokens(
  frame: string,
): { opcode: string; rest: string[] } | undefined {
  const trimmed = frame.trim();

  if (!trimmed.startsWith('<') || !trimmed.endsWith('>')) {
    return undefined;
  }

  const body = trimmed.slice(1, -1);

  if (!body) {
    return undefined;
  }

  return {
    opcode: body[0],
    rest: body.slice(1).match(/"(?:\\.|[^"\\])*"|\S+/g) ?? [],
  };
}

function matchParts(
  parts: CommandPart[],
  words: string[],
  partIndex = 0,
  wordIndex = 0,
): MatchedCommandParameter[] | undefined {
  if (partIndex === parts.length) {
    return wordIndex === words.length ? [] : undefined;
  }

  const part = parts[partIndex];

  if (part.kind === 'keyword') {
    if (words[wordIndex]?.toUpperCase() !== part.text.toUpperCase()) {
      return undefined;
    }

    return matchParts(parts, words, partIndex + 1, wordIndex + 1);
  }

  if (part.optional && part.name === 'moreBytes') {
    const remaining = words.slice(wordIndex);

    if (remaining.length > 0 && partIndex === parts.length - 1) {
      return [{ input: part, value: remaining.join(' ') }];
    }

    return matchParts(parts, words, partIndex + 1, wordIndex);
  }

  const word = words[wordIndex];

  if (word !== undefined) {
    const rest = matchParts(parts, words, partIndex + 1, wordIndex + 1);

    if (rest) {
      return [
        {
          input: part,
          value:
            word.startsWith('"') && word.endsWith('"')
              ? word.slice(1, -1)
              : word,
        },
        ...rest,
      ];
    }
  }

  if (part.optional) {
    return matchParts(parts, words, partIndex + 1, wordIndex);
  }

  return undefined;
}

// Find the command definition for a complete raw frame and return its actual
// input values in the order named by the command pattern.
export function matchCommand(frame: string): CommandMatch | undefined {
  const tokens = frameTokens(frame);

  if (!tokens) {
    return undefined;
  }

  const matches = COMMANDS.flatMap((command) => {
    if (command.opcode !== tokens.opcode) {
      return [];
    }

    const parameters = matchParts(command.parts, tokens.rest);

    return parameters
      ? [
          {
            command,
            parameters,
            specificity: command.parts.filter(part => part.kind === 'keyword')
              .length,
          },
        ]
      : [];
  });
  const bestMatch = matches.sort(
    (left, right) => right.specificity - left.specificity,
  )[0];

  return bestMatch
    ? { command: bestMatch.command, parameters: bestMatch.parameters }
    : undefined;
}

export function isComplete(
  command: CommandDef,
  values: readonly string[],
): boolean {
  return command.inputs.every(
    (input, index) => input.optional || Boolean(values[index]?.trim()),
  );
}

// Fill a command's inputs, in order, and frame it ready to send. Blank
// optional inputs are left out.
export function buildCommand(
  command: CommandDef,
  values: readonly string[],
): string {
  const words: string[] = [];
  let next = 0;

  for (const part of command.parts) {
    if (part.kind === 'keyword') {
      words.push(part.text);
      continue;
    }

    const value = (values[next] ?? '').trim();

    next += 1;

    if (!value) {
      continue;
    }

    words.push(part.quoted
      ? `"${value.replace(/^"|"$/g, '')}"`
      : value);
  }

  const gap = command.glued || words.length === 0 ? '' : ' ';

  return `<${command.opcode}${gap}${words.join(' ')}>`;
}

// The opcode and keywords before the first input, squashed together, so a
// command typed the way it is sent ("JT", "<J T>", "<1 MAIN>") still finds it.
function sentPrefix(command: CommandDef): string {
  let prefix = command.opcode;

  for (const part of command.parts) {
    if (part.kind === 'input') {
      break;
    }

    prefix += part.text;
  }

  return prefix.toLowerCase();
}

// Every word of the query has to appear somewhere in a command's pattern,
// summary, detail, group or needs, in any order: "power main" finds <1 MAIN>.
export function searchCommands(
  query: string,
  commands: readonly CommandDef[] = COMMANDS,
): CommandDef[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const typed = query.toLowerCase().replace(/[\s<>]/g, '');

  if (words.length === 0) {
    return [...commands];
  }

  return commands.filter((command) => {
    const text = [
      command.pattern,
      command.summary,
      command.detail,
      command.group,
      command.needs,
    ]
      .join(' ')
      .toLowerCase();

    return (
      words.every(word => text.includes(word))
      || sentPrefix(command).startsWith(typed)
    );
  });
}
