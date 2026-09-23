import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { addLogSink, log, LogEntry } from '../index';

describe('log', () => {
  let captured: LogEntry[] = [];
  let unsubscribe: () => void;

  beforeEach(() => {
    captured = [];

    unsubscribe = addLogSink((entry) => captured.push(entry));
  });

  afterEach(() => {
    unsubscribe();
  });

  it('emits the level, event identifier and context to a sink', () => {
    const context = { frame: 'iDCCEX / MEGA' };

    log.warn(
      'protocol.decode.decodeSystemInfo.microprocessor_not_found',
      context,
    );

    expect(captured).toEqual([
      expect.objectContaining({
        level: 'warn',
        event: 'protocol.decode.decodeSystemInfo.microprocessor_not_found',
        context,
      }),
    ]);
  });

  it('sends entries to every registered sink', () => {
    const second: LogEntry[] = [];
    const removeSecond = addLogSink((entry) => second.push(entry));

    log.debug('component.test.two_sinks');

    removeSecond();

    expect(captured).toHaveLength(1);
    expect(second).toHaveLength(1);
  });

  it('stops sending once the sink is removed', () => {
    unsubscribe();

    log.info('component.test.removed');

    expect(captured).toEqual([]);
  });
});
