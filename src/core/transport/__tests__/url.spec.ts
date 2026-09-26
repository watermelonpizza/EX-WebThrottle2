import { describe, expect, it } from 'vitest';

import { webSocketUrlError } from '../url';

describe('checking a WebSocket address', () => {
  it('accepts ws:// and wss:// addresses, ignoring stray spaces', () => {
    expect(webSocketUrlError(' ws://127.0.0.1:4444 ', 'http:')).toBe('');
    expect(webSocketUrlError('wss://hub.local/dcc', 'https:')).toBe('');
  });

  it('explains what is wrong with an address it cannot use', () => {
    expect(webSocketUrlError('   ', 'http:')).toBe('Enter a WebSocket URL.');
    expect(webSocketUrlError('not a URL', 'http:')).toContain(
      'full WebSocket URL',
    );
    expect(webSocketUrlError('http://localhost:4444', 'http:')).toContain(
      'must start with ws://',
    );
    expect(
      webSocketUrlError('ws://user:pass@localhost:4444', 'http:'),
    ).toContain('username or password');
  });

  it('needs wss:// from a page served over HTTPS', () => {
    expect(webSocketUrlError('ws://127.0.0.1:4444', 'https:')).toContain(
      'must use wss://',
    );
  });
});
