// Why a WebSocket address cannot be used from a page served over
// pageProtocol ('http:' or 'https:'), in words for the person typing it, or ''
// when it can.
export function webSocketUrlError(value: string, pageProtocol: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'Enter a WebSocket URL.';
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return 'Enter a full WebSocket URL, such as ws://192.168.1.25:4444.';
  }

  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    return 'The URL must start with ws:// or wss://.';
  }

  if (parsed.username || parsed.password) {
    return 'WebSocket URLs cannot include a username or password.';
  }

  // Browsers block an insecure socket from a secure page.
  if (pageProtocol === 'https:' && parsed.protocol !== 'wss:') {
    return 'This page uses HTTPS, so the WebSocket URL must use wss://.';
  }

  return '';
}
