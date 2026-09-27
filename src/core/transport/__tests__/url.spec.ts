import { describe, expect, it } from 'vitest';

import { webSocketUrlError } from '../url';

describe('checking a WebSocket address', () => {
  it.each([
    { url: ' ws://127.0.0.1:4444 ', page: 'http:' },
    { url: 'wss://hub.local/dcc', page: 'https:' },
  ])('accepts "$url" from an $page page', ({ url, page }) => {
    expect(webSocketUrlError(url, page)).toBe('');
  });

  it.each([
    { url: '   ', problem: 'Enter a WebSocket URL.' },
    { url: 'not a URL', problem: 'full WebSocket URL' },
    { url: 'http://localhost:4444', problem: 'must start with ws://' },
    { url: 'ws://user:pass@localhost:4444', problem: 'username or password' },
  ])('explains what is wrong with "$url"', ({ url, problem }) => {
    expect(webSocketUrlError(url, 'http:')).toContain(problem);
  });

  it('needs wss:// from a page served over HTTPS', () => {
    expect(webSocketUrlError('ws://127.0.0.1:4444', 'https:')).toContain('must use wss://');
  });
});
