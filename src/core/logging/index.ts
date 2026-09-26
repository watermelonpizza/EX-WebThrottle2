// Each message starts with a dotted event identifier naming the code path it
// came from (for example "protocol.decode.decodeFrame.invalid_power"), so
// searching the repository for it finds the code that logged it. The arrows
// look console up on each call, so tests can spy on console.warn.
export const log = {
  warn: (event: string, context?: object) => console.warn(event, context),
  error: (event: string, context?: object) => console.error(event, context),
};
