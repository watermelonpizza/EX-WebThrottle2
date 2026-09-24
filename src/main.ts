import { createApp } from 'vue';
import { createPinia } from 'pinia';

import '@mdi/font/css/materialdesignicons.css';
import '@/styles/main.scss';
import App from '@/App.vue';
import router from '@/router';
import { applyTheme } from '@/styles/theme';
import { useSettingsStore } from '@/stores/settings';

const pinia = createPinia();
applyTheme(useSettingsStore(pinia).theme);

createApp(App).use(pinia).use(router).mount('#app');
