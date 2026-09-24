import type { ThemeName } from '@/stores/settings';

// Applies the named theme by flipping the data-theme attribute on <html>;
// the token blocks in styles/main.scss key off it. The settings store keeps
// the value + persistence; this file owns the DOM side so the store stays
// testable without a document.

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}
