// A tiny structured logger, deliberately not calling console.* anywhere in
// the calling code. Each message carries a dotted event identifier that names
// the code path it came from (for example
// "protocol.decode.decodeSystemInfo.microprocessor_not_found"), plus an object
// of related values. Searching the repository for the identifier finds both the
// log line and the code that produced it.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  event: string;
  at: number;
  context?: Record<string, unknown>;
}

// A sink is anything that wants to receive log entries: the browser devtools
// console, a capture list inside a test, or a future remote logger.
export type LogSink = (entry: LogEntry) => void;

const sinks = new Set<LogSink>();

// The default sink prints readable lines to the browser devtools console, if
// one exists. It is added here so the rest of the app never touches console.
const consoleSink: LogSink = (entry) => {
  if (typeof console === 'undefined') return;

  const prefix = `[${entry.level}] ${entry.event}`;

  const details = { at: new Date(entry.at), ...entry.context };

  if (entry.level === 'error') {
    console.error(prefix, details);
  } else if (entry.level === 'warn') {
    console.warn(prefix, details);
  } else if (entry.level === 'debug') {
    console.debug(prefix, details);
  } else {
    console.info(prefix, details);
  }
};

sinks.add(consoleSink);

export function addLogSink(sink: LogSink): () => void {
  sinks.add(sink);

  return () => {
    sinks.delete(sink);
  };
}

function emit(entry: LogEntry): void {
  for (const sink of sinks) {
    try {
      sink(entry);
    } catch {
      // A failing sink (for example a broken test capturer) must never take
      // the app down with it.
    }
  }
}

function emitEntry(
  level: LogLevel,
  event: string,
  context?: Record<string, unknown>,
): void {
  emit({ level, event, at: Date.now(), context });
}

export const log = {
  debug: (event: string, context?: Record<string, unknown>) =>
    emitEntry('debug', event, context),
  info: (event: string, context?: Record<string, unknown>) =>
    emitEntry('info', event, context),
  warn: (event: string, context?: Record<string, unknown>) =>
    emitEntry('warn', event, context),
  error: (event: string, context?: Record<string, unknown>) =>
    emitEntry('error', event, context),
};
