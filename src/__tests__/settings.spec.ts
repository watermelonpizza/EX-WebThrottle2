import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { THEME_KEY, useSettingsStore } from '@/stores/settings';

describe('settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('starts on a known theme', () => {
    const store = useSettingsStore();
    expect(['light', 'dark']).toContain(store.theme);
  });

  it('chooses contrast or light from the system preference', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query.includes('contrast'),
        }) as MediaQueryList,
    );
    expect(useSettingsStore().theme).toBe('contrast');

    localStorage.clear();
    setActivePinia(createPinia());
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query.includes('color-scheme'),
        }) as MediaQueryList,
    );
    expect(useSettingsStore().theme).toBe('light');

    localStorage.clear();
    setActivePinia(createPinia());
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList);
    expect(useSettingsStore().theme).toBe('dark');
  });

  it('sets the theme and persists it', () => {
    const store = useSettingsStore();

    store.setTheme('dark');

    expect(store.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('"dark"');
  });

  it('starts on the saved theme', () => {
    localStorage.setItem(THEME_KEY, '"contrast"');

    expect(useSettingsStore().theme).toBe('contrast');
  });
});
