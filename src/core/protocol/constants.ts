// Single case-sensitive opcode characters from the DCC-EX Native API Reference.
// Uppercase commands are sent to the command station; lowercase responses are
// broadcast back. The names here pin both sides of the same letter, so the
// encoder and parser cannot drift apart over time.

export const OPCODE_POWER_ON = '1';
export const OPCODE_POWER_OFF = '0';
export const OPCODE_EMERGENCY_STOP = '!';
export const OPCODE_SYSTEM_INFO_REQUEST = 's';
export const OPCODE_LOCO = 't';
export const OPCODE_FUNCTION = 'F';
export const OPCODE_FORGET = '-';

// Track assignments are listed as <= A MAIN> in answer to <=>.
export const OPCODE_TRACK_LIST = '=';

// <s> is answered with <iDCCEX version / μC / motorController / build>.
export const OPCODE_SYSTEM_INFO = 'i';

// Power changes are announced as <p0> / <p1> broadcasts rather than answers.
export const OPCODE_POWER = 'p';

// <t cab> commands drive loco updates, which arrive as <l cab …> broadcasts.
export const OPCODE_LOCO_UPDATE = 'l';

export const OPCODE_TURNOUT = 'H';

// <X> is the command station's generic "invalid command" response.
export const OPCODE_ERROR = 'X';
