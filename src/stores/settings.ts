import { defineStore } from 'pinia';

export const THEME_KEY = 'exwt-theme';

export type ThemeName = 'light' | 'dark';

function initialTheme(): ThemeName {
  const saved = localStorage.getItem(THEME_KEY);

  if (saved === 'light' || saved === 'dark') {
    return saved;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    theme: initialTheme(),
  }),
  actions: {
    setTheme(theme: ThemeName) {
      this.theme = theme;
      localStorage.setItem(THEME_KEY, theme);
    },
  },
});
