import { createApp } from 'vue';
import { createPinia } from 'pinia';

import '@/styles/base.css';
import App from '@/App.vue';
import router from '@/router';
import { applyTheme, useSettingsStore } from '@/stores/settings';

const pinia = createPinia();

applyTheme(useSettingsStore(pinia).theme);

createApp(App).use(pinia).use(router).mount('#app');
