// Reads a JSON value this browser saved earlier. Anything missing, unreadable
// or the wrong shape gives the fallback: a corrupted setting must not stop the
// app booting.
export function loadSaved<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): T {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');

    return isValid(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}
