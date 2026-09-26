import { defineStore } from 'pinia';

import { loadSaved } from '@/stores/saved';

export const THEME_KEY = 'exwt-theme';

// Dark suits a train room lit for the layout, light a bright room or daylight,
// and contrast gives the strongest separation and larger text for low vision.
export const THEMES = ['dark', 'light', 'contrast'] as const;

export type ThemeName = (typeof THEMES)[number];

function isTheme(value: unknown): value is ThemeName {
  return THEMES.includes(value as ThemeName);
}

function systemTheme(): ThemeName {
  if (window.matchMedia('(prefers-contrast: more)').matches) {
    return 'contrast';
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

// The token blocks in styles/tokens.scss key off data-theme on <html>.
export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    theme:
      loadSaved<ThemeName | null>(THEME_KEY, null, isTheme) ?? systemTheme(),
  }),
  actions: {
    setTheme(theme: ThemeName) {
      this.theme = theme;
      localStorage.setItem(THEME_KEY, JSON.stringify(theme));
      applyTheme(theme);
    },
  },
});
