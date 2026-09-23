import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

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

  it('toggles the theme and persists it', () => {
    const store = useSettingsStore();
    const before = store.theme;

    store.toggleTheme();

    expect(store.theme).not.toBe(before);
    expect(localStorage.getItem(THEME_KEY)).toBe(store.theme);
  });
});
