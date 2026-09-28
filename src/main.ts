import { createApp } from 'vue';
import { createPinia } from 'pinia';

import '@/styles/base.css';
import App from '@/App.vue';
import router from '@/router';
import { applyTheme, useSettingsStore } from '@/stores/settings';

const pinia = createPinia();

applyTheme(useSettingsStore(pinia).theme);

createApp(App).use(pinia).use(router).mount('#app');

// The built app keeps a copy of itself, so it opens without the internet and
// installs as an app; the dev server has no service worker.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js');
}
