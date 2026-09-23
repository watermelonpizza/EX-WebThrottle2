export { Direction, PowerState, TurnoutState } from './types';
export type { ProtocolMessage, SystemInfo, LocoState } from './types';
export {
  OPCODE_EMERGENCY_STOP,
  OPCODE_ERROR,
  OPCODE_FORGET,
  OPCODE_FUNCTION,
  OPCODE_LOCO,
  OPCODE_LOCO_UPDATE,
  OPCODE_POWER,
  OPCODE_POWER_OFF,
  OPCODE_POWER_ON,
  OPCODE_SYSTEM_INFO,
  OPCODE_SYSTEM_INFO_REQUEST,
  OPCODE_TURNOUT,
} from './constants';
export {
  powerOn,
  powerOff,
  emergencyStop,
  requestSystemInfo,
  requestLocoUpdate,
  forgetLoco,
  setLocoSpeed,
  setLocoFunction,
} from './encode';
export { decodeMessage, decodeFrame, splitFrames } from './decode';
export { decodeSpeedByte, encodeSpeedByte } from './speed';
export type { DecodedSpeed } from './speed';
