import type { ThemeDefinition } from 'vuetify';

// Signal-style palette: red for attention, green for status.
const signalRed = '#a6302b';
const signalGreen = '#2e6b3c';

export const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#f4f1ea',
    surface: '#fffdf8',
    primary: signalRed,
    secondary: signalGreen,
    accent: '#7a5c12',
    error: signalRed,
    success: signalGreen,
  },
};

export const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#1c1a17',
    surface: '#262320',
    primary: signalRed,
    secondary: signalGreen,
    accent: '#c9a33e',
    error: signalRed,
    success: signalGreen,
  },
};
