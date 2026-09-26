import { onScopeDispose, ref } from 'vue';

// 24-hour HH:MM, the way a railway clock reads.
export function clockTime(at: number): string {
  return new Date(at).toTimeString().slice(0, 5);
}

// 24-hour HH:MM:SS for logs, where several changes can share a minute.
export function logTime(at: number): string {
  return new Date(at).toTimeString().slice(0, 8);
}

// The time of day, kept current to the minute.
export function useClock() {
  const now = ref(clockTime(Date.now()));

  const timer = setInterval(() => {
    now.value = clockTime(Date.now());
  }, 5000);

  onScopeDispose(() => clearInterval(timer));

  return now;
}
