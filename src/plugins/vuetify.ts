import { createVuetify } from 'vuetify';

import { lightTheme, darkTheme } from '@/styles/theme';

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: lightTheme,
      dark: darkTheme,
    },
  },
});
