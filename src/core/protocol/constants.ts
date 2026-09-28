// Single case-sensitive opcode characters from the DCC-EX Native API Reference.
// Uppercase commands are sent to the command station; lowercase responses are
// broadcast back. The names here pin both sides of the same letter, so the
// encoder and parser cannot drift apart over time.

export const OPCODE_POWER_ON = '1';
export const OPCODE_POWER_OFF = '0';
export const OPCODE_SYSTEM_INFO_REQUEST = 's';
export const OPCODE_LOCO = 't';
export const OPCODE_FUNCTION = 'F';
export const OPCODE_FORGET = '-';
// <!> emergency-stops every loco the command station is driving, whichever
// throttle set it moving.
export const OPCODE_EMERGENCY_STOP_ALL = '!';

// Track assignments are listed as <= A MAIN> in answer to <=>.
export const OPCODE_TRACK_LIST = '=';

// <s> is answered with <iDCCEX version / μC / motorController / build>.
export const OPCODE_SYSTEM_INFO = 'i';

// Power changes are announced as <p0> / <p1> broadcasts rather than answers.
export const OPCODE_POWER = 'p';

// <t cab> commands drive loco updates, which arrive as <l cab …> broadcasts.
export const OPCODE_LOCO_UPDATE = 'l';

// Turnout states are broadcast as <H id state>; <T id T|C> throws or closes one.
export const OPCODE_TURNOUT = 'H';
export const OPCODE_TURNOUT_SET = 'T';

// Inventory questions are asked as <J?> and answered as <j?>, where the second
// letter picks the subject: <JT> for turnouts.
export const OPCODE_INFO_REQUEST = 'J';
export const OPCODE_INFO = 'j';
export const INFO_TURNOUTS = 'T';

// EXRAIL routes and automations are listed with <JA>. Their button states and
// captions are broadcast as <jB …>, which has no matching question.
export const INFO_ROUTES = 'A';
export const INFO_ROUTE_STATE = 'B';

// The Command Station's own loco list, from ROSTER lines in its EXRAIL script:
// <JR> lists the addresses, <JR cab> gives a loco's name and function names.
export const INFO_ROSTER = 'R';

// EXRAIL commands start with a slash: </ START id> sets a route going, and
// </ START loco id> sends a loco off on an automation. </ PAUSE> freezes every
// task and stops every loco; </ RESUME> sets them going again.
export const OPCODE_EXRAIL = '/';
export const EXRAIL_START = 'START';
export const EXRAIL_PAUSE = 'PAUSE';
export const EXRAIL_RESUME = 'RESUME';

// Outputs: <Z> lists them, <Z id 1|0> switches one, and both answer with <Y …>.
export const OPCODE_OUTPUT_SET = 'Z';
export const OPCODE_OUTPUT = 'Y';

// Sensors: <Q> asks for every sensor state, and each one reports back as
// <Q id> when active or <q id> when not — the case carries the state.
export const OPCODE_SENSOR = 'Q';
export const OPCODE_SENSOR_INACTIVE = 'q';

// Diagnostics: <D CABS> lists the locos the command station is driving, in a
// <* LocoSlots … *> diagnostic reply with one "Loco=<cab>" line per loco.
export const OPCODE_DIAGNOSTIC = 'D';
export const DIAGNOSTIC_CABS = 'CABS';
export const OPCODE_DIAGNOSTIC_REPLY = '*';
export const CAB_LIST_TITLE = 'LocoSlots';
