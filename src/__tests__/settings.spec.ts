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

  it('sets the theme and persists it', () => {
    const store = useSettingsStore();

    store.setTheme('dark');

    expect(store.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });
});
