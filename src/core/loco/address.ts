import { MAX_CAB } from '../protocol';

// A loco address as typed, or undefined unless it is a whole number from 1 to
// the largest address the Command Station accepts.
export function parseAddress(text: string): number | undefined {
  const address = Number(text);

  return Number.isInteger(address) && address >= 1 && address <= MAX_CAB
    ? address
    : undefined;
}
