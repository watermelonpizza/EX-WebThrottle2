import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { THEME_KEY, useSettingsStore } from '@/stores/settings';

describe('settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts on a known theme', () => {
    expect(['light', 'dark']).toContain(useSettingsStore().theme);
  });

  it.each<{ theme: string; preference: string; matches: (query: string) => boolean }>([
    { theme: 'contrast', preference: 'more contrast', matches: query => query.includes('contrast') },
    { theme: 'light', preference: 'a light colour scheme', matches: query => query.includes('color-scheme') },
    { theme: 'dark', preference: 'nothing in particular', matches: () => false },
  ])('starts on $theme when the system asks for $preference', ({ theme, matches }) => {
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: matches(query) }) as MediaQueryList);

    expect(useSettingsStore().theme).toBe(theme);
  });

  it('starts on the saved theme', () => {
    localStorage.setItem(THEME_KEY, '"contrast"');

    expect(useSettingsStore().theme).toBe('contrast');
  });

  describe('setting the theme', () => {
    beforeEach(() => {
      useSettingsStore().setTheme('dark');
    });

    it('uses it', () => {
      expect(useSettingsStore().theme).toBe('dark');
    });

    it('saves it for next time', () => {
      expect(localStorage.getItem(THEME_KEY)).toBe('"dark"');
    });
  });
});
